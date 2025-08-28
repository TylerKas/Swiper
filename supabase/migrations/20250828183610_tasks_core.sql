-- Create task_status enum if missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_status') THEN
    CREATE TYPE task_status AS ENUM ('available','matched','in_progress','completed','cancelled');
  END IF;
END$$;

-- Create tasks table
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  elder_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  budget NUMERIC(10,2),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  status task_status NOT NULL DEFAULT 'available',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT tasks_elder_fk FOREIGN KEY (elder_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Indexes for tasks
CREATE INDEX IF NOT EXISTS tasks_status_idx ON public.tasks (status);
CREATE INDEX IF NOT EXISTS tasks_created_at_idx ON public.tasks (created_at DESC);

-- RLS for tasks
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Elders can insert their own tasks
CREATE POLICY IF NOT EXISTS tasks_insert_elders ON public.tasks
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = tasks.elder_id AND p.user_id = auth.uid() AND p.user_type = 'elder'
  )
);

-- Elders can update their own tasks
CREATE POLICY IF NOT EXISTS tasks_update_elders ON public.tasks
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = tasks.elder_id AND p.user_id = auth.uid()
  )
);

-- Students can select available tasks; elders can see their own
CREATE POLICY IF NOT EXISTS tasks_select_available_or_own ON public.tasks
FOR SELECT USING (
  tasks.status = 'available'
  OR EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = tasks.elder_id AND p.user_id = auth.uid()
  )
);

-- Timestamp trigger for tasks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_tasks_updated_at'
  ) THEN
    CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END$$;

-- Dismissed tasks (student swiped left)
CREATE TABLE IF NOT EXISTS public.dismissed_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT dismissed_tasks_unique UNIQUE (task_id, student_id)
);

ALTER TABLE public.dismissed_tasks ENABLE ROW LEVEL SECURITY;

-- Students can insert/select their own dismissed records
CREATE POLICY IF NOT EXISTS dismissed_tasks_rw_own ON public.dismissed_tasks
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = dismissed_tasks.student_id AND p.user_id = auth.uid()
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = dismissed_tasks.student_id AND p.user_id = auth.uid()
  )
);

-- Completed tasks and earnings
CREATE TABLE IF NOT EXISTS public.completed_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  elder_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.completed_tasks ENABLE ROW LEVEL SECURITY;

-- Participants can read/write their own completed records
CREATE POLICY IF NOT EXISTS completed_tasks_select_participants ON public.completed_tasks
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = completed_tasks.student_id AND p.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = completed_tasks.elder_id AND p.user_id = auth.uid())
);

CREATE POLICY IF NOT EXISTS completed_tasks_insert_participants ON public.completed_tasks
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = completed_tasks.student_id AND p.user_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = completed_tasks.elder_id AND p.user_id = auth.uid())
);

-- RPC: swipe_right to create match and lock the task
CREATE OR REPLACE FUNCTION public.swipe_right(p_task_id UUID, p_student_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status task_status;
  v_elder UUID;
  v_is_student BOOLEAN;
BEGIN
  -- Verify caller owns the provided student profile and is a student
  SELECT (p.user_type = 'student') INTO v_is_student
  FROM public.profiles p
  WHERE p.id = p_student_id AND p.user_id = auth.uid();

  IF NOT COALESCE(v_is_student, FALSE) THEN
    RAISE EXCEPTION 'Unauthorized student profile';
  END IF;

  -- Lock task and validate availability
  SELECT t.status, t.elder_id INTO v_status, v_elder
  FROM public.tasks t
  WHERE t.id = p_task_id
  FOR UPDATE;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Task not found';
  END IF;

  IF v_status <> 'available' THEN
    RAISE EXCEPTION 'Task not available';
  END IF;

  -- Prevent elders from matching their own task via their student profile
  IF EXISTS (SELECT 1 FROM public.profiles ep WHERE ep.id = v_elder AND ep.user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Cannot match your own task';
  END IF;

  -- Create a match (if not exists) and set task to matched
  INSERT INTO public.matches (task_id, student_id, elder_id, status)
  VALUES (p_task_id, p_student_id, v_elder, 'pending')
  ON CONFLICT DO NOTHING;

  UPDATE public.tasks SET status = 'matched' WHERE id = p_task_id AND status = 'available';
END;
$$;

GRANT EXECUTE ON FUNCTION public.swipe_right(UUID, UUID) TO anon, authenticated;

-- RPC: complete_task to mark completion and record payout
CREATE OR REPLACE FUNCTION public.complete_task(p_task_id UUID, p_student_id UUID, p_amount NUMERIC)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_ok BOOLEAN;
  v_elder UUID;
BEGIN
  -- Verify caller owns the provided student profile
  SELECT TRUE INTO v_student_ok
  FROM public.profiles p
  WHERE p.id = p_student_id AND p.user_id = auth.uid();

  IF NOT COALESCE(v_student_ok, FALSE) THEN
    RAISE EXCEPTION 'Unauthorized student profile';
  END IF;

  -- Get elder and move task to completed
  SELECT t.elder_id INTO v_elder FROM public.tasks t WHERE t.id = p_task_id;
  IF v_elder IS NULL THEN
    RAISE EXCEPTION 'Task not found';
  END IF;

  UPDATE public.tasks SET status = 'completed' WHERE id = p_task_id AND status IN ('in_progress','matched');

  INSERT INTO public.completed_tasks (task_id, student_id, elder_id, amount)
  VALUES (p_task_id, p_student_id, v_elder, COALESCE(p_amount, 0));
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_task(UUID, UUID, NUMERIC) TO anon, authenticated;
