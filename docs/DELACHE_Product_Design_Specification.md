# DELACHE Product Design Specification

## Product vision

DELACHE is an operations platform for forensic electrical expert cases: intake → questionnaires → inspections → evidence → technical reports → court delivery → accounting. Staff use the internal portal; law firms use a separate client portal with shared notes, documents, and report review.

## Brand identity

Deep blue trust (`primary` ≈ `#0B4EA2`) with bright blue CTAs (`accent` ≈ `#2979FF`). Typography: DM Sans (UI) + Manrope (titles). See [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md).

## Design system

Canonical tokens, semantic Tailwind rules, radius, and card patterns are documented in [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md). UI work must follow those tokens; no arbitrary color utilities.

## Layout system

- Staff portal: collapsible dark sidebar + main content with global search
- Client portal: simpler case list / case detail shell
- Content max-widths and card sections for operational density without clutter

## Marketing website

Public landing and auth entry points (staff vs law firm). Marketing visual utilities (`hero-gradient`, `section-title`) live in `client/global.css`.

## Admin / staff platform (screen inventory)

| Area | Route (approx.) | Purpose |
|------|-----------------|--------|
| Dashboard | `/portal` | Stats, KPIs, recent cases |
| Cases | `/portal/cases`, `/portal/cases/:uuid` | Workflow, docs, reviews, evidence, reports |
| Calendar | `/portal/calendar` | Events & deadlines |
| Documents | `/portal/documents` | Cross-case document index + search |
| Finance | `/portal/finance` | Invoices & payments |
| Notifications | `/portal/notifications` | In-app alerts |
| Team | `/portal/team` | Members (admin) |
| Settings | `/portal/settings` | Case number format, law firms |

Global search (header) covers cases, documents, invoices, and members.

## Client (law firm) portal

| Area | Purpose |
|------|--------|
| Case list | Submit and track matters |
| Case detail | Documents, shared notes, technical report review (`external_review`) |

## UX flows (high level)

1. Staff advances case status through allowed transitions (12-point process). Forward moves are rejected with HTTP 409 + `missing[]` when `evaluateProcessGates` fails. Documents must carry a process `category` (upload or PATCH). P4/P10 `changes_requested` returns the case to P3/P9; fondo `rejected` holds the case and reopens the artifact as `changes_requested`. Typed deadlines complete when leaving their status. The 10-day clock starts when `protesta` is filed. Fatality is an explicit case flag. Hold resume is the paused status (admin may jump). Accountant may complete P12.
2. Document completeness gates intake / additional-docs phases
3. Questionnaire & report reviews via review requests and status transitions
4. Inspections scheduled → completed; evidence checklist tracked
5. Law firm reviews reports in `external_review` (approve / changes / reject)
6. Audit log records operational actions on the case
7. Case detail shows the 12-point rail + blocking gates (`ProcessTimeline`)

Operational SOP: [Proceso_Peritaje_Electrico_12_Puntos.md](./Proceso_Peritaje_Electrico_12_Puntos.md). Rules: `shared/processGates.ts`.

## Motion design

Light spring transitions on portal sidebar / mobile drawer (Framer Motion). Prefer subtle presence over decorative motion.

## Accessibility

Semantic buttons/links, visible focus rings (`ring` token), readable contrast on primary/accent surfaces, and i18n for en/es user-facing copy.

## Technical UI notes

- Data via Redux thunks only (no axios in components)
- Forms: Formik + Yup
- Shared contracts in `shared/api.ts`; business rules in `shared/*`
- API surface: Vercel serverless `api/index.ts` + `swagger.yaml`
