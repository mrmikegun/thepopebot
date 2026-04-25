# docker/ — Docker Images & Compose

## Images

All tagged `stephengpope/thepopebot:{tag}-{version}`. A unified `coding-agent` base image supports multiple agents and runtimes:

| Image | Lifecycle | Purpose |
|-------|-----------|---------|
| `event-handler` | Long-lived | Next.js server. Installs npm package from npm, user project volume-mounted at `/app`, PM2 process manager |
| `coding-agent-claude-code` | Ephemeral/Long-lived | Unified coding agent: agent-job, headless, interactive, cluster-worker, and command runtimes |
| `coding-agent-pi-coding-agent` | Ephemeral/Long-lived | Pi coding agent variant |
| `coding-agent-codex-cli` | Ephemeral/Long-lived | OpenAI Codex CLI variant |
| `coding-agent-gemini-cli` | Ephemeral/Long-lived | Google Gemini CLI variant |
| `coding-agent-opencode` | Ephemeral/Long-lived | OpenCode variant |
| `coding-agent-kimi-cli` | Ephemeral/Long-lived | Kimi CLI variant |

All `coding-agent-*` images extend a shared `coding-agent-base-{version}` image (built first by `bin/docker-build.js`). Per-agent script structure (auth, setup, run, interactive, start-coding-session, merge-back) is documented in `docker/coding-agent/CLAUDE.md`.

## Docker Compose

`docker-compose.yml` runs: Traefik (reverse proxy), event-handler. Agent-job containers are NOT in compose — created on-demand by the event handler via Docker API.

Optional overlay compose files (in the project root, scaffolded to user projects):

- `docker-compose.litellm.yml` — adds a LiteLLM proxy sidecar at `http://litellm:4000`. The event handler syncs the user's custom-provider settings to `event-handler/litellm/main.yaml`, and `buildAgentAuthEnv()` routes Anthropic-only agents (Claude Code) through this proxy when targeting non-Anthropic providers.
- `docker-compose.port-forwards.yml` — exposes interactive code-workspace ports for local dev.
- `docker-compose.custom.yml` — user-owned overrides merged with the main compose file.

## Internal Only

This directory is build infrastructure — NOT published to npm, NOT scaffolded to user projects. CI/CD (`publish-npm.yml`) and local dev (`npm run docker:build`, `thepopebot sync`) use these files to build Docker images. Users pull pre-built images from Docker Hub.

## Secrets Flow

Agent-job containers receive auth env vars directly from the event handler via `buildAgentAuthEnv()` in `lib/tools/docker.js`. No GitHub Actions secrets flow — containers are launched locally.
