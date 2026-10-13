# DELACHE CRM: post-meeting audit and UI fix proposal

**Inputs:** `platform_changes_checklist.txt` (meeting transcript summary), `DELACHE CRM.pdf` (5 annotated client mockups: Paso 1 → Paso 6), current `main` working tree.
**Scope:** I audited every checklist item against the code: shared rules, API, and portal UI. Each item gets a status, the root cause where something is broken, and a concrete fix. Decisions that are still open are listed at the end, each with answer options and a recommendation.

Legend: ✅ exists · 🟡 partial / works but confusing · 🔴 broken or missing

---

## 0. Executive summary

| # | Area | Status | Headline |
|---|------|--------|----------|
| 1 | Dashboard & UI clutter | 🟡 | Every step shows **two progress trackers**: the left step tree and the right "Estado del expediente" rail. There are **5 different deadline concepts** and about 59 hint/subtitle strings on case screens alone. |
| 2 | Document recovery | 🔴 | **Three real bugs** cause the "stuck in rejected/completed" reports (see §2). |
| 3 | Location editing | 🟡 | Editing exists, but **not where users are**: the Paso 2 lat/lng fields are `readOnly`. There is no place name, no pin drop, and no reverse geocoding. |
| 4 | AI questionnaires / templates | 🔴 | Nothing exists: no template library, no AI provider, no template tables. |
| 5 | Workflow order & virtual/in-person | 🟡 | Order is mostly right, but logistics and inspection are **merged** into `field_ops`. No case-level attendance mode exists, and logistics is not notified. |
| 6 | AI reports & in-platform editing | 🔴 | The report is upload-only. There is no editor, autosave, "last saved" indicator, or edit audit trail (`audit_logs` exists but isn't used for this). |
| 7 | Branding / dates / mobile | 🟡 | The questionnaire editor is too thin (no headings or tables, no preview). Several deadline displays duplicate each other. |

**Recommended release plan:** Phase 1 (bugs + clutter) ships first and needs **no product decisions** beyond Q1–Q3 below. Phases 2–4 are gated on the open questions in §9.

> ⚠️ Housekeeping before starting: `main` has ~116 uncommitted files (+11.5k/−7.6k). Commit or branch that work first so these fixes land as reviewable PRs.

---

## 1. Dashboard & UI/UX (checklist §1)

### Findings

1. **Duplicate progress trackers on every step page.** `PortalLayout.tsx:372` renders `CasePortalSidebar` (full step tree). Each step workspace also renders `CasePdfStepShell`, which draws its own "Estado del expediente" rail (`CasePdfStepShell.tsx:75`). On a laptop the user sees the same process twice, side by side. This is the "duplicate summaries/menus" complaint.
2. **Right rail stacks 3 informational cards** before the action buttons: status rail, "Al enviar" hint, "Formatos aceptados". On mobile, `lg:col-span-4` collapses *below* the content, so Send/Draft end up at the very bottom after two info cards.
3. **Help-text density.** The es locale has 116 hint/subtitle/body keys. Case-detail screens alone use about 59, and many are 120–250 characters (`cases.handoffWaitingExpertHint`, `cases.docsBlockingHint`, `cases.expedientePendingDocsHint`…). `HandoffPendingNotice` (5 hints) and `ProtestaModalityPanel` (3) are the heaviest.
4. **The staff dashboard duplicates the Cases page.** The Dashboard has mission control, anticipo cue, quick actions, metric tiles, and a KPI table, while `/portal/cases` has its own `CasesKpiStrip`. The two screens answer the same question.
5. **Summary strip** (`buildCasePdfSummary.ts`): folio, despacho, sent date, deadline, expert. The meeting asked for **office, creation date, deadline, initial documents**. Two of those are present, "initial documents" is missing, and "sent at" duplicates creation for most cases.

### Proposal

| Change | Detail |
|---|---|
| **One progress tracker** | Keep the left step tree as the single source of navigation. Remove the status rail from `CasePdfStepShell`. On mobile (where the sidebar is a drawer), show a compact horizontal `CaseStepStepper` (it already exists) at the top instead. |
| **Sticky action bar** | Move Draft/Send into a sticky footer bar (pattern already exists as `StickyAdvanceBar` in `CaseDetail.tsx`). Show "Formatos aceptados" inline under each dropzone (one muted line), not as a card. |
| **`InfoHint` component (new, reusable)** | An `(i)` icon button with a Popover (`ui/popover.tsx`, which works on tap for mobile, unlike Tooltip). Replace every paragraph-level hint on case screens with `<InfoHint>`. Keep a single one-line subtitle per step. Target: ≤ 1 visible hint sentence per section. |
| **Summary strip v2** | Despacho · Created · **Next deadline (one)** · Expert · Initial docs (4 chips, colored by category tone `bg-doc-*`, ✓/!). Click a chip to preview the file. |
| **Dashboard = "what do I do today"** | Keep only action queue, a 4-tile KPI row, and today's deadlines. Move the KPI table to the Cases page (or remove it). Keep the per-stage colors (`doc-*` and stage tones), as the meeting requested. |
| **Naming** | Keep "Expediente" everywhere (already used); no change. |

---

## 2. Case documents & workflow actions (checklist §2): **the real bugs**

### Root causes found

**Bug A: one rejected file blocks re-upload for the whole category.**
`canLawFirmUploadCategory` (`shared/documentApprovalRules.ts:91`) blocks upload if *any* document in the category is `uploaded/under_review/approved`. Categories hold multiple files (e.g. `preliminary_photo`, "archivos adicionales"). If the admin rejects 1 of 4 photos, the other 3 are still locked, and the despacho **cannot upload the replacement**. The UI mirrors the same rule (`DespachoCaseDetail.tsx:52`, dropzone disabled). This is the "can't add files to rejected documents" report.

**Bug B: a reject can't be undone by staff.**
`documentIsApprovable` (`documentApprovalRules.ts:97`) only allows `uploaded | under_review`. A coordinator who rejects by mistake cannot approve the same file again and has to wait for the despacho to re-upload. Meanwhile the reject has already **sent the despacho an email**, **cleared expediente approval**, and **created a 3-business-day correction deadline**.

**Bug C: no "reopen" for a mistaken approval, only "reject".**
The only way to undo an approval is Reject, which fires all of Bug B's side effects (email, SLA, expediente un-approval) for what was an internal mistake. There is also no way to move a **step** back. `getAllowedNextStatuses` (`shared/caseWorkflow.ts:72`) only goes forward, apart from a few built-in reject loops. Admins have to detour through `on_hold`, which is what users call "stuck".

**Secondary issues**
- Staff intake cards filter rejected files out (`IntakeDocumentCards.tsx:67`). When the only file is rejected, the card shows "Pendiente" and the **rejection reason is invisible** to staff.
- Approve/reject is limited to the 4 intake categories (`api/index.ts:14182`). Protesta, plaintiff questionnaire, and evidence have no per-file review.
- `document_versions` exists, but every upload creates a **new `documents` row at version 1**. Corrections never become "v2 of the same document", so old and new copies pile up side by side.

### Proposal

| Fix | Behavior |
|---|---|
| **A: per-file lock** ✅ *decided: new version* | Lock = "this file". A category stays uploadable while it has fewer than N active files, or whenever any file in it is `rejected`. For single-file categories (demanda, dictamen CFE), a correction upload becomes **a new version of the rejected document**, so status goes back to `uploaded` and history is kept. |
| **B+C: "Reabrir" action (coordinator/admin)** | A new `POST …/documents/:id/reopen` endpoint: `approved | rejected → under_review`. It sends **no email, creates no SLA, and requires a reason**. It writes a row to `audit_logs`. The reject side effects are reversed only if they were created by that reject. |
| **Step reopen** | Admin-only "Regresar a paso anterior" in the workflow section with a required reason. Allowed for one step back, and never past `court_acceptance` once protesta is filed (the legal clock starts there; Q4 confirms). It is recorded in `case_status_history` plus `audit_logs`. |
| **Card UI = 3 verbs only** | Each document card shows only **Subir · Marcar completo · Rechazar** (plus **Reabrir** when completed or rejected), and the visible reason when rejected. Rejected files stay visible in a collapsed "Historial" row instead of disappearing. |
| **Rejection email ("¿Por qué se rechazó?")** | Today `notifyLawFirmIntakeCorrection` sends a plain English one-liner with the raw category key (`Please re-upload cfe_report…`), and the reason is optional. New branded template in `lib/emails.ts` (inlined into `api/index.ts`): Spanish/English per recipient locale, a translated category name, a **required** reason box styled as a highlighted callout, a file name and thumbnail (if image), the correction deadline (3 BD) with the exact date, and a single CTA "Subir corrección" that deep-links to the rejected card. Reject reason becomes **mandatory** in the UI and API (min 10 chars). |
| **Tests** | New rules go into `documentApprovalRules.ts` with Vitest happy and edge cases (multi-file category, mixed statuses, reopen from each status, non-admin). API tests in `api/*.test.ts`, mirrored inline in `api/index.ts`. |

---

## 3. Address & location management (checklist §3)

### Findings
- The edit UI exists in `CaseLocationSection.tsx`: address fields, `/api/geo/geocode`, device GPS, and lat/lng including DMS parsing (`locationRules.ts`). The API is `PATCH /cases/:id/location`, which `canEditCaseLocation` allows for admin, expert, and logistics.
- **But Paso 2 (where the mockup shows search, lat/lng, and map) renders lat/lng `readOnly`** (`PdfStepQuestionnaireWorkspace.tsx:279,287`) with a hint telling the user to go edit it elsewhere. This is the main complaint.
- There is no **location name** field (e.g. "Terreno El Roble, poste #14"). The schema only has address parts plus lat/lng.
- There is no reverse geocoding (coordinates → address) and no click/drag pin; the map is a Google `iframe` embed.
- Street View is only an external link. "Capture reference screenshot" is a manual upload into the `street_view` category.

### Proposal
1. Extract a reusable **`LocationEditor`** from `CaseLocationSection` with a single smart input that accepts *address, coordinates, a Google Maps link, or a place name*. It auto-detects the input type with `parseGpsText` and the geocoder, and adds reverse geocoding to fill in the address. Use it inline in Paso 2, Field ops, and Intake.
2. A **draggable pin** requires the Maps JS API instead of the iframe. Fallback: "click on map → set pin" with the same key (`VITE_GOOGLE_MAPS_API_KEY`).
3. Add a **`property_place_name`** column (migration) and show it as the location title everywhere.
4. **Street View panel:** a "Abrir Street View" button plus a **"Capturar referencia"** button. On desktop this uses the Static Street View API, which renders the exact pano image server-side and attaches it to `street_view` with lat/lng/heading in metadata, with no manual screenshot needed. On mobile it opens the Google Maps app via a `geo:`/universal link, and the user uploads from the camera roll.
5. Mobile: the map gets a full-width "Navegar" CTA, a sticky button, and no nested horizontal scroll.

---

## 4. Questionnaires: editor fixes now, templates + AI later (checklist §4 & §7)

### Current bugs (Phase 1)
- **Duplicate files on every save:** `persistDraft` generates a new `.docx` from the editor and uploads it as a **new document** on *every* "Guardar borrador" (`PdfStepQuestionnaireWorkspace.tsx:184`). Ten saves produce ten DOCX files.
- **Send requires a separately uploaded PDF** (`canSend`, line 104: `hasDocx && hasPdf && hasStreet && lat && lng`), even when the questionnaire was written in the platform editor. The user has to export a PDF outside the app and upload it back.
- **Thin editor:** `QuestionnaireDocEditor` is StarterKit only (bold, italic, lists, undo). There are no headings, numbered questions, or tables, and no **preview** of the final document. Importing DOCX through mammoth loses formatting silently.

### Proposal
- **Phase 1:** save editor content to `questionnaires.content_json` only. Generate the DOCX/PDF **once, on Send**, as a versioned document, and remove the manual-PDF requirement when editor content exists. Add headings and numbered-question blocks to the editor, plus a "Vista previa" tab that renders the exact DOCX output (paged, A4). Add autosave and a "Guardado hace 3 s" indicator (shared hook, reused in §6).
- **Phase 3, templates:** new `questionnaire_templates` table (name, specialty/category, owner, `content_json`, source file, `is_active`) and a **Plantillas** nav item for admins. Uploading a DOCX turns it into an editable template. The template uses merge fields such as `{{folio}}`, `{{despacho}}`, `{{ubicacion}}`, `{{fecha_evento}}`, `{{demandante}}`, which are filled from case data.
- **Phase 3, generation:** "Generar borrador" = template + case data + (optional) AI that adapts questions to the demanda/dictamen CFE text (OCR text already exists in `document_versions.ocr_text`). Every generated draft opens in the editor and **must be reviewed before acceptance**; nothing auto-submits.

---

## 5. Workflow order & conditional steps (checklist §5)

### Current flow (`shared/caseWorkflow.ts`)
```
intake → questionnaire → assignment → legal_review → [additional_docs hidden] → court_acceptance
       → field_ops (logistics + inspection merged) → technical_report → validation_delivery → accounting
```
The meeting's order is **Acceptance & protest → Logistics → Technical inspection → Dictamen → Validation & delivery**. That is the same sequence, except **logistics and inspection must be separate steps** ("keep logistics as a single workflow step").

### Findings
- `field_ops` requires **all 5 evidence tiles** regardless of mode (`PdfStepFieldOpsWorkspace.tsx:69`). For a virtual case, that is impossible or meaningless.
- **No logistics notification:** setting `protesta_modality` (`api/index.ts:10963`) triggers nothing.
- `protesta_modality` (virtual/presencial) describes *how the protesta is signed*. It is **not** the same thing as "the expert travels to the site". The meeting's "virtual vs in-person case" needs a clear owner field (Q2).
- The Paso 6 mockup asks for a calendar to set **how many days the expert has to finish the dictamen**. `dictamen_due_at` already exists but is only editable in `CaseLogisticsSection`, not on the step screen.

### Proposal (decided: split into 2 steps; mode = `protesta_modality`)
- Split `field_ops` into **`logistics`** and **`inspection`**. The legacy statuses `logistics`/`inspection` already map in `LEGACY_CASE_STATUS_MAP`, so in-flight cases can be migrated deterministically. The 10-point rail becomes 11 (or 10 if `additional_docs` is formally dropped).
- **Reuse `protesta_modality`** (`virtual | presencial`) as the case's attendance mode. No new column. Wording in the UI changes from "Modalidad de protesta" to "Modalidad del peritaje" with an `InfoHint` explaining that it drives logistics and inspection. Changing it after logistics has started requires admin and a reason.
  - **presencial:** the logistics step is active. Logistics gets an in-app and email notification as soon as `protesta_modality` and a validated location both exist. The inspection step requires the evidence tiles.
  - **virtual:** the logistics step is auto-skipped (it shows as "No aplica"). Inspection asks only for the documentary evidence subset.
- Each step shows **only its own fields**. The rule goes in `SECTIONS_BY_STEP` plus a new `attendance_mode` filter. Evidence uploads are hidden before the inspection step.
- A "Días para dictamen" picker (business days → `dictamen_due_at`) on the inspection step, using the existing `businessDays.ts`.

---

## 6. Technical report: generation, editor, autosave, audit (checklist §6)

### Findings
`PdfStepReportWorkspace` is upload-plus-send only. `technical_reports` already has `investigation_summary`, `conclusions`, `photo_catalog_json`, and `version_number`, which is a good base for structured authoring. There is no autosave, no "last saved" indicator, and no edit history.

### Proposal
- **Structured editor** (same TipTap base as the questionnaire, extended): sections Antecedentes, Metodología, Inspección, Análisis, Conclusiones, and Anexos (photo catalog from evidence).
- **Per-expert templates and style:** an `expert_report_templates` table (expert, name, `content_json`, reference docs). Generation = template + case data + evidence + questionnaires (plus AI if approved, Q5).
- **Autosave** with a 2 s debounce through `PATCH …/technical-reports/:id/draft` and optimistic concurrency (`updated_at` check, so two tabs don't overwrite each other). The header shows "Guardado · 10:42" or "Guardando…" or "Sin conexión".
- **Audit:** every save adds an `audit_logs` row (actor, timestamp, diff size). Versions are snapshotted on *Send to review*, not on every keystroke. A "Historial" drawer shows who saved what and when.
- **Output:** "Descargar PDF/DOCX", a signature (existing `DigitalSignaturePad`), and a seal image per expert. "Enviar al despacho" reuses the existing P9 review flow.
- Remove the "replace file / v2 upload" UI once the report is authored in-platform. Keep upload as a fallback for externally written reports.
- **Extraction:** OCR text already exists. Add a "Sugerir datos" action that pulls coordinates, names, and addresses from intake docs into the case. Every suggestion needs one-click confirmation; nothing is auto-written.

---

## 7. Additional (checklist §7)

- **Branding:** the despacho logo goes into `law_firms` (new `logo_url`) and is shown in the despacho portal header and on generated questionnaire/report covers. DELACHE assets stay as defined in `BrandLogo`.
- **Dates:** the case currently carries `inspection_deadline_at`, `external_court_deadline_at`, `dictamen_due_at`, the expert delivery deadline, and the intake correction deadline, and they appear in the summary strip, the SLA strip, the deadlines section, and the sidebar. Proposal: a single **`nextDeadline(case)`** rule in `shared/` decides the one deadline shown in headers, with a tooltip listing the rest. Full details stay in the Deadlines section only.
- **Client-domain QA:** after Phase 1, run an e2e pass on the client's domain at 375 px and 1280 px covering create expediente → approve → questionnaire → protesta → logistics → inspection → dictamen.

---

## 8. Phased delivery

| Phase | Contents | Size | Depends on |
|---|---|---|---|
| **1: Immediate fixes** | §2 bugs A/B/C + Reabrir; §4 questionnaire save/send/preview; §3 inline `LocationEditor` + place name; §1 single tracker, `InfoHint`, sticky actions, summary v2 | ~1.5–2 wks | Q1, Q3 |
| **2: Workflow** | Split logistics/inspection, `attendance_mode`, conditional sections, logistics notify, dictamen days picker, step reopen | ~1.5 wks | Q2, Q4 |
| **3: Templates + AI** | Questionnaire templates, report templates, generation, structured report editor | ~3 wks | Q5, Q6 |
| **4: Polish** | Autosave everywhere, audit drawer, branding, unified deadline, mobile e2e | ~1 wk | n/a |

Every phase ships with Vitest coverage (rules in `shared/`, API in `api/*.test.ts`), i18n en+es, swagger updates, and `DESIGN_SYSTEM.md` notes, per AGENTS.md.

---

## 9. Decisions

**Decided (2026-10-12):** Q1 → **a, new version**, plus a branded "why it was rejected" email (§2) · Q2 → **b, reuse `protesta_modality`** · Steps → **split logistics and inspection** · Q3/Q4 → **admin only, one step back, locked once protesta is filed**.

### Still open

| # | Question | Options | Recommendation |
|---|---|---|---|
| Q1 | When a single-file doc is rejected and re-uploaded, what happens? | a) New **version** of the same document (history kept) · b) New separate document, old one archived · c) Old one hard-replaced | **a**: uses the existing `document_versions` and gives a clean audit trail |
| Q2 | What decides "virtual vs presencial case"? | a) New `attendance_mode` field set at acceptance · b) Reuse `protesta_modality` · c) Set at intake by the despacho | **a**: protesta signing mode and site visit are different facts |
| Q3 | Who can **Reabrir** documents and steps? | a) Admin/coordinator only · b) Admin + the step owner (expert/legal) · c) Admin, plus law firm on its own rejected docs | **a** for steps, **a** for docs; experts keep their existing reject loops |
| Q4 | How far back can a step be reopened? | a) One step back, blocked after protesta is filed · b) Any earlier step · c) One step back, no restriction | **a**: protects the legal clock |
| Q5 | AI engine for questionnaire/report drafts | a) Claude API server-side (inline in `api/index.ts`) · b) Template + merge fields only (no AI) first, AI later · c) Other provider | **b then a**: templates deliver 70% of the value with no data-privacy review; add Claude once templates exist |
| Q6 | Where do templates live? | a) Global library, filtered by specialty · b) Per-expert private templates · c) Both (global + personal) | **c** |
| Q7 | Virtual cases: logistics step | a) Auto-skip, shown as "No aplica" · b) Hidden entirely · c) Still required (minimal) | **a**: keeps step numbering stable |
| Q8 | Staff dashboard | a) Action queue + 4 KPIs + today's deadlines · b) Keep current, just trim text · c) Remove dashboard, land on Cases | **a** |
