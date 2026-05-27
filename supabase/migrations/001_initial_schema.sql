create extension if not exists pgcrypto;

create table if not exists public.app_authorized_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.app_authorized_users enable row level security;

create or replace function public.is_garage_authorized()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.app_authorized_users
    where user_id = auth.uid()
  );
$$;

create table if not exists public.locations (
  id text primary key default ('loc_' || substr(gen_random_uuid()::text, 1, 8)),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  code text default '',
  type text default 'bin',
  parent_id text references public.locations(id) on delete set null,
  notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inventory_items (
  id text primary key default ('item_' || substr(gen_random_uuid()::text, 1, 8)),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  category text default 'Uncategorized',
  tags jsonb not null default '[]'::jsonb,
  attributes jsonb not null default '{}'::jsonb,
  quantity numeric,
  units text default 'each',
  in_stock boolean not null default true,
  dimensions jsonb not null default '{}'::jsonb,
  material_composition jsonb not null default '[]'::jsonb,
  condition text default 'unknown',
  location_id text references public.locations(id) on delete set null,
  notes text default '',
  source_origin text default '',
  tested_status text default 'not tested',
  confidence_level text default 'unknown',
  salvage_status text default 'intake',
  date_added date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tags (
  id text primary key default ('tag_' || substr(gen_random_uuid()::text, 1, 8)),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  normalized_name text not null,
  use_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, normalized_name)
);

create table if not exists public.capability_upgrades (
  id text primary key default ('cap_' || substr(gen_random_uuid()::text, 1, 8)),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  estimated_cost numeric,
  capabilities_unlocked jsonb not null default '[]'::jsonb,
  related_item_ids jsonb not null default '[]'::jsonb,
  priority text default 'medium',
  status text default 'desired',
  notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists locations_set_updated_at on public.locations;
create trigger locations_set_updated_at
before update on public.locations
for each row execute function public.set_updated_at();

drop trigger if exists inventory_items_set_updated_at on public.inventory_items;
create trigger inventory_items_set_updated_at
before update on public.inventory_items
for each row execute function public.set_updated_at();

drop trigger if exists tags_set_updated_at on public.tags;
create trigger tags_set_updated_at
before update on public.tags
for each row execute function public.set_updated_at();

drop trigger if exists capability_upgrades_set_updated_at on public.capability_upgrades;
create trigger capability_upgrades_set_updated_at
before update on public.capability_upgrades
for each row execute function public.set_updated_at();

alter table public.locations enable row level security;
alter table public.inventory_items enable row level security;
alter table public.tags enable row level security;
alter table public.capability_upgrades enable row level security;

drop policy if exists "authorized users can read own locations" on public.locations;
create policy "authorized users can read own locations"
on public.locations for select
using (public.is_garage_authorized() and owner_id = auth.uid());

drop policy if exists "authorized users can insert own locations" on public.locations;
create policy "authorized users can insert own locations"
on public.locations for insert
with check (public.is_garage_authorized() and owner_id = auth.uid());

drop policy if exists "authorized users can update own locations" on public.locations;
create policy "authorized users can update own locations"
on public.locations for update
using (public.is_garage_authorized() and owner_id = auth.uid())
with check (public.is_garage_authorized() and owner_id = auth.uid());

drop policy if exists "authorized users can delete own locations" on public.locations;
create policy "authorized users can delete own locations"
on public.locations for delete
using (public.is_garage_authorized() and owner_id = auth.uid());

drop policy if exists "authorized users can read own inventory" on public.inventory_items;
create policy "authorized users can read own inventory"
on public.inventory_items for select
using (public.is_garage_authorized() and owner_id = auth.uid());

drop policy if exists "authorized users can insert own inventory" on public.inventory_items;
create policy "authorized users can insert own inventory"
on public.inventory_items for insert
with check (public.is_garage_authorized() and owner_id = auth.uid());

drop policy if exists "authorized users can update own inventory" on public.inventory_items;
create policy "authorized users can update own inventory"
on public.inventory_items for update
using (public.is_garage_authorized() and owner_id = auth.uid())
with check (public.is_garage_authorized() and owner_id = auth.uid());

drop policy if exists "authorized users can delete own inventory" on public.inventory_items;
create policy "authorized users can delete own inventory"
on public.inventory_items for delete
using (public.is_garage_authorized() and owner_id = auth.uid());

drop policy if exists "authorized users can read own tags" on public.tags;
create policy "authorized users can read own tags"
on public.tags for select
using (public.is_garage_authorized() and owner_id = auth.uid());

drop policy if exists "authorized users can insert own tags" on public.tags;
create policy "authorized users can insert own tags"
on public.tags for insert
with check (public.is_garage_authorized() and owner_id = auth.uid());

drop policy if exists "authorized users can update own tags" on public.tags;
create policy "authorized users can update own tags"
on public.tags for update
using (public.is_garage_authorized() and owner_id = auth.uid())
with check (public.is_garage_authorized() and owner_id = auth.uid());

drop policy if exists "authorized users can delete own tags" on public.tags;
create policy "authorized users can delete own tags"
on public.tags for delete
using (public.is_garage_authorized() and owner_id = auth.uid());

drop policy if exists "authorized users can read own capabilities" on public.capability_upgrades;
create policy "authorized users can read own capabilities"
on public.capability_upgrades for select
using (public.is_garage_authorized() and owner_id = auth.uid());

drop policy if exists "authorized users can insert own capabilities" on public.capability_upgrades;
create policy "authorized users can insert own capabilities"
on public.capability_upgrades for insert
with check (public.is_garage_authorized() and owner_id = auth.uid());

drop policy if exists "authorized users can update own capabilities" on public.capability_upgrades;
create policy "authorized users can update own capabilities"
on public.capability_upgrades for update
using (public.is_garage_authorized() and owner_id = auth.uid())
with check (public.is_garage_authorized() and owner_id = auth.uid());

drop policy if exists "authorized users can delete own capabilities" on public.capability_upgrades;
create policy "authorized users can delete own capabilities"
on public.capability_upgrades for delete
using (public.is_garage_authorized() and owner_id = auth.uid());

create index if not exists locations_owner_idx on public.locations(owner_id);
create index if not exists inventory_items_owner_idx on public.inventory_items(owner_id);
create index if not exists inventory_items_location_idx on public.inventory_items(location_id);
create index if not exists inventory_items_tags_gin_idx on public.inventory_items using gin(tags);
create index if not exists inventory_items_attributes_gin_idx on public.inventory_items using gin(attributes);
create index if not exists tags_owner_normalized_idx on public.tags(owner_id, normalized_name);
create index if not exists tags_use_count_idx on public.tags(use_count desc);
create index if not exists capability_upgrades_owner_idx on public.capability_upgrades(owner_id);
