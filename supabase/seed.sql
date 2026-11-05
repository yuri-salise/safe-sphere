-- Optional Safe Sphere demonstration seed. Run only on a non-production project.
-- No user accounts are created by this file.

insert into public.incidents(
  code, title, description, incident_type, severity, status, location, location_label,
  estimated_affected, is_public
) values
(
  'INC-DEMO-001',
  'Flood monitoring point',
  'Sample public incident for map and workflow validation.',
  'Flood',
  'HIGH',
  'ACTIVE',
  extensions.st_setsrid(extensions.st_makepoint(125.0499, 7.8582), 4326)::extensions.geography,
  'Central Operations Sector',
  83,
  true
),
(
  'INC-DEMO-002',
  'Medical assistance staging',
  'Sample medical staging record.',
  'Medical',
  'MODERATE',
  'RESPONSE_ONGOING',
  extensions.st_setsrid(extensions.st_makepoint(125.0560, 7.8646), 4326)::extensions.geography,
  'Eastern Ridge Sector',
  21,
  true
)
on conflict (code) do nothing;

insert into public.vehicles(asset_code, plate_number, vehicle_type, capacity_note)
values
  ('SPHERE-DEMO-01', null, 'Pickup', 'Relief cargo / field team'),
  ('SPHERE-DEMO-02', null, 'Van', 'Personnel transport')
on conflict (asset_code) do nothing;

insert into public.vehicle_availability(vehicle_id, is_available, status_note)
select id, true, 'Available for demo operations'
from public.vehicles
where asset_code in ('SPHERE-DEMO-01', 'SPHERE-DEMO-02')
on conflict (vehicle_id) do nothing;
