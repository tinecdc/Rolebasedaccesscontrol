
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

  ## Deploying to Vercel

  This app is structured as a frontend + API split. The frontend is deployed to Vercel, while the Express API should run on a separate host such as Render.

  ### Frontend env var

  Create a Vercel environment variable:

  ```bash
  VITE_API_URL=https://your-render-api.onrender.com
  ```

  The frontend uses relative `/api/*` requests, and [vercel.json](vercel.json) rewrites those requests to the configured backend origin.

  ### API env vars for Render

  On the backend host, set:

  ```bash
  PORT=3001
  NODE_ENV=production
  CORS_ORIGIN=https://your-vercel-app.vercel.app
  # For production use MySQL (or set to nothing to use local SQLite)
  DATABASE_URL=mysql://user:password@host:3306/database_name
  ```

  This app uses local SQLite for development by default. Set `DATABASE_URL` to a MySQL connection string to run the API against MySQL in production.

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
