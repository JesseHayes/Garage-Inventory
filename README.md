# Garage Lab Inventory

Mobile-first GitHub Pages PWA for workshop inventory, storage tracking, tags, and capability planning.

The app now uses Supabase PostgreSQL as the persistent database. GitHub Pages hosts only the frontend; data is never seeded or overwritten during deployment.

## Features

- Supabase Auth login
- PostgreSQL persistence through Supabase REST
- Row Level Security policies
- Offline-capable PWA shell
- Offline write queue with manual/automatic sync status
- JSON import/export backups
- Mobile-first responsive interface
- Category-first inventory browsing
- Projects, capabilities, storage, reusable tags, and flexible item attributes
- No image upload support

## Local Development

Create `.env` from `.env.example`:

```powershell
Copy-Item .env.example .env
```

Set:

```text
VITE_SUPABASE_URL=https://fgtjzegcihspilzuzsbu.supabase.co
VITE_SUPABASE_ANON_KEY=your anon public key
```

Install and run:

```powershell
npm.cmd install --cache .\.npm-cache
npm.cmd run dev
```

## Supabase Setup

1. In Supabase, open the SQL editor.
2. Run `supabase/migrations/001_initial_schema.sql`.
3. Run `supabase/migrations/002_inventory_projects_ux.sql`.
4. Create your user in Supabase Auth.
5. Copy your Auth user ID.
6. Run:

```sql
insert into public.app_authorized_users (user_id)
values ('YOUR_AUTH_USER_ID')
on conflict (user_id) do nothing;
```

RLS blocks all inventory access unless the signed-in user is listed in `app_authorized_users`.

Recommended: disable public sign-ups in Supabase Auth after creating your account.

### Existing Database Upgrade

For an existing Supabase database that already has the first schema, run only:

```text
supabase/migrations/002_inventory_projects_ux.sql
```

This migration preserves existing inventory rows. It adds `in_stock`, makes `quantity` optional, moves old `base_type` values into `category` only when category is empty, removes `base_type`, and creates the `projects` table with RLS.

## GitHub Pages Deployment

In the GitHub repository, add repository variables:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Values:

```text
VITE_SUPABASE_URL=https://fgtjzegcihspilzuzsbu.supabase.co
VITE_SUPABASE_ANON_KEY=<your anon public key>
```

Enable Pages with GitHub Actions as the source, then push to `main`. The workflow in `.github/workflows/pages.yml` builds and deploys the PWA.

Deployments do not run SQL migrations and do not import JSON, so they will not overwrite Supabase data.

## Migrating Current Inventory

A one-time export of the previous SQLite inventory is saved at:

```text
backups/current-inventory-export.json
```

After Supabase Auth and RLS are configured:

1. Open the deployed app.
2. Sign in.
3. Go to JSON.
4. Paste/import the backup JSON.

The import writes to Supabase using your authenticated account.

## Offline Behavior

The PWA caches the app shell for offline loading. Reads use the latest cached data when offline. Creates, edits, and deletes are queued locally and sync to Supabase when the device is online again.

The sync button in the top-right shows:

- `Synced`: the local edit queue is empty.
- `Offline`: the app cannot reach the network, and new edits will queue on this device.
- `N pending sync`: that many local creates, edits, or deletes are waiting to upload to Supabase. Clicking it tries a manual sync.

Keep regular JSON exports as backups, especially after working offline.'
