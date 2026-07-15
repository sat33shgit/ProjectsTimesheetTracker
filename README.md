# Projects Timesheet Tracker

A Next.js time tracking and project management dashboard built with TypeScript, Drizzle ORM, and Vercel Postgres.

## Overview

This app provides:

- A dashboard with project earnings, total hours, and top project insights.
- A timesheet page for logging and reviewing time entries.
- Project management with active/inactive project support.
- Settings for billing rates and currency conversion.
- Figma version tracking and Figma URL management.
- Excel import/export support for timesheet, Figma versions, and Figma URLs.
- Admin seeding and reset endpoints protected by an admin token.

## Getting Started

### Install dependencies

```bash
npm install
```

### Configure environment

Create a `.env.local` file in the repository root with at least:

```env
POSTGRES_URL=postgres://user:password@localhost:5432/database
ADMIN_API_TOKEN=your-admin-token
```

- `POSTGRES_URL` is required for the database connection.
- `ADMIN_API_TOKEN` is optional but required for `/api/seed` and `/api/reset`.

### Run development server

```bash
npm run dev
```

Open `http://localhost:3000` and the app will redirect to `/timesheet`.

### Build for production

```bash
npm run build
npm start
```

## Scripts

- `npm run dev` — start development server
- `npm run build` — compile production build
- `npm start` — run production server
- `npm run lint` — run ESLint

## App Structure

- `src/app/(dashboard)` — dashboard layout and route groups
- `src/app/(dashboard)/dashboard` — dashboard overview page
- `src/app/(dashboard)/timesheet` — timesheet logs and entry drawer
- `src/app/(dashboard)/settings` — project settings, import/export, and billing rates
- `src/app/(dashboard)/figma-urls` — manage Figma URLs
- `src/app/(dashboard)/figma-versions` — manage Figma version history
- `src/lib/db` — Drizzle schema and database setup
- `src/lib/utils` — helpers for date, format, Excel import, and auth

## Database

This project uses Drizzle ORM with `@vercel/postgres`.

- Schema is defined in `src/lib/db/schema.ts`
- Drizzle config is in `drizzle.config.ts`

## Admin API

If `ADMIN_API_TOKEN` is configured, you can seed or reset the database:

```bash
curl -X POST http://localhost:3000/api/seed -H "x-admin-token: your-admin-token"
curl -X DELETE http://localhost:3000/api/reset -H "x-admin-token: your-admin-token"
```

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Drizzle ORM / drizzle-kit
- @vercel/postgres
- Zustand
- react-hook-form + Zod
- Recharts
- Lucide React
- @base-ui/react
- date-fns
- xlsx
- sonner

## Notes

- The app uses Vercel-style Postgres integration, but any Postgres-compatible database works with a valid connection URL.
- `/api/settings` persists billing rates and project configurations.
- Excel import/export is available from the settings page.
