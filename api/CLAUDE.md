# /api — External API Routes

This directory contains the route handlers for all `/api/*` endpoints. These routes are for **external callers only** — GitHub Actions, Telegram, cURL, third-party webhooks.

## Auth

Most routes require a valid API key passed via the `x-api-key` header. API keys are stored in the SQLite database and managed through the admin UI — they are NOT environment variables.

**Public routes** (no API key needed): `/ping`, `/telegram/webhook` (Telegram webhook secret), `/github/webhook` (GitHub webhook secret), `/oauth/callback` (validated via short-lived `state` token).

Auth flow: `x-api-key` header → `verifyApiKey()` → DB lookup (hashed, timing-safe comparison). Two key types exist:

- **User-owned API keys** — long-lived, created via the admin UI, used by external callers (cURL, GitHub Actions, Telegram register).
- **Per-job agent API keys** (`agent_job_api_key`) — short-lived, auto-created when an agent-job container launches (`createAgentJobApiKey()` in `lib/db/api-keys.js`), tied to the container name, and cleaned up by the maintenance cron after expiry. Only this key type is allowed to call `/api/get-agent-job-secret` (the route rejects other types).

## Do NOT use these routes for browser UI

Browser-facing data fetching uses **fetch route handlers** colocated with pages (`route.js` files in `web/app/`). These check `auth()` session — never use `/api` routes from the browser. Server actions (`'use server'`) are used only for **mutations** (rename, delete, star, config updates) — never for data fetching (causes page refresh issues). Handler implementations live in `lib/chat/api.js`; route files are thin re-exports.

| Caller | Mechanism | Auth |
|--------|-----------|------|
| External (cURL, GitHub Actions, Telegram) | `/api` route | `x-api-key` header |
| Browser UI (data fetching) | Fetch route handler colocated with page | `auth()` session |
| Browser UI (mutations) | Server action | `requireAuth()` session |
| Browser UI (streaming) | `/stream/chat`, `/stream/containers`, `/stream/cluster/*/logs` | `auth()` session |

## Routes

| Method | Path | Auth | Handler |
|--------|------|------|---------|
| GET | `/api/ping` | None | Health check |
| POST | `/api/create-agent-job` | `x-api-key` | Create agent job |
| GET | `/api/get-agent-job-secret` | `agent_job_api_key` only | Get an agent job secret. `oauth2` credentials return only the access_token (auto-refreshed under a lock; rotated refresh tokens are persisted back). Other secret types return the raw value. |
| POST | `/api/set-agent-job-secret` | `agent_job_api_key` only | Create or update an agent-job secret from inside the container (used by the `set-secret` skill). |
| GET | `/api/agent-job-list-secrets` | `x-api-key` | List agent job secret keys (no values); returns `{secrets: [{key, isSet, updatedAt, secretType}]}` |
| GET | `/api/agent-jobs/status` | `x-api-key` | Agent job status (query: `?agent_job_id=`) |
| POST | `/api/telegram/webhook` | Telegram webhook secret | Telegram message handler (per-user routing via `user_channels`; verifies via `/verify <code>`, dispatches `/session` commands) |
| POST | `/api/telegram/register` | `x-api-key` | Register bot token + webhook URL |
| POST | `/api/github/webhook` | GitHub webhook secret | GitHub event handler |
| POST | `/api/cluster/:clusterId/role/:roleId/webhook` | `x-api-key` | Trigger cluster role execution |
| GET/POST | `/api/oauth/callback` | `state` token | OAuth provider redirect target. Exchanges `code` for tokens, persists via `setAgentJobSecret(name, stored, 'oauth')`. |
