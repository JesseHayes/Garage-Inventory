# Garage Lab Inventory Architecture

## Runtime

The app is a GitHub Pages hosted PWA. It has no Node/Express backend and no SQLite runtime. The browser talks directly to Supabase using:

- Supabase Auth for sign-in
- Supabase REST for CRUD operations
- PostgreSQL Row Level Security for access control

## Persistence

Supabase PostgreSQL is the source of truth. The browser keeps only:

- the current auth session
- a read cache for offline display
- a write queue for offline changes waiting to sync

Deployments do not seed, migrate, or overwrite database contents.

## Tables

Defined in `supabase/migrations/001_initial_schema.sql`:

- `inventory_items`
- `locations`
- `tags`
- `capability_upgrades`

The migration also includes `app_authorized_users`, a small allow-list used by RLS so only approved Supabase Auth users can access the app data.

## PWA Behavior

The service worker caches the app shell. Supabase network requests are not cached by the service worker; the app-level cache and sync queue handle offline workflow.

When offline:

- reads use the latest local cache
- creates/edits/deletes update the local cache immediately
- writes are queued in local storage
- queued writes flush when connectivity returns or when the user taps the sync chip

## Frontend Modules

- `src/lib/supabaseClient.js`: auth session and Supabase endpoint configuration
- `src/lib/api.js`: Supabase REST adapter, offline cache, sync queue, JSON import/export
- `src/components/AuthGate.jsx`: login screen
- `src/components/*`: inventory, storage, tag, capability, search, and JSON UI

## Environment

Required Vite environment variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

The anon key is public by design; RLS and authentication protect the data.
