# FRC 2026 Scouting App — Team 107

A PWA for FRC match and pit scouting, built with React + Vite. Works fully offline and syncs to Supabase when connected.

## Features

**Three roles, one app:**
- **Pit Scouter** — Create robot profiles with photos, shooting rate (balls/sec), and a description
- **Match Scouter** — Track auto/teleop firing time with a live timer, shooting accuracy, climb levels, pickup location, defense rating, and notes
- **Manager** — View analytics, team rankings, climb charts, pit data, match history, and per-team lookups

**Manager Dashboard tabs:**
- **Analytics** — Team rankings sortable by auto fuel, teleop fuel, total fuel, or defense. Climb-by-level bar chart for top 10 teams (auto or endgame view)
- **Pit Data** — All pit-scouted teams with photos and robot specs
- **Match Data** — Full match record table
- **Team Lookup** — Detailed stats + match history for any team
- **Event Setup** — Load teams from The Blue Alliance by event key (e.g. `2026miket`)

**Offline-first:** All data is saved to `localStorage` immediately. A background sync pushes pending records to Supabase whenever you're online.

**PWA:** Installable on Android and iOS. Works at venues with no WiFi.

## Quickstart

```bash
git clone https://github.com/FRCTeam107/FRC2026-ScoutingApp.git
cd FRC2026-ScoutingApp
npm install
```

Create a `.env.local` file in the project root:

```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_TBA_KEY=your_tba_api_key
```

- **Supabase** — Create a free project at [supabase.com](https://supabase.com). The URL and anon key are in Project Settings → API.
- **TBA key** — Register at [thebluealliance.com/account](https://www.thebluealliance.com/account) to get a free read API key.

Start the dev server:

```bash
npm run dev
```

## Supabase Setup

Run the following SQL in your Supabase SQL editor to create the required tables:

```sql
-- Team profiles (pit scouting)
create table team_profiles (
  team_number integer primary key,
  description text,
  balls_per_second numeric,
  photo_url text,
  updated_at timestamptz default now()
);

-- Match records
create table match_records (
  id uuid primary key default gen_random_uuid(),
  team_number integer not null,
  match_number integer not null,
  alliance_color text,
  auto_firing_seconds numeric,
  auto_accuracy integer,
  auto_climb text,
  teleop_firing_seconds numeric,
  teleop_accuracy integer,
  teleop_climb text,
  pickup_location text,
  defense_rating integer,
  notes text,
  scouter_device_id text,
  unique (team_number, match_number, scouter_device_id)
);

-- Admin password
create table app_settings (
  key text primary key,
  value text
);
insert into app_settings (key, value) values ('admin_password', 'your_password_here');
```

Then create a **Storage bucket** named `robot-photos` and set it to **public** so robot photos can be displayed across devices.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run deploy` | Deploy to GitHub Pages |

## Tech Stack

- React 19
- Vite 7
- React Router 7
- Supabase (database + photo storage + admin auth)
- The Blue Alliance API v3 (event/team data)
- vite-plugin-pwa (offline PWA support)

## Deployment

The app is configured to deploy to GitHub Pages via `gh-pages`:

```bash
npm run deploy
```

Make sure the `base` in `vite.config.js` matches your repo path if deploying to a subdirectory. For a custom domain or root deployment it stays as `'/'`.
