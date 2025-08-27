-- Create messages table for communication between users
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  task_id UUID NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE NULL
);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Create policies for messages
CREATE POLICY "Users can view messages they sent or received" 
ON public.messages 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles p1 WHERE p1.id = messages.sender_id AND p1.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM profiles p2 WHERE p2.id = messages.receiver_id AND p2.user_id = auth.uid()
  )
);

CREATE POLICY "Users can send messages" 
ON public.messages 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles WHERE id = messages.sender_id AND user_id = auth.uid()
  )
);

-- Create ratings table for post-task ratings
CREATE TABLE public.ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL,
  rater_id UUID NOT NULL,
  rated_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

-- Create policies for ratings
CREATE POLICY "Users can view ratings about them" 
ON public.ratings 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles WHERE id = ratings.rated_id AND user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM profiles WHERE id = ratings.rater_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can create ratings" 
ON public.ratings 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles WHERE id = ratings.rater_id AND user_id = auth.uid()
  )
);

-- Create matches table to track when users are matched for tasks
CREATE TABLE public.matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL,
  student_id UUID NOT NULL,
  elder_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- Create policies for matches
CREATE POLICY "Users can view their own matches" 
ON public.matches 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles WHERE id = matches.student_id AND user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM profiles WHERE id = matches.elder_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Students can create matches" 
ON public.matches 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles WHERE id = matches.student_id AND user_id = auth.uid() AND user_type = 'student'
  )
);

CREATE POLICY "Users can update their matches" 
ON public.matches 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM profiles WHERE id = matches.student_id AND user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM profiles WHERE id = matches.elder_id AND user_id = auth.uid()
  )
);

-- Create trigger for matches updated_at
CREATE TRIGGER update_matches_updated_at
BEFORE UPDATE ON public.matches
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();