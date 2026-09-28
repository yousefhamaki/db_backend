# db_backend

Backend API (Node/Express + Oracle DB) with auth, connections, and devices management.

## Setup

```bash
npm install
cp .env.example .env   # fill in DB credentials and a JWT secret
npm run migrate sql/001_auth_and_devices.sql
npm start
```

API docs (Swagger UI): `http://localhost:3000/api-docs/`
