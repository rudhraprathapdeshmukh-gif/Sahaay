-- 0013 — Standardize to exactly 8 service categories + 30 sub-services
-- Must clear provider_skills before skills due to FK constraint

-- Ensure all 8 categories exist (idempotent)
INSERT INTO public.services (name, slug, description) VALUES
  ('Electrician', 'electrician', 'Fan Repair, Switch & Socket Repair, Light Installation, Wiring Repair'),
  ('Plumber',     'plumber',     'Tap Repair, Pipe Leakage, Drain Blockage, Bathroom Plumbing'),
  ('Carpenter',   'carpenter',   'Door Repair, Furniture Repair, Lock Repair, Shelf Installation'),
  ('Painter',     'painter',     'Wall Painting, Room Painting, Touch-up, Exterior Painting'),
  ('Driver',      'driver',      'Local Driver, Outstation Driver, Full-Day Driver'),
  ('Cleaner',     'cleaner',     'Home Cleaning, Bathroom Cleaning, Kitchen Cleaning, Deep Cleaning'),
  ('Caregiver',   'caregiver',   'Elder Care, Patient Care, Daily Assistance'),
  ('Technician',  'technician',  'AC Repair, Refrigerator Repair, Washing Machine Repair, TV Repair')
ON CONFLICT (name) DO NOTHING;

-- Remove any services that are not part of the 8 approved categories
-- (keep this deletable by id list so stale slugs like 'beautician' etc. are gone)
DELETE FROM public.services
WHERE slug NOT IN ('electrician','plumber','carpenter','painter','driver','cleaner','caregiver','technician');

-- FK-safe skill reset: provider_skills first, then skills
DELETE FROM public.provider_skills;
DELETE FROM public.skills;

WITH s AS (SELECT id, name FROM public.services)
INSERT INTO public.skills (service_id, name) VALUES
((SELECT id FROM s WHERE name = 'Electrician'), 'Fan Repair'),
((SELECT id FROM s WHERE name = 'Electrician'), 'Switch & Socket Repair'),
((SELECT id FROM s WHERE name = 'Electrician'), 'Light Installation'),
((SELECT id FROM s WHERE name = 'Electrician'), 'Wiring Repair'),

((SELECT id FROM s WHERE name = 'Plumber'), 'Tap Repair'),
((SELECT id FROM s WHERE name = 'Plumber'), 'Pipe Leakage'),
((SELECT id FROM s WHERE name = 'Plumber'), 'Drain Blockage'),
((SELECT id FROM s WHERE name = 'Plumber'), 'Bathroom Plumbing'),

((SELECT id FROM s WHERE name = 'Carpenter'), 'Door Repair'),
((SELECT id FROM s WHERE name = 'Carpenter'), 'Furniture Repair'),
((SELECT id FROM s WHERE name = 'Carpenter'), 'Lock Repair'),
((SELECT id FROM s WHERE name = 'Carpenter'), 'Shelf Installation'),

((SELECT id FROM s WHERE name = 'Painter'), 'Wall Painting'),
((SELECT id FROM s WHERE name = 'Painter'), 'Room Painting'),
((SELECT id FROM s WHERE name = 'Painter'), 'Touch-up'),
((SELECT id FROM s WHERE name = 'Painter'), 'Exterior Painting'),

((SELECT id FROM s WHERE name = 'Driver'), 'Local Driver'),
((SELECT id FROM s WHERE name = 'Driver'), 'Outstation Driver'),
((SELECT id FROM s WHERE name = 'Driver'), 'Full-Day Driver'),

((SELECT id FROM s WHERE name = 'Cleaner'), 'Home Cleaning'),
((SELECT id FROM s WHERE name = 'Cleaner'), 'Bathroom Cleaning'),
((SELECT id FROM s WHERE name = 'Cleaner'), 'Kitchen Cleaning'),
((SELECT id FROM s WHERE name = 'Cleaner'), 'Deep Cleaning'),

((SELECT id FROM s WHERE name = 'Caregiver'), 'Elder Care'),
((SELECT id FROM s WHERE name = 'Caregiver'), 'Patient Care'),
((SELECT id FROM s WHERE name = 'Caregiver'), 'Daily Assistance'),

((SELECT id FROM s WHERE name = 'Technician'), 'AC Repair'),
((SELECT id FROM s WHERE name = 'Technician'), 'Refrigerator Repair'),
((SELECT id FROM s WHERE name = 'Technician'), 'Washing Machine Repair'),
((SELECT id FROM s WHERE name = 'Technician'), 'TV Repair');
