# Agent guide — ultim-portal

Partner/admin portal for ULTIM. Companion repos: `../ultim-server` (Payload CMS backend),
`../ULTIM-USER` (member mobile app), `../facility-pass-pro` (gate QR scanner web app).

## Commands

```bash
npm run dev        # local dev on :3000
npm run build      # static export to out/ (must pass before finishing any task)
npm run preview    # serve out/ on :3000
npx tsc --noEmit   # typecheck
```

## Conventions

- **Client-only / static SPA.** Every page is a client component. `next.config.ts` uses
  `output: "export"`; there is no server runtime, middleware, route handler, or server action.
  Do not add `src/app/api/*`, `src/proxy.ts`, `"use server"`, or `next/headers` usage.
- **Arena theme + light/dark modes.** Design system is `Sports-Arena-Home-Screen` (`DESIGN-HANDOFF.md` + `index.html`):
  night `#0a0b0d`, paper `#f6f2ea`, accent orange `#ff6a1a`/`#ff5100`, success `#7bd99a`.
  Display type `Barlow Condensed` (uppercase, `font-display` / `.arena-display`), body `Manrope`.
  Eyebrow kickers use `.arena-eyebrow`, stat numerals use `.arena-numeral`. Radius `16–22px`, pill buttons/badges.
  Theme is class-based via `next-themes` (`ThemeProvider`, `ThemeToggle`); tokens live in `:root` (light) and `.dark` in `src/app/globals.css`. Never hardcode `white/*` washes or hex text colors outside intentionally-dark previews — use `bg-accent`, `border-border`, `text-muted-foreground`, `text-gold` tokens so both modes work.
- **All backend access goes through `src/lib/api.ts`** (`payload.list/get/create/update/remove`).
  Components may call these helpers directly; the browser sends the JWT from `localStorage`.
  Set `NEXT_PUBLIC_API_URL`; the Payload server must allow the portal origin via `PORTAL_ORIGINS`.
- **Tenant scoping is mandatory.** Partner/consultant queries must include
  `tenantScope(user)` from `src/lib/scope.ts`. Admins have no tenant scope.
- **Reads:** use `usePortalQuery` (`src/hooks/use-portal-query.ts`) for page data. It handles
  loading/error state and refetches when a successful mutation broadcasts `portal:refresh`.
- **Mutations:** use `portalCall` / `portalPost` from `src/lib/portal-client.ts`. Handlers live in
  `src/lib/portal/actions/*` and call Payload directly with the stored token. Return
  `{ ok, error?, message? }`; successful mutations dispatch `portal:refresh` automatically.
  Multipart uploads go through `portalCall.uploadFacilityImage` → Payload `/api/media`.
- **Auth:** `src/components/portal/auth-provider.tsx` stores the JWT + profile in `localStorage`,
  verifies `/api/users/me` on boot, and client-guards `/app/*`. Admin pages use
  `useRequireAdmin` (`src/hooks/use-require-admin.ts`). Do not use cookies or a proxy.
- **Static routes:** dynamic detail pages use query params, e.g.
  `/app/members/view?id=12`, `/app/plans/edit?id=3`, `/app/tenants/view?id=1`,
  `/app/app-releases/edit?id=4`. Never add `[id]` route folders.
- **Suspense:** any component using `useSearchParams` must sit under a Suspense boundary. The
  `/app` layout wraps its children; the login page wraps its content.
- **Client components:** pages use `"use client"`; shared plain constants belong in `src/lib/`.
- The portal is **staff-only** (`admin | partner | consultant`). Member accounts are rejected at
  login; members use the mobile app.

## Key files

| Area | File |
|---|---|
| Auth context + localStorage session | `src/components/portal/auth-provider.tsx`, `src/lib/session.ts` |
| Payload client + domain types | `src/lib/api.ts` |
| Client query hook / refresh bus | `src/hooks/use-portal-query.ts`, `src/lib/portal-refresh.ts` |
| Mutations + action modules | `src/lib/portal-client.ts`, `src/lib/portal/actions/*` |
| Where-builder / query params | `src/lib/query.ts`, `src/lib/where-utils.ts` |
| Tenant scope + IST day helpers | `src/lib/scope.ts` |
| Dashboard aggregates | `src/lib/dashboard.ts` |
| Nav config (role-gated) | `src/lib/nav.ts` |
| Shared UI | `src/components/portal/*`, `src/components/data-table.tsx` |

## Backend notes (ultim-server)

- Roles: `admin`, `partner`, `consultant`, `member`; partners are bound to one tenant.
- `Membership` money fields (`amountPaid`, `amountDue`) are recomputed by
  `src/lib/membershipTotals.ts` — counting `transactions.membership` FK links plus legacy
  `membership.transactions[]` array links (de-duplicated), against the effective plan price.
