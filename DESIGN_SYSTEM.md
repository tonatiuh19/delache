# DELACHE Design System

Concise reference for portal and marketing UI. Source tokens live in `client/global.css` and `tailwind.config.ts`.

## Brand colors

Aligned to the client-approved CRM PDF (`DELACHE_CRM` mockups): marigold CTAs with white label text, cool paper background, light-blue info panels, green completed checks.

| Role                         | Approx hex                         | Tailwind / CSS                          |
| ---------------------------- | ---------------------------------- | --------------------------------------- |
| Primary (PDF marigold CTA)   | `#F8C018`                          | `primary` / `--primary`                 |
| Primary foreground           | white on primary                   | `primary-foreground`                    |
| Accent (ink CTA)             | near-black `#121212`               | `accent` / `--accent`                   |
| Success (completed checks)   | green ~`#22A06B`                   | `success` / `--success`                 |
| Info (summary / Al enviar)   | blue ~`#3B82F6` + wash `#F0F7FF` | `info` / `info-muted`                   |
| Gold deep (email / hover)    | `#C9922A`                          | `delache.goldDeep`                      |
| Destructive                  | red ~`#E11D48`-class               | `destructive`                           |
| Muted / secondary            | cool gray / warm cream             | `muted`, `secondary`                    |
| Foreground / background      | near-black / cool paper `#F5F7F9`  | `foreground`, `background`              |

Sidebar dark shell uses intentional `bg-delache-950` (`#1A1408`, warm gold-ink). Brand logos (only these two): `public/brand/logo-full.png` (lockup) and `public/brand/logo.png` (mark) via `BrandLogo` `variant="full" | "mark"`. Logo mark gold remains `#E6AB40` in assets; UI CTAs follow the brighter PDF marigold.

Gold scale (legacy `#E6AB40`): `delache-50` … `delache-950` in `tailwind.config.ts`. Prefer semantic tokens (`primary`, `info`, `success`) over raw hexes in portal UI.

## Typography

- Body / UI: **DM Sans**
- Display / page titles: **Manrope** (`font-[Manrope]`)

## Semantic Tailwind rule

Use design-system tokens only: `primary`, `accent`, `destructive`, `success`, `info`, `info-muted`, `muted`, `secondary`, `foreground`, `background`, `border`, `card`, `input`, `ring`, and their `*-foreground` variants.

**Do not** use arbitrary palette classes (`text-emerald-500`, `bg-amber-400`, `border-red-500`, etc.).

Intake document cards use four approved hues from the client PDF, exposed as tokens (`bg-doc-demand`, `bg-doc-medical`, `bg-doc-cfe`, `bg-doc-photos`). Status pills on those cards stay on semantic tones (`primary`, `destructive`, `secondary`, `muted`).

Case detail subsections share `CaseDetailSectionPanel`: numbered title, 40px icon square, and optional header action. Do not rebuild that header inside a section.

Steps 2–9 use the PDF composed workspace (`CasePdfStepShell`): light-blue summary bar, main column, right rail (green completed checks, solid marigold “En curso”, light-blue Al enviar, formatos), Guardar borrador + Enviar (white on marigold). No horizontal process stepper and no subsection pills / 1.1–1.n sidebar links (intake included); the left process rail stays as step titles only. TipTap edits the questionnaire in-browser (Mammoth import / docx export). Paso 6 shows five multi-file evidence tiles mapped to existing categories. Pasos 7–9 (dictamen, validación/entrega, cobranza) reuse the same shell with Miro gates: internal report approval → firm OK + court/ratification PDFs → anticipo + finiquito paid.

Paso 1 create and the open expediente share the same Resumen layout. Nuevo expediente (`/portal/cases/new`) is that page with nothing stored until Enviar; leaving drops the draft. The left column is the PDF form (despacho picker, folio, required deadline, four document hues, optional extras, 500-character note). The right column is the PDF guide: required-document checks and accepted file types. Chosen files stay in the browser, with preview and remove, until Enviar. The same hold-until-send pattern is used on later step uploads. An existing case in Recepción uses the same form on Resumen (`CaseIntakeWorkspace`). Location and workflow stay as extra pills on the Recepción step. The despacho view is read-only after create.

### Despacho (law firm) in `/portal`

Same app shell as staff (`PortalLayout`); nav is gated to cases / firm team / notifications / profile. APIs share `/api/cases*` with role checks (`requireStaffOrLawFirm`). Auth identity remains `/api/auth/client/*` (`memberRole` on me). **Panel del despacho** (`/portal/cases`): Mis expedientes + Seguimiento; **viewer** hides Nuevo / uploads / report actions (API also 403). **Equipo del despacho** (`/portal/firm-team`): owner/admin invites; staff redirected to `/portal/team`. Staff **Equipo** tabs: Staff | Despacho (`GET /api/team/members?roster=firm`). Soft-deleted same-actor emails **reactivate** on re-invite. Dual alive staff+despacho emails block OTP (`email_actor_conflict`). Creating a firm always requires a primary owner.

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

## Auth / login

- Unified sign-in at **`/login`** for staff and law-firm contacts (`shared/unifiedLoginRules.ts`). Client calls **`POST /api/auth/request-otp`** once (staff → law_firm on `account_not_found`, single `unified` rate-limit bucket). Pending OTP email/actor is kept in `sessionStorage` across refresh. Verify still uses `/api/auth/staff|client/verify-otp` based on returned `actor`. Both actors land on **`/portal`** (despacho home redirects to `/portal/cases`).
- Legacy `/portal/login` and `/client/login` redirect to `/login`. Invite emails use `/login`.
- Login persists in `localStorage` (`delache_staff_token` / `delache_client_token`) for the 30-day server session. A 401 clears a token only when that request sent `Authorization`, and only that actor's token. Timeouts and 5xx on `/me` keep the token and show retry (`SessionRestoreFallback`).
- Single shell: `PortalLayout` hosts staff and law firm; nav/APIs gate by actor. Product invites enforce one email = one actor; legacy dual **alive** rows block login until an admin cleans one side.
- **Coming Soon** (`client/pages/ComingSoon.tsx`): **opt-in only** via `VITE_COMING_SOON=true`. Default is the full app (product is live). Previously prod defaulted to Coming Soon unless the flag was `"false"`.

## Loading skeletons

- Primitive: `client/components/ui/skeleton.tsx` (`animate-pulse bg-muted`)
- Shared layouts: `client/components/portal/PortalSkeletons.tsx`
  - **`ContentPageSkeleton`** — reusable content-area loader (`list` | `dashboard` | `form` | `detail` | `split` | `inbox`)
  - Shells: `PortalShellSkeleton`, `ClientShellSkeleton`
  - Domain: `CalendarPageSkeleton`, `IntakeCreatePageSkeleton` (Nuevo expediente form), `CaseOverviewSkeleton` / `CaseDetailSkeleton` (Resumen), `DashboardSkeleton`. `PortalShellSkeleton` picks the content block from the current path.
- Prefer full-page `ContentPageSkeleton` on first load; DataGrid pages keep row skeletons via `isLoading`

## Documents / DMS

- Dropzone: dashed `border-border` / active `border-accent bg-accent/5`
- Preview: centered `Dialog` modal (`DocumentPreviewSheet`) with PDF page canvas (`PdfPreview`), image `object-contain`, collapsible OCR in `bg-muted/40` pre block; open/download CTAs in header
- OCR status chips: `rounded-full bg-secondary text-primary`
- Signatures: `DigitalSignaturePad` uses velocity-aware stroke width and a baseline guide for capture; PNG export is ink-only on white (no grid/baseline chrome)
- Blob uploads prefer private Vercel Blob + short-lived signed URLs in API responses (legacy public URLs still work). Private put fails closed (no silent public fallback). Files over ~3MB upload browser→Blob (not through the Vercel JSON body) then register via `/documents/from-blob`. Dropzone toasts skipped files and failed uploads. While `DMS_SHOW_SIZE_STABILIZATION_LEGEND` is true, `DocumentSizeStabilizationLegend` explains the temporary per-file cap (`DMS_MAX_FILE_BYTES`, currently 15MB) above every `DocumentDropzone`.

## Email / notifications

- Transactional HTML in `lib/emails.ts` uses `EMAIL_BRAND` tokens aligned with UI (`primary` `#E6AB40`, `accent` `#C9922A`, dark header `#1A1408`, DM Sans). Keep the inlined copy in `api/index.ts` in sync.
- Header brand uses `/brand/logo-full.png` via `resolveEmailAssetBaseUrl` (when `appUrl` is localhost, assets load from `https://www.delache.mx` or `EMAIL_ASSET_BASE_URL` / `PUBLIC_APP_URL` — email clients cannot fetch localhost). Gold “DELACHE” wordmark sits under the mark as a fallback.
- Staff/assignment role values are localized (`shared/emailLabels.ts`) — never raw enum keys like `expert` in Spanish invites.
- Case detail mutation CTAs use `PendingSubmitButton` (spinner + disabled + `common.saving`) with success toasts via `notifyThunkSave`.
- Process timeline: admin/legal see full RACI; other roles get a compact “your action” blurb. Blocked gates still deep-link to role-gated anchors (`#case-documents`, `#case-assignments`, etc.) on case detail.
- Staff dashboard is role-aware (`shared/dashboardPersonaRules.ts`): metric cards + mission-first quick CTAs (primary shortcut highlighted with gold icon tile); org KPI strip for admin only. Persona badge labels the desk (ops / expert / legal / logistics / collections). Anticipo cue when `advanceReleased && !advancePaid` for accountant/ops. Dashboard/KPI APIs apply case visibility to reviews, invoices, deadlines, and missing-docs.
- Case step pages always show sticky numbered chrome (`1 · Step · 1.1 Substep` + R/A ownership chips + numbered pills). P6 protesta modality picker, P9 firm→delivery checklist, SLA strip, soft-parallel copy, sticky Advance when gates clear.
- **Role-gated checklists:** missing gates split into *your tasks* vs *waiting on others* (`partitionMissingGatesForViewer`). Perito does not get admin handoff/assign CTAs; at P2 they get soft-parallel links to questionnaire / location while status stays on assignment.
- **Role-gated step tree (Miro):** sidebar shows only mission + soft-parallel points + current PASO ACTUAL (`visibleProcessPointIdsForRole` / `visibleStepTreeForRole`). Perito: P3/P6–P9 (+P2 when current). Legal: P3–P4. Logistics: P7 (+current). Accountant: P10. Admin: all 10. Subsections hide `workflow` for non-ops.
- **P3 questionnaire attach:** `CategoryDocumentAttach` on the Cuestionario section uploads `category: questionnaire` PDF (Miro defendant Q). Process gates require the file — form fields alone do not clear `doc:questionnaire`.
- **Miro PDF-first steps:** P6 protesta, P8 technical report, and P9 court filing + ratification use the same inline attach pattern. Report status / ratification schedule no longer substitute for missing PDFs.
- Listado column uses Miro primary badges (`shared/listadoBadgeRules.ts`: ACTIVO / EN REVISIÓN / EN ESPERA / VENCIDO / CERRADO / PAGADO). Cases action queue is filtered by `roleMission.primaryPoints`.
- Expert can **view** logistics readiness on P7 but cannot mutate trips (`portalCapabilities`).
- Dashboard metric tiles with a mapped destination (`dashboardMetricCtaHref`) render as `Link` cards with hover “Open →” affordance; **Pending reviews** routes to `/portal/reviews` (review queue → case `#case-reviews`). Reviews nav item is role-gated (`reviewQueueRules.canAccessReviewsQueue`) and shows a destructive count badge when `pendingReviewsTotal > 0` (lightweight `fetchPendingReviews({ limit: 1 })` on layout mount/focus).
- Pipeline kanban uses full `listado` gate input (incl. P8 evidence) and `holdResumeStatus` for on_hold resume drops.
- CTA buttons use gold fill with ink text (`onPrimary`); header `#1A1408`
- Shared shell: preheader, brand mark, CTA gradient button, footer tagline
- Invite emails include accent highlight banner + numbered steps; ops alerts use tone banners (warn / success / accent)
- Dual-channel: in-app `notifications` rows also email when allowed; Resend id stored on `email_provider_id`
- Law firm inbox: `/portal/notifications` (same notifications API; actor-scoped)

## Maps / GPS

- `LocationMapPanel`: Google Maps iframe preview **only when** `VITE_GOOGLE_MAPS_API_KEY` is set (Maps Embed API). Without the key, the iframe is hidden; Navigate / Street View / Open map deep links still show.
- Property location on case detail: **collapsed by default** after save — map preview + CTAs + **Edit location**. Edit mode shows address/GPS fields, geocode, and device GPS; successful save collapses again.
- **Location permission modal** (`LocationPermissionModal`): when GPS is missing and the browser will prompt (or permission is unknown), staff see a branded allow/not-now dialog before `navigator.geolocation`. If permission is already **granted**, coordinates auto-fill without the modal. “Use my location” on property or evidence uses the same flow. Rules in `shared/locationPermissionRules.ts`.
- GPS fields accept decimal and DMS (`16°26'47.1"N`, `92°43'40.7"W`); values normalize to decimal on save. Invalid GPS no longer blocks address/city/state/postal persistence (GPS is kept or cleared with a toast).
- Form saves platform-wide: reset/refresh only after thunk `fulfilled`; failures toast and keep typed values (`shared/formSaveRules` + `notifyThunkSave`).

## Layout notes

- Portal shell: dark `bg-delache-950` sidebar with **sectioned nav** (Overview / Work / Admin), muted labels, gold inset active rail (not solid primary fill), and a bottom profile card (avatar initials, localized role, **bell → notifications inbox**, sign out). No duplicate Notifications row in the main nav. Expanded width ~280px; collapsed ~88px.
- Content width: staff portal pages fill the main pane (`w-full min-w-0 max-w-full`) — no artificial `max-w-5xl/6xl/7xl` on list/ops surfaces. Narrow caps remain only on Profile / Settings forms. Pipeline columns flex (`flex-1` + min width) so the board uses available width. **Skeletons match** (`ContentPageSkeleton`, `CalendarPageSkeleton`, Cases list/pipeline skeletons) — same full-width shell, compact KPI card placeholders.
- Prefer mobile-first grids (`sm:`, `lg:`) and compact section cards over dense dashboards
- **Mobile (mandatory):** No page-level horizontal scroll — `overflow-x-clip` on shells (`html`, `body`, `#root`, portal layout). Wide content (pipeline columns, process steppers, tables) scrolls **inside** `.table-scroll` / `.mobile-scroll-x` with `overscroll-x-contain`. `DataGrid` renders stacked mobile cards below `sm` (custom or auto fallback). Toolbars stack full-width on mobile. See `.cursor/rules/mobile-responsive.mdc`.
- **Page header vs list search:** `PortalPageHeader` is title/CTA only. List filters and page search sit **under** the header inside `PortalListPanel` (toolbar strip + grid/list) so they read as one panel. Global search lives in the sidebar (desktop) / compact mobile top bar — not above the page title.
- **Step chrome (always on):** Sticky subsection nav shows `1 · Step · 1.1 Substep`, R/A ownership chips (role + assignee when assigned), and numbered substep pills. Section headers and sidebar nested links use the same `1.n` scheme (`shared/caseStepNavRules.ts`). Process coaching panel removed — gates, required-doc badges, handoff notices, and evidence checklist stay visible.
- **Form tip helpers removed:** under-field tip copy (`FieldHelper` / `SectionHelper`) was removed so roles are not overwhelmed. Legacy `showFormHelpers` / `showProcessGuidance` remain in the API (default OFF) for compatibility but are not exposed in Profile.
- **Date / datetime pickers:** use `DatePicker` / `DateTimePicker` (`client/components/ui/date-picker.tsx`, `date-time-picker.tsx`) — Popover + `Calendar` (react-day-picker **v9** classNames), locale-aware labels via date-fns. Values stay `YYYY-MM-DD` / `YYYY-MM-DDTHH:mm` (`shared/datePickerRules.ts`). Do **not** use native `type="date"` / `datetime-local` in portal forms.
- **Case detail shell:** `/portal/cases/:uuid` overview + step panels. **Sidebar** holds case ID + title and the process step tree. **No main-area case title** — content starts directly (mobile-only back link). Overview and step views use **full main width**.
- **Lazy case-detail sections:** `CaseDetail.tsx` keeps route params, SLA / Protesta / P9 / StickyAdvance (with optional reason), and `shouldShowSection` gates. Visible panels load via `React.lazy` + `Suspense` from `client/components/portal/case-detail/sections/` (one self-contained Formik + Redux section per id). Fallback: `CaseDetailSectionFallback` skeleton. Soft-parallel is productized (UI gates + API `soft_parallel_blocked` with message; on_hold rework uses `holdResumeStatus`). Evidence opens `DocumentPreviewSheet`. Completeness mounts only when focused or documents are role-hidden.
- **Process SOP panels (case detail):** P1 **`ExpedienteApproveNotice`** + per-document approve/reject (admin) before leaving intake; P2 **`HandoffPendingNotice`** (coordinator confirm vs expert/observer waiting copy) + recommended-role banner in Assignments; overview shows compact handoff alert when P2 gate blocks. P3 **PDF-first questionnaire** (`CategoryDocumentAttach` + GPS / Street View / optional chronology); P6 protesta attach + modality; P8 **`EvidenceChecklistGuide`** + technical report PDF attach; P9 firm→court→ratify checklist with court_filing / ratification attaches (schedule is planning only); P10 **`CaseFinancePanel`**. Questionnaire flow: draft → grammar QA → legal review → approved; advance releases on QA pass. Despacho docs lock after upload until admin requests correction (3-BD `intake_correction` deadline) — law-firm case detail shows status, lock badge, and correction copy. Optional `externalCourtDeadlineAt` is editable in Workflow (admin/legal) and shown on the SLA strip when set.
- **10-point process rail:** flat sidebar list (1–10); legacy URL slugs (`logistics`, `inspection`, `legal_validation`, `court_delivery`) redirect to `field_ops` / `validation_delivery`. Legacy `ProcessTimeline` still shows SLA nesting for the court clock in copy.
- **Listado avance strip:** `ListadoFlagStrip` on the staff cases grid (desktop column + mobile card) — check/minus chips for intake → cobro flags. Compact short labels; full labels as tooltips.
- **Cases pipeline:** `/portal/cases` collapsible KPI strip (persists open/closed in `localStorage`) + list/board toggle + **Filters** popover (status + priority). KPI tiles are **clickable CTAs** (`shared/casesKpiRules.ts`): active → pipeline board; due soon → calendar; in review → review queue; completed → list filter. Pipeline / list cards show **ownership badges** (R/A + assignee or role) from `activeAssignments` + `shared/caseCardOwnershipRules.ts`. Pipeline card click navigates to case overview (`/portal/cases/:uuid`). Board columns = case `status` with per-column pagination; drag forward when `listado.gatesOk`.
- **Fatality flag:** checkbox on the case-detail header; drives the death-certificate gate (never inferred from the file).
- **Create expediente:** Cases `+ Nuevo` and `?create=1` open `/portal/cases/new`, the same Resumen layout as an open case. Despacho select + quick-add sit on that page for staff. Nothing is written until Enviar. Law-firm create uses the same route/API without the firm picker; API autofills court from `law_firms.default_court_name` (`shared/caseCourtNameRules.ts`). **DEV-only** “Fill test data” pill.
- **Document category:** `CaseDocumentsPanel` is a **single full-width surface**: category pills for required types, one prominent dropzone, **Attach files** buttons that open the picker directly (no scroll to a separate upload box), compact phase progress chips, collapsible flat file list with inline recategorize + admin approve/request-correction. Process gate doc links deep-link to `#case-documents-cat-{category}`. `DocumentCategorySelect` also used on law-firm case detail. Gates read `documents.category`; P1 also requires approved intake docs + `expediente:approved`.
- **Local email CTA legend:** `LocalEmailCtaLegend` on Team invite / resend. Only renders on localhost (and loopback). Warns that welcome/notification email buttons will use `APP_URL` / `VITE_PUBLIC_APP_URL`. On Vercel production set `APP_URL=https://www.delache.mx` (localhost Vite values are skipped).

Keep this file in sync when design-relevant UI tokens change.
