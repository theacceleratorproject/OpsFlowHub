-- Add parent_step_id to task_steps for nesting sub-tasks
ALTER TABLE public.task_steps ADD COLUMN parent_step_id UUID REFERENCES public.task_steps(id) ON DELETE CASCADE;
CREATE INDEX idx_task_steps_parent ON public.task_steps(parent_step_id);
