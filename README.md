
  # Role Based Access Control

  A role-based access control portal with a React frontend and SQLite-backed API.

  ## Running the app

  Install dependencies:

  ```bash
  pnpm install
  ```

  Start the API server (port 3001) and frontend (port 5173) in separate terminals:

  ```bash
  pnpm dev:server
  pnpm dev
  ```

  Open http://localhost:5173 and sign in with a demo account (e.g. `admin@company.com` / `admin123`).

  ## Database

  SQLite database is created automatically at `server/data/rba.db` on first server start, seeded with demo users and system access rules.

  To reset and re-seed, delete `server/data/rba.db` and restart the server.

  ## Demo accounts

  | Role        | Email                 | Password    |
  |-------------|-----------------------|-------------|
  | Super Admin | admin@company.com     | admin123    |
  | Manager     | manager@company.com   | manager123  |
  | Viewer      | user@company.com      | user123     |
  | Ops Lead    | ops@company.com       | ops123      |
