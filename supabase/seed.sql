-- ============================================================================
-- Seed Data: Ice Pack NPI Project
-- Scenario: Contract manufacturer moving from DVT to PVT phase
-- ============================================================================

-- ── Project ──────────────────────────────────────────────────────────────────

INSERT INTO public.projects (id, project_name, customer, start_date, target_end_date, project_lead, status, notes)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Ice Pack NPI',
  'ArcticFlow Technologies',
  '2025-09-01',
  '2026-06-30',
  'Marc Cadet',
  'Active',
  'Portable therapeutic ice pack with active cooling module. Target CM: Jabil Penang. DVT builds in progress, PVT planned for Q2 2026.'
);

-- ── Project Versions ─────────────────────────────────────────────────────────

INSERT INTO public.project_versions (id, project_id, version_name, created_at) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Proto',   '2025-09-15T08:00:00Z'),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'EVT',     '2025-11-01T08:00:00Z'),
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'DVT',     '2026-01-15T08:00:00Z'),
  ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'PVT',     '2026-03-10T08:00:00Z');

-- ── Upload Batch (for BOM lines) ─────────────────────────────────────────────

INSERT INTO public.upload_batches (id, upload_batch_id) VALUES
  ('c0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001');

-- ── BOM Lines (DVT version, 28 parts) ────────────────────────────────────────

INSERT INTO public.bom_lines (
  upload_batch_id, project_version_id, bom_level, component_number, object_description,
  component_quantity, base_unit_measure, standard_price, material_type, sort_string, required_qty
) VALUES
  -- ICs & Semiconductors
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 1, 'IC-STM32L476-RGT6', 'MCU ARM Cortex-M4 1MB Flash 128KB RAM LQFP-64',                     1, 'EA', 6.82,  'IC',   '0010', 1),
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 1, 'IC-TPS63061-DSCR',  'Buck-Boost Converter 2A Adjustable 2x2 SON-10',                      1, 'EA', 3.45,  'IC',   '0020', 1),
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 1, 'IC-BQ25895-RTWT',   'Battery Charger IC USB-PD 5A I2C WQFN-24',                            1, 'EA', 4.18,  'IC',   '0030', 1),
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 1, 'IC-TMP117-AIDRVR',  'Digital Temperature Sensor ±0.1°C I2C SOT-6',                         2, 'EA', 2.95,  'IC',   '0040', 2),
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 1, 'IC-DRV8837-DSGR',   'H-Bridge Motor Driver 1.8A SOT-8',                                    1, 'EA', 1.62,  'IC',   '0050', 1),
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 1, 'IC-ESP32C3-MINI',   'WiFi+BLE 5.0 Module 4MB Flash PCB Antenna',                            1, 'EA', 2.80,  'IC',   '0060', 1),
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 1, 'MOSFET-AO3400A',    'N-Channel MOSFET 30V 5.7A SOT-23',                                    2, 'EA', 0.28,  'IC',   '0070', 2),

  -- Passives
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 2, 'CAP-0402-100NF',    'MLCC 100nF 16V X7R 0402',                                             24, 'EA', 0.008, 'CAP',  '0100', 24),
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 2, 'CAP-0603-10UF',     'MLCC 10µF 10V X5R 0603',                                              8,  'EA', 0.032, 'CAP',  '0110', 8),
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 2, 'CAP-1210-100UF',    'MLCC 100µF 6.3V X5R 1210',                                            3,  'EA', 0.85,  'CAP',  '0120', 3),
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 2, 'RES-0402-10K',      'Chip Resistor 10kΩ 1% 1/16W 0402',                                    18, 'EA', 0.003, 'RES',  '0130', 18),
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 2, 'RES-0402-4K7',      'Chip Resistor 4.7kΩ 1% 1/16W 0402',                                   6,  'EA', 0.003, 'RES',  '0140', 6),
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 2, 'RES-2512-100MR',    'Current Sense Resistor 0.1Ω 1% 1W 2512',                              2,  'EA', 0.18,  'RES',  '0150', 2),
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 2, 'IND-4020-4R7UH',    'Power Inductor 4.7µH 3A Shielded 4x4x2mm',                            1,  'EA', 0.42,  'IND',  '0160', 1),
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 2, 'LED-0603-GRN',      'LED Green 0603 2V 20mA 573nm',                                        3,  'EA', 0.045, 'LED',  '0170', 3),
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 2, 'LED-0603-RED',      'LED Red 0603 2V 20mA 630nm',                                          1,  'EA', 0.04,  'LED',  '0180', 1),

  -- Connectors
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 1, 'CON-JST-4P',        'JST PH 2.0mm 4-Pin Header SMD RA',                                    2, 'EA', 0.35,  'CON',  '0200', 2),
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 1, 'CON-USBC-16P',      'USB Type-C Receptacle 16-Pin Mid-Mount SMD',                           1, 'EA', 0.92,  'CON',  '0210', 1),
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 1, 'CON-FPC-10P',       'FPC Connector 10-Pin 0.5mm Bottom Contact ZIF',                        1, 'EA', 0.48,  'CON',  '0220', 1),
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 1, 'CON-BATT-2P',       'Battery Connector 2-Pin JST SH 1.0mm',                                 1, 'EA', 0.22,  'CON',  '0230', 1),

  -- Mechanical & Electromechanical
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 1, 'MECH-TEC-12710',    'Peltier Module TEC1-12710 40x40mm 10A',                                1, 'EA', 8.50,  'MECH', '0300', 1),
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 1, 'MECH-FAN-4010',     'DC Blower Fan 40x40x10mm 5V 0.15A',                                   1, 'EA', 3.20,  'MECH', '0310', 1),
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 1, 'MECH-HSINK-AL40',   'Aluminum Heatsink 40x40x11mm Anodized',                                1, 'EA', 1.85,  'MECH', '0320', 1),
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 1, 'MECH-PUMP-DC6V',    'Micro Water Pump DC 6V 0.8A 1.2L/min',                                 1, 'EA', 5.40,  'MECH', '0330', 1),
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 1, 'MECH-TUBE-SIL4',    'Silicone Tubing 4mm ID 6mm OD Medical Grade (1m)',                      2, 'EA', 1.10,  'MECH', '0340', 2),

  -- Battery & PCB
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 1, 'BATT-LI3S-2500',    'Li-Ion Battery Pack 3S1P 11.1V 2500mAh w/ BMS',                        1, 'EA', 14.50, 'BATT', '0400', 1),
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 0, 'PCB-ICEPACK-V3',    'Main PCBA 4-Layer FR4 1.6mm ENIG 85x52mm',                             1, 'EA', 4.20,  'PCB',  '0500', 1),
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 1, 'ASSY-SHELL-TOP',    'Top Shell Injection Mold ABS+PC White',                                 1, 'EA', 2.60,  'ASSY', '0600', 1);

-- ── Suppliers (8) ────────────────────────────────────────────────────────────

INSERT INTO public.suppliers (part_number, supplier_name, lead_time_days, unit_cost, currency, supplier_pn, notes) VALUES
  ('IC-STM32L476-RGT6',  'Arrow Electronics',       14, 6.82,  'USD', 'STM32L476RGT6',    'Primary distributor, MOQ 100'),
  ('IC-STM32L476-RGT6',  'Mouser Electronics',      7,  7.15,  'USD', '511-STM32L476RGT6', 'Backup, faster lead time'),
  ('IC-BQ25895-RTWT',    'Digi-Key Electronics',    10, 4.18,  'USD', '296-BQ25895RTWT',   'Stock verified Mar 2026'),
  ('IC-TPS63061-DSCR',   'TTI Inc',                 12, 3.45,  'USD', 'TPS63061DSCR',      'Pricing locked through Q2'),
  ('IC-ESP32C3-MINI',    'LCSC Electronics',        21, 2.80,  'USD', 'C2838502',          'CN warehouse, bulk pricing'),
  ('MECH-TEC-12710',     'CUI Devices',             28, 8.50,  'USD', 'CP60140',           'Custom thermal interface, NRE waived'),
  ('BATT-LI3S-2500',     'Great Power Energy',       35, 14.50, 'USD', 'GPE-3S1P-2500',    'UL2054 certified, 500pc MOQ'),
  ('CON-USBC-16P',       'Amphenol ICC',            18, 0.92,  'USD', '12401610E4#2A',     'USB-IF certified'),
  ('MECH-PUMP-DC6V',     'Shenzhen Zhongke Tech',   30, 5.40,  'USD', 'ZKT-DC60-12L',     'Custom impeller, DVT sample approved'),
  ('PCB-ICEPACK-V3',     'JLCPCB',                  10, 4.20,  'USD', 'JLC-IP3-4L',       'Batch 50pcs min, ENIG finish');

-- ── Tasks (15 across phases, linked to DVT version) ─────────────────────────

INSERT INTO public.tasks (
  id, project_id, version_id, task_name, phase, assigned_to,
  start_date, due_date, progress, status, priority, notes
) VALUES
  -- Proto phase (completed)
  ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
   'Proof of concept breadboard build', 'Proto', 'Kevin Liu', '2025-09-05', '2025-09-20', 100, 'Complete', 'High', 'Cooling loop validated at 3°C delta'),

  ('d0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
   'Thermal simulation & Peltier sizing', 'Proto', 'Sarah Chen', '2025-09-10', '2025-09-30', 100, 'Complete', 'High', 'TEC1-12710 selected, 40x40mm form factor confirmed'),

  -- EVT phase (completed)
  ('d0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002',
   'Schematic review & DFM check', 'EVT', 'Kevin Liu', '2025-11-05', '2025-11-18', 100, 'Complete', 'High', 'No DFM issues flagged by Jabil'),

  ('d0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002',
   'EVT PCBA build & bring-up', 'EVT', 'Marc Cadet', '2025-11-20', '2025-12-10', 100, 'Complete', 'Critical', '10 units built, 9/10 passed bring-up'),

  ('d0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002',
   'Safety & regulatory pre-scan', 'EVT', 'Priya Patel', '2025-12-01', '2025-12-20', 100, 'Complete', 'Medium', 'IEC 60601-1 gap analysis complete'),

  -- DVT phase (in progress)
  ('d0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003',
   'DVT build readiness review', 'DVT', 'Marc Cadet', '2026-01-20', '2026-02-01', 100, 'Complete', 'Critical', 'BOM frozen, all long-lead parts on order'),

  ('d0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003',
   'DVT PCBA build (50 units)', 'DVT', 'Kevin Liu', '2026-02-03', '2026-03-01', 75, 'In Progress', 'Critical', '38/50 boards assembled, waiting on TEC shortage resolution'),

  ('d0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003',
   'Thermal validation testing', 'DVT', 'Sarah Chen', '2026-02-15', '2026-03-15', 40, 'In Progress', 'High', '8-hour soak test in progress, ambient 25°C and 35°C'),

  ('d0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003',
   'Battery cycle life testing', 'DVT', 'Priya Patel', '2026-02-20', '2026-04-01', 20, 'In Progress', 'High', 'Target: 500 cycles at 80% capacity retention'),

  ('d0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003',
   'Drop test & mechanical stress', 'DVT', 'James Park', '2026-03-01', '2026-03-20', 0, 'Not Started', 'High', 'IEC 60068-2-31 freefall, 6 faces x 3 drops'),

  ('d0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003',
   'EMC pre-compliance scan', 'DVT', 'Kevin Liu', '2026-03-10', '2026-03-25', 0, 'Not Started', 'Medium', 'FCC Part 15B + CISPR 11, near-field probe scan'),

  ('d0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003',
   'Firmware OTA update validation', 'DVT', 'Ana Reyes', '2026-03-05', '2026-03-18', 60, 'In Progress', 'Medium', 'BLE DFU working, WiFi OTA in test'),

  -- PVT phase (planned)
  ('d0000000-0000-0000-0000-000000000013', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000004',
   'BOM lockdown for PVT', 'PVT', 'Marc Cadet', '2026-04-01', '2026-04-10', 0, 'Not Started', 'Critical', 'All alternates validated, AVL finalized'),

  ('d0000000-0000-0000-0000-000000000014', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000004',
   'PVT pilot run (200 units)', 'PVT', 'Kevin Liu', '2026-04-15', '2026-05-15', 0, 'Not Started', 'Critical', 'Jabil line qualification required before start'),

  ('d0000000-0000-0000-0000-000000000015', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000004',
   'Final regulatory submission (FCC/CE)', 'PVT', 'Priya Patel', '2026-05-01', '2026-06-15', 0, 'Not Started', 'High', 'Test lab: TÜV Rheinland, pre-booked slot');

-- ── Task Steps (for key DVT tasks) ──────────────────────────────────────────

INSERT INTO public.task_steps (task_id, step_name, weight, complete, sort_order, status, assigned_to, start_date, due_date) VALUES
  -- DVT PCBA build steps
  ('d0000000-0000-0000-0000-000000000007', 'Stencil & solder paste inspection',     0.10, true,  1, 'Complete',    'Kevin Liu',  '2026-02-03', '2026-02-04'),
  ('d0000000-0000-0000-0000-000000000007', 'SMT placement run 1 (top side)',        0.20, true,  2, 'Complete',    'Kevin Liu',  '2026-02-05', '2026-02-08'),
  ('d0000000-0000-0000-0000-000000000007', 'SMT placement run 2 (bottom side)',     0.20, true,  3, 'Complete',    'Kevin Liu',  '2026-02-09', '2026-02-12'),
  ('d0000000-0000-0000-0000-000000000007', 'Reflow & AOI inspection',               0.15, true,  4, 'Complete',    'Kevin Liu',  '2026-02-13', '2026-02-15'),
  ('d0000000-0000-0000-0000-000000000007', 'Through-hole & manual assembly',        0.10, false, 5, 'In Progress', 'James Park', '2026-02-16', '2026-02-20'),
  ('d0000000-0000-0000-0000-000000000007', 'ICT & functional test',                 0.15, false, 6, 'Not Started', 'Kevin Liu',  '2026-02-21', '2026-02-25'),
  ('d0000000-0000-0000-0000-000000000007', 'Conformal coat & final QC',             0.10, false, 7, 'Not Started', 'James Park', '2026-02-26', '2026-03-01'),

  -- Thermal validation steps
  ('d0000000-0000-0000-0000-000000000008', 'Thermocouple placement & calibration',  0.15, true,  1, 'Complete',    'Sarah Chen', '2026-02-15', '2026-02-17'),
  ('d0000000-0000-0000-0000-000000000008', 'Cold-side temperature mapping',         0.25, true,  2, 'Complete',    'Sarah Chen', '2026-02-18', '2026-02-25'),
  ('d0000000-0000-0000-0000-000000000008', '8-hour continuous run soak test',       0.30, false, 3, 'In Progress', 'Sarah Chen', '2026-02-26', '2026-03-08'),
  ('d0000000-0000-0000-0000-000000000008', 'Hot-side heatsink thermal resistance',  0.15, false, 4, 'Not Started', 'Sarah Chen', '2026-03-09', '2026-03-12'),
  ('d0000000-0000-0000-0000-000000000008', 'Thermal runaway protection test',       0.15, false, 5, 'Not Started', 'Sarah Chen', '2026-03-13', '2026-03-15');

-- ── Inventory (40 rows, DVT version, mixed stock levels) ─────────────────────

INSERT INTO public.inventory (part_number, project_version_id, on_hand_qty, on_order_qty, bin_location, last_counted_at, updated_by) VALUES
  -- ICs
  ('IC-STM32L476-RGT6',  'b0000000-0000-0000-0000-000000000003', 55,  0,   'A1-01', '2026-03-15T09:00:00Z', 'Kevin Liu'),
  ('IC-TPS63061-DSCR',   'b0000000-0000-0000-0000-000000000003', 48,  0,   'A1-02', '2026-03-15T09:00:00Z', 'Kevin Liu'),
  ('IC-BQ25895-RTWT',    'b0000000-0000-0000-0000-000000000003', 52,  0,   'A1-03', '2026-03-15T09:00:00Z', 'Kevin Liu'),
  ('IC-TMP117-AIDRVR',   'b0000000-0000-0000-0000-000000000003', 95,  0,   'A1-04', '2026-03-15T09:00:00Z', 'Kevin Liu'),
  ('IC-DRV8837-DSGR',    'b0000000-0000-0000-0000-000000000003', 50,  0,   'A1-05', '2026-03-15T09:00:00Z', 'Kevin Liu'),
  ('IC-ESP32C3-MINI',    'b0000000-0000-0000-0000-000000000003', 42,  0,   'A1-06', '2026-03-15T09:00:00Z', 'Kevin Liu'),
  ('MOSFET-AO3400A',     'b0000000-0000-0000-0000-000000000003', 120, 0,   'A1-07', '2026-03-15T09:00:00Z', 'Kevin Liu'),

  -- Passives
  ('CAP-0402-100NF',     'b0000000-0000-0000-0000-000000000003', 2400, 0,  'B1-01', '2026-03-14T14:00:00Z', 'James Park'),
  ('CAP-0603-10UF',      'b0000000-0000-0000-0000-000000000003', 800,  0,  'B1-02', '2026-03-14T14:00:00Z', 'James Park'),
  ('CAP-1210-100UF',     'b0000000-0000-0000-0000-000000000003', 180,  0,  'B1-03', '2026-03-14T14:00:00Z', 'James Park'),
  ('RES-0402-10K',       'b0000000-0000-0000-0000-000000000003', 1800, 0,  'B2-01', '2026-03-14T14:00:00Z', 'James Park'),
  ('RES-0402-4K7',       'b0000000-0000-0000-0000-000000000003', 600,  0,  'B2-02', '2026-03-14T14:00:00Z', 'James Park'),
  ('RES-2512-100MR',     'b0000000-0000-0000-0000-000000000003', 110,  0,  'B2-03', '2026-03-14T14:00:00Z', 'James Park'),
  ('IND-4020-4R7UH',     'b0000000-0000-0000-0000-000000000003', 55,   0,  'B3-01', '2026-03-14T14:00:00Z', 'James Park'),
  ('LED-0603-GRN',       'b0000000-0000-0000-0000-000000000003', 300,  0,  'B3-02', '2026-03-14T14:00:00Z', 'James Park'),
  ('LED-0603-RED',       'b0000000-0000-0000-0000-000000000003', 150,  0,  'B3-03', '2026-03-14T14:00:00Z', 'James Park'),

  -- Connectors
  ('CON-JST-4P',         'b0000000-0000-0000-0000-000000000003', 90,   0,  'C1-01', '2026-03-14T14:00:00Z', 'James Park'),
  ('CON-USBC-16P',       'b0000000-0000-0000-0000-000000000003', 45,   0,  'C1-02', '2026-03-14T14:00:00Z', 'James Park'),
  ('CON-FPC-10P',        'b0000000-0000-0000-0000-000000000003', 48,   0,  'C1-03', '2026-03-14T14:00:00Z', 'James Park'),
  ('CON-BATT-2P',        'b0000000-0000-0000-0000-000000000003', 52,   0,  'C1-04', '2026-03-14T14:00:00Z', 'James Park'),

  -- Mechanical - some critical shortages
  ('MECH-TEC-12710',     'b0000000-0000-0000-0000-000000000003', 8,    25,  'D1-01', '2026-03-15T09:00:00Z', 'Marc Cadet'),
  ('MECH-FAN-4010',      'b0000000-0000-0000-0000-000000000003', 50,   0,   'D1-02', '2026-03-15T09:00:00Z', 'Marc Cadet'),
  ('MECH-HSINK-AL40',    'b0000000-0000-0000-0000-000000000003', 48,   0,   'D1-03', '2026-03-15T09:00:00Z', 'Marc Cadet'),
  ('MECH-PUMP-DC6V',     'b0000000-0000-0000-0000-000000000003', 0,    30,  'D1-04', '2026-03-15T09:00:00Z', 'Marc Cadet'),
  ('MECH-TUBE-SIL4',     'b0000000-0000-0000-0000-000000000003', 85,   0,   'D1-05', '2026-03-15T09:00:00Z', 'Marc Cadet'),

  -- Battery & PCB
  ('BATT-LI3S-2500',     'b0000000-0000-0000-0000-000000000003', 3,    50,  'E1-01', '2026-03-15T09:00:00Z', 'Marc Cadet'),
  ('PCB-ICEPACK-V3',     'b0000000-0000-0000-0000-000000000003', 12,   0,   'E2-01', '2026-03-15T09:00:00Z', 'Kevin Liu'),
  ('ASSY-SHELL-TOP',     'b0000000-0000-0000-0000-000000000003', 0,    60,  'F1-01', '2026-03-15T09:00:00Z', 'Marc Cadet'),

  -- Low stock / zero stock alerts
  ('IC-STM32L476-RGT6',  'b0000000-0000-0000-0000-000000000004', 0,    200, 'A1-01', '2026-03-15T09:00:00Z', 'Kevin Liu'),
  ('IC-TPS63061-DSCR',   'b0000000-0000-0000-0000-000000000004', 0,    200, 'A1-02', '2026-03-15T09:00:00Z', 'Kevin Liu'),
  ('IC-BQ25895-RTWT',    'b0000000-0000-0000-0000-000000000004', 0,    200, 'A1-03', '2026-03-15T09:00:00Z', 'Kevin Liu'),
  ('MECH-TEC-12710',     'b0000000-0000-0000-0000-000000000004', 0,    200, 'D1-01', '2026-03-15T09:00:00Z', 'Marc Cadet'),
  ('MECH-PUMP-DC6V',     'b0000000-0000-0000-0000-000000000004', 0,    200, 'D1-04', '2026-03-15T09:00:00Z', 'Marc Cadet'),
  ('BATT-LI3S-2500',     'b0000000-0000-0000-0000-000000000004', 0,    200, 'E1-01', '2026-03-15T09:00:00Z', 'Marc Cadet'),
  ('CON-USBC-16P',       'b0000000-0000-0000-0000-000000000004', 0,    200, 'C1-02', '2026-03-15T09:00:00Z', 'James Park'),
  ('PCB-ICEPACK-V3',     'b0000000-0000-0000-0000-000000000004', 0,    200, 'E2-01', '2026-03-15T09:00:00Z', 'Kevin Liu'),
  ('ASSY-SHELL-TOP',     'b0000000-0000-0000-0000-000000000004', 0,    200, 'F1-01', '2026-03-15T09:00:00Z', 'Marc Cadet'),
  ('IC-ESP32C3-MINI',    'b0000000-0000-0000-0000-000000000004', 0,    200, 'A1-06', '2026-03-15T09:00:00Z', 'Kevin Liu');

-- ── Issues (6 open: 2 critical, 3 high, 1 moderate) ─────────────────────────

INSERT INTO public.issues (
  project_id, version_id, related_module, issue_description,
  raised_by, raised_date, assigned_to, priority, status, root_cause, resolution
) VALUES
  -- Critical issues
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 'Inventory',
   'Peltier module TEC1-12710 shortage — only 8 on hand, need 50 for DVT build. Supplier CUI Devices quotes 28-day lead time, will miss DVT build schedule.',
   'Marc Cadet', '2026-03-10T11:30:00Z', 'Marc Cadet', 'Critical', 'Open',
   'Single-source component, no AVL alternate qualified', NULL),

  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 'Task',
   'Micro water pump DC6V zero stock — DVT build blocked for final assembly of cooling loop. Shenzhen supplier confirms customs delay at HK border.',
   'Kevin Liu', '2026-03-12T09:15:00Z', 'Marc Cadet', 'Critical', 'Open',
   'Customs clearance delay, vendor using new freight forwarder', NULL),

  -- High priority issues
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 'Task',
   'Battery pack BMS intermittent shutdown during high-current draw (>8A). Observed in 2 of 10 EVT units during 35°C ambient thermal test.',
   'Sarah Chen', '2026-03-08T16:45:00Z', 'Priya Patel', 'High', 'Open',
   'Suspected BMS overcurrent threshold set too low at factory', NULL),

  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 'BOM',
   'USB-C connector footprint mismatch — Amphenol 12401610E4#2A land pattern 0.15mm narrower than Altium library. Confirmed by X-ray after EVT reflow. Needs ECO for DVT Rev B.',
   'Kevin Liu', '2026-03-05T14:20:00Z', 'Kevin Liu', 'High', 'In Progress',
   'Library footprint based on older datasheet rev', 'ECO-2026-031 filed, updated footprint in Altium, gerber re-gen in progress'),

  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 'Task',
   'FCC pre-scan radiated emission fail at 480 MHz harmonic — USB 2.0 clock leaking through unshielded FPC cable to temp sensor. Need ferrite bead or shielded FPC for DVT.',
   'Kevin Liu', '2026-03-14T10:00:00Z', 'Kevin Liu', 'High', 'Open',
   NULL, NULL),

  -- Moderate issue
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 'BOM',
   'Top shell injection mold T1 sample shows sink marks near screw boss — cosmetic only, does not affect fit. Toolmaker adjusting gate location for T2.',
   'James Park', '2026-03-11T08:30:00Z', 'James Park', 'Medium', 'In Progress',
   'Gate location too far from thick wall section', 'Toolmaker relocating gate, T2 sample expected 2026-03-25');

-- ── Work Orders (5 in various states) ────────────────────────────────────────

INSERT INTO public.work_orders (
  id, project_id, version_id, work_order_number, mode, status, notes
) VALUES
  ('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003',
   'WO-DVT-001', 'custom', 'Complete', 'DVT build batch 1 — 20 units SMT only'),

  ('e0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003',
   'WO-DVT-002', 'custom', 'Complete', 'DVT build batch 2 — 18 units SMT + through-hole'),

  ('e0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003',
   'WO-DVT-003', 'custom', 'In Progress', 'DVT build batch 3 — 12 units, blocked on TEC & pump shortage'),

  ('e0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003',
   'WO-DVT-REWORK', 'custom', 'Open', 'Rework WO for USB-C footprint fix on batch 1 boards'),

  ('e0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000004',
   'WO-PVT-001', 'custom', 'Open', 'PVT pilot run — 200 units, pending BOM lockdown');

-- ── Work Order Lines ─────────────────────────────────────────────────────────

INSERT INTO public.work_order_lines (work_order_id, part_number, description, required_qty, unit_of_measure) VALUES
  -- WO-DVT-003 (in progress, 12 units)
  ('e0000000-0000-0000-0000-000000000003', 'PCB-ICEPACK-V3',    'Main PCBA 4-Layer',                12, 'EA'),
  ('e0000000-0000-0000-0000-000000000003', 'IC-STM32L476-RGT6', 'MCU ARM Cortex-M4',                12, 'EA'),
  ('e0000000-0000-0000-0000-000000000003', 'IC-BQ25895-RTWT',   'Battery Charger IC',               12, 'EA'),
  ('e0000000-0000-0000-0000-000000000003', 'MECH-TEC-12710',    'Peltier Module 40x40mm',           12, 'EA'),
  ('e0000000-0000-0000-0000-000000000003', 'MECH-PUMP-DC6V',    'Micro Water Pump DC 6V',           12, 'EA'),
  ('e0000000-0000-0000-0000-000000000003', 'BATT-LI3S-2500',    'Li-Ion Battery Pack 3S1P 11.1V',   12, 'EA'),
  ('e0000000-0000-0000-0000-000000000003', 'ASSY-SHELL-TOP',    'Top Shell ABS+PC',                 12, 'EA'),

  -- WO-DVT-REWORK (USB-C rework)
  ('e0000000-0000-0000-0000-000000000004', 'CON-USBC-16P',      'USB Type-C Receptacle (corrected)', 20, 'EA'),

  -- WO-PVT-001 (200 unit pilot, all key parts)
  ('e0000000-0000-0000-0000-000000000005', 'PCB-ICEPACK-V3',    'Main PCBA 4-Layer',                200, 'EA'),
  ('e0000000-0000-0000-0000-000000000005', 'IC-STM32L476-RGT6', 'MCU ARM Cortex-M4',                200, 'EA'),
  ('e0000000-0000-0000-0000-000000000005', 'IC-BQ25895-RTWT',   'Battery Charger IC',               200, 'EA'),
  ('e0000000-0000-0000-0000-000000000005', 'IC-ESP32C3-MINI',   'WiFi+BLE Module',                  200, 'EA'),
  ('e0000000-0000-0000-0000-000000000005', 'MECH-TEC-12710',    'Peltier Module 40x40mm',           200, 'EA'),
  ('e0000000-0000-0000-0000-000000000005', 'MECH-PUMP-DC6V',    'Micro Water Pump DC 6V',           200, 'EA'),
  ('e0000000-0000-0000-0000-000000000005', 'BATT-LI3S-2500',    'Li-Ion Battery Pack 3S1P 11.1V',   200, 'EA'),
  ('e0000000-0000-0000-0000-000000000005', 'ASSY-SHELL-TOP',    'Top Shell ABS+PC',                 200, 'EA'),
  ('e0000000-0000-0000-0000-000000000005', 'CON-USBC-16P',      'USB Type-C Receptacle',            200, 'EA');

-- ── Picking Orders (for WO-DVT-003, mixed statuses) ──────────────────────────

INSERT INTO public.picking_orders (
  project_id, version_id, work_order_number, part_number, pick_qty,
  bin_location, assigned_picker, status, picked_qty, picked_date_time, issue_note
) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 'WO-DVT-003', 'PCB-ICEPACK-V3',    12, 'E2-01', 'James Park', 'Verified', 12,  '2026-03-16T10:30:00Z', NULL),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 'WO-DVT-003', 'IC-STM32L476-RGT6', 12, 'A1-01', 'James Park', 'Verified', 12,  '2026-03-16T10:45:00Z', NULL),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 'WO-DVT-003', 'IC-BQ25895-RTWT',   12, 'A1-03', 'James Park', 'Picked',   12,  '2026-03-16T11:00:00Z', NULL),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 'WO-DVT-003', 'MECH-TEC-12710',    12, 'D1-01', 'James Park', 'Picked',   8,   '2026-03-16T11:15:00Z', 'Short 4 — only 8 remaining on shelf, 25 on order from CUI Devices'),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 'WO-DVT-003', 'MECH-PUMP-DC6V',    12, 'D1-04', 'James Park', 'Issue',    0,   NULL, 'Zero stock — customs delay, ETA unknown'),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 'WO-DVT-003', 'BATT-LI3S-2500',    12, 'E1-01', 'James Park', 'Pending',  NULL, NULL, NULL),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 'WO-DVT-003', 'ASSY-SHELL-TOP',    12, 'F1-01', 'James Park', 'Pending',  NULL, NULL, NULL);

-- ── Part Requests (8: 2 pending, 2 approved, 2 ordered, 2 received) ─────────
-- 3 of these are for zero-inventory parts (MECH-PUMP-DC6V, ASSY-SHELL-TOP, IC-STM32L476-RGT6 PVT)

INSERT INTO public.part_requests (
  project_id, version_id, part_number, requested_qty, requested_by,
  request_date, needed_by_date, urgency, status, approved_by, approval_date
) VALUES
  -- RECEIVED: arrived, replenished stock
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003',
   'MECH-TEC-12710', 25, 'Kevin Liu',
   '2026-03-01T09:00:00Z', '2026-03-12', 'Critical', 'Received',
   'Marc Cadet', '2026-03-01T11:00:00Z'),

  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003',
   'IC-BQ25895-RTWT', 50, 'Kevin Liu',
   '2026-02-20T14:30:00Z', '2026-03-05', 'Expedite', 'Received',
   'Marc Cadet', '2026-02-21T08:00:00Z'),

  -- ORDERED: PO issued, in transit — both overdue
  -- ** Zero inventory: MECH-PUMP-DC6V (0 on hand) — overdue by 9 days **
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003',
   'MECH-PUMP-DC6V', 30, 'Kevin Liu',
   '2026-02-25T10:00:00Z', '2026-03-10', 'Critical', 'Ordered',
   'Marc Cadet', '2026-02-25T14:00:00Z'),

  -- ** Zero inventory: ASSY-SHELL-TOP (0 on hand) — overdue by 5 days **
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003',
   'ASSY-SHELL-TOP', 60, 'James Park',
   '2026-02-28T08:30:00Z', '2026-03-14', 'Expedite', 'Ordered',
   'Marc Cadet', '2026-03-01T09:00:00Z'),

  -- APPROVED: awaiting PO creation — one arriving soon, one overdue
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003',
   'BATT-LI3S-2500', 50, 'Marc Cadet',
   '2026-03-10T14:00:00Z', '2026-03-22', 'Expedite', 'Approved',
   'Marc Cadet', '2026-03-10T16:00:00Z'),

  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003',
   'CON-USBC-16P', 20, 'Kevin Liu',
   '2026-03-06T11:00:00Z', '2026-03-20', 'Standard', 'Approved',
   'Marc Cadet', '2026-03-07T09:30:00Z'),

  -- PENDING: awaiting approval
  -- ** Zero inventory: IC-STM32L476-RGT6 PVT (0 on hand) — needed for PVT pilot run **
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000004',
   'IC-STM32L476-RGT6', 200, 'Marc Cadet',
   '2026-03-17T10:00:00Z', '2026-04-10', 'Standard', 'Pending',
   NULL, NULL),

  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003',
   'IC-ESP32C3-MINI', 15, 'Sarah Chen',
   '2026-03-18T16:00:00Z', '2026-03-28', 'Expedite', 'Pending',
   NULL, NULL);

-- ── Gate Reviews (4 phases) ─────────────────────────────────────────────────

INSERT INTO public.gate_reviews (
  id, project_version_id, gate_name, status,
  target_date, actual_date, readiness_score, notes
) VALUES
  ('f0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001',
   'Proto', 'completed', '2025-10-15', '2025-10-12', 100,
   'Proof-of-concept validated. Cooling delta confirmed at 3°C. Go decision for EVT.'),

  ('f0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002',
   'EVT', 'completed', '2025-12-20', '2025-12-22', 100,
   'All 10 EVT units functional. 9/10 passed bring-up. IEC 60601-1 gap analysis done. Proceed to DVT.'),

  ('f0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000003',
   'DVT', 'in_progress', '2026-03-28', NULL, 72,
   'DVT build 75% complete. Blocked on pump shortage and TEC supply. Thermal and battery testing in progress. FCC pre-scan failed at 480 MHz — needs ferrite bead fix.'),

  ('f0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000004',
   'PVT', 'planned', '2026-05-30', NULL, NULL,
   'Pending DVT gate exit. Jabil line qualification not yet started.');

-- ── Gate Criteria (DVT gate — 8 criteria, 5 met / 3 open = 62.5% → 72 score) ─

INSERT INTO public.gate_criteria (
  gate_review_id, category, criterion, is_met, owner
) VALUES
  -- Met criteria (5)
  ('f0000000-0000-0000-0000-000000000003', 'Design',
   'Schematic review & DFM sign-off complete', true, 'Kevin Liu'),

  ('f0000000-0000-0000-0000-000000000003', 'Design',
   'BOM frozen with all alternates validated', true, 'Marc Cadet'),

  ('f0000000-0000-0000-0000-000000000003', 'Build',
   'DVT PCBA build ≥70% complete (38/50 boards)', true, 'Kevin Liu'),

  ('f0000000-0000-0000-0000-000000000003', 'Quality',
   'ICT fixtures designed and first-article pass', true, 'James Park'),

  ('f0000000-0000-0000-0000-000000000003', 'Regulatory',
   'IEC 60601-1 gap analysis complete with no blockers', true, 'Priya Patel'),

  -- Open criteria (3)
  ('f0000000-0000-0000-0000-000000000003', 'Test',
   'Thermal validation 8-hour soak test pass at 25°C and 35°C', false, 'Sarah Chen'),

  ('f0000000-0000-0000-0000-000000000003', 'Regulatory',
   'FCC Part 15B pre-compliance scan pass (480 MHz harmonic resolved)', false, 'Kevin Liu'),

  ('f0000000-0000-0000-0000-000000000003', 'Supply Chain',
   'All critical parts on hand or received with ≤5 day lead time', false, 'Marc Cadet');

-- ── ECN Notices (6 change notices across DVT/EVT) ──────────────────────────

INSERT INTO public.ecn_notices (
  id, ecn_number, title, description, status, priority,
  project_version_id, submitted_by, approved_by,
  submitted_at, approved_at, implementation_date,
  affected_bom_lines, reason, impact_summary
) VALUES
  -- 1. Approved & Implemented — thermal pad thickness change
  ('e0000000-0000-0000-0000-000000000001',
   'ECN-2025-041',
   'Increase thermal pad thickness from 1.0mm to 1.5mm',
   'Field data from EVT units shows TEC junction temperature exceeding 85°C at sustained 35°C ambient. Increasing thermal pad thickness improves contact pressure and reduces thermal resistance by ~12%.',
   'implemented', 'high',
   'b0000000-0000-0000-0000-000000000003',
   'Sarah Chen', 'Marc Cadet',
   '2026-02-10T09:30:00Z', '2026-02-12T14:00:00Z', '2026-02-18',
   '{MECH-TEC-12710,MECH-HSINK-AL40}',
   'Thermal runaway risk under sustained cooling load',
   'Updated heatsink assembly drawing rev C. BOM cost impact +$0.04/unit. No tooling change required — pad is die-cut from sheet stock.'),

  -- 2. Approved & Implemented — capacitor substitution due to shortage
  ('e0000000-0000-0000-0000-000000000002',
   'ECN-2025-043',
   'Substitute 100µF capacitor: TDK C3225 → Murata GRM32 (1210)',
   'TDK C3225X5R1C107M250AC on 26-week allocation from Q1 shortage. Murata GRM32ER61C107ME20L is pin- and spec-compatible alternate with 8-week lead time.',
   'implemented', 'critical',
   'b0000000-0000-0000-0000-000000000003',
   'Kevin Liu', 'Marc Cadet',
   '2026-01-28T11:15:00Z', '2026-01-29T10:00:00Z', '2026-02-05',
   '{CAP-1210-100UF}',
   'Primary 100µF capacitor on 26-week allocation — blocks DVT build',
   'Alternate validated in EVT. No requalification needed. Lead time reduced from 26 weeks to 8 weeks. Unit cost +$0.02.'),

  -- 3. Under Review — connector pinout correction
  ('e0000000-0000-0000-0000-000000000003',
   'ECN-2025-047',
   'Correct FPC connector pinout: swap SDA/SCL on pins 3-4',
   'I2C bus to temperature sensor array has SDA and SCL swapped on the FPC connector footprint. Currently corrected with blue wire on DVT boards. Must be fixed in PCB layout before PVT.',
   'under_review', 'high',
   'b0000000-0000-0000-0000-000000000003',
   'Kevin Liu', NULL,
   '2026-03-12T16:45:00Z', NULL, NULL,
   '{CON-FPC-10P,IC-TMP117-AIDRVR}',
   'PCB layout error discovered during DVT bring-up — I2C bus non-functional without blue wire rework',
   'Requires PCB respin (rev D). Estimated 3-week impact on PVT schedule if approved after Mar 20. No BOM cost change.'),

  -- 4. Under Review — battery connector upgrade
  ('e0000000-0000-0000-0000-000000000004',
   'ECN-2025-048',
   'Upgrade battery connector from JST PH 2-pin to XT30 for 5A charge path',
   'BQ25895 charger IC supports up to 5A charge current but JST PH connector is rated only 2A. Drop-in tests show connector temperature rise of 18°C at 3.5A. XT30 rated for 30A continuous.',
   'under_review', 'normal',
   'b0000000-0000-0000-0000-000000000003',
   'James Park', NULL,
   '2026-03-15T10:20:00Z', NULL, NULL,
   '{CON-BATT-2P,IC-BQ25895-RTWT}',
   'Battery connector thermal safety margin insufficient for fast-charge mode',
   'Requires PCB footprint change and shell cutout modification. BOM cost +$0.35/unit. Mechanical shell tooling update needed — 2 week lead.'),

  -- 5. Critical Pending — MOSFET derating failure
  ('e0000000-0000-0000-0000-000000000005',
   'ECN-2026-002',
   'Replace AO3400A MOSFET with higher-rated FDMC86248 for TEC H-bridge',
   'DVT thermal testing revealed AO3400A operating at 92% of rated current in sustained cooling mode. Derating analysis requires ≤80% for IEC 60601-1 compliance. FDMC86248 provides 2x current margin.',
   'draft', 'critical',
   'b0000000-0000-0000-0000-000000000003',
   'Sarah Chen', NULL,
   '2026-03-18T08:00:00Z', NULL, NULL,
   '{MOSFET-AO3400A,IC-DRV8837-DSGR}',
   'MOSFET derating violation — regulatory non-compliance risk for IEC 60601-1 safety standard',
   'CRITICAL: Blocks DVT gate exit. Requires PCB footprint change (SOT-23 → PQFN 3x3). Gate driver output may need series resistor adjustment. Full thermal revalidation required.'),

  -- 6. Rejected — LED indicator color change
  ('e0000000-0000-0000-0000-000000000006',
   'ECN-2025-044',
   'Change charging indicator from green LED to blue LED',
   'Marketing requested blue LED for charging indicator to differentiate from the "cooling active" green LED. Engineering review found blue LED forward voltage (3.1V) exceeds 3.0V LDO rail.',
   'rejected', 'normal',
   'b0000000-0000-0000-0000-000000000002',
   'Priya Patel', 'Marc Cadet',
   '2026-02-01T13:30:00Z', '2026-02-03T09:00:00Z', NULL,
   '{LED-0603-GRN}',
   'Marketing request for product differentiation — visual UX improvement',
   'Rejected: Blue LED Vf (3.1V) incompatible with 3.0V LDO rail. Would require adding a charge pump or boosted rail — excessive cost and complexity for cosmetic change. Recommend revisiting in next-gen platform with 3.3V rail.');
