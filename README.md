# AgriConnect Monorepo (Node + React)

This repository now contains only:

- `node_agriconnect/` (Node.js + Express + Sequelize backend)
- `react_agriconnect/` (React + Vite frontend)

## Development

Backend (monolith dev mode):

```bash
cd node_agriconnect
npm install
npm run dev
```

This command builds both frontends and runs the backend, serving:

- User app at `http://localhost:3000/`
- Admin app at `http://localhost:3000/admin-panel/`

Backend-only dev (without frontend builds):

```bash
cd node_agriconnect
npm run dev:backend
```

Frontend:

```bash
cd react_agriconnect
npm install
npm run dev
```

## Monolith Mode (Single Server)

You can serve both frontends from the Node backend on one port.

User app: `http://localhost:3000/`

Admin app: `http://localhost:3000/admin-panel`

Run with MySQL env:

```bash
cd node_agriconnect
set -a && source .env.mysql && set +a
npm run start:monolith
```

Environment overrides:

- `USER_APP_BASE` (default `/`)
- `ADMIN_UI_BASE` (default `/admin-panel`)

## MySQL Migration (From Existing PostgreSQL Data)

The backend supports dialect switching via env (`DB_DIALECT=postgres|mysql`).

### 1) Start MySQL dev database

```bash
cd node_agriconnect
npm run db:mysql:up
```

MySQL dev defaults are in `node_agriconnect/docker-compose.mysql.yml`.

### 2) Configure env for MySQL target + PG source

```bash
cd node_agriconnect
cp .env.mysql.example .env.mysql
```

Set values in `.env.mysql`:

- MySQL target (`DB_*`)
- PostgreSQL source (`PG_SRC_*`)

### 3) Build schema in MySQL using Sequelize migrations

```bash
cd node_agriconnect
set -a && source .env.mysql && set +a
npm run db:migrate:mysql
```

### 4) Copy data from PostgreSQL to MySQL

```bash
cd node_agriconnect
set -a && source .env.mysql && set +a
npm run db:copy:pg-to-mysql
```

The copy script is: `node_agriconnect/scripts/migrate_pg_to_mysql.js`.

### 5) Run backend against MySQL

```bash
cd node_agriconnect
set -a && source .env.mysql && set +a
npm run dev
```

### 6) Validate app flows

Run backend tests and frontend E2E to confirm migration integrity.

## Notes

- Install dependency updates in `node_agriconnect` after pulling changes:

```bash
cd node_agriconnect
npm install
```

- `mysql2` is now required for MySQL runtime.
