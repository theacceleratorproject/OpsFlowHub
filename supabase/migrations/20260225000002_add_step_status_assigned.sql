ALTER TABLE public.task_steps ADD COLUMN status TEXT NOT NULL DEFAULT 'Not Started';
ALTER TABLE public.task_steps ADD COLUMN assigned_to TEXT;
