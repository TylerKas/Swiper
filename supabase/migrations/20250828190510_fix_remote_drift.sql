-- Fix remote schema drift: ensure tables/columns, RLS, policies, and RPCs exist

-- Ensure enums
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_status') THEN
    CREATE TYPE task_status AS ENUM ('available','matched','in_progress','completed','cancelled');
  END IF;
END$$;

-- Ensure tasks table exists (no-op if already present)
CREATE TABLE IF NOT EXISTS public.tasks (
  id uuid primary key default gen_random_uuid(),
  elder_id uuid not null,
  title text not null,
  description text,
  category text,
  budget numeric(10,2),
  latitude double precision,
  longitude double precision,
  status task_status not null default 'available',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ensure dismissed_tasks exists before enabling RLS
CREATE TABLE IF NOT EXISTS public.dismissed_tasks (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint dismissed_tasks_unique unique (task_id, student_id)
);

-- Ensure completed_tasks exists before adding elder_id
CREATE TABLE IF NOT EXISTS public.completed_tasks (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  -- elder_id may be added below if missing
  amount numeric(10,2) not null default 0,
  completed_at timestamptz not null default now()
);

-- Ensure completed_tasks.elder_id exists
ALTER TABLE public.completed_tasks
  ADD COLUMN IF NOT EXISTS elder_id uuid;

-- Add FK constraint for completed_tasks.elder_id if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints c
    WHERE c.table_schema = 'public'
      AND c.table_name = 'completed_tasks'
      AND c.constraint_name = 'completed_tasks_elder_fk'
  ) THEN
    ALTER TABLE public.completed_tasks
      ADD CONSTRAINT completed_tasks_elder_fk
      FOREIGN KEY (elder_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END$$;

-- Enable RLS on key tables
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dismissed_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.completed_tasks ENABLE ROW LEVEL SECURITY;

-- Policies for tasks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tasks' AND policyname = 'tasks_insert_elders'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY tasks_insert_elders ON public.tasks
      FOR INSERT WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = tasks.elder_id AND p.user_id = auth.uid() AND p.user_type = 'elder'
        )
      );
    $policy$;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tasks' AND policyname = 'tasks_update_elders'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY tasks_update_elders ON public.tasks
      FOR UPDATE USING (
        EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = tasks.elder_id AND p.user_id = auth.uid()
        )
      );
    $policy$;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tasks' AND policyname = 'tasks_select_available_or_own'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY tasks_select_available_or_own ON public.tasks
      FOR SELECT USING (
        (status = 'available')
        OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = tasks.elder_id AND p.user_id = auth.uid()
        )
      );
    $policy$;
  END IF;
END$$;

-- Policies for dismissed_tasks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'dismissed_tasks' AND policyname = 'dismissed_tasks_rw_own'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY dismissed_tasks_rw_own ON public.dismissed_tasks
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
    $policy$;
  END IF;
END$$;

-- Policies for completed_tasks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'completed_tasks' AND policyname = 'completed_tasks_select_participants'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY completed_tasks_select_participants ON public.completed_tasks
      FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = completed_tasks.student_id AND p.user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = completed_tasks.elder_id AND p.user_id = auth.uid())
      );
    $policy$;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'completed_tasks' AND policyname = 'completed_tasks_insert_participants'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY completed_tasks_insert_participants ON public.completed_tasks
      FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = completed_tasks.student_id AND p.user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = completed_tasks.elder_id AND p.user_id = auth.uid())
      );
    $policy$;
  END IF;
END$$;

-- Recreate RPCs with robust typing (text-compatible)
CREATE OR REPLACE FUNCTION public.swipe_right(p_task_id uuid, p_student_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
  v_elder uuid;
  v_is_student boolean;
BEGIN
  SELECT (p.user_type = 'student') INTO v_is_student
  FROM public.profiles p
  WHERE p.id = p_student_id AND p.user_id = auth.uid();

  IF NOT coalesce(v_is_student, false) THEN
    RAISE EXCEPTION 'Unauthorized student profile';
  END IF;

  SELECT t.status::text, t.elder_id INTO v_status, v_elder
  FROM public.tasks t
  WHERE t.id = p_task_id
  FOR UPDATE;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Task not found';
  END IF;

  IF v_status <> 'available' THEN
    RAISE EXCEPTION 'Task not available';
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles ep WHERE ep.id = v_elder AND ep.user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Cannot match your own task';
  END IF;

  INSERT INTO public.matches (task_id, student_id, elder_id, status)
  VALUES (p_task_id, p_student_id, v_elder, 'pending')
  ON CONFLICT DO NOTHING;

  UPDATE public.tasks SET status = 'matched' WHERE id = p_task_id AND status = 'available';
END;
$$;

GRANT EXECUTE ON FUNCTION public.swipe_right(uuid, uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.complete_task(p_task_id uuid, p_student_id uuid, p_amount numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student_ok boolean;
  v_elder uuid;
BEGIN
  SELECT TRUE INTO v_student_ok
  FROM public.profiles p
  WHERE p.id = p_student_id AND p.user_id = auth.uid();

  IF NOT coalesce(v_student_ok, false) THEN
    RAISE EXCEPTION 'Unauthorized student profile';
  END IF;

  SELECT t.elder_id INTO v_elder FROM public.tasks t WHERE t.id = p_task_id;
  IF v_elder IS NULL THEN
    RAISE EXCEPTION 'Task not found';
  END IF;

  UPDATE public.tasks SET status = 'completed' WHERE id = p_task_id AND status IN ('in_progress','matched');

  INSERT INTO public.completed_tasks (task_id, student_id, elder_id, amount)
  VALUES (p_task_id, p_student_id, v_elder, coalesce(p_amount, 0));
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_task(uuid, uuid, numeric) TO anon, authenticated;

