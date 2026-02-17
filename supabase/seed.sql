-- ============================================================
-- OpsFlowHub Seed Data
-- Realistic mock data for development & demo
-- ============================================================

-- ── Project ──────────────────────────────────────────────────
INSERT INTO projects (id, project_name, customer, start_date, target_end_date, project_lead, status, notes) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Lumina X1 Headlamp', 'AutoCorp NA', '2026-01-06', '2026-06-30', 'marc@opsflow.io', 'Active', 'Next-gen LED headlamp assembly for 2027 MY sedan');

-- ── Project Version ──────────────────────────────────────────
INSERT INTO project_versions (id, project_id, version_name) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'EVT Build 1');

-- ── BOM Lines (1 header + 12 child parts) ────────────────────
-- Upload batch ID shared by all lines in this BOM
INSERT INTO bom_lines (id, upload_batch_id, project_version_id, bom_level, component_number, object_description, required_qty, component_quantity, base_unit_measure, standard_price, material_type, sort_string) VALUES
  -- Header (level 0)
  ('c1000000-0000-0000-0000-000000000000', 'd1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 0, 'LX1-ASM-100', 'Lumina X1 Headlamp Assembly', 0, 0, 'EA', 0, 'HALB', '00000'),
  -- Children (level 1)
  ('c1000000-0000-0000-0000-000000000001', 'd1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 1, 'LED-MOD-210', 'LED Module 12W 6500K', 4, 4, 'EA', 8.50, 'ROH', '00001'),
  ('c1000000-0000-0000-0000-000000000002', 'd1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 1, 'HSK-ALU-305', 'Aluminum Heat Sink', 2, 2, 'EA', 3.20, 'ROH', '00002'),
  ('c1000000-0000-0000-0000-000000000003', 'd1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 1, 'LNS-PC-420', 'Polycarbonate Lens', 1, 1, 'EA', 12.75, 'ROH', '00003'),
  ('c1000000-0000-0000-0000-000000000004', 'd1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 1, 'PCB-DRV-110', 'Driver PCB Rev C', 1, 1, 'EA', 6.40, 'ROH', '00004'),
  ('c1000000-0000-0000-0000-000000000005', 'd1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 1, 'HSG-ABS-500', 'ABS Housing Black', 1, 1, 'EA', 4.15, 'ROH', '00005'),
  ('c1000000-0000-0000-0000-000000000006', 'd1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 1, 'REF-CHR-601', 'Chrome Reflector', 1, 1, 'EA', 5.80, 'ROH', '00006'),
  ('c1000000-0000-0000-0000-000000000007', 'd1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 1, 'WRH-18G-700', '18 AWG Wire Harness', 1, 1, 'EA', 2.30, 'ROH', '00007'),
  ('c1000000-0000-0000-0000-000000000008', 'd1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 1, 'GSK-SIL-801', 'Silicone Gasket IP67', 1, 1, 'EA', 0.95, 'ROH', '00008'),
  ('c1000000-0000-0000-0000-000000000009', 'd1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 1, 'SCR-M3-010', 'M3x8 SS Screw', 12, 12, 'EA', 0.04, 'ROH', '00009'),
  ('c1000000-0000-0000-0000-000000000010', 'd1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 1, 'CON-TE-220', 'TE 4-Pin Connector', 1, 1, 'EA', 1.10, 'ROH', '00010'),
  ('c1000000-0000-0000-0000-000000000011', 'd1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 1, 'ADH-3M-901', '3M VHB Adhesive Strip', 2, 2, 'EA', 0.65, 'ROH', '00011'),
  ('c1000000-0000-0000-0000-000000000012', 'd1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 1, 'LBL-QR-050', 'QR Code Label', 1, 1, 'EA', 0.12, 'ROH', '00012');

-- ── Suppliers ────────────────────────────────────────────────
INSERT INTO suppliers (part_number, supplier_name, lead_time_days, unit_cost, currency, supplier_pn, notes) VALUES
  ('LED-MOD-210', 'Lumileds NA', 14, 8.50, 'USD', 'LL-12W-65K', 'MOQ 100'),
  ('HSK-ALU-305', 'CoolTech Thermal', 7, 3.20, 'USD', 'CT-HS-AL305', NULL),
  ('LNS-PC-420', 'OptiClear Inc.', 21, 12.75, 'USD', 'OC-LNS-420', 'Custom mold'),
  ('PCB-DRV-110', 'FlexPCB Asia', 28, 6.40, 'USD', 'FP-DRV-RC', 'Rev C only'),
  ('HSG-ABS-500', 'MoldPro Mexico', 10, 4.15, 'USD', 'MP-HSG-BK', NULL),
  ('REF-CHR-601', 'ChromeWorks DE', 18, 5.80, 'USD', 'CW-REF-601', 'Vacuum metalised'),
  ('WRH-18G-700', 'WireHouse TX', 5, 2.30, 'USD', 'WH-18AWG-4P', NULL),
  ('GSK-SIL-801', 'SealTech JP', 12, 0.95, 'USD', 'ST-SIL-IP67', NULL),
  ('SCR-M3-010', 'FastenerWorld', 3, 0.04, 'USD', 'FW-M3x8-SS', 'Bulk pack 1000'),
  ('CON-TE-220', 'TE Connectivity', 10, 1.10, 'USD', 'TE-4P-220', NULL),
  ('ADH-3M-901', '3M Industrial', 5, 0.65, 'USD', '3M-VHB-4910', NULL),
  ('LBL-QR-050', 'LabelPrint Co', 2, 0.12, 'USD', 'LP-QR-50', NULL);

-- ── Inventory ────────────────────────────────────────────────
INSERT INTO inventory (part_number, project_version_id, on_hand_qty, on_order_qty, bin_location) VALUES
  ('LED-MOD-210', 'b1000000-0000-0000-0000-000000000001', 10, 50, 'A-01-03'),
  ('HSK-ALU-305', 'b1000000-0000-0000-0000-000000000001', 25, 0, 'A-02-01'),
  ('LNS-PC-420', 'b1000000-0000-0000-0000-000000000001', 0, 20, 'B-01-02'),
  ('PCB-DRV-110', 'b1000000-0000-0000-0000-000000000001', 0, 0, NULL),
  ('HSG-ABS-500', 'b1000000-0000-0000-0000-000000000001', 15, 0, 'C-03-01'),
  ('REF-CHR-601', 'b1000000-0000-0000-0000-000000000001', 3, 10, 'B-02-04'),
  ('WRH-18G-700', 'b1000000-0000-0000-0000-000000000001', 50, 0, 'D-01-01'),
  ('GSK-SIL-801', 'b1000000-0000-0000-0000-000000000001', 100, 0, 'D-02-03'),
  ('SCR-M3-010', 'b1000000-0000-0000-0000-000000000001', 500, 0, 'E-01-01'),
  ('CON-TE-220', 'b1000000-0000-0000-0000-000000000001', 8, 0, 'A-04-02'),
  ('ADH-3M-901', 'b1000000-0000-0000-0000-000000000001', 40, 0, 'D-03-01'),
  ('LBL-QR-050', 'b1000000-0000-0000-0000-000000000001', 200, 0, 'E-02-01');

-- ── Tasks (across phases) ────────────────────────────────────
INSERT INTO tasks (id, project_id, version_id, task_name, phase, assigned_to, start_date, due_date, progress, status, priority, notes) VALUES
  ('e1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001',
   'Kitting & Serial Number Gen', 'EVT', 'alex@opsflow.io', '2026-02-10', '2026-02-14', 0.85, 'In Progress', 'High', NULL),
  ('e1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001',
   'Mechanical Assembly', 'EVT', 'jordan@opsflow.io', '2026-02-15', '2026-02-21', 0.20, 'In Progress', 'High', NULL),
  ('e1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001',
   'IPQA Inspection #1', 'EVT', 'sam@opsflow.io', '2026-02-22', '2026-02-24', 0, 'Not Started', 'Medium', NULL),
  ('e1000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001',
   'Optical Assembly', 'EVT', 'jordan@opsflow.io', '2026-02-25', '2026-03-03', 0, 'Not Started', 'High', NULL),
  ('e1000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001',
   'Leak Test & Function Test', 'DVT', 'alex@opsflow.io', '2026-03-04', '2026-03-07', 0, 'Not Started', 'Critical', NULL),
  ('e1000000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001',
   'FQA & Packing', 'DVT', 'sam@opsflow.io', '2026-03-08', '2026-03-12', 0, 'Not Started', 'Medium', NULL),
  ('e1000000-0000-0000-0000-000000000007', 'a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001',
   'Tooling Validation', 'PPVT', 'marc@opsflow.io', '2026-03-15', '2026-03-25', 0, 'Not Started', 'High', NULL);

-- ── Task Steps (for first two tasks) ─────────────────────────
-- Task 1: Kitting & SN Gen (85% done = 17 of 20 steps)
INSERT INTO task_steps (task_id, step_name, weight, complete, sort_order) VALUES
  ('e1000000-0000-0000-0000-000000000001', 'Kitting', 0.05, true, 0),
  ('e1000000-0000-0000-0000-000000000001', 'Serial Number Gen.', 0.05, true, 1),
  ('e1000000-0000-0000-0000-000000000001', 'Pallet Transfer', 0.05, true, 2),
  ('e1000000-0000-0000-0000-000000000001', 'Mech Assembly #1', 0.05, true, 3),
  ('e1000000-0000-0000-0000-000000000001', 'Mech Assembly #2', 0.05, true, 4),
  ('e1000000-0000-0000-0000-000000000001', 'Mech Assembly #3', 0.05, true, 5),
  ('e1000000-0000-0000-0000-000000000001', 'Mech Assembly #4', 0.05, true, 6),
  ('e1000000-0000-0000-0000-000000000001', 'IPQA #1', 0.05, true, 7),
  ('e1000000-0000-0000-0000-000000000001', 'Leak Test', 0.05, true, 8),
  ('e1000000-0000-0000-0000-000000000001', 'Optical Assembly #1', 0.05, true, 9),
  ('e1000000-0000-0000-0000-000000000001', 'Optical Assembly #2', 0.05, true, 10),
  ('e1000000-0000-0000-0000-000000000001', 'Optical Assembly #3', 0.05, true, 11),
  ('e1000000-0000-0000-0000-000000000001', 'Optical Assembly #4', 0.05, true, 12),
  ('e1000000-0000-0000-0000-000000000001', 'IPQA #2', 0.05, true, 13),
  ('e1000000-0000-0000-0000-000000000001', 'Fill Coolant', 0.05, true, 14),
  ('e1000000-0000-0000-0000-000000000001', 'Function Test', 0.05, true, 15),
  ('e1000000-0000-0000-0000-000000000001', 'FQA', 0.05, true, 16),
  ('e1000000-0000-0000-0000-000000000001', 'Packing', 0.05, false, 17),
  ('e1000000-0000-0000-0000-000000000001', 'Ready to Ship', 0.05, false, 18),
  ('e1000000-0000-0000-0000-000000000001', 'Shipped', 0.05, false, 19);

-- Task 2: Mechanical Assembly (20% done = 4 of 20 steps)
INSERT INTO task_steps (task_id, step_name, weight, complete, sort_order) VALUES
  ('e1000000-0000-0000-0000-000000000002', 'Kitting', 0.05, true, 0),
  ('e1000000-0000-0000-0000-000000000002', 'Serial Number Gen.', 0.05, true, 1),
  ('e1000000-0000-0000-0000-000000000002', 'Pallet Transfer', 0.05, true, 2),
  ('e1000000-0000-0000-0000-000000000002', 'Mech Assembly #1', 0.05, true, 3),
  ('e1000000-0000-0000-0000-000000000002', 'Mech Assembly #2', 0.05, false, 4),
  ('e1000000-0000-0000-0000-000000000002', 'Mech Assembly #3', 0.05, false, 5),
  ('e1000000-0000-0000-0000-000000000002', 'Mech Assembly #4', 0.05, false, 6),
  ('e1000000-0000-0000-0000-000000000002', 'IPQA #1', 0.05, false, 7),
  ('e1000000-0000-0000-0000-000000000002', 'Leak Test', 0.05, false, 8),
  ('e1000000-0000-0000-0000-000000000002', 'Optical Assembly #1', 0.05, false, 9),
  ('e1000000-0000-0000-0000-000000000002', 'Optical Assembly #2', 0.05, false, 10),
  ('e1000000-0000-0000-0000-000000000002', 'Optical Assembly #3', 0.05, false, 11),
  ('e1000000-0000-0000-0000-000000000002', 'Optical Assembly #4', 0.05, false, 12),
  ('e1000000-0000-0000-0000-000000000002', 'IPQA #2', 0.05, false, 13),
  ('e1000000-0000-0000-0000-000000000002', 'Fill Coolant', 0.05, false, 14),
  ('e1000000-0000-0000-0000-000000000002', 'Function Test', 0.05, false, 15),
  ('e1000000-0000-0000-0000-000000000002', 'FQA', 0.05, false, 16),
  ('e1000000-0000-0000-0000-000000000002', 'Packing', 0.05, false, 17),
  ('e1000000-0000-0000-0000-000000000002', 'Ready to Ship', 0.05, false, 18),
  ('e1000000-0000-0000-0000-000000000002', 'Shipped', 0.05, false, 19);

-- ── Part Requests ────────────────────────────────────────────
INSERT INTO part_requests (id, project_id, version_id, part_number, requested_qty, requested_by, needed_by_date, urgency, status, approved_by, approval_date, work_order_number) VALUES
  ('f1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001',
   'LNS-PC-420', 10, 'jordan@opsflow.io', '2026-02-20', 'Expedite', 'Approved', 'marc@opsflow.io', '2026-02-15T10:30:00Z', 'WO-20260215-001'),
  ('f1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001',
   'PCB-DRV-110', 5, 'alex@opsflow.io', '2026-02-25', 'Critical', 'Pending', NULL, NULL, NULL),
  ('f1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001',
   'SCR-M3-010', 200, 'sam@opsflow.io', '2026-03-01', 'Standard', 'Pending', NULL, NULL, NULL);

-- ── Picking Orders ───────────────────────────────────────────
INSERT INTO picking_orders (id, project_id, version_id, work_order_number, part_number, pick_qty, bin_location, assigned_picker, status, picked_qty, picked_by) VALUES
  ('g1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001',
   'WO-20260215-001', 'LNS-PC-420', 10, 'B-01-02', 'alex@opsflow.io', 'Pending', 0, NULL),
  ('g1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001',
   'WO-20260215-001', 'LED-MOD-210', 4, 'A-01-03', 'alex@opsflow.io', 'Picked', 4, 'alex@opsflow.io'),
  ('g1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001',
   'WO-20260215-001', 'HSK-ALU-305', 2, 'A-02-01', 'jordan@opsflow.io', 'Verified', 2, 'jordan@opsflow.io'),
  ('g1000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001',
   'WO-20260215-001', 'PCB-DRV-110', 1, NULL, 'alex@opsflow.io', 'Out of Stock', 0, NULL),
  ('g1000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001',
   'WO-20260215-001', 'REF-CHR-601', 1, 'B-02-04', 'sam@opsflow.io', 'In Progress', 0, NULL);

-- ── Issues ───────────────────────────────────────────────────
INSERT INTO issues (id, project_id, version_id, related_module, issue_description, raised_by, assigned_to, priority, status) VALUES
  ('h1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001',
   'Material', 'PCB-DRV-110 driver board not available — supplier FlexPCB delayed shipment by 2 weeks', 'alex@opsflow.io', 'marc@opsflow.io', 'Critical', 'Open'),
  ('h1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001',
   'Task', 'Mechanical assembly fixture misaligned — 0.3 mm offset on left mounting bracket', 'jordan@opsflow.io', 'jordan@opsflow.io', 'High', 'In Progress'),
  ('h1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001',
   'PickingOrder', 'Bin B-01-02 label missing — picker could not locate LNS-PC-420', 'sam@opsflow.io', 'sam@opsflow.io', 'Medium', 'Open'),
  ('h1000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001',
   'Other', 'ESD strap inventory low at station 3 — reorder needed', 'alex@opsflow.io', NULL, 'Low', 'Resolved');

-- Update resolved issue
UPDATE issues SET resolution = 'Ordered 50 ESD straps from SupplyCo — arriving Feb 20', resolved_date = '2026-02-16T14:00:00Z' WHERE id = 'h1000000-0000-0000-0000-000000000004';

-- ── Stock Issues ─────────────────────────────────────────────
INSERT INTO stock_issues (project_id, version_id, work_order_number, part_number, part_description, quantity_short, reported_by, notes) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001',
   'WO-20260215-001', 'PCB-DRV-110', 'Driver PCB Rev C', 1, 'alex@opsflow.io', 'Supplier FlexPCB Asia delayed — ETA Mar 1');
