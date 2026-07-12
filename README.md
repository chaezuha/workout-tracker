# workout-tracker

## Setup

### 1. Create the Supabase project

The app stores its data in Supabase, so you need a (free) project first:

1. Go to [supabase.com](https://supabase.com), sign in, and create a **New Project**.
2. Open the **SQL Editor** and run the migrations in order:
   [`supabase/migrations/0000_init.sql`](supabase/migrations/0000_init.sql)
   first (base tables), then
   [`supabase/migrations/0001_sessions.sql`](supabase/migrations/0001_sessions.sql)
   (sessions). Both are safe to re-run on a project that already has the
   tables.
3. Under **Settings → API**, copy the **Project URL** and the **anon/publishable
   key** (you'll need both for `.env`).

### 2. Run with Docker Compose (recommended)

The prebuilt image is published to GHCR, so you don't need to clone the repo
or install Node. Put [`compose.yaml`](compose.yaml) and a `.env` (see
[`.env.example`](.env.example)) in a folder, paste your Supabase URL and anon
key into `.env`, then:

```sh
mkdir workout-tracker && cd workout-tracker
curl -O https://raw.githubusercontent.com/chaezuha/workout-tracker/main/compose.yaml
curl -o .env https://raw.githubusercontent.com/chaezuha/workout-tracker/main/.env.example
# edit .env and paste in your Supabase URL and anon key
docker compose up -d          # pulls the prebuilt GHCR image
docker compose logs -f        # follow logs
```

The app is now at [http://localhost:8080](http://localhost:8080) (change the
port with `PORT` in `.env`).

(If your Docker setup needs root, prefix the `docker` commands with `sudo` or
add yourself to the `docker` group.)

The compose file sets `restart: unless-stopped`, so the app comes back on its
own after crashes and reboots. It also sets `pull_policy: always`, which makes
re-running `up -d` double as the update command:

```sh
docker compose up -d          # checks the registry and pulls a newer image if one exists
```

Your Supabase credentials are injected when the container starts (they are not
baked into the image), so switching projects is just an edit to `.env` and
another `docker compose up -d`.

**Data:** everything lives in your Supabase project, not in the container.
`docker compose down`, rebuilds, and image updates never touch your workout
history.

### Alternative: build the image from source

To build the image yourself instead (e.g. for local changes):

```sh
git clone https://github.com/chaezuha/workout-tracker.git
cd workout-tracker
docker build -t ghcr.io/chaezuha/workout-tracker:latest .
docker compose up -d --pull never   # --pull never keeps your local build
```

### Alternative: run directly with Node

You'll need Node.js 22+. Then install, configure, and run:

```sh
git clone https://github.com/chaezuha/workout-tracker.git
cd workout-tracker/frontend
npm install
cp .env.example .env.local  # then edit .env.local and paste in your Supabase URL and anon key
npm run dev
```

The dev server runs at [http://localhost:5173](http://localhost:5173). To test
the production build and the service worker (offline support, install prompt),
use `npm run build && npm run preview` instead; the dev server doesn't run the
service worker.

## Configuration (`.env`)

For Docker (the `.env` next to `compose.yaml`):

| Variable            | Required | Description                                                    |
| ------------------- | -------- | -------------------------------------------------------------- |
| `SUPABASE_URL`      | yes      | Project URL from **Settings → API** in the Supabase dashboard. |
| `SUPABASE_ANON_KEY` | yes      | The anon/publishable key from the same page.                   |
| `PORT`              | no       | Host port the app is served on (default `8080`).               |

For the Node dev server (`frontend/.env.local`, see
[`frontend/.env.example`](frontend/.env.example)), the same two Supabase values
go in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. `PORT` sets the Vite
dev server port there instead (default `5173`).

## Development

```sh
cd frontend
npm install
npm run lint      # eslint
npm test          # vitest unit tests (no network needed)
```

CI runs both on every push to `main` and every PR. Pushes to `main` also
publish the multi-arch Docker image to GHCR.
