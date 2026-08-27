# DELACHE Design System

Concise reference for portal and marketing UI. Source tokens live in `client/global.css` and `tailwind.config.ts`.

## Brand colors

| Role | Approx hex | Tailwind / CSS |
|------|------------|----------------|
| Primary (brand gold) | `#E6AB40` | `primary` / `--primary` |
| Primary foreground | `#0F172A` (ink on gold) | `primary-foreground` |
| Accent (ink CTA) | near-black `#121212` | `accent` / `--accent` |
| Gold deep (email / hover) | `#C9922A` | `delache.goldDeep` |
| Destructive | red ~`#E11D48`-class | `destructive` |
| Muted / secondary | warm cream / gray | `muted`, `secondary` |
| Foreground / background | near-black / warm near-white | `foreground`, `background` |

Sidebar dark shell uses intentional `bg-delache-950` (`#1A1408`, warm gold-ink). Brand logos (only these two): `public/brand/logo-full.png` (lockup) and `public/brand/logo.png` (mark) via `BrandLogo` `variant="full" | "mark"`.

Gold scale (from primary `#E6AB40`): `delache-50` … `delache-950` in `tailwind.config.ts`. Prefer these over navy/blue hexes for surfaces.

## Typography

- Body / UI: **DM Sans**
- Display / page titles: **Manrope** (`font-[Manrope]`)

## Semantic Tailwind rule

Use design-system tokens only: `primary`, `accent`, `destructive`, `muted`, `secondary`, `foreground`, `background`, `border`, `card`, `input`, `ring`, and their `*-foreground` variants.

**Do not** use arbitrary palette classes (`text-emerald-500`, `bg-amber-400`, `border-red-500`, etc.).

## Radius & surfaces

- Global radius: `--radius: 0.9rem`
- Common patterns: `rounded-xl` / `rounded-2xl` cards with `border border-border bg-card shadow-sm`
- Inputs: `rounded-xl border border-input bg-background` with `focus:border-accent focus:ring-4 focus:ring-ring/20`
- Pills / status chips: `rounded-full border border-border`

## Interaction patterns

- Primary CTA: `bg-primary text-primary-foreground`
- Accent CTA: `bg-accent text-accent-foreground`
- Secondary chip actions: `bg-secondary text-primary`
- Destructive hover: `hover:border-destructive hover:text-destructive`

## Loading skeletons

- Primitive: `client/components/ui/skeleton.tsx` (`animate-pulse bg-muted`)
- Shared layouts: `client/components/portal/PortalSkeletons.tsx`
  - **`ContentPageSkeleton`** — reusable content-area loader (`list` | `dashboard` | `form` | `detail` | `split` | `inbox`)
  - Shells: `PortalShellSkeleton`, `ClientShellSkeleton`
  - Domain: `CalendarPageSkeleton`, `CaseDetailSkeleton`, `DashboardSkeleton` (wrappers around `ContentPageSkeleton` where possible)
- Prefer full-page `ContentPageSkeleton` on first load; DataGrid pages keep row skeletons via `isLoading`

## Documents / DMS

- Dropzone: dashed `border-border` / active `border-accent bg-accent/5`
- Preview: right `Sheet` with PDF page canvas (`PdfPreview`), image `object-contain`, OCR text in `bg-muted/40` pre block
- OCR status chips: `rounded-full bg-secondary text-primary`
- Signatures: `DigitalSignaturePad` uses velocity-aware stroke width and a baseline guide for capture; PNG export is ink-only on white (no grid/baseline chrome)
- Blob uploads prefer private Vercel Blob + short-lived signed URLs in API responses (legacy public URLs still work). Private put fails closed (no silent public fallback). Files over ~3MB upload browser→Blob (not through the Vercel JSON body) then register via `/documents/from-blob`. Dropzone toasts skipped files and failed uploads. While `DMS_SHOW_SIZE_STABILIZATION_LEGEND` is true, `DocumentSizeStabilizationLegend` explains the temporary per-file cap (`DMS_MAX_FILE_BYTES`, currently 15MB) above every `DocumentDropzone`.

## Email / notifications

- Transactional HTML in `lib/emails.ts` uses `EMAIL_BRAND` tokens aligned with UI (`primary` `#E6AB40`, `accent` `#C9922A`, dark header `#1A1408`, DM Sans). Keep the inlined copy in `api/index.ts` in sync.
- Header brand uses `/brand/logo-full.png` via `resolveEmailAssetBaseUrl` (when `appUrl` is localhost, assets load from `https://www.delache.mx` or `EMAIL_ASSET_BASE_URL` / `PUBLIC_APP_URL` — email clients cannot fetch localhost). Gold “DELACHE” wordmark sits under the mark as a fallback.
- Staff/assignment role values are localized (`shared/emailLabels.ts`) — never raw enum keys like `expert` in Spanish invites.
- Case detail mutation CTAs use `PendingSubmitButton` (spinner + disabled + `common.saving`) with success toasts via `notifyThunkSave`.
- Process timeline: admin/coordinator/legal see full RACI; other roles get a compact “your action” blurb. Blocked gates and ownership panels include role-gated quick links (`#case-documents`, `#case-assignments`, etc.) on case detail.
- Staff dashboard is role-aware (`shared/dashboardPersonaRules.ts`): metric cards + quick CTAs; org KPI strip for admin/coordinator only. Dashboard/KPI APIs apply case visibility to reviews, invoices, deadlines, and missing-docs.
- Dashboard metric tiles with a mapped destination (`dashboardMetricCtaHref`) render as `Link` cards with hover “Open →” affordance; **Pending reviews** routes to `/portal/reviews` (review queue → case `#case-reviews`). Reviews nav item is role-gated (`reviewQueueRules.canAccessReviewsQueue`) and shows a destructive count badge when `pendingReviewsTotal > 0` (lightweight `fetchPendingReviews({ limit: 1 })` on layout mount/focus).
- Pipeline kanban uses full `listado` gate input (incl. P8 evidence) and `holdResumeStatus` for on_hold resume drops.
- CTA buttons use gold fill with ink text (`onPrimary`); header `#1A1408`
- Shared shell: preheader, brand mark, CTA gradient button, footer tagline
- Invite emails include accent highlight banner + numbered steps; ops alerts use tone banners (warn / success / accent)
- Dual-channel: in-app `notifications` rows also email when allowed; Resend id stored on `email_provider_id`
- Client portal: `/client/notifications` inbox for law-firm recipients

## Maps / GPS

- `LocationMapPanel`: Google Maps iframe preview **only when** `VITE_GOOGLE_MAPS_API_KEY` is set (Maps Embed API). Without the key, the iframe is hidden; Navigate / Street View / Open map deep links still show.
- Property location on case detail: **collapsed by default** after save — map preview + CTAs + **Edit location**. Edit mode shows address/GPS fields, geocode, and device GPS; successful save collapses again.
- GPS fields accept decimal and DMS (`16°26'47.1"N`, `92°43'40.7"W`); values normalize to decimal on save. Invalid GPS no longer blocks address/city/state/postal persistence (GPS is kept or cleared with a toast).
- Form saves platform-wide: reset/refresh only after thunk `fulfilled`; failures toast and keep typed values (`shared/formSaveRules` + `notifyThunkSave`).

## Layout notes

- Portal shell: dark `bg-delache-950` sidebar with **sectioned nav** (Overview / Work / Admin), muted labels, gold inset active rail (not solid primary fill), and a bottom profile card (avatar initials, localized role, **bell → notifications inbox**, sign out). No duplicate Notifications row in the main nav. Expanded width ~280px; collapsed ~88px.
- Content width: typically `max-w-5xl` / `max-w-6xl` centered
- Prefer mobile-first grids (`sm:`, `lg:`) and compact section cards over dense dashboards
- **Page header vs list search:** `PortalPageHeader` is title/CTA only. List filters and page search sit **under** the header inside `PortalListPanel` (toolbar strip + grid/list) so they read as one panel. Global search lives in the sidebar (desktop) / compact mobile top bar — not above the page title.
- **Form helpers:** `FieldHelper` / `SectionHelper` (`client/components/portal/FormHelpers.tsx`) show short under-field / section tips. Gated by `AuthUser.showFormHelpers` (DB default ON). Toggle on **Profile** (`/portal/profile`, `/client/profile`). Prefer helpers over placeholder-only guidance.
- **12-point process rail:** `ProcessTimeline` on staff case detail — compact point cards, SLA captions, blocking-gate list. Uses the server `processGate` snapshot when it matches the current point (role-filtered sections must not invent a looser local gate). Semantic tokens only.
- **Listado avance strip:** `ListadoFlagStrip` on the staff cases grid (desktop column + mobile card) — check/minus chips for intake → cobro flags. Compact short labels; full labels as tooltips.
- **Cases pipeline:** `/portal/cases` toggles list vs board (localStorage; desktop defaults to board). On navigate / view switch, the boot skeleton matches the saved preference (`CasesPipelineSkeleton` vs `CasesListSkeleton`) before data arrives. Board columns = case `status` with per-column server pagination (`GET /api/cases/pipeline`), shared debounced search/filters; visibility change refetches so gates stay fresh. Coordinators/admins can drag cards one step forward when `listado.gatesOk` is true; blocked drops show a lock hint. Case detail forward status buttons use the same gate lock. Others click through to detail.
- **Fatality flag:** checkbox on create-case and case-detail header; drives the death-certificate gate (never inferred from the file).
- **Document category:** `CaseDocumentsPanel` on staff case detail is **full-width** below workflow/notes (not the narrow side column). Blocking checklist for current point, phase completeness strip, upload picker labeled as “category for this upload”, files grouped by category with immediate recategorize + toast. Process gate doc links deep-link to `#case-documents-cat-{category}`. `DocumentCategorySelect` also used on client portal. Gates read `documents.category`.
- **Local email CTA legend:** `LocalEmailCtaLegend` on Team invite / resend. Only renders on localhost (and loopback). Warns that welcome/notification email buttons will use `APP_URL` / `VITE_PUBLIC_APP_URL`. On Vercel production set `APP_URL=https://www.delache.mx` (localhost Vite values are skipped).

Keep this file in sync when design-relevant UI tokens change.
