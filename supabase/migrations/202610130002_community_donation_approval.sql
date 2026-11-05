-- Every signed-in account may pledge; review gates operational and public use.
alter table public.donations
  add column review_status text not null default 'APPROVED'
    check (review_status in ('PENDING', 'APPROVED', 'REJECTED')),
  add column reviewed_by uuid references public.profiles(id),
  add column reviewed_at timestamptz;

create index donations_pending_review_idx on public.donations(created_at)
  where review_status = 'PENDING';

drop policy if exists "donor role creates own donations" on public.donations;
create policy "signed-in users create pending donations"
on public.donations for insert to authenticated
with check (
  donor_id = auth.uid()
  and review_status = 'PENDING'
  and current_status = 'PLEDGED'
  and reviewed_by is null
  and reviewed_at is null
  and payment_verified_by is null
  and payment_verified_at is null
);

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
  if auth.uid() is null then
    raise exception 'Sign in to create a donation pledge';
  end if;
  if p_incident_id is null then
    raise exception 'Target incident is required';
  end if;
  if not exists (
    select 1 from public.incidents i
    where i.id = p_incident_id and i.status <> 'CLOSED'
      and i.review_status = 'APPROVED'
  ) then
    raise exception 'Target incident is unavailable or awaiting approval';
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
    donor_id, incident_id, donation_type, amount, is_anonymous,
    donor_message, payment_method, payment_reference, review_status
  ) values (
    auth.uid(), p_incident_id, p_donation_type,
    case when p_donation_type = 'FUNDS' then p_amount else null end,
    coalesce(p_is_anonymous, false),
    nullif(trim(coalesce(p_donor_message, '')), ''),
    case when p_donation_type = 'FUNDS' then nullif(trim(coalesce(p_payment_method, '')), '') else null end,
    case when p_donation_type = 'FUNDS' then nullif(trim(coalesce(p_payment_reference, '')), '') else null end,
    'PENDING'
  ) returning id into new_id;

  if p_donation_type = 'GOODS' then
    insert into public.donation_items(donation_id, item_name, quantity, unit)
    values (new_id, trim(p_item_name), p_quantity, trim(p_unit));
  end if;
  return new_id;
end;
$$;

-- Approval is separate from payment verification and donation state changes.
create function public.guard_donation_review()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.review_status is distinct from old.review_status
    or new.reviewed_by is distinct from old.reviewed_by
    or new.reviewed_at is distinct from old.reviewed_at then
    if not public.has_role('ADMIN') then
      raise exception 'Administrator approval is required';
    end if;
    if old.review_status <> 'PENDING' or new.review_status not in ('APPROVED', 'REJECTED') then
      raise exception 'Only pending donations can be reviewed';
    end if;
    if new.reviewed_by is distinct from auth.uid() or new.reviewed_at is null then
      raise exception 'Review actor and time are required';
    end if;
  end if;
  if old.review_status <> 'APPROVED'
    and new.current_status is distinct from old.current_status then
    raise exception 'Donation requires administrator approval before workflow changes';
  end if;
  return new;
end;
$$;
create trigger guard_donation_review
before update on public.donations
for each row execute function public.guard_donation_review();

-- Rejected goods pledges cannot be edited after the decision.
drop policy if exists "donors add items while pledged" on public.donation_items;
drop policy if exists "donors add items to open goods donation" on public.donation_items;
create policy "owners add items to open goods donation"
on public.donation_items for insert to authenticated
with check (
  exists (
    select 1 from public.donations d
    where d.id = donation_id and d.donor_id = auth.uid()
      and d.donation_type = 'GOODS' and d.current_status = 'PLEDGED'
      and d.review_status <> 'REJECTED'
  )
);

-- The PLEDGED event is recorded immediately, then becomes public on approval.
create or replace function public.get_public_donation_timeline(p_limit integer default 150)
returns table (
  event_id uuid, donation_code text, incident_code text, incident_title text,
  donor_label text, donation_type public.donation_type, amount numeric,
  currency char(3), event_type public.donation_status, public_note text,
  created_at timestamptz
)
language sql stable security definer
set search_path = public
as $$
  select e.id, d.code, i.code, i.title,
    case when d.is_anonymous then 'Anonymous donor'
      else coalesce(p.display_name, 'Community donor') end,
    d.donation_type, d.amount, d.currency, e.event_type, e.public_note, e.created_at
  from public.donation_events e
  join public.donations d on d.id = e.donation_id
  left join public.incidents i on i.id = d.incident_id and i.is_public = true
  left join public.profiles p on p.id = d.donor_id
  where e.is_public = true and d.review_status = 'APPROVED'
  order by e.created_at desc
  limit least(greatest(coalesce(p_limit, 150), 1), 500);
$$;
