-- Distinguish BOM work-order picks from manually created picks
ALTER TABLE picking_orders ADD COLUMN source TEXT NOT NULL DEFAULT 'Manual';

-- Backfill: picks with a work_order_number are likely from WO approval
UPDATE picking_orders SET source = 'WO' WHERE work_order_number IS NOT NULL;
