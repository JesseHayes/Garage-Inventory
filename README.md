# Garage Lab Inventory

Mobile-first GitHub Pages PWA for workshop inventory, storage tracking, tags, and capability planning.

The app now uses Supabase PostgreSQL as the persistent database. GitHub Pages hosts only the frontend; data is never seeded or overwritten during deployment.

## Features

- Supabase Auth login
- PostgreSQL persistence through Supabase REST
- Row Level Security policies
- Offline-capable PWA shell
- Offline write queue with manual/automatic sync
- JSON import/export backups
- Mobile-first responsive interface
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
3. Create your user in Supabase Auth.
4. Copy your Auth user ID.
5. Run:

```sql
insert into public.app_authorized_users (user_id)
values ('YOUR_AUTH_USER_ID')
on conflict (user_id) do nothing;
```

RLS blocks all inventory access unless the signed-in user is listed in `app_authorized_users`.

Recommended: disable public sign-ups in Supabase Auth after creating your account.

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

Keep regular JSON exports as backups, especially after working offline.'
