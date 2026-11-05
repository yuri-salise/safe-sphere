-- Safe Sphere foundation schema
-- Target: Supabase PostgreSQL + PostGIS
-- Run in a fresh Supabase project using the SQL Editor or Supabase CLI.

create schema if not exists extensions;
create extension if not exists postgis with schema extensions;

create type public.app_role as enum (
  'PUBLIC',
  'DONOR',
  'RECIPIENT',
  'VOLUNTEER',
  'RESCUE_PERSONNEL',
  'LOGISTICS',
  'COORDINATOR',
  'DRRMO_STAFF',
  'ADMIN'
);

create type public.incident_severity as enum ('LOW', 'MODERATE', 'HIGH', 'CRITICAL');
create type public.incident_status as enum (
  'REPORTED',
  'VERIFIED',
  'ACTIVE',
  'RESPONSE_ONGOING',
  'NEEDS_MET',
  'CLOSED'
);
create type public.donation_type as enum ('GOODS', 'FUNDS');
create type public.donation_status as enum (
  'PLEDGED',
  'CONFIRMED',
  'ASSIGNED',
  'PICKED_UP',
  'IN_TRANSIT',
  'DELIVERED',
  'RECIPIENT_CONFIRMED',
  'COMPLETED',
  'CANCELLED',
  'FAILED_PICKUP',
  'DELIVERY_FAILED'
);
create type public.delivery_status as enum (
  'PENDING',
  'ASSIGNED',
  'PICKED_UP',
  'IN_TRANSIT',
  'DELIVERED',
  'CONFIRMED',
  'FAILED'
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  phone text,
  organization text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.app_role not null,
  granted_by uuid references public.profiles(id),
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);

create table public.incidents (
  id uuid primary key default gen_random_uuid(),
  code text unique not null default (
    'INC-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
  ),
  title text not null check (char_length(title) between 5 and 160),
  description text,
  incident_type text not null,
  severity public.incident_severity not null default 'MODERATE',
  status public.incident_status not null default 'REPORTED',
  location extensions.geography(point, 4326) not null,
  location_label text,
  estimated_affected integer not null default 0 check (estimated_affected >= 0),
  is_public boolean not null default true,
  reported_by uuid references public.profiles(id),
  verified_by uuid references public.profiles(id),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index incidents_location_gix on public.incidents using gist (location);
create index incidents_status_idx on public.incidents(status, severity);

create table public.incident_updates (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete cascade,
  message text not null,
  status public.incident_status,
  severity public.incident_severity,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create index incident_updates_incident_idx on public.incident_updates(incident_id, created_at desc);

create table public.incident_needs (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete cascade,
  category text not null,
  description text,
  quantity_needed numeric(12,2) check (quantity_needed is null or quantity_needed >= 0),
  quantity_met numeric(12,2) not null default 0 check (quantity_met >= 0),
  unit text,
  is_resolved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.personnel_availability (
  person_id uuid primary key references public.profiles(id) on delete cascade,
  is_available boolean not null default false,
  status_note text,
  current_location extensions.geography(point, 4326),
  available_until timestamptz,
  updated_at timestamptz not null default now()
);
create index personnel_location_gix on public.personnel_availability using gist (current_location);

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  asset_code text unique not null,
  plate_number text,
  vehicle_type text not null,
  capacity_note text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.vehicle_availability (
  vehicle_id uuid primary key references public.vehicles(id) on delete cascade,
  is_available boolean not null default false,
  status_note text,
  current_location extensions.geography(point, 4326),
  updated_at timestamptz not null default now()
);
create index vehicle_availability_location_gix on public.vehicle_availability using gist (current_location);

create table public.donations (
  id uuid primary key default gen_random_uuid(),
  code text unique not null default (
    'DON-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
  ),
  donor_id uuid not null references public.profiles(id),
  incident_id uuid references public.incidents(id),
  donation_type public.donation_type not null,
  current_status public.donation_status not null default 'PLEDGED',
  amount numeric(14,2) check (amount is null or amount >= 0),
  currency char(3) default 'PHP',
  is_anonymous boolean not null default false,
  donor_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (donation_type = 'FUNDS' and amount is not null)
    or donation_type = 'GOODS'
  )
);
create index donations_donor_idx on public.donations(donor_id, created_at desc);
create index donations_incident_idx on public.donations(incident_id, created_at desc);

create table public.donation_items (
  id uuid primary key default gen_random_uuid(),
  donation_id uuid not null references public.donations(id) on delete cascade,
  item_name text not null,
  quantity numeric(12,2) not null check (quantity > 0),
  unit text not null,
  notes text
);

create table public.donation_events (
  id uuid primary key default gen_random_uuid(),
  donation_id uuid not null references public.donations(id) on delete cascade,
  event_type public.donation_status not null,
  performed_by uuid references public.profiles(id),
  is_public boolean not null default true,
  public_note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index donation_events_timeline_idx on public.donation_events(donation_id, created_at);

create table public.logistics_assignments (
  id uuid primary key default gen_random_uuid(),
  donation_id uuid references public.donations(id),
  incident_id uuid references public.incidents(id),
  assigned_to uuid not null references public.profiles(id),
  assigned_by uuid references public.profiles(id),
  instructions text,
  accepted_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  check (donation_id is not null or incident_id is not null)
);

create table public.deliveries (
  id uuid primary key default gen_random_uuid(),
  donation_id uuid not null references public.donations(id),
  logistics_assignment_id uuid references public.logistics_assignments(id),
  recipient_id uuid references public.profiles(id),
  status public.delivery_status not null default 'PENDING',
  destination extensions.geography(point, 4326),
  destination_label text,
  picked_up_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index deliveries_destination_gix on public.deliveries using gist (destination);

create table public.delivery_confirmations (
  id uuid primary key default gen_random_uuid(),
  delivery_id uuid unique not null references public.deliveries(id) on delete cascade,
  confirmed_by uuid not null references public.profiles(id),
  confirmation_note text,
  proof_path text,
  confirmed_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category text not null default 'SYSTEM',
  title text not null,
  message text not null,
  action_url text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications(user_id, created_at desc);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_entity_idx on public.audit_logs(entity_type, entity_id, created_at desc);

-- Helpers --------------------------------------------------------------------

create or replace function public.has_role(required_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role = required_role
  );
$$;

create or replace function public.is_response_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.has_role('ADMIN')
    or public.has_role('DRRMO_STAFF')
    or public.has_role('COORDINATOR');
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();
create trigger incidents_set_updated_at
before update on public.incidents
for each row execute function public.set_updated_at();
create trigger incident_needs_set_updated_at
before update on public.incident_needs
for each row execute function public.set_updated_at();
create trigger vehicles_set_updated_at
before update on public.vehicles
for each row execute function public.set_updated_at();
create trigger donations_set_updated_at
before update on public.donations
for each row execute function public.set_updated_at();
create trigger deliveries_set_updated_at
before update on public.deliveries
for each row execute function public.set_updated_at();

-- Append-only donation status history. The current_status column is a query
-- optimization; donation_events remains the audit-friendly chain of custody.
create or replace function public.record_donation_status_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' or new.current_status is distinct from old.current_status then
    insert into public.donation_events(
      donation_id, event_type, performed_by, is_public, public_note, metadata
    ) values (
      new.id,
      new.current_status,
      auth.uid(),
      true,
      case new.current_status
        when 'PLEDGED' then 'Donation pledged'
        when 'CONFIRMED' then 'Donation confirmed'
        when 'ASSIGNED' then 'Logistics assigned'
        when 'PICKED_UP' then 'Donation picked up'
        when 'IN_TRANSIT' then 'Donation in transit'
        when 'DELIVERED' then 'Donation delivered'
        when 'RECIPIENT_CONFIRMED' then 'Recipient confirmed delivery'
        when 'COMPLETED' then 'Donation completed'
        when 'CANCELLED' then 'Donation cancelled'
        when 'FAILED_PICKUP' then 'Pickup failed'
        when 'DELIVERY_FAILED' then 'Delivery failed'
      end,
      jsonb_build_object('source', 'donation_status_trigger')
    );
  end if;
  return new;
end;
$$;

create trigger donations_record_status_event
after insert or update of current_status on public.donations
for each row execute function public.record_donation_status_event();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles(id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));

  insert into public.user_roles(user_id, role)
  values (new.id, 'PUBLIC');

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Public map RPC. This avoids exposing raw PostGIS representation to the UI.
create or replace function public.get_public_incidents()
returns table (
  id uuid,
  code text,
  title text,
  incident_type text,
  severity public.incident_severity,
  status public.incident_status,
  latitude double precision,
  longitude double precision,
  estimated_affected integer,
  updated_at timestamptz
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select
    i.id,
    i.code,
    i.title,
    i.incident_type,
    i.severity,
    i.status,
    extensions.st_y(i.location::extensions.geometry) as latitude,
    extensions.st_x(i.location::extensions.geometry) as longitude,
    i.estimated_affected,
    i.updated_at
  from public.incidents i
  where i.is_public = true
    and i.status <> 'CLOSED'
  order by
    case i.severity
      when 'CRITICAL' then 4
      when 'HIGH' then 3
      when 'MODERATE' then 2
      else 1
    end desc,
    i.updated_at desc;
$$;

-- RLS ------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.incidents enable row level security;
alter table public.incident_updates enable row level security;
alter table public.incident_needs enable row level security;
alter table public.personnel_availability enable row level security;
alter table public.vehicles enable row level security;
alter table public.vehicle_availability enable row level security;
alter table public.donations enable row level security;
alter table public.donation_items enable row level security;
alter table public.donation_events enable row level security;
alter table public.logistics_assignments enable row level security;
alter table public.deliveries enable row level security;
alter table public.delivery_confirmations enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

create policy "profiles read self or staff"
on public.profiles for select
using (id = auth.uid() or public.is_response_staff());
create policy "profiles update self"
on public.profiles for update
using (id = auth.uid()) with check (id = auth.uid());

create policy "roles read self or admins"
on public.user_roles for select
using (user_id = auth.uid() or public.has_role('ADMIN'));
create policy "roles managed by admins"
on public.user_roles for all
using (public.has_role('ADMIN')) with check (public.has_role('ADMIN'));

create policy "public incidents are readable"
on public.incidents for select
using (is_public = true or public.is_response_staff());
create policy "response staff create incidents"
on public.incidents for insert
with check (public.is_response_staff());
create policy "response staff update incidents"
on public.incidents for update
using (public.is_response_staff()) with check (public.is_response_staff());
create policy "admins delete incidents"
on public.incidents for delete
using (public.has_role('ADMIN'));

create policy "public incident updates readable"
on public.incident_updates for select
using (
  exists (
    select 1 from public.incidents i
    where i.id = incident_id and (i.is_public = true or public.is_response_staff())
  )
);
create policy "staff create incident updates"
on public.incident_updates for insert
with check (public.is_response_staff());

create policy "public incident needs readable"
on public.incident_needs for select
using (
  exists (
    select 1 from public.incidents i
    where i.id = incident_id and (i.is_public = true or public.is_response_staff())
  )
);
create policy "staff manage incident needs"
on public.incident_needs for all
using (public.is_response_staff()) with check (public.is_response_staff());

create policy "personnel availability readable by owner or staff"
on public.personnel_availability for select
using (person_id = auth.uid() or public.is_response_staff());
create policy "personnel update own availability"
on public.personnel_availability for insert
with check (person_id = auth.uid());
create policy "personnel change own availability"
on public.personnel_availability for update
using (person_id = auth.uid() or public.is_response_staff())
with check (person_id = auth.uid() or public.is_response_staff());

create policy "staff read vehicles"
on public.vehicles for select
using (public.is_response_staff() or public.has_role('LOGISTICS'));
create policy "staff manage vehicles"
on public.vehicles for all
using (public.is_response_staff()) with check (public.is_response_staff());

create policy "staff read vehicle availability"
on public.vehicle_availability for select
using (public.is_response_staff() or public.has_role('LOGISTICS'));
create policy "staff manage vehicle availability"
on public.vehicle_availability for all
using (public.is_response_staff() or public.has_role('LOGISTICS'))
with check (public.is_response_staff() or public.has_role('LOGISTICS'));

create policy "donors and staff read donations"
on public.donations for select
using (donor_id = auth.uid() or public.is_response_staff());
create policy "donors create own donations"
on public.donations for insert
with check (donor_id = auth.uid());
create policy "staff manage donations"
on public.donations for update
using (public.is_response_staff() or public.has_role('LOGISTICS'))
with check (public.is_response_staff() or public.has_role('LOGISTICS'));

create policy "donation item access follows donation"
on public.donation_items for select
using (
  exists (
    select 1 from public.donations d
    where d.id = donation_id
      and (d.donor_id = auth.uid() or public.is_response_staff() or public.has_role('LOGISTICS'))
  )
);
create policy "donors add items to own donation"
on public.donation_items for insert
with check (
  exists (
    select 1 from public.donations d
    where d.id = donation_id and d.donor_id = auth.uid()
  )
);

create policy "public donation events readable"
on public.donation_events for select
using (
  is_public = true
  or public.is_response_staff()
  or exists (
    select 1 from public.donations d
    where d.id = donation_id and d.donor_id = auth.uid()
  )
);
create policy "authorized staff create donation events"
on public.donation_events for insert
with check (public.is_response_staff() or public.has_role('LOGISTICS'));

create policy "assignments visible to assignee or staff"
on public.logistics_assignments for select
using (assigned_to = auth.uid() or public.is_response_staff());
create policy "staff manage assignments"
on public.logistics_assignments for all
using (public.is_response_staff()) with check (public.is_response_staff());

create policy "deliveries visible to recipient logistics or staff"
on public.deliveries for select
using (
  recipient_id = auth.uid()
  or public.is_response_staff()
  or exists (
    select 1 from public.logistics_assignments a
    where a.id = logistics_assignment_id and a.assigned_to = auth.uid()
  )
);
create policy "logistics or staff update deliveries"
on public.deliveries for update
using (
  public.is_response_staff()
  or exists (
    select 1 from public.logistics_assignments a
    where a.id = logistics_assignment_id and a.assigned_to = auth.uid()
  )
)
with check (
  public.is_response_staff()
  or exists (
    select 1 from public.logistics_assignments a
    where a.id = logistics_assignment_id and a.assigned_to = auth.uid()
  )
);
create policy "staff create deliveries"
on public.deliveries for insert
with check (public.is_response_staff() or public.has_role('LOGISTICS'));

create policy "confirmation visible to participant or staff"
on public.delivery_confirmations for select
using (confirmed_by = auth.uid() or public.is_response_staff());
create policy "recipient confirms delivery"
on public.delivery_confirmations for insert
with check (
  confirmed_by = auth.uid()
  and exists (
    select 1 from public.deliveries d
    where d.id = delivery_id and d.recipient_id = auth.uid()
  )
);

create policy "users read own notifications"
on public.notifications for select
using (user_id = auth.uid());
create policy "users mark own notifications read"
on public.notifications for update
using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "staff create notifications"
on public.notifications for insert
with check (public.is_response_staff() or public.has_role('LOGISTICS'));

create policy "admins read audit log"
on public.audit_logs for select
using (public.has_role('ADMIN'));
create policy "staff write audit log"
on public.audit_logs for insert
with check (auth.uid() is not null);

-- Realtime foundation. Postgres Changes is used for realtime synchronization;
-- migrate high-volume production updates to Supabase Broadcast as scale requires.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'incidents'
  ) then
    alter publication supabase_realtime add table public.incidents;
  end if;
end $$;

-- Optional development seed. Uncomment after creating a DRRMO user if desired.
-- insert into public.incidents(title, incident_type, severity, status, location, location_label, estimated_affected)
-- values (
--   'Flood monitoring point', 'Flood', 'HIGH', 'ACTIVE',
--   extensions.st_setsrid(extensions.st_makepoint(125.0499, 7.8582), 4326)::extensions.geography,
--   'Central Operations Sector Zone A', 83
-- );
