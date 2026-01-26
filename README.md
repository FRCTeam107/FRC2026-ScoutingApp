# FRC 2026 Scouting Web App

A PWA for FRC match and pit scouting, built with React + Vite. Works offline and syncs to Supabase when connected.

## Quickstart

```bash
git clone https://github.com/Corzed/FRC2026-ScoutingWebApp.git
cd FRC2026-ScoutingWebApp
npm install
```

Create a `.env` file in the project root:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Start the dev server:

```bash
npm run dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |

## Tech Stack

- React 19
- Vite 7
- React Router
- Supabase (database + storage)
- PWA via vite-plugin-pwa
