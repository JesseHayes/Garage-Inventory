# Garage Lab Inventory

Local-first inventory and workshop capability tracker for a garage laboratory or workshop.

## Start On This PC

Install dependencies once:

```powershell
npm.cmd install --cache .\.npm-cache
```

Build the app:

```powershell
npm.cmd run build
```

Start the API and web app:

```powershell
npm.cmd run lan
```

Open the app on this PC:

```text
http://127.0.0.1:4173
```

## Use From A Phone On The Same Wi-Fi

1. Start the app with:

```powershell
npm.cmd run lan
```

2. Find this PC's local network IP:

```powershell
npm.cmd run ip
```

Look for an address like `192.168.x.x`, `10.x.x.x`, or `172.x.x.x`.

3. On your phone, connect to the same Wi-Fi network.

4. In the phone browser, open:

```text
http://YOUR-PC-IP:4173
```

Example:

```text
http://192.168.1.25:4173
```

The API runs on port `3107`, and the web app runs on port `4173`. If Windows Firewall asks, allow Node.js on private networks.

## Access Online

For internet access, use the single-server mode. This serves both the web app and API from port `3107`.

Set a username and password first:

```powershell
$env:GARAGE_AUTH_USER="garage"
$env:GARAGE_AUTH_PASSWORD="choose-a-long-password"
```

Build and start the online-ready server:

```powershell
npm.cmd run online
```

Open it locally:

```text
http://127.0.0.1:3107
```

To reach it from outside your home network, expose port `3107` using one of these methods:

- A tunnel service that forwards a public HTTPS URL to `http://localhost:3107`
- Router port forwarding from an external port to this PC on port `3107`
- A self-hosted reverse proxy/VPN if you already use one

Tunnel services are usually the lowest-friction option because they do not require router changes. Router port forwarding works, but only use it with a strong password and ideally behind HTTPS.

If Windows Firewall asks, allow Node.js on private networks. For internet exposure, you may also need to allow inbound traffic for the tunnel tool or forwarded port.

## GitHub Pages Version

GitHub Pages can host the app without a running server, but it cannot run SQLite. The Pages build uses browser storage instead:

- The current SQLite data is exported into `public/seed-data.json` during build.
- The first time the Pages app opens, it copies that seed data into the browser.
- Edits stay in that browser's local storage.
- Use JSON Export/Import to back up or move data between devices.

Build the Pages version locally:

```powershell
npm.cmd run build:pages
```

Preview it:

```powershell
npm.cmd run preview
```

To publish on GitHub:

1. Push this project to a GitHub repository.
2. In the repository settings, enable GitHub Pages with GitHub Actions as the source.
3. Push to `main`.
4. The workflow at `.github/workflows/pages.yml` will build and publish the app.

Important: GitHub Pages is public unless your GitHub plan/repo settings support private Pages. Do not rely on it for secret or hazardous information. Keep regular JSON exports as backups.

## Data Storage

The SQLite database is stored locally:

```text
data/garage-inventory.sqlite
```

JSON export/import is available inside the app for backups and for copy-pasting structured inventory data into ChatGPT.

## Tag System

Tags remain user-defined and flexible. The app tracks every used inventory tag in a lightweight `tags` registry with:

- normalized names for duplicate prevention
- use counts
- autocomplete suggestions
- a searchable tag browser
- clickable tags for inventory filtering

The app nudges reuse, but it does not hardcode tag categories.

## Attribute Format

Attributes can be typed quickly:

```text
shaft: 7.5 mm, voltage: 12 V, rpm: unknown
```

Numeric values are stored in structured form:

```json
{
  "shaft": { "value": 7.5, "unit": "mm" }
}
```

Plain text remains plain text when it cannot be safely interpreted as a number.
