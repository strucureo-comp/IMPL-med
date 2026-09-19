# IMPL instrument intelligence

The IMPL search workspace is a standalone React frontend based on `../front-template`, connected to the contract in `../kls-martin-search/API_REFERENCE.md`. The backend and design reference are unchanged.

## Run

The backend runs on the Raspberry Pi at `http://aurelion.local:3000`, as recorded in the session notes. The frontend proxies to that address by default. Keep this computer on the same network as the Pi. In a terminal:

```powershell
cd E:\kls-martin-v2\frontend
npm install
npm run dev
```

Open http://127.0.0.1:5173. Vite forwards `/api` and `/health` to the Pi without requiring backend CORS changes. The frontend does not start or restart any backend services.

To use a different backend address:

```powershell
$env:API_TARGET = 'http://YOUR_PI_IP:3000'
npm run dev
```

You can also copy `.env.example` to `.env.local` and change `API_TARGET`. If `.local` name resolution is unavailable, use the Pi's LAN IP address. When running the frontend server on the Pi itself, set `API_TARGET=http://127.0.0.1:3000` and run `npm run dev -- --host 0.0.0.0` to make the frontend accessible on your LAN.

## Build

```powershell
npm run build
npm run preview
```

Production output is in `dist`. For deployment, configure your frontend web server to proxy `/api` and `/health` to the backend. Alternatively, set `VITE_API_BASE_URL` at build time to an existing API URL that supports requests from the frontend origin. `API_TARGET` also configures the local preview proxy.

## Features

- Instrument names, article codes, specifications, and competitor references.
- Specialty, author, sterility, single-use, and image-availability filters.
- Image matching with upload, clipboard paste, and drag-and-drop; image-only and 10 MB validation.
- Normalized family results, category facets, server pagination, competitor context, source links, suggestions, and low-confidence match labels.
- Full family details and article specifications loaded on demand.
- CSV list import with editable column mapping, headerless-file support, row correction/exclusion, and a generated search preview (100 items / 2 MB maximum).
- Batch matching with a serial request queue, pause/resume, per-row review, candidate pagination, retries, and quantity-aware tray additions. Exact catalog articles are preselected; family, descriptive, and competitor matches require review.
- A local surgery tray with article selection, quantities, removal, and visible add confirmations.
- PDF export with a report preview, editable hospital and set details, article photos, quantities, and automatic page breaks. CSV export is also available.
- Recent searches stored locally with a clear-history action.
- API health status, service errors, blocked-query guidance, empty states, and cancellable searches.
- Responsive layouts, keyboard controls, native dialog focus management, and reduced-motion support.

Tray and history data are saved on this browser only. There are no backend cart, history, authentication, or checkout calls. No prices or inventory are invented. Google Fonts are optional; system font fallbacks work offline. PDF reports use bundled, OFL-licensed Noto Sans fonts and are generated in the browser.

Imported CSVs are parsed locally. Only each generated search query is sent to the API; the file and extra columns are not uploaded. The import review lasts for the current app session and is paused when switching to single search. Reloading clears the review, while added tray articles remain saved. For the existing API's exact-code behavior, KLS Martin brand labels are retained in the original request but omitted from search text; competitor brand names remain in queries. Added import rows cannot be added again; edit their quantities in the tray.
