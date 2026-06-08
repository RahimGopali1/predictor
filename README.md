# 2026 FIFA World Cup Predictor

Angular 20 app with Express API — dynamic team data from FIFA (and Google ranking hints), Monte Carlo tournament simulation, and an admin dashboard for user predictions.

## Quick Start

```bash
# Install all dependencies
npm run install:all

# Terminal 1 — API server (port 3001)
npm run server

# Terminal 2 — Angular app (port 4200)
npm run client
```

Open **http://localhost:4200** for the predictor.  
Open **http://localhost:4200/admin** for the admin panel (default key: `wc2026admin`).

## Project Structure

| Path | Description |
|------|-------------|
| `client/` | Angular 20 frontend (original design preserved) |
| `server/` | Express API — FIFA sync, predictions storage |
| `data/` | Team metadata, predictions JSON, FIFA cache |
| `index.html` | Original static version (kept for reference) |

## Features

- **Dynamic teams** — Synced from [FIFA World Cup 2026](https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026/teams) on startup; FIFA rankings enriched via Google search hints when available
- **Live fixture tracking** — Full 104-match schedule; sandbox shows each team's **next match**; results sync from FIFA; eliminated teams auto-marked through group stage and knockouts
- **48 qualified nations** — Includes **Sweden** (UEFA playoff); Ukraine removed (did not qualify)
- **Admin panel** — Bar chart + table of all user champion picks after simulations
- **Prediction tracking** — Each completed 50k simulation run is saved with user name and top-5 picks

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/teams` | Cached team list |
| POST | `/api/teams/sync` | Refresh from FIFA |
| GET | `/api/fixtures/status` | Next match + elimination status per team |
| POST | `/api/fixtures/sync` | Sync match results from FIFA |
| POST | `/api/admin/fixtures/result` | Manually set a match score (admin) |
| POST | `/api/predictions` | Save user prediction |
| GET | `/api/admin/predictions` | All predictions (header: `X-Admin-Key`) |
| GET | `/api/admin/stats` | Aggregated stats for charts |

## Environment

- `PORT` — API port (default `3001`)
- `ADMIN_KEY` — Admin panel key (default `wc2026admin`)

## Netlify Deployment

This project is configured to deploy the Angular app to Netlify and run the API as a Netlify Function.

1. Create a Supabase project and add a table:

```sql
create table app_store (
  key text primary key,
  value jsonb,
  updated_at timestamptz default now()
);
```

2. Set Netlify environment variables:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_KEY` (optional)

3. Deploy the site to Netlify.

The Angular build will publish from `client/dist/client`, and `/api/*` will route to `netlify/functions/api`.
