# Repository Guidelines

## Project Structure & Module Organization
- `src/`: Cloudflare Workers backend (Hono + chanfana). Key areas:
  - `src/providers/`: provider proxies (OpenAI, Azure OpenAI, Claude, Responses).
  - `src/admin/`: admin APIs (channels, tokens, pricing, DB init).
  - `src/db/`: D1 schema/init helpers.
- `public/`: built admin UI assets served by Workers.
- `frontend/`: React/Vite admin UI source (build outputs to `public/`).
- `wrangler.toml.template`: Workers config template (bindings, routes, D1, assets).
- `type.d.ts`: shared types for bindings and data models.

## Build, Test, and Development Commands
- `pnpm -C frontend build`: Type-checks and builds the admin UI into `public/`.
- `pnpm dev`: Runs the Worker locally via `wrangler dev` (expects a local `wrangler.toml`).
- `pnpm run deploy`: Deploys the Worker to Cloudflare.
- `pnpm run cf-typegen`: Generates Cloudflare bindings/types.

## Coding Style & Naming Conventions
- TypeScript throughout; follow existing patterns and file layout.
- Indentation: 4 spaces in backend files, 2 spaces in frontend TSX (match existing).
- API routes: `src/admin/*_api.ts`, provider files in `src/providers/`.
- Channel types: use string literals (e.g., `openai-responses`, `azure-openai-responses`).

## Testing Guidelines
- No dedicated test framework is currently configured.
- Use `pnpm -C frontend build` as a basic safety check for UI changes.
- For backend changes, run `pnpm dev` and validate with the API Test page.

## Commit & Pull Request Guidelines
- No formal commit conventions are documented in-repo; use clear, imperative messages (e.g., "Add responses proxy").
- PRs should include:
  - Summary of changes.
  - Notes on config changes (`wrangler.toml`, env vars).
  - Screenshots for UI changes (from `frontend/`).

## Security & Configuration Tips
- Admin endpoints require `x-admin-token` (`ADMIN_TOKEN` binding).
- Tokens and channel configs are stored in D1; validate permissions and quotas.
- For Azure Responses v1, leave `api_version` empty and set `endpoint` to the resource host.
- `wrangler.toml` is git-ignored; copy from `wrangler.toml.template` for local use.
