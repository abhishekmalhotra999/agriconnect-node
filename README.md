# AgriConnect Backend

This repository is now backend-only.

## Structure

- `node_agriconnect/` (Node.js + Express + Sequelize API)

## Deploy (Hostinger/Node hosts)

Deploy from repository root with:

- Build command: `npm install && npm run deploy:build`
- Start command: `npm run deploy:start`
- Node version: `18+`

`deploy:build` is a no-op for backend-only mode.

## Environment Variables

Required:

- `NODE_ENV=production`
- `PORT` (usually injected by host)
- `DB_DIALECT=mysql`
- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASS`
- `JWT_SECRET`

Optional integrations:

- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`

## Development

```bash
cd node_agriconnect
npm install
npm run dev
```

MySQL `.env.mysql` local run:

```bash
cd node_agriconnect
npm run start:mysql
```

## Database Export / Restore

Export local MySQL:

```bash
cd node_agriconnect
npm run db:dump:mysql
```

Restore dump to server MySQL:

```bash
cd node_agriconnect
DB_HOST=<server-db-host> \
DB_PORT=3306 \
DB_NAME=<server-db-name> \
DB_USER=<server-db-user> \
DB_PASS=<server-db-password> \
DUMP_FILE=./backups/<dump-file>.sql.gz \
npm run db:restore:mysql
```
