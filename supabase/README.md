# Supabase Setup

1. Open the Supabase SQL editor.
2. Run `supabase/migrations/001_initial_schema.sql`.
3. Create your user in Supabase Auth.
4. Find your user's Auth UID.
5. Authorize that user:

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

GitHub Pages deploys only the PWA files. It does not run migrations or seed data, so future deployments will not overwrite database contents.

Recommended: disable public sign-ups in Supabase Auth after creating your account. RLS already blocks unapproved users, but disabling sign-ups keeps the project quieter.
