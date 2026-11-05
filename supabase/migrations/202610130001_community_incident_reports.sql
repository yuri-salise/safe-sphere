-- Community reports remain private until an administrator reviews them.
alter table public.incidents
  add column review_status text not null default 'APPROVED'
    check (review_status in ('PENDING', 'APPROVED', 'REJECTED')),
  add column reviewed_by uuid references public.profiles(id),
  add column reviewed_at timestamptz;

create index incidents_pending_review_idx on public.incidents(created_at)
  where review_status = 'PENDING';

create or replace function public.submit_incident_report(
  p_title text,
  p_description text,
  p_incident_type text,
  p_severity public.incident_severity,
  p_latitude double precision,
  p_longitude double precision,
  p_location_label text,
  p_estimated_affected integer
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Sign in to submit a report';
  end if;
  if p_latitude is null or p_latitude < -90 or p_latitude > 90
    or p_longitude is null or p_longitude < -180 or p_longitude > 180 then
    raise exception 'Invalid coordinates';
  end if;
  if length(trim(coalesce(p_title, ''))) < 5
    or nullif(trim(coalesce(p_incident_type, '')), '') is null then
    raise exception 'A title and incident type are required';
  end if;

  insert into public.incidents (
    title, description, incident_type, severity, location, location_label,
    estimated_affected, is_public, reported_by, review_status
  ) values (
    p_title, nullif(p_description, ''), p_incident_type,
    coalesce(p_severity, 'MODERATE'),
    extensions.st_setsrid(extensions.st_makepoint(p_longitude, p_latitude), 4326)::extensions.geography,
    nullif(p_location_label, ''), greatest(coalesce(p_estimated_affected, 0), 0),
    false, auth.uid(), 'PENDING'
  ) returning id into new_id;

  return new_id;
end;
$$;

revoke all on function public.submit_incident_report(
  text, text, text, public.incident_severity, double precision, double precision, text, integer
) from public;
grant execute on function public.submit_incident_report(
  text, text, text, public.incident_severity, double precision, double precision, text, integer
) to authenticated;

-- Keep reporter access scoped to their own private submissions.
drop policy if exists "public incidents are readable" on public.incidents;
create policy "public incidents are readable"
on public.incidents for select
using (
  (is_public = true and review_status = 'APPROVED')
  or public.is_response_staff()
  or (auth.uid() is not null and reported_by = auth.uid())
);

-- Staff may edit operational fields, but only admins can publish a community report.
create or replace function public.guard_incident_review()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.review_status <> 'APPROVED' and new.is_public then
    raise exception 'Unapproved reports cannot be public';
  end if;
  if tg_op = 'UPDATE' then
    if (new.review_status is distinct from old.review_status
      or (old.review_status <> 'APPROVED' and new.is_public is distinct from old.is_public))
      and not public.has_role('ADMIN') then
      raise exception 'Administrator approval is required';
    end if;
  end if;
  return new;
end;
$$;

create trigger guard_incident_review
before insert or update on public.incidents
for each row execute function public.guard_incident_review();

create function public.get_incident_location(p_incident_id uuid)
returns table (latitude double precision, longitude double precision)
language sql stable security invoker
set search_path = public, extensions
as $$
  select extensions.st_y(i.location::extensions.geometry),
    extensions.st_x(i.location::extensions.geometry)
  from public.incidents i where i.id = p_incident_id;
$$;
revoke all on function public.get_incident_location(uuid) from public;
grant execute on function public.get_incident_location(uuid) to authenticated;

-- A report awaiting review is not yet an eligible target for a pledge.
create function public.guard_donation_incident_review()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.incident_id is not null and not exists (
    select 1 from public.incidents i
    where i.id = new.incident_id and i.review_status = 'APPROVED'
  ) then
    raise exception 'The target incident is awaiting approval';
  end if;
  return new;
end;
$$;
create trigger guard_donation_incident_review
before insert or update of incident_id on public.donations
for each row execute function public.guard_donation_incident_review();

create or replace function public.get_public_incidents()
returns table (
  id uuid, code text, title text, incident_type text,
  severity public.incident_severity, status public.incident_status,
  latitude double precision, longitude double precision,
  estimated_affected integer, updated_at timestamptz
)
language sql stable security invoker
set search_path = public, extensions
as $$
  select i.id, i.code, i.title, i.incident_type, i.severity, i.status,
    extensions.st_y(i.location::extensions.geometry),
    extensions.st_x(i.location::extensions.geometry),
    i.estimated_affected, i.updated_at
  from public.incidents i
  where i.is_public = true and i.review_status = 'APPROVED' and i.status <> 'CLOSED'
  order by case i.severity
    when 'CRITICAL' then 4 when 'HIGH' then 3
    when 'MODERATE' then 2 else 1 end desc, i.updated_at desc;
$$;
