# Pawlease 🐾

A mobile-first web app (installable PWA) for looking after your dogs, shared with your family.

- **Pets**: profiles with breed, birthday/age, weight, microchip, food, allergies, meds and notes. Share a profile as text with a sitter or vet.
- **Quick actions**: one-tap logging of walks, meals, water, meds, potty, treats, baths and weight, plus *Call vet* and *Emergency* shortcuts.
- **Tasks & Notes**: due dates, times, assignees, and daily/weekly/monthly repeats (completing one schedules the next). Notes can be pinned, searched and linked to a pet.
- **Bookings**: vet, grooming, walking, daycare, boarding and training appointments. Export any booking to your calendar (.ics), get directions, or call.
- **Professionals**: *My Vet* (your go-to vet) plus *My Professionals*: groomers, walkers, sitters, trainers, daycare and more.
- **Guides**: emergency signs, toxic foods, vaccines and parasites, feeding, exercise, grooming, training, new puppy, senior care.
- **Family sharing**: households with invite links/codes, owner and member roles, removing members, rotating the code, belonging to several households and switching between them. Family activity feed; data syncs every 20 seconds and whenever the app regains focus.

## Stack

React + TypeScript + Vite frontend; Express API on libSQL/SQLite (`@libsql/client`): a local file in development, [Turso](https://turso.tech) in production. Cookie sessions with scrypt password hashing.

## Run

```bash
npm install
npm run dev          # API on :3001, web on http://localhost:5173
npm test             # API tests
npm run build && npm start   # production: one server on :3001 serving API + SPA
```

Environment: `PORT`, `DATABASE_PATH` (default `data/pawlease.db`), `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` (use Turso instead of the local file), `INSECURE_COOKIES=1` to allow production mode over plain HTTP (local testing only).

## Deploy to Vercel

Serverless functions have no persistent disk, so production data lives in Turso.

1. **Create a Turso database** (free tier is fine) at [app.turso.tech](https://app.turso.tech) or with the CLI:
   ```bash
   turso db create pawlease
   turso db show pawlease --url        # -> TURSO_DATABASE_URL (libsql://…)
   turso db tokens create pawlease     # -> TURSO_AUTH_TOKEN
   ```
2. **Import the GitHub repo** in Vercel (Add New → Project). Leave the framework as *Other*; `vercel.json` sets the build command.
3. **Add environment variables** `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` (Production and Preview), then deploy.

Tables are created automatically on the first request. `npm run build:vercel` produces the [Build Output API](https://vercel.com/docs/build-output-api/v3) bundle in `.vercel/output`: the SPA as static files and the API as one bundled Node function at `/api/*`.
