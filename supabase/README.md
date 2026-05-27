# Supabase Setup

1. Open the Supabase SQL editor.
2. Run `supabase/migrations/001_initial_schema.sql`.
3. Run `supabase/migrations/002_inventory_projects_ux.sql`.
4. Create your user in Supabase Auth.
5. Find your user's Auth UID.
6. Authorize that user:

```sql
insert into public.app_authorized_users (user_id)
values ('YOUR_AUTH_USER_ID')
on conflict (user_id) do nothing;
```

Only authorized authenticated users can read or write inventory data. Row Level Security is enabled on:

- `inventory_items`
- `locations`
- `tags`
- `capability_upgrades`
- `projects`

GitHub Pages deploys only the PWA files. It does not run migrations or seed data, so future deployments will not overwrite database contents.

Recommended: disable public sign-ups in Supabase Auth after creating your account. RLS already blocks unapproved users, but disabling sign-ups keeps the project quieter.

## Migration 002

Run `002_inventory_projects_ux.sql` on any database created before the projects/in-stock update. It:

- Adds `inventory_items.in_stock`.
- Makes `inventory_items.quantity` optional.
- Migrates blank categories from the old `base_type` column, then drops `base_type`.
- Creates `projects` with `created_at`, `updated_at`, state filtering fields, related tags/items, and RLS policies.

The migration updates schema only. It does not delete inventory contents or seed replacement data.
