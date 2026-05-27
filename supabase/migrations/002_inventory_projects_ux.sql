alter table public.inventory_items
  add column if not exists in_stock boolean not null default true;

alter table public.inventory_items
  alter column quantity drop default,
  alter column quantity drop not null;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'inventory_items'
      and column_name = 'base_type'
  ) then
    update public.inventory_items
    set category = coalesce(nullif(category, ''), nullif(base_type, ''), 'Uncategorized');
  else
    update public.inventory_items
    set category = coalesce(nullif(category, ''), 'Uncategorized');
  end if;
end $$;

update public.inventory_items
set in_stock = case
  when quantity is null then true
  when quantity > 0 then true
  else false
end;

alter table public.inventory_items
  drop column if exists base_type;

create table if not exists public.projects (
  id text primary key default ('proj_' || substr(gen_random_uuid()::text, 1, 8)),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  description text default '',
  related_item_ids jsonb not null default '[]'::jsonb,
  related_tags jsonb not null default '[]'::jsonb,
  state text not null default 'Conceived' check (state in ('Conceived', 'Planned', 'In Progress', 'Attempted', 'Completed')),
  notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

alter table public.projects enable row level security;

drop policy if exists "authorized users can read own projects" on public.projects;
create policy "authorized users can read own projects"
on public.projects for select
using (public.is_garage_authorized() and owner_id = auth.uid());

drop policy if exists "authorized users can insert own projects" on public.projects;
create policy "authorized users can insert own projects"
on public.projects for insert
with check (public.is_garage_authorized() and owner_id = auth.uid());

drop policy if exists "authorized users can update own projects" on public.projects;
create policy "authorized users can update own projects"
on public.projects for update
using (public.is_garage_authorized() and owner_id = auth.uid())
with check (public.is_garage_authorized() and owner_id = auth.uid());

drop policy if exists "authorized users can delete own projects" on public.projects;
create policy "authorized users can delete own projects"
on public.projects for delete
using (public.is_garage_authorized() and owner_id = auth.uid());

create index if not exists projects_owner_idx on public.projects(owner_id);
create index if not exists projects_state_idx on public.projects(owner_id, state);
create index if not exists projects_related_tags_gin_idx on public.projects using gin(related_tags);
