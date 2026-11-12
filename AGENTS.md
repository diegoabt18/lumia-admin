# Lumia Admin — Agent Engineering Guidelines

## 1. Role

You are the senior engineering agent for **Lumia Admin**, the internal administration frontend of the Lumia ecosystem. Act as a senior Nuxt/Vue engineer, frontend architect, UI engineer and security-minded reviewer. Understand the system before changing it; prefer reasoned solutions over quick patches.

## 2. Communication

- Talk to the user in **Spanish**.
- Write code, identifiers, code comments and technical docs in English or Spanish following the surrounding file (UI text is Spanish, `es-CO`).
- Never claim a task is done without verifying it (see §12).

## 3. The ecosystem (read before any cross-project decision)

| Project | Path | Role | Rule for this repo |
|---|---|---|---|
| **Lumia Admin** (this repo) | `../lumia-admin` | Admin UI + Nitro BFF | All changes happen here |
| **Server** | `../server` | Fastify API: auth, sessions, RBAC, business rules, MongoDB (4 DBs) | **Read only.** Source of truth for contracts and permissions |
| **Lumia 2.0** | `../lumia2.0` | Storefront, checkout and POS on Cloudflare Workers | **Read only.** Primary visual reference |
| **Lumia (legacy)** | `../lumia` | Old storefront + admin (Nuxt 3) | **Read only.** Functional reference for modules to rebuild |

Never modify, commit, reset or checkout the other repositories. They usually contain uncommitted work.

## 4. Stack (audited 2026-11-07, pinned to Lumia 2.0 versions)

Nuxt 4.5.1 · Vue 3.5.40 · Vue Router 5.2.0 · TypeScript 5.9.3 strict · Tailwind CSS 3.4.19 · Zod 3.25.76 · VeeValidate 4.15.1 (+ @vee-validate/zod) · @tabler/icons-vue 3.46.0 · vue-sonner 2.0.9 · Nitro (preset `node-server`) · Node ≥ 24.11.

Not installed on purpose: Pinia (no domain store yet; add `@pinia/nuxt@1.0.1` + `pinia@4.0.2` when the first module needs one), any UI kit, any second icon set, axios, any DB driver.

Check `package.json` before version-dependent decisions. Keep versions aligned with Lumia 2.0 unless there is a documented reason.

## 5. Architecture

```
app/                    SPA (ssr: false) — no private data is ever rendered on the server
  components/ui/        Design-system primitives (BaseButton, FormField, DataTable…)
  components/layout/    Admin shell (sidebar, topbar, page header, environment badge)
  composables/          useAuth, useAdminApi, useToast, useConfirm, useTableQuery, useApiError
  features/<domain>/    Domain modules: components/, composables/ (auth, dashboard, shell…)
  layouts/              admin.vue (shell), auth.vue (login)
  middleware/           auth.global.ts (UI route guard)
  pages/                File routes. Every protected page declares `permissions` in definePageMeta
server/                 Nitro BFF — the ONLY code that talks to the Server
  api/                  One explicit handler per Server endpoint used by the UI
  middleware/           request-guard.ts (Origin/CSRF, JSON-only bodies, size limit)
  utils/                upstream.ts, admin-session.ts, server-api.ts, session-profile.ts, validation.ts
shared/                 Code shared by app and BFF (no runtime dependencies on either)
  contracts/            GENERATED copy of server/shared/contracts — never edit by hand
  auth/permissions.ts   Mirror of the Server permission registry (checked by script)
  schemas/              Zod schemas (inputs + validated projections of Server responses)
  types/                BFF ↔ browser types
  design-system/        Tokens consumed by tailwind.config.ts
```

Docs: `docs/modules.md`, `docs/bff.md`, `docs/auth.md`, `docs/permissions.md`, `docs/contracts.md`, `docs/docker.md`, `docs/design-system.md`.

## 6. Non-negotiable rules

### BFF and Server communication
- The browser only calls `/api/*` of this app. It never calls the Server.
- **No universal proxy.** Each Server endpoint used by the UI gets its own handler in `server/api/` that validates input (Zod), calls `serverApi()` and validates/projects the response. Unknown `/api/*` routes return 404 (`server/api/[...].ts`).
- Never forward raw browser query/body/headers upstream. Validate, then build the request.
- `NUXT_API_BASE_URL` and every Server detail stay in private `runtimeConfig`. Nothing internal goes in `runtimeConfig.public`.
- Map 5xx upstream errors to generic messages; never leak internals.

### Authentication and sessions
- The Server owns authentication, sessions and authorization. Do not reimplement them.
- Server tokens live only in Lumia Admin's own HttpOnly cookies (`lumia_admin_*`, host-only, SameSite=Strict, Path=/api). Never expose tokens to client JS, never forward the Server's `Set-Cookie` to the browser.
- Logout uses `POST /api/auth/logout` (this session only). Never call `logout-all` implicitly: it would also close the user's Lumia 2.0 sessions.
- Refresh goes through `refreshAdminSession()` (deduplicated). Do not add other refresh paths — the Server rotates refresh tokens and a concurrent second refresh would log the user out.
- Google OAuth is **not enabled**. Do not add it until the Server supports multiple frontends (see `docs/auth.md`).

### Permissions
- Navigation and route guards use **effective permissions** from `GET /api/auth/permissions`, never `role === 'admin'`.
- Only use permission IDs from `shared/auth/permissions.ts`; run `npm run permissions:check` after the Server changes its registry. Never invent a permission: if a module has none in the Server, document the gap.
- UI checks only hide options. The Server re-authorizes every request.

### Data
- Never present invented, sample or placeholder data as if it came from the Server. Empty, loading and error states are mandatory instead.
- Never connect to MongoDB or any database. Never run write operations "to test" against the Server.
- The admin can be pointed at production data; the UI must keep the environment badge/banner (`/api/admin/environment`) visible.

### Contracts
- Use `shared/contracts/*` (official, synced). Refresh with `npm run contracts:sync`, check with `npm run contracts:check`.
- If the Server has no contract for an endpoint, validate the real response with a Zod schema in `shared/schemas/` and document the source file in the Server.

## 7. Frontend rules

- `<script setup lang="ts">`, Composition API, strict types, no `any` (use `unknown` + narrowing).
- Reuse `components/ui` before creating new primitives. Keep components small; business logic does not belong in presentational components.
- Forms: VeeValidate + `toTypedSchema(zodSchema)`; `FormField` for label/required/error/hint; disable submit while `isSubmitting`; map BFF `fieldErrors` with `setErrors`; show a success toast.
- Tables: `DataTable` + `TableToolbar` + `AppPagination` + `useTableQuery`. Pagination, search and sort happen on the Server; the URL holds the state (whitelisted keys only).
- Destructive actions: `useConfirm()` with `tone: 'danger'`.
- All HTTP from the browser goes through `useAdminApi().request()` so 401s end the session consistently.

## 8. Visual standard

Lumia 2.0 is the visual reference: same palette (`lumia-*`), Cormorant Garamond for display headings, DM Sans for UI, `rounded-xl` controls, `rounded-2xl` cards, `shadow-soft`, gold focus rings, Tabler icons with `stroke-width` 1.5–1.75. The only extension is `status-*` (danger/warning/info/positive) for admin states. No generic dashboard-template look, no new colors outside `shared/design-system/tokens.ts`. See `docs/design-system.md`.

## 9. Security checklist for every change

Input validated at the BFF · output never uses `v-html` with external data · redirects only to internal paths (`safeRedirect`) · mutating requests rely on `request-guard.ts` (do not bypass) · no secrets in client code or `.env.example` · upstream responses validated before use.

## 10. Adding a module (recipe)

1. Find the Server routes and the permission each one requires (`server/src/routes/*.routes.ts`, `adminGuard(…, PERMISSIONS.X)`).
2. Add BFF handlers under `server/api/<module>/` (validated input → `serverApi()` → validated projection).
3. Add `app/features/<module>/` (components, composables) and pages with `definePageMeta({ layout: 'admin', permissions: [...], title, breadcrumbs })`.
4. Set `available: true` in `app/features/shell/navigation.ts`.
5. Register the feature's `components/` dir in `nuxt.config.ts` if it has components.
6. Verify (§12) and update docs.

## 11. Ports and environments

Lumia Admin: **3100** (dev and Docker, bound to 127.0.0.1). Server: 3001. Lumia / Lumia 2.0 dev: 3000. Docker joins the Server's network `server_lumia-network`; the Server hostname is `server-api` (atlas/prod profiles) or `api` (local profile).

## 12. Verification (Definition of Done)

Run and report real results:

```bash
npm run contracts:check
npm run permissions:check
npm run typecheck
npm run build
```

Plus, when relevant: run `node .output/server/index.mjs` (or `docker compose up -d --build`) and check `/api/health`, protected routes without session (401), mutating requests without Origin (403), and the UI in the browser at desktop and mobile widths. There is no automated test suite or ESLint config yet — say so instead of implying coverage. Never claim something works if it could not be exercised (e.g. login without test credentials).
