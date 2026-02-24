ALTER TABLE picking_orders
  ADD COLUMN verified_by_scan BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN scan_timestamp TIMESTAMPTZ,
  ADD COLUMN last_scan_result TEXT,
  ADD COLUMN scanned_value TEXT,
  ADD COLUMN scan_match BOOLEAN NOT NULL DEFAULT FALSE;
