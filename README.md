# AgriConnect Monorepo (Node + React)

This repository now contains only:

- `node_agriconnect/` (Node.js + Express + Sequelize backend)
- `react_agriconnect/` (React + Vite frontend)

## Deploying This Folder Structure

This repo is a monorepo and is deployable without moving folders.

Key points:

- Root `package.json` uses npm workspaces, so `npm install` at repo root installs backend + frontend + admin dependencies.
- Production deploy should run from repo root using:
	- Build command: `npm run deploy:build`
	- Start command: `npm run deploy:start`
- Backend serves the built frontends from:
	- User app: `/`
	- Admin app: `/admin-panel`

Environment variables required for backend runtime:

- `NODE_ENV=production`
- `PORT` (provided by most hosts)
- `DB_DIALECT` (`postgres` or `mysql`)
- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASS`
- `JWT_SECRET`

Optional frontend mount overrides:

- `USER_APP_BASE` (default `/`)
- `ADMIN_UI_BASE` (default `/admin-panel`)

### Hostinger Note

If Hostinger shows `Unsupported framework or invalid project structure`, this repo now exposes a root Node entrypoint (`app.js`) for detection.

Use these settings in Hostinger deployment:

- Build command: `npm install && npm run deploy:build`
- Start command: `npm run deploy:start`
- Node version: `18+`

If Hostinger still refuses monorepo detection in your plan/UI, deploy by one of these alternatives:

- Use Hostinger VPS (manual Node process/PM2 deployment).
- Deploy this repo on Render/Railway (works with the included root scripts).

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

MySQL-backed dev shortcuts:

```bash
cd node_agriconnect
npm run dev:mysql
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
npm run start:mysql
```

Environment overrides:

- `USER_APP_BASE` (default `/`)
- `ADMIN_UI_BASE` (default `/admin-panel`)

## MySQL Migration (From Existing PostgreSQL Data)

The backend supports dialect switching via env (`DB_DIALECT=postgres|mysql`).

## Export Local MySQL and Deploy to Server

If your DB is local (for example `127.0.0.1:3306`), export it and restore on your server DB.

From `node_agriconnect/`, create `.env.mysql` with your values (example):

```env
DB_DIALECT=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=agriconnect_mysql_dev
DB_USER=agri
DB_PASS=agri123
```

Create dump:

```bash
cd node_agriconnect
npm run db:dump:mysql
```

This creates a compressed file in `node_agriconnect/backups/` like:

- `agriconnect_mysql_dev_YYYYMMDD_HHMMSS.sql.gz`

Restore to server DB:

```bash
cd node_agriconnect
DB_HOST=<server-db-host> \
DB_PORT=3306 \
DB_NAME=<server-db-name> \
DB_USER=<server-db-user> \
DB_PASS=<server-db-password> \
DUMP_FILE=./backups/<your_dump_file>.sql.gz \
npm run db:restore:mysql
```

After restore, set these runtime env vars in your deployed app service:

- `DB_DIALECT=mysql`
- `DB_HOST=<server-db-host>`
- `DB_PORT=3306`
- `DB_NAME=<server-db-name>`
- `DB_USER=<server-db-user>`
- `DB_PASS=<server-db-password>`
- `NODE_ENV=production`
- `JWT_SECRET=<strong-secret>`

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
