-- Add picked_by column to picking_orders for tracking who picked
ALTER TABLE picking_orders ADD COLUMN picked_by TEXT;
