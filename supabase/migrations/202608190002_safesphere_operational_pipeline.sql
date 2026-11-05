-- Safe Sphere operational completion
-- Run after 202608190001_safesphere_foundation.sql.
-- Adds full workflow support, public transparency RPCs, notifications,
-- delivery-proof storage, realtime publication, and audit automation.

-- Domain extensions ----------------------------------------------------------

alter table public.donations
  add column if not exists payment_method text,
  add column if not exists payment_reference text,
  add column if not exists payment_verified_at timestamptz,
  add column if not exists payment_verified_by uuid references public.profiles(id);

alter table public.logistics_assignments
  add column if not exists vehicle_id uuid references public.vehicles(id),
  add column if not exists status text not null default 'PENDING';

alter table public.logistics_assignments
  drop constraint if exists logistics_assignments_status_check;
alter table public.logistics_assignments
  add constraint logistics_assignments_status_check
  check (status in ('PENDING', 'ACCEPTED', 'COMPLETED', 'CANCELLED'));

create index if not exists logistics_assignments_assignee_idx
  on public.logistics_assignments(assigned_to, status, created_at desc);
create index if not exists logistics_assignments_donation_idx
  on public.logistics_assignments(donation_id, created_at desc);
create index if not exists logistics_assignments_vehicle_idx
  on public.logistics_assignments(vehicle_id, status, created_at desc)
  where vehicle_id is not null;
create index if not exists deliveries_recipient_idx
  on public.deliveries(recipient_id, status, created_at desc);

create table if not exists public.incident_coordination (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete cascade,
  organization text not null,
  coordination_type text not null default 'NOTIFICATION',
  status text not null default 'CONTACTED' check (status in ('CONTACTED', 'ACKNOWLEDGED', 'DISPATCHED', 'UNAVAILABLE', 'COMPLETED')),
  note text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists incident_coordination_incident_idx
  on public.incident_coordination(incident_id, created_at desc);
alter table public.incident_coordination enable row level security;

-- Self-service community role registration ----------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested text;
begin
  insert into public.profiles(id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;

  insert into public.user_roles(user_id, role)
  values (new.id, 'PUBLIC')
  on conflict do nothing;

  requested := upper(coalesce(new.raw_user_meta_data ->> 'requested_role', ''));
  if requested = 'DONOR' then
    insert into public.user_roles(user_id, role) values (new.id, 'DONOR') on conflict do nothing;
  elsif requested = 'RECIPIENT' then
    insert into public.user_roles(user_id, role) values (new.id, 'RECIPIENT') on conflict do nothing;
  elsif requested = 'VOLUNTEER' then
    insert into public.user_roles(user_id, role) values (new.id, 'VOLUNTEER') on conflict do nothing;
  end if;

  return new;
end;
$$;

-- Backfill safe community roles for accounts created before this migration.
insert into public.user_roles(user_id, role)
select
  u.id,
  upper(u.raw_user_meta_data ->> 'requested_role')::public.app_role
from auth.users u
where upper(coalesce(u.raw_user_meta_data ->> 'requested_role', '')) in ('DONOR', 'RECIPIENT', 'VOLUNTEER')
on conflict do nothing;

-- Coordinate-safe incident creation -----------------------------------------

create or replace function public.create_incident(
  p_title text,
  p_description text,
  p_incident_type text,
  p_severity public.incident_severity,
  p_latitude double precision,
  p_longitude double precision,
  p_location_label text,
  p_estimated_affected integer,
  p_is_public boolean
)
returns uuid
language plpgsql
security invoker
set search_path = public, extensions
as $$
declare
  new_id uuid;
begin
  if p_latitude < -90 or p_latitude > 90 then
    raise exception 'Invalid latitude';
  end if;
  if p_longitude < -180 or p_longitude > 180 then
    raise exception 'Invalid longitude';
  end if;

  insert into public.incidents(
    title,
    description,
    incident_type,
    severity,
    location,
    location_label,
    estimated_affected,
    is_public,
    reported_by
  ) values (
    p_title,
    nullif(p_description, ''),
    p_incident_type,
    coalesce(p_severity, 'MODERATE'),
    extensions.st_setsrid(extensions.st_makepoint(p_longitude, p_latitude), 4326)::extensions.geography,
    nullif(p_location_label, ''),
    greatest(coalesce(p_estimated_affected, 0), 0),
    coalesce(p_is_public, true),
    auth.uid()
  ) returning id into new_id;

  return new_id;
end;
$$;

grant execute on function public.create_incident(
  text, text, text, public.incident_severity, double precision, double precision, text, integer, boolean
) to authenticated;

-- Atomic pledge creation keeps the donation header and initial goods item in
-- the same transaction. Funds may carry a provider/reference supplied by the donor;
-- payment verification remains a staff-controlled workflow event.
create or replace function public.create_donation_pledge(
  p_incident_id uuid,
  p_donation_type public.donation_type,
  p_amount numeric,
  p_is_anonymous boolean,
  p_donor_message text,
  p_payment_method text,
  p_payment_reference text,
  p_item_name text,
  p_quantity numeric,
  p_unit text
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  new_id uuid;
begin
  if not public.has_role('DONOR') then
    raise exception 'A Donor role is required to create a donation pledge';
  end if;

  if p_incident_id is null then
    raise exception 'Target incident is required';
  end if;

  if not exists (
    select 1 from public.incidents i
    where i.id = p_incident_id and i.status <> 'CLOSED'
  ) then
    raise exception 'Target incident is unavailable or closed';
  end if;

  if p_donation_type = 'FUNDS' and coalesce(p_amount, 0) <= 0 then
    raise exception 'Funds donation amount must be greater than zero';
  end if;

  if p_donation_type = 'GOODS'
     and (nullif(trim(coalesce(p_item_name, '')), '') is null
          or coalesce(p_quantity, 0) <= 0
          or nullif(trim(coalesce(p_unit, '')), '') is null) then
    raise exception 'Goods donation requires item, quantity, and unit';
  end if;

  insert into public.donations(
    donor_id,
    incident_id,
    donation_type,
    amount,
    is_anonymous,
    donor_message,
    payment_method,
    payment_reference
  ) values (
    auth.uid(),
    p_incident_id,
    p_donation_type,
    case when p_donation_type = 'FUNDS' then p_amount else null end,
    coalesce(p_is_anonymous, false),
    nullif(trim(coalesce(p_donor_message, '')), ''),
    case when p_donation_type = 'FUNDS' then nullif(trim(coalesce(p_payment_method, '')), '') else null end,
    case when p_donation_type = 'FUNDS' then nullif(trim(coalesce(p_payment_reference, '')), '') else null end
  ) returning id into new_id;

  if p_donation_type = 'GOODS' then
    insert into public.donation_items(donation_id, item_name, quantity, unit)
    values (new_id, trim(p_item_name), p_quantity, trim(p_unit));
  end if;

  return new_id;
end;
$$;

grant execute on function public.create_donation_pledge(
  uuid, public.donation_type, numeric, boolean, text, text, text, text, numeric, text
) to authenticated;

-- Donation state machine -----------------------------------------------------

create or replace function public.protect_donation_transition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.current_status is not distinct from old.current_status then
    return new;
  end if;

  if old.current_status = 'PLEDGED' and new.current_status not in ('CONFIRMED', 'CANCELLED') then
    raise exception 'Pledged donations may only be confirmed or cancelled';
  elsif old.current_status = 'CONFIRMED' and new.current_status not in ('ASSIGNED', 'CANCELLED', 'FAILED_PICKUP') then
    raise exception 'Confirmed donations must proceed through assignment, cancellation, or failed pickup';
  elsif old.current_status = 'ASSIGNED' and new.current_status not in ('CONFIRMED', 'PICKED_UP', 'DELIVERY_FAILED') then
    raise exception 'Assigned donations must proceed through pickup, delivery failure, or return to confirmed';
  elsif old.current_status = 'PICKED_UP' and new.current_status not in ('IN_TRANSIT', 'DELIVERY_FAILED') then
    raise exception 'Picked-up donations may only enter transit or fail delivery';
  elsif old.current_status = 'IN_TRANSIT' and new.current_status not in ('DELIVERED', 'DELIVERY_FAILED') then
    raise exception 'In-transit donations may only be delivered or fail delivery';
  elsif old.current_status = 'DELIVERED' and new.current_status not in ('RECIPIENT_CONFIRMED', 'DELIVERY_FAILED') then
    raise exception 'Delivered donations require recipient confirmation or a delivery failure';
  elsif old.current_status = 'RECIPIENT_CONFIRMED' and new.current_status <> 'COMPLETED' then
    raise exception 'Recipient-confirmed donations may only be completed';
  elsif old.current_status = 'FAILED_PICKUP' and new.current_status not in ('CONFIRMED', 'ASSIGNED', 'CANCELLED') then
    raise exception 'Failed pickups may only be retried, returned to confirmed, or cancelled';
  elsif old.current_status = 'DELIVERY_FAILED' and new.current_status not in ('CONFIRMED', 'ASSIGNED', 'CANCELLED') then
    raise exception 'Failed deliveries may only be retried, returned to confirmed, or cancelled';
  elsif old.current_status in ('COMPLETED', 'CANCELLED') then
    raise exception 'Completed or cancelled donations are terminal records';
  end if;

  return new;
end;
$$;

drop trigger if exists donations_protect_transition on public.donations;
create trigger donations_protect_transition
before update of current_status on public.donations
for each row execute function public.protect_donation_transition();

-- Public transparency view ---------------------------------------------------

create or replace function public.get_public_donation_timeline(p_limit integer default 150)
returns table (
  event_id uuid,
  donation_code text,
  incident_code text,
  incident_title text,
  donor_label text,
  donation_type public.donation_type,
  amount numeric,
  currency char(3),
  event_type public.donation_status,
  public_note text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    e.id as event_id,
    d.code as donation_code,
    i.code as incident_code,
    i.title as incident_title,
    case
      when d.is_anonymous then 'Anonymous donor'
      else coalesce(p.display_name, 'Community donor')
    end as donor_label,
    d.donation_type,
    d.amount,
    d.currency,
    e.event_type,
    e.public_note,
    e.created_at
  from public.donation_events e
  join public.donations d on d.id = e.donation_id
  left join public.incidents i on i.id = d.incident_id and i.is_public = true
  left join public.profiles p on p.id = d.donor_id
  where e.is_public = true
  order by e.created_at desc
  limit least(greatest(coalesce(p_limit, 150), 1), 500);
$$;

grant execute on function public.get_public_donation_timeline(integer) to anon, authenticated;
grant execute on function public.get_public_incidents() to anon, authenticated;

-- Operational event history --------------------------------------------------

create or replace function public.record_incident_state_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.incident_updates(incident_id, message, status, severity, created_by)
    values (new.id, 'Incident report created', new.status, new.severity, auth.uid());
  elsif new.status is distinct from old.status or new.severity is distinct from old.severity then
    insert into public.incident_updates(incident_id, message, status, severity, created_by)
    values (
      new.id,
      'Incident state updated',
      new.status,
      new.severity,
      auth.uid()
    );

    if new.status in ('VERIFIED', 'ACTIVE', 'RESPONSE_ONGOING')
       and new.status is distinct from old.status then
      insert into public.notifications(user_id, category, title, message, action_url)
      select distinct ur.user_id,
        'INCIDENT',
        'Incident response update',
        new.code || ' is now ' || replace(new.status::text, '_', ' ') || '.',
        '/dashboard/incidents/' || new.id::text
      from public.user_roles ur
      where ur.role in ('VOLUNTEER', 'RESCUE_PERSONNEL', 'LOGISTICS', 'COORDINATOR', 'DRRMO_STAFF')
        and ur.user_id <> coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists incidents_record_state_event on public.incidents;
create trigger incidents_record_state_event
after insert or update of status, severity on public.incidents
for each row execute function public.record_incident_state_event();

-- Assignment and delivery automation ----------------------------------------

-- Reserve personnel/vehicle atomically so two coordinators cannot dispatch the
-- same available resource at the same time.
create or replace function public.reserve_assignment_resources()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  person_available boolean;
  vehicle_available boolean;
  donation_state public.donation_status;
  incident_state public.incident_status;
begin
  if new.donation_id is not null then
    select d.current_status into donation_state
    from public.donations d
    where d.id = new.donation_id
    for update;

    if donation_state is null then
      raise exception 'Selected donation does not exist or is not accessible';
    end if;
    if donation_state not in ('CONFIRMED', 'FAILED_PICKUP', 'DELIVERY_FAILED') then
      raise exception 'Donation must be confirmed and ready for logistics before assignment';
    end if;
    if exists (
      select 1 from public.logistics_assignments a
      where a.donation_id = new.donation_id and a.status in ('PENDING', 'ACCEPTED')
    ) then
      raise exception 'Donation already has an active logistics assignment';
    end if;
  end if;

  if new.incident_id is not null then
    select i.status into incident_state
    from public.incidents i
    where i.id = new.incident_id
    for update;

    if incident_state is null then
      raise exception 'Selected incident does not exist or is not accessible';
    end if;
    if incident_state in ('NEEDS_MET', 'CLOSED') then
      raise exception 'Resolved or closed incidents cannot receive new dispatch assignments';
    end if;
  end if;

  if not exists (
    select 1 from public.user_roles ur
    where ur.user_id = new.assigned_to
      and ur.role in ('VOLUNTEER', 'RESCUE_PERSONNEL', 'LOGISTICS', 'COORDINATOR', 'DRRMO_STAFF', 'ADMIN')
  ) then
    raise exception 'Selected assignee does not have an operational role';
  end if;

  select (pa.is_available and (pa.available_until is null or pa.available_until > now())) into person_available
  from public.personnel_availability pa
  where pa.person_id = new.assigned_to
  for update;

  if coalesce(person_available, false) = false then
    raise exception 'Selected assignee is not currently available';
  end if;

  update public.personnel_availability
  set is_available = false,
      status_note = 'Assigned to an active Safe Sphere task',
      updated_at = now()
  where person_id = new.assigned_to;

  if new.vehicle_id is not null then
    select va.is_available into vehicle_available
    from public.vehicle_availability va
    where va.vehicle_id = new.vehicle_id
    for update;

    if coalesce(vehicle_available, false) = false then
      raise exception 'Selected vehicle is not currently available';
    end if;

    update public.vehicle_availability
    set is_available = false,
        status_note = 'Assigned to an active Safe Sphere task',
        updated_at = now()
    where vehicle_id = new.vehicle_id;
  end if;

  return new;
end;
$$;

drop trigger if exists logistics_assignment_reserve_resources on public.logistics_assignments;
create trigger logistics_assignment_reserve_resources
before insert on public.logistics_assignments
for each row execute function public.reserve_assignment_resources();

create or replace function public.release_assignment_resources()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status in ('COMPLETED', 'CANCELLED')
     and new.status is distinct from old.status then
    if not exists (
      select 1 from public.logistics_assignments a
      where a.assigned_to = new.assigned_to
        and a.id <> new.id
        and a.status in ('PENDING', 'ACCEPTED')
    ) then
      update public.personnel_availability
      set is_available = (available_until is null or available_until > now()),
          status_note = case
            when available_until is null or available_until > now() then 'Available'
            else 'Availability window ended'
          end,
          updated_at = now()
      where person_id = new.assigned_to;
    end if;

    if new.vehicle_id is not null and not exists (
      select 1 from public.logistics_assignments a
      where a.vehicle_id = new.vehicle_id
        and a.id <> new.id
        and a.status in ('PENDING', 'ACCEPTED')
    ) then
      update public.vehicle_availability
      set is_available = true,
          status_note = 'Available',
          updated_at = now()
      where vehicle_id = new.vehicle_id;
    end if;

    if new.status = 'CANCELLED' and new.donation_id is not null then
      update public.donations
      set current_status = 'CONFIRMED'
      where id = new.donation_id and current_status = 'ASSIGNED';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists logistics_assignment_release_resources on public.logistics_assignments;
create trigger logistics_assignment_release_resources
after update of status on public.logistics_assignments
for each row execute function public.release_assignment_resources();

-- Keep resource availability consistent with active assignments even when a user or
-- logistics operator manually edits an availability record.
create or replace function public.guard_personnel_availability()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_available and new.available_until is not null and new.available_until <= now() then
    raise exception 'Available-until must be in the future';
  end if;

  if new.is_available and exists (
    select 1 from public.logistics_assignments a
    where a.assigned_to = new.person_id
      and a.status in ('PENDING', 'ACCEPTED')
  ) then
    raise exception 'Personnel with an active assignment cannot be marked available';
  end if;
  return new;
end;
$$;

drop trigger if exists personnel_availability_guard on public.personnel_availability;
create trigger personnel_availability_guard
before insert or update of is_available on public.personnel_availability
for each row execute function public.guard_personnel_availability();

create or replace function public.guard_vehicle_availability()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_available and exists (
    select 1 from public.logistics_assignments a
    where a.vehicle_id = new.vehicle_id
      and a.status in ('PENDING', 'ACCEPTED')
  ) then
    raise exception 'A vehicle with an active assignment cannot be marked available';
  end if;
  return new;
end;
$$;

drop trigger if exists vehicle_availability_guard on public.vehicle_availability;
create trigger vehicle_availability_guard
before insert or update of is_available on public.vehicle_availability
for each row execute function public.guard_vehicle_availability();

-- Reconcile reservations when upgrading a database that already contains active tasks.
update public.personnel_availability pa
set is_available = false,
    status_note = 'Assigned to an active Safe Sphere task',
    updated_at = now()
where exists (
  select 1 from public.logistics_assignments a
  where a.assigned_to = pa.person_id and a.status in ('PENDING', 'ACCEPTED')
);

update public.vehicle_availability va
set is_available = false,
    status_note = 'Assigned to an active Safe Sphere task',
    updated_at = now()
where exists (
  select 1 from public.logistics_assignments a
  where a.vehicle_id = va.vehicle_id and a.status in ('PENDING', 'ACCEPTED')
);

create or replace function public.notify_relief_team_of_donation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications(user_id, category, title, message, action_url)
  select distinct ur.user_id,
    'DONATION',
    'New donation pledge',
    new.code || ' was pledged and is ready for coordination.',
    '/dashboard/donations/' || new.id::text
  from public.user_roles ur
  where ur.role in ('LOGISTICS', 'VOLUNTEER', 'COORDINATOR', 'DRRMO_STAFF');
  return new;
end;
$$;

drop trigger if exists donation_notify_relief_team on public.donations;
create trigger donation_notify_relief_team
after insert on public.donations
for each row execute function public.notify_relief_team_of_donation();

create or replace function public.handle_assignment_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ref_code text;
begin
  if new.donation_id is not null then
    update public.donations
    set current_status = 'ASSIGNED'
    where id = new.donation_id
      and current_status in ('CONFIRMED', 'FAILED_PICKUP', 'DELIVERY_FAILED');

    select code into ref_code from public.donations where id = new.donation_id;
  elsif new.incident_id is not null then
    select code into ref_code from public.incidents where id = new.incident_id;
  end if;

  insert into public.notifications(user_id, category, title, message, action_url)
  values (
    new.assigned_to,
    'ASSIGNMENT',
    'New operational assignment',
    coalesce(ref_code, 'A Safe Sphere task') || ' has been assigned to you.',
    '/dashboard/logistics'
  );

  return new;
end;
$$;

drop trigger if exists logistics_assignment_notify on public.logistics_assignments;
create trigger logistics_assignment_notify
after insert on public.logistics_assignments
for each row execute function public.handle_assignment_created();

create or replace function public.validate_delivery_links()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  assignment_donation uuid;
  assignment_status text;
begin
  if new.logistics_assignment_id is null then
    raise exception 'A delivery requires a logistics assignment';
  end if;

  select a.donation_id, a.status into assignment_donation, assignment_status
  from public.logistics_assignments a
  where a.id = new.logistics_assignment_id;

  if assignment_donation is null or assignment_donation <> new.donation_id then
    raise exception 'Delivery assignment must belong to the selected donation';
  end if;

  if assignment_status <> 'ACCEPTED' then
    raise exception 'The logistics assignment must be accepted before a delivery is created';
  end if;

  if new.recipient_id is null then
    raise exception 'A delivery requires a recipient or local coordinator';
  end if;

  if nullif(trim(coalesce(new.destination_label, '')), '') is null then
    raise exception 'A delivery destination is required';
  end if;

  if not exists (
    select 1 from public.user_roles ur
    where ur.user_id = new.recipient_id
      and ur.role in ('RECIPIENT', 'COORDINATOR', 'DRRMO_STAFF', 'ADMIN')
  ) then
    raise exception 'Delivery recipient must be a recipient or authorized coordinator';
  end if;

  return new;
end;
$$;

drop trigger if exists deliveries_validate_links on public.deliveries;
create trigger deliveries_validate_links
before insert or update of donation_id, logistics_assignment_id, recipient_id on public.deliveries
for each row execute function public.validate_delivery_links();

create or replace function public.protect_delivery_transition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.status <> 'ASSIGNED' then
      raise exception 'New deliveries must start in the assigned state';
    end if;
    return new;
  end if;

  if new.status is not distinct from old.status then
    return new;
  end if;

  if old.status = 'PENDING' and new.status not in ('ASSIGNED', 'FAILED') then
    raise exception 'Pending deliveries may only be assigned or failed';
  elsif old.status = 'ASSIGNED' and new.status not in ('PICKED_UP', 'FAILED') then
    raise exception 'Assigned deliveries may only be picked up or failed';
  elsif old.status = 'PICKED_UP' and new.status not in ('IN_TRANSIT', 'FAILED') then
    raise exception 'Picked-up deliveries may only enter transit or fail';
  elsif old.status = 'IN_TRANSIT' and new.status not in ('DELIVERED', 'FAILED') then
    raise exception 'In-transit deliveries may only be delivered or failed';
  elsif old.status = 'DELIVERED' then
    if new.status <> 'CONFIRMED' then
      raise exception 'Delivered aid must be confirmed by the assigned recipient';
    end if;
    if not exists (
      select 1 from public.delivery_confirmations c
      where c.delivery_id = new.id and c.confirmed_by = new.recipient_id
    ) then
      raise exception 'A recipient confirmation record is required before confirming delivery';
    end if;
  elsif old.status in ('CONFIRMED', 'FAILED') then
    raise exception 'Confirmed or failed deliveries are terminal records';
  end if;

  return new;
end;
$$;

drop trigger if exists deliveries_protect_transition on public.deliveries;
create trigger deliveries_protect_transition
before insert or update of status on public.deliveries
for each row execute function public.protect_delivery_transition();

create or replace function public.sync_delivery_to_donation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  mapped_status public.donation_status;
begin
  mapped_status := case new.status
    when 'PENDING' then null
    when 'ASSIGNED' then 'ASSIGNED'::public.donation_status
    when 'PICKED_UP' then 'PICKED_UP'::public.donation_status
    when 'IN_TRANSIT' then 'IN_TRANSIT'::public.donation_status
    when 'DELIVERED' then 'DELIVERED'::public.donation_status
    when 'CONFIRMED' then 'RECIPIENT_CONFIRMED'::public.donation_status
    when 'FAILED' then 'DELIVERY_FAILED'::public.donation_status
  end;

  if mapped_status is not null then
    update public.donations
    set current_status = mapped_status
    where id = new.donation_id
      and current_status not in ('COMPLETED', 'CANCELLED');
  end if;

  if new.status = 'DELIVERED' and new.recipient_id is not null then
    if tg_op = 'INSERT' then
      insert into public.notifications(user_id, category, title, message, action_url)
      values (
        new.recipient_id,
        'DELIVERY',
        'Aid ready for confirmation',
        'A delivery has been marked delivered. Please confirm receipt.',
        '/dashboard/logistics'
      );
    elsif tg_op = 'UPDATE' and old.status is distinct from new.status then
      insert into public.notifications(user_id, category, title, message, action_url)
      values (
        new.recipient_id,
        'DELIVERY',
        'Aid ready for confirmation',
        'A delivery has been marked delivered. Please confirm receipt.',
        '/dashboard/logistics'
      );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists deliveries_sync_donation on public.deliveries;
create trigger deliveries_sync_donation
after insert or update of status on public.deliveries
for each row execute function public.sync_delivery_to_donation();

create or replace function public.finalize_delivery_confirmation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_donation_id uuid;
  v_assignment_id uuid;
  v_donor_id uuid;
  v_incident_id uuid;
begin
  if not exists (
    select 1 from public.deliveries d
    where d.id = new.delivery_id
      and d.recipient_id = new.confirmed_by
      and d.status = 'DELIVERED'
  ) then
    raise exception 'Only the assigned recipient can confirm a delivered aid record';
  end if;

  select d.donation_id, d.logistics_assignment_id
  into v_donation_id, v_assignment_id
  from public.deliveries d
  where d.id = new.delivery_id;

  update public.deliveries
  set status = 'CONFIRMED'
  where id = new.delivery_id;

  update public.donations
  set current_status = 'COMPLETED'
  where id = v_donation_id
  returning donor_id, incident_id into v_donor_id, v_incident_id;

  if v_assignment_id is not null then
    update public.logistics_assignments
    set status = 'COMPLETED', completed_at = coalesce(completed_at, now())
    where id = v_assignment_id;
  end if;

  if v_donor_id is not null then
    insert into public.notifications(user_id, category, title, message, action_url)
    values (
      v_donor_id,
      'DONATION',
      'Donation received',
      'The recipient confirmed delivery of your donation.',
      '/dashboard/donations/' || v_donation_id::text
    );
  end if;

  if v_incident_id is not null
     and exists (select 1 from public.incident_needs n where n.incident_id = v_incident_id)
     and not exists (
       select 1 from public.incident_needs n
       where n.incident_id = v_incident_id and n.is_resolved = false
     ) then
    update public.incidents
    set status = 'NEEDS_MET'
    where id = v_incident_id and status not in ('CLOSED', 'NEEDS_MET');
  end if;

  return new;
end;
$$;

drop trigger if exists delivery_confirmation_finalize on public.delivery_confirmations;
create trigger delivery_confirmation_finalize
after insert on public.delivery_confirmations
for each row execute function public.finalize_delivery_confirmation();

-- Audit logging ---------------------------------------------------------------

create or replace function public.write_audit_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  record_id text;
begin
  if tg_op = 'DELETE' then
    record_id := to_jsonb(old) ->> 'id';
  else
    record_id := to_jsonb(new) ->> 'id';
  end if;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(),
    tg_op,
    tg_table_name,
    record_id,
    jsonb_build_object('source', 'database_trigger')
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists audit_incidents on public.incidents;
create trigger audit_incidents
after insert or update or delete on public.incidents
for each row execute function public.write_audit_event();

drop trigger if exists audit_donations on public.donations;
create trigger audit_donations
after insert or update or delete on public.donations
for each row execute function public.write_audit_event();

drop trigger if exists audit_assignments on public.logistics_assignments;
create trigger audit_assignments
after insert or update or delete on public.logistics_assignments
for each row execute function public.write_audit_event();

drop trigger if exists audit_deliveries on public.deliveries;
create trigger audit_deliveries
after insert or update or delete on public.deliveries
for each row execute function public.write_audit_event();

drop trigger if exists audit_confirmations on public.delivery_confirmations;
create trigger audit_confirmations
after insert or update or delete on public.delivery_confirmations
for each row execute function public.write_audit_event();

drop trigger if exists audit_incident_coordination on public.incident_coordination;
create trigger audit_incident_coordination
after insert or update or delete on public.incident_coordination
for each row execute function public.write_audit_event();

-- Notify registered members of a coordinated office when an incident coordination
-- entry targets their organization. The activity is still retained even when no
-- matching Safe Sphere account exists, so phone/radio coordination can be logged.
create or replace function public.notify_incident_coordination()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications(user_id, category, title, message, action_url)
  select p.id,
    'INCIDENT',
    'Coordination request',
    new.organization || ': ' || replace(new.coordination_type, '_', ' '),
    '/dashboard/incidents/' || new.incident_id::text
  from public.profiles p
  where p.is_active = true
    and p.organization is not null
    and lower(trim(p.organization)) = lower(trim(new.organization))
    and p.id <> coalesce(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);
  return new;
end;
$$;

drop trigger if exists incident_coordination_notify on public.incident_coordination;
create trigger incident_coordination_notify
after insert on public.incident_coordination
for each row execute function public.notify_incident_coordination();


-- Protect assignment state transitions globally; non-staff assignees are additionally prevented from editing protected task fields.
create or replace function public.protect_assignment_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    if old.status = 'PENDING' and new.status not in ('ACCEPTED', 'CANCELLED') then
      raise exception 'Pending assignments may only be accepted or cancelled';
    elsif old.status = 'ACCEPTED' and new.status not in ('COMPLETED', 'CANCELLED') then
      raise exception 'Accepted assignments may only be completed or cancelled';
    elsif old.status in ('COMPLETED', 'CANCELLED') then
      raise exception 'Completed or cancelled assignments are terminal records';
    end if;
  end if;

  if new.donation_id is not null and new.status is distinct from old.status then
    if new.status = 'COMPLETED' and not exists (
      select 1
      from public.deliveries d
      join public.delivery_confirmations c on c.delivery_id = d.id
      where d.logistics_assignment_id = new.id
    ) then
      raise exception 'Donation assignments are completed by recipient delivery confirmation';
    end if;

    if new.status = 'CANCELLED' and exists (
      select 1 from public.deliveries d
      where d.logistics_assignment_id = new.id
        and d.status in ('ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED')
    ) then
      raise exception 'An assignment with an active delivery cannot be cancelled';
    end if;
  end if;

  if auth.uid() = old.assigned_to and not public.is_response_staff() then
    if new.donation_id is distinct from old.donation_id
       or new.incident_id is distinct from old.incident_id
       or new.assigned_to is distinct from old.assigned_to
       or new.assigned_by is distinct from old.assigned_by
       or new.vehicle_id is distinct from old.vehicle_id
       or new.instructions is distinct from old.instructions
       or new.created_at is distinct from old.created_at then
      raise exception 'Assignees cannot modify protected assignment fields';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists logistics_assignment_protect on public.logistics_assignments;
create trigger logistics_assignment_protect
before update on public.logistics_assignments
for each row execute function public.protect_assignment_update();

-- RLS additions ---------------------------------------------------------------

-- Tighten permissive personnel policies now that operational roles exist.
drop policy if exists "personnel update own availability" on public.personnel_availability;
drop policy if exists "personnel change own availability" on public.personnel_availability;

drop policy if exists "operational personnel create own availability" on public.personnel_availability;
create policy "operational personnel create own availability"
on public.personnel_availability for insert
with check (
  person_id = auth.uid()
  and (
    public.has_role('VOLUNTEER')
    or public.has_role('RESCUE_PERSONNEL')
    or public.has_role('LOGISTICS')
    or public.has_role('COORDINATOR')
    or public.has_role('DRRMO_STAFF')
    or public.has_role('ADMIN')
  )
);

drop policy if exists "operational personnel update availability" on public.personnel_availability;
create policy "operational personnel update availability"
on public.personnel_availability for update
using (
  public.is_response_staff()
  or (
    person_id = auth.uid()
    and (
      public.has_role('VOLUNTEER')
      or public.has_role('RESCUE_PERSONNEL')
      or public.has_role('LOGISTICS')
      or public.has_role('COORDINATOR')
      or public.has_role('DRRMO_STAFF')
      or public.has_role('ADMIN')
    )
  )
)
with check (
  public.is_response_staff()
  or (
    person_id = auth.uid()
    and (
      public.has_role('VOLUNTEER')
      or public.has_role('RESCUE_PERSONNEL')
      or public.has_role('LOGISTICS')
      or public.has_role('COORDINATOR')
      or public.has_role('DRRMO_STAFF')
      or public.has_role('ADMIN')
    )
  )
);

-- Only accounts carrying the Donor role may originate donation records.
drop policy if exists "donors create own donations" on public.donations;
drop policy if exists "donor role creates own donations" on public.donations;
create policy "donor role creates own donations"
on public.donations for insert
with check (donor_id = auth.uid() and public.has_role('DONOR'));

-- Donation contents remain editable by the donor only while the pledge is pending.
drop policy if exists "donors add items to own donation" on public.donation_items;
drop policy if exists "donors add items while pledged" on public.donation_items;
create policy "donors add items while pledged"
on public.donation_items for insert
with check (
  public.has_role('DONOR')
  and exists (
    select 1 from public.donations d
    where d.id = donation_items.donation_id
      and d.donor_id = auth.uid()
      and d.current_status = 'PLEDGED'
  )
);

-- Staff-authored notes must describe the donation's actual current state.
drop policy if exists "authorized staff create donation events" on public.donation_events;
drop policy if exists "authorized current-state donation events" on public.donation_events;
create policy "authorized current-state donation events"
on public.donation_events for insert
with check (
  (public.is_response_staff() or public.has_role('LOGISTICS'))
  and exists (
    select 1 from public.donations d
    where d.id = donation_events.donation_id
      and d.current_status = donation_events.event_type
  )
);

-- Public donation history is exposed through the sanitized transparency RPC only.
-- Direct table reads retain full actor IDs/metadata and are therefore limited to
-- authorized participants.
drop policy if exists "public donation events readable" on public.donation_events;
drop policy if exists "authorized donation events readable" on public.donation_events;
create policy "authorized donation events readable"
on public.donation_events for select
using (
  public.is_response_staff()
  or public.has_role('LOGISTICS')
  or exists (
    select 1 from public.donations d
    where d.id = donation_events.donation_id and d.donor_id = auth.uid()
  )
  or exists (
    select 1 from public.logistics_assignments a
    where a.donation_id = donation_events.donation_id and a.assigned_to = auth.uid()
  )
  or exists (
    select 1 from public.deliveries dl
    where dl.donation_id = donation_events.donation_id and dl.recipient_id = auth.uid()
  )
);

-- Recipient confirmation is only valid after logistics marks the delivery delivered.
drop policy if exists "recipient confirms delivery" on public.delivery_confirmations;
create policy "recipient confirms delivered aid"
on public.delivery_confirmations for insert
with check (
  confirmed_by = auth.uid()
  and exists (
    select 1 from public.deliveries d
    where d.id = delivery_id
      and d.recipient_id = auth.uid()
      and d.status = 'DELIVERED'
  )
);

-- Audit rows are trigger-generated only; authenticated clients must not forge them.
drop policy if exists "staff write audit log" on public.audit_logs;

drop policy if exists "response staff manage incident coordination" on public.incident_coordination;
create policy "response staff manage incident coordination"
on public.incident_coordination for all
using (public.is_response_staff())
with check (public.is_response_staff());

drop policy if exists "logistics read incident coordination" on public.incident_coordination;
create policy "logistics read incident coordination"
on public.incident_coordination for select
using (public.has_role('LOGISTICS'));

drop policy if exists "response staff or logistics read profiles" on public.profiles;
create policy "response staff or logistics read profiles"
on public.profiles for select
using (public.is_response_staff() or public.has_role('LOGISTICS'));

drop policy if exists "response staff or logistics read roles" on public.user_roles;
create policy "response staff or logistics read roles"
on public.user_roles for select
using (public.is_response_staff() or public.has_role('LOGISTICS'));

drop policy if exists "assignees read assigned vehicles" on public.vehicles;
create policy "assignees read assigned vehicles"
on public.vehicles for select
using (
  exists (
    select 1 from public.logistics_assignments a
    where a.vehicle_id = vehicles.id and a.assigned_to = auth.uid()
  )
);

drop policy if exists "assignees read assigned vehicle availability" on public.vehicle_availability;
create policy "assignees read assigned vehicle availability"
on public.vehicle_availability for select
using (
  exists (
    select 1 from public.logistics_assignments a
    where a.vehicle_id = vehicle_availability.vehicle_id and a.assigned_to = auth.uid()
  )
);

drop policy if exists "donors add items to own donation" on public.donation_items;
drop policy if exists "donors add items to open goods donation" on public.donation_items;
create policy "donors add items to open goods donation"
on public.donation_items for insert
with check (
  exists (
    select 1 from public.donations d
    where d.id = donation_id
      and d.donor_id = auth.uid()
      and d.donation_type = 'GOODS'
      and d.current_status = 'PLEDGED'
  )
);

drop policy if exists "logistics read donations" on public.donations;
create policy "logistics read donations"
on public.donations for select
using (public.has_role('LOGISTICS'));

drop policy if exists "delivery participants read donations" on public.donations;
create policy "delivery participants read donations"
on public.donations for select
using (
  exists (
    select 1 from public.logistics_assignments a
    where a.donation_id = donations.id and a.assigned_to = auth.uid()
  )
  or exists (
    select 1 from public.deliveries d
    where d.donation_id = donations.id and d.recipient_id = auth.uid()
  )
);

drop policy if exists "logistics read donation items" on public.donation_items;
create policy "logistics read donation items"
on public.donation_items for select
using (public.has_role('LOGISTICS'));

drop policy if exists "delivery participants read donation items" on public.donation_items;
create policy "delivery participants read donation items"
on public.donation_items for select
using (
  exists (
    select 1 from public.donations d
    where d.id = donation_items.donation_id
      and (
        exists (select 1 from public.logistics_assignments a where a.donation_id = d.id and a.assigned_to = auth.uid())
        or exists (select 1 from public.deliveries dl where dl.donation_id = d.id and dl.recipient_id = auth.uid())
      )
  )
);

drop policy if exists "logistics read assignments" on public.logistics_assignments;
create policy "logistics read assignments"
on public.logistics_assignments for select
using (public.has_role('LOGISTICS'));

drop policy if exists "assignees update own assignments" on public.logistics_assignments;
create policy "assignees update own assignments"
on public.logistics_assignments for update
using (assigned_to = auth.uid())
with check (assigned_to = auth.uid());

drop policy if exists "logistics read deliveries" on public.deliveries;
create policy "logistics read deliveries"
on public.deliveries for select
using (public.has_role('LOGISTICS'));

drop policy if exists "logistics read confirmations" on public.delivery_confirmations;
create policy "logistics read confirmations"
on public.delivery_confirmations for select
using (public.has_role('LOGISTICS'));

drop policy if exists "logistics update deliveries" on public.deliveries;
create policy "logistics update deliveries"
on public.deliveries for update
using (public.has_role('LOGISTICS'))
with check (public.has_role('LOGISTICS'));

-- Delivery proof storage ------------------------------------------------------

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values (
  'delivery-proofs',
  'delivery-proofs',
  false,
  3145728,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "users upload own delivery proof" on storage.objects;
create policy "users upload own delivery proof"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'delivery-proofs'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "participants read delivery proofs" on storage.objects;
create policy "participants read delivery proofs"
on storage.objects for select to authenticated
using (
  bucket_id = 'delivery-proofs'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_response_staff()
    or public.has_role('LOGISTICS')
  )
);

drop policy if exists "owners or admins delete delivery proofs" on storage.objects;
create policy "owners or admins delete delivery proofs"
on storage.objects for delete to authenticated
using (
  bucket_id = 'delivery-proofs'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.has_role('ADMIN')
  )
);

-- Realtime -------------------------------------------------------------------

do $$
declare
  t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array[
      'incidents',
      'incident_needs',
      'incident_coordination',
      'personnel_availability',
      'donations',
      'donation_events',
      'logistics_assignments',
      'deliveries',
      'notifications'
    ] loop
      if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = t
      ) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end $$;

-- API grants. RLS remains the authorization boundary. ------------------------

grant usage on schema public to anon, authenticated;
revoke select on public.donation_events from anon;
grant select on public.incidents, public.incident_updates, public.incident_needs to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
