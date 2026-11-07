# ULTIM Partner Portal

The partner & admin web app for ULTIM — a facility management portal that replaces the raw
Payload admin experience for gym/sports partners. Built with Next.js + shadcn/ui against the
existing Payload CMS backend (`ultim-server`).

## Stack

- **Next.js 16** (App Router, Turbopack) + TypeScript — **static export SPA**
- **Tailwind CSS v4** + **shadcn/ui** (radix-nova preset, dark-only "Ember on Black" theme)
- **TanStack Table** for data tables, **React Hook Form + Zod** for forms
- **Recharts** (via shadcn charts) for dashboard visuals
- Backend: Payload 3 REST API at `https://ultim-server.vercel.app` (override with `NEXT_PUBLIC_API_URL`)

The portal has **no server runtime**: every page is a client component, `next build` emits static
HTML/JS to `out/`, and the browser calls the Payload REST API directly with the signed-in user's
JWT. There are no server actions, route handlers, middleware, or server components that read data.

## Getting started

```bash
cp .env.example .env.local   # NEXT_PUBLIC_API_URL points at the deployed backend
npm install
npm run dev                  # http://localhost:3000
npm run build                # static export to out/
npm run preview              # serve out/ on http://localhost:3000
```

Sign in with a **partner / consultant / admin** account. Member accounts are rejected —
members use the mobile app.

## Environment

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_API_URL` | Payload backend base URL, inlined into the browser bundle |
| `NEXT_PUBLIC_SCANNER_URL` | Existing gate-scanner web app linked from the sidebar |

On the Payload server, add the portal origin to `PORTAL_ORIGINS` (comma-separated) so browser
requests pass CORS.

## Architecture

- **Auth**: the browser calls Payload's `/api/users/login` directly. The JWT and profile are
  stored in `localStorage`; `src/components/portal/auth-provider.tsx` hydrates the session, verifies
  it with `/api/users/me`, and guards `/app/*` on the client.
- **Scoping**: `src/lib/scope.ts` derives the tenant scope from the session; every query in the
  portal is filtered by `tenant` for partner/consultant roles. Admins see all facilities.
- **Data**: client components call Payload through `src/lib/api.ts`; list/detail pages use
  `usePortalQuery` (`src/hooks/use-portal-query.ts`) and mutations go through `portalCall` in
  `src/lib/portal-client.ts`. Successful mutations broadcast `portal:refresh`, and mounted pages
  refetch automatically.
- **Static export**: `next.config.ts` sets `output: "export"`; dynamic detail pages use query
  params (`/app/members/view?id=…`) instead of server-rendered `[id]` routes.
- **Theme tokens**: `src/app/globals.css` — ember primary `#FF5A1F`, gold secondary `#E9B54C`,
  near-black surfaces, dark-only.

## Feature roadmap

| Phase | Scope | Status |
|---|---|---|
| 0 | Scaffold, theme, auth, app shell, API/DataTable kit | ✅ |
| 1 | Dashboard (KPIs, revenue chart, activity), Facility profile + activities/courts editor, Plans CRUD | ✅ |
| 2 | Activation wizard (member → plan → payment → membership), Members directory + profile, Transactions + export | ✅ |
| 3 | Bookings day board (check-in/out + cancel), Leads pipeline + conversion, Employees CRUD + stats | ✅ |
| 4 | Admin tenants/users, exports, landing page + public lead endpoint | ✅ |
| 5 | Backend gap fixes: booking status/cancel+refund, membership QR verify, maxMembers/active enforcement, tenant access, staff provisioning, public leads | ✅ (deploy `ultim-server` to activate) |

All modules are live. Loading states use route-level `loading.tsx` skeletons
(`src/components/portal/skeletons/*`).

### Desk money flows

- **New pass**: Activate member wizard → member → plan → payment → review (creates the
  transaction + membership; credits granted automatically).
- **Settle dues on an existing/expired pass**: Member profile → *Collect payment* on the pass, or
  the wizard's payment mode (`/app/activate?member=…&payment=1`) which lists the member's passes
  with outstanding balances. Payments link into `membership.transactions[]` so the backend hook
  recalculates paid/due automatically.
- **Renew / new cycle**: *Renew plan* on a pass opens the wizard pre-set to that plan (a renewal is
  a fresh membership cycle alongside the old pass).
- **General payments** (not tied to a pass) are still possible from the payment mode.
- **Payments link via a real foreign key** (`transactions.membership`). Collecting on a pass is a
  single write on the payment itself — the backend hook (`recomputeMembershipTotals`) recomputes the
  pass's paid/due, and moving a payment between passes recomputes both. Nothing rewrites arrays, so
  links can never be reset by a later payment.
- **Fix mis-recorded payments**: Member profile → Payments → *Link to pass* (or *Re-link*) simply
  sets the FK; legacy array-linked payments still count (de-duplicated by transaction id).

Dues are always derived from raw components — `effectivePrice (discounted price when offered)
− linked payments − discountOffered` — via `src/lib/dues.ts`, so pills are exact and update the
moment a payment is linked (no reliance on cached `amountDue`). The backend hook applies the same
effective-price formula when it recomputes the stored figures.

### Filters

Members (status · plan · activity · dues), Transactions (search · method · plan · date range ·
amount range, with per-method totals), Bookings (day · pass · activity · status · court), Plans
(status · category · duration), Leads (status · source · consultant), Employees (search · gender),
Users (role), Facilities (search), Dashboard (range · activity · facility). All filters run through
Payload `where` operators from the browser, URL-synced.
