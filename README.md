# db_backend

Backend API (Node/Express + Oracle DB) with auth, connections, devices, preferences and SQL query history.

## Setup

```bash
npm install
cp .env.example .env   # fill in DB credentials and a JWT secret
# run every file in sql/ once, in order (001 ... 006)
npm run migrate sql/001_auth_and_devices.sql
npm start              # builds TypeScript into dist/, then runs node dist/server.js
```

API docs (Swagger UI): `http://localhost:3000/api-docs/`

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Run with auto-reload (`ts-node-dev`), no build step |
| `npm run build` | Compile `src/` to `dist/` |
| `npm start` | Build, then run `dist/server.js` |
| `npm test` | Jest unit tests (`spec/`) |
| `npm run test:coverage` | Same, with a coverage report |
| `npm run typecheck` | `tsc --noEmit` |

## Code layout

The project is mid-migration from plain JavaScript to the TypeScript standard (one service and one controller per
endpoint, response DTOs, Joi validation, a Jest spec for every unit). **New endpoints are written in the standard**;
the older ones (`auth`, `connections`, `devices`, `preferences`) are still JavaScript and compile through `allowJs`.
Query history (`/api/query-history`) is the first feature built in the standard: see `src/routes/queryHistory.route.ts`
for how routes, services, controllers, the Oracle model and traits are wired together.

Routes written in the standard document themselves with `@openapi` blocks, which are merged into `/api-docs`.

## Deploying

The build command is `npm install && npm run build`; the start command is `npm start`.
