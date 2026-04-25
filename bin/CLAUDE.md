# bin/ — CLI Tools

Entry point: `cli.js` (invoked via `npx thepopebot <command>`).

## Commands

| Command | Purpose |
|---------|---------|
| `init [--no-managed] [--no-install]` | Scaffold project from templates, sync managed files, create `.env`, install deps |
| `setup` | Run interactive setup wizard (see `setup/CLAUDE.md`) |
| `setup-telegram` | Reconfigure Telegram webhook |
| `setup-ssl` | Configure SSL with Let's Encrypt wildcard cert |
| `upgrade [@beta\|version]` | Upgrade package, run init, rebuild, commit, push, restart Docker |
| `reset [file]` | Restore a template file to defaults |
| `reset-all` | Nuclear reset — restore entire project to fresh init state |
| `audit` | Show project state vs. package templates (modified / missing / unknown) |
| `diff [file]` | Show diff between user file and package template |
| `reset-auth` | Regenerate `AUTH_SECRET` (invalidates all sessions) |
| `set-var <KEY> [VALUE]` | Set GitHub repository variable (also reads piped stdin) |
| `user:password <email>` | Change user password |
| `sync <path>` | Dev helper — pack, build, upload local package to test install |
| `sync --fast <path>` | Fast variant — copy source into the running container and rebuild `.next` only |

## Managed Paths System

`managed-paths.js` defines files auto-synced by `init`. These are overwritten on every init/upgrade — users should not edit them.

**Managed paths**: `.github/workflows/`, `docker-compose.yml`, `.dockerignore`, `.gitignore`.

`isManaged(relPath)` — returns true if a path is managed (exact match or directory prefix).

## Template Processing

- Templates live in `templates/` with optional `.template` suffix
- `.template` suffix is stripped when copying to the user project (e.g., `CLAUDE.md.template` → `CLAUDE.md`)
- Managed files are deleted from user projects if removed from templates
- Non-managed template files are only created, never overwritten

## docker-build.js

Builds the event-handler Docker image locally. Used by `docker-compose.yml` build step. Bakes the npm package, `web/` source, and `.next` build output into the image.
