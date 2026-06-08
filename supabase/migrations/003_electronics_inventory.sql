create table if not exists public.electronics_inventory (
  id text primary key default 'common_components',
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  stock jsonb not null default '{}'::jsonb,
  salvaged_components jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists electronics_inventory_set_updated_at on public.electronics_inventory;
create trigger electronics_inventory_set_updated_at
before update on public.electronics_inventory
for each row execute function public.set_updated_at();

alter table public.electronics_inventory enable row level security;

drop policy if exists "authorized users can read own electronics" on public.electronics_inventory;
create policy "authorized users can read own electronics"
on public.electronics_inventory for select
using (public.is_garage_authorized() and owner_id = auth.uid());

drop policy if exists "authorized users can insert own electronics" on public.electronics_inventory;
create policy "authorized users can insert own electronics"
on public.electronics_inventory for insert
with check (public.is_garage_authorized() and owner_id = auth.uid());

drop policy if exists "authorized users can update own electronics" on public.electronics_inventory;
create policy "authorized users can update own electronics"
on public.electronics_inventory for update
using (public.is_garage_authorized() and owner_id = auth.uid())
with check (public.is_garage_authorized() and owner_id = auth.uid());

drop policy if exists "authorized users can delete own electronics" on public.electronics_inventory;
create policy "authorized users can delete own electronics"
on public.electronics_inventory for delete
using (public.is_garage_authorized() and owner_id = auth.uid());

create index if not exists electronics_inventory_owner_idx on public.electronics_inventory(owner_id);
create index if not exists electronics_inventory_stock_gin_idx on public.electronics_inventory using gin(stock);
