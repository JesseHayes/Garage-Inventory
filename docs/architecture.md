# Garage Lab Inventory MVP Architecture

## Database Schema

The database is SQLite and stored locally at `data/garage-inventory.sqlite`. The model keeps a few stable columns for fast filtering and uses JSON text fields for expandable metadata.

### `locations`

- `id`
- `name`
- `code`
- `type`
- `parent_id`
- `notes`
- `created_at`
- `updated_at`

Locations are hierarchical through `parent_id`, for example `Shelf B > Bin MOTORS-1`.

### `inventory_items`

- `id`
- `name`
- `base_type`
- `category`
- `tags`
- `attributes`
- `quantity`
- `units`
- `dimensions`
- `material_composition`
- `condition`
- `location_id`
- `notes`
- `photos`
- `source_origin`
- `tested_status`
- `confidence_level`
- `salvage_status`
- `date_added`
- `created_at`
- `updated_at`

Flexible fields are stored as JSON arrays or objects:

- `tags`: string array
- `attributes`: object
- `dimensions`: object
- `material_composition`: string array or object
- `photos`: string array

### `capability_upgrades`

- `id`
- `name`
- `estimated_cost`
- `capabilities_unlocked`
- `related_item_ids`
- `priority`
- `status`
- `notes`
- `created_at`
- `updated_at`

## Folder Structure

```text
.
├── data/
├── docs/
│   └── architecture.md
├── server/
│   ├── db/
│   │   ├── database.js
│   │   └── schema.sql
│   └── index.js
├── src/
│   ├── components/
│   ├── lib/
│   ├── App.jsx
│   ├── main.jsx
│   └── styles.css
├── index.html
├── package.json
└── vite.config.js
```

### `tags`

- `id`
- `name`
- `normalized_name`
- `use_count`
- `created_at`
- `updated_at`

Tags are still stored on each item as flexible JSON. The `tags` table is a lightweight registry used for autocomplete, frequency counts, duplicate prevention, and browsing. It is refreshed from inventory data after item changes and imports.

## API Design

- `GET /api/health`
- `GET /api/items`
- `POST /api/items`
- `GET /api/items/:id`
- `PUT /api/items/:id`
- `DELETE /api/items/:id`
- `GET /api/locations`
- `POST /api/locations`
- `PUT /api/locations/:id`
- `DELETE /api/locations/:id`
- `GET /api/capabilities`
- `POST /api/capabilities`
- `PUT /api/capabilities/:id`
- `DELETE /api/capabilities/:id`
- `GET /api/tags`
- `POST /api/tags`
- `GET /api/export`
- `POST /api/import`

## React Component Architecture

- `App`: page shell, navigation, global data loading
- `InventoryList`: dense item table and item selection
- `QuickAddForm`: fast item creation with tags and attributes
- `ItemDetail`: progressive refinement editor for selected item
- `LocationManager`: hierarchical storage manager
- `CapabilityTracker`: workshop upgrade and capability list
- `CapabilityDetail`: edit/create/delete form inside capability tracker
- `SearchView`: structured search/filter surface
- `TagInput`: reusable chip/autocomplete tag entry
- `TagBrowser`: searchable tag registry and filter launcher
- `ImportExport`: JSON export/import workspace
- `TagPill`: compact tag display

## LAN Access

The server listens on `0.0.0.0` so another device on the same local network can reach it. The web app is served from Vite preview on port `4173`, and production API calls use the same hostname on port `3107`.

Use `npm.cmd run lan`, then open `http://<local-ip>:4173` from a phone on the same Wi-Fi.

## Initial UI Wireframe Concepts

```text
+---------------------------------------------------------------+
| Garage Lab Inventory      [Inventory] [Search] [Storage] ...  |
+----------------------+----------------------------------------+
| Quick Add            | Inventory List                         |
| Name                 | search box / filters                   |
| Type Category        | ID  Name  Tags  Qty  Location  Status  |
| Tags                 | ...                                    |
| Save                 |                                        |
+----------------------+----------------------------------------+
| Detail panel opens inline for selected item                   |
+---------------------------------------------------------------+
```

```text
Search / Filter
+---------------------------------------------------------------+
| query: copper wire                         tags: conductive    |
| base type | category | location | salvage status | tested      |
+---------------------------------------------------------------+
| Results table                                                  |
+---------------------------------------------------------------+
```

```text
Storage
+------------------------+--------------------------------------+
| Add location           | location tree                         |
| name/type/code/parent  | Shelf B                               |
|                        |   Bin MOTORS-1                        |
+------------------------+--------------------------------------+
```

## MVP Implementation Plan

1. Create the schema and local API with JSON import/export. Done.
2. Build the inventory list, quick add form, and item detail editor. Done.
3. Add location hierarchy management and location filtering. Done.
4. Add capability/upgrade tracking. Done.
5. Add a dedicated search page over names, tags, attributes, dimensions, materials, storage, and notes. Done.
6. Add reusable tag management with autocomplete and counts. Done.
7. Add LAN/mobile startup support and mobile-friendly layouts. Done.
8. Prepare for photo uploads, QR labels, advanced filters, and relationships through existing JSON fields and related item IDs. Started.
