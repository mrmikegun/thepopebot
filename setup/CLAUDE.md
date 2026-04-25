# setup/ — Interactive Setup Wizard

Entry point: `setup.mjs` (invoked via `thepopebot setup`).

## Wizard Steps

1. **Load `.env`** — `dotenv.config()` runs first so existing values are available to subsequent steps.
2. **Prerequisites** — Checks Node.js (>=18), git, gh CLI (authenticated), Docker. Initializes git repo and GitHub remote if needed.
3. **GitHub PAT** — Validates fine-grained token with required scopes (Actions, Admin, Contents, PRs, Secrets, Workflows).
4. **App URL** — Prompts for public HTTPS URL (ngrok, VPS, PaaS). Generates webhook secret.
5. **Sync Config** — Writes secrets/variables to GitHub and local DB via `syncConfig()`.
6. **Start Server** — Starts Docker containers, polls `/api/ping` to confirm.

The setup wizard does NOT run `npm run build` — `.next` is baked into the event-handler Docker image at publish time.

## Database

Settings DB defaults to `data/db/thepopebot.sqlite` (relative to project root). Override via `DATABASE_PATH` in `.env`. Schema migrations run automatically on server start (`lib/db/index.js`).

## Sync Target Types

Config values are synced to different targets via `lib/sync.mjs`:

| Target | Storage | Example |
|--------|---------|---------|
| `env` | `.env` file | `APP_URL`, `GH_OWNER` |
| `db` | `settings` table (plaintext) | Non-secret config |
| `db_secret` | `settings` table (encrypted) | `GH_TOKEN` |
| `github_secret` | GitHub repo secret | `GH_TOKEN`, `WEBHOOK_SECRET` |
| `github_variable` | GitHub repo variable | `LLM_PROVIDER`, `LLM_MODEL` |

A single config field can sync to multiple targets (e.g., `GH_TOKEN` → `db_secret` + `github_secret` + `env`).

## Adding New Config Fields

1. Add the field definition to the sync config map in `lib/sync.mjs` with its target(s)
2. If it needs user input, add a prompt step in `setup.mjs`
3. Run `syncConfig()` to write to all targets
