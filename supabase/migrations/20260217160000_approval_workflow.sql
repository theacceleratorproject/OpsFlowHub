-- Add work_order_number to part_requests for approval workflow
ALTER TABLE part_requests ADD COLUMN work_order_number TEXT;
