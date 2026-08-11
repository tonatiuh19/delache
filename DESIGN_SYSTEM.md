# DELACHE Design System

Concise reference for portal and marketing UI. Source tokens live in `client/global.css` and `tailwind.config.ts`.

## Brand colors

| Role | Approx hex | Tailwind / CSS |
|------|------------|----------------|
| Primary (trust) | `#0B4EA2` | `primary` / `--primary` |
| Accent (CTA) | `#2979FF` | `accent` / `--accent` |
| Destructive | red ~`#E11D48`-class | `destructive` |
| Muted / secondary | light blue-gray | `muted`, `secondary` |
| Foreground / background | near-black / near-white | `foreground`, `background` |

Sidebar dark shell uses intentional `bg-[#0b0f1a]` (exception to the arbitrary-color rule).

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
- Blob uploads prefer private Vercel Blob + short-lived signed URLs in API responses (legacy public URLs still work). Private put fails closed (no silent public fallback).

## Email / notifications

- Transactional HTML in `lib/emails.ts` uses `EMAIL_BRAND` tokens aligned with UI (`primary` `#0B4EA2`, `accent` `#2979FF`, dark header `#0b1b33`, DM Sans)
- Shared shell: preheader, brand mark, CTA gradient button, footer tagline
- Invite emails include accent highlight banner + numbered steps; ops alerts use tone banners (warn / success / accent)
- Dual-channel: in-app `notifications` rows also email when allowed; Resend id stored on `email_provider_id`
- Client portal: `/client/notifications` inbox for law-firm recipients

## Maps / GPS

- `LocationMapPanel`: OSM embed iframe when lat/lng present; Google Maps / directions / Street View as external link-outs (no Google API key)
- Property location editor on case detail: address fields + lat/lng, **Use my location** (browser geolocation), **Geocode address** (staff `/api/geo/geocode` → Nominatim)
- Evidence capture: same **Use my location** fills lat/lng; compact map shows latest GPS evidence pin
- Actions use compact bordered chips (`rounded-lg border border-border`) and accent navigate CTA

## Layout notes

- Portal shell: dark sidebar + `bg-muted/40` main canvas
- Content width: typically `max-w-5xl` / `max-w-6xl` centered
- Prefer mobile-first grids (`sm:`, `lg:`) and compact section cards over dense dashboards
- **Page header vs list search:** `PortalPageHeader` is title/CTA only. List filters and page search sit **under** the header inside `PortalListPanel` (toolbar strip + grid/list) so they read as one panel. Global search lives in the sidebar (desktop) / compact mobile top bar — not above the page title.
- **Form helpers:** `FieldHelper` / `SectionHelper` (`client/components/portal/FormHelpers.tsx`) show short under-field / section tips. Gated by `AuthUser.showFormHelpers` (DB default ON). Toggle on **Profile** (`/portal/profile`, `/client/profile`). Prefer helpers over placeholder-only guidance.
- **12-point process rail:** `ProcessTimeline` on staff case detail — compact point cards, SLA captions, blocking-gate list. Uses the server `processGate` snapshot when it matches the current point (role-filtered sections must not invent a looser local gate). Semantic tokens only.
- **Listado avance strip:** `ListadoFlagStrip` on the staff cases grid (desktop column + mobile card) — check/minus chips for intake → cobro flags. Compact short labels; full labels as tooltips.
- **Fatality flag:** checkbox on create-case and case-detail header; drives the death-certificate gate (never inferred from the file).
- **Document category:** `DocumentCategorySelect` on staff and client case-detail upload + per-file recategorize. Semantic tokens only; gates read `documents.category`.

Keep this file in sync when design-relevant UI tokens change.
