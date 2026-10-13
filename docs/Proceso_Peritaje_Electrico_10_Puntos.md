# Proceso de Peritaje Eléctrico — 10 puntos (SoT v2)

**Canonical source of truth** after decision **Y** (collapse 12 → 10).  
Executable rules: `shared/processGates.ts` + `shared/caseWorkflow.ts`.  
Prior 12-point doc remains historical reference only.

## Why 10

Stakeholder Miro board modeled 10 operational stages. Product collapses:

| Old (12) | New (10) |
|----------|----------|
| P7 Logística + P8 Inspección | **P7 Field ops** (`field_ops`) |
| P10 Validación despacho + P11 Entrega/ratificación | **P9 Validation & delivery** (`validation_delivery`) |
| Blank Miro stage 5 | **P5 Docs del despacho** (`additional_docs`) — filled |

## Locked product decisions

| ID | Choice |
|----|--------|
| Order | **Questionnaire → assign** (client PDF, Oct 2026). `additional_docs` stays in the enum for in-flight cases and is hidden from the step rail. |
| Protesta | **presencial \| virtual** (+ scan path for presencial) |
| Revisión jurídica (P4) | **Internal legal only** |
| Anticipo | After **P3 QA pass** (`advanceReleased`) |
| Miro | Rewrite as **mirror of this 10-point SoT** |

## Roles (system)

| Role (Miro) | Actor | Owns |
|-------------|-------|------|
| Despacho | `law_firm` | Intake pack, plaintiff docs, firm report validation |
| Coordinador | `admin` | Assign, handoff, advance, escalate, overrides, users |
| Perito | `expert` | Q, protesta, field ops, dictamen, delivery |
| Legal interno | `legal` | P4 questionnaire legal approval |
| Logística | `logistics` | Trips inside field_ops |
| Contador | `accountant` | Anticipo + finiquito capture |

`case_coordinator` was removed as a login role — Miro Coordinador is `admin`.  
Persona names on Miro are **examples only**.

### Staff step-tree visibility (portal sidebar)

| Role | Steps shown |
|------|-------------|
| `admin` | All 10 |
| `expert` | P3, P6–P9 + soft-parallel P3; always includes **current** PASO ACTUAL (e.g. P2 while waiting handoff) |
| `legal` | P4 + P3 (questionnaire context) |
| `logistics` | P7 + current |
| `accountant` | P10 + current |

Subsections hide `workflow` for non-ops (except accountant on P10). Soft parallel prep does **not** unlock earlier admin-owned steps as work targets.

## Status flow

```
intake → questionnaire → assignment → legal_review_questionnaire
  → court_acceptance → field_ops → technical_report
  → validation_delivery → accounting → completed
```

Laterals: `on_hold`, `cancelled` (unchanged).

### Migration map

| Old status | New status |
|------------|------------|
| `logistics` | `field_ops` |
| `inspection` | `field_ops` |
| `legal_validation` | `validation_delivery` |
| `court_delivery` | `validation_delivery` |
| all others | unchanged |

## Points

### P1 — Recepción (`intake`) · A: coordinator · R: law_firm (primary creator)
**Who creates:** Jurídico (**despacho**) creates the expediente in the client portal (Miro: “Crear expediente y subir documentos iniciales”). Admin/coordinator may create **on behalf** when needed.  
Min docs: demanda, expediente médico, dictamen CFE, fotos preliminares.  
Expediente may exist incomplete; Listado flags `intakeComplete`.

### P2 — Asignación + handoff (`assignment`) · A: coordinator
Primary expert required. Coordinator confirms documents handoff.  
Soft parallel: logistics may **draft** trip after expert assigned, but case stays in P2/P3 until gates pass.

### P3 — Cuestionario / GPS / Street View / QA (`questionnaire`) · A: expert · SLA 3 BD
Expert uploads **defendant questionnaire PDF** (`category: questionnaire`, Miro `05_cuestionario_demandada.pdf`) **and** captures GPS / Street View (+ optional chronology / notes).  
QA pass → `advanceReleased` (anticipo). Soft parallel: GPS/SV drafts allowed once expert assigned.  
**Gate:** `doc:questionnaire` file is required — form fields alone do not clear the artifact.

### P4 — Revisión jurídica interna (`legal_review_questionnaire`) · A: legal · SLA 2 BD
Approve → P5. Changes → P3. Reject fondo → `on_hold`.

### P5 — Docs del despacho (`additional_docs`) · A: coordinator · R: law_firm
Plaintiff questionnaire required before leaving field_ops/report. Death cert if fatality.  
Does **not** block protesta if court already cited.

### P6 — Protesta (`court_acceptance`) · A: expert · SLA parent 10 BD
`protesta_modality`: `presencial` | `virtual`.  
**Gate:** upload `protesta` PDF (Miro `10_protesta_del_cargo.pdf`). Virtual: signed file. Presencial: print → wet sign → scan.  
**Clock starts on protesta artifact**, not modality alone.

### P7 — Field ops (`field_ops`) · A: expert (logistics C) · inside 10 BD
Merged logistics + inspection. Gates: `logisticsReady` + inspection complete + evidence checklist + plaintiff Q.

### P8 — Dictamen interno (`technical_report`) · A: technical director · R: expert
**Gate:** `technical_report` PDF (Miro `11_dictamen_tecnico.pdf`) + internal approval status.  
Form chapter text is optional metadata only — does not substitute for the file.

### P9 — Validación & entrega (`validation_delivery`) · A: law_firm then expert · SLA 3 BD nested
Firm approves report (or returns to P8).  
**Gates:** `court_filing` + `ratification` PDFs (Miro `12` / `13`). Schedule is planning only and does **not** clear `doc:ratification`.  
`finalReleased` on ratification / attended-with-report.

### P10 — Cobranza (`accounting`) · A: accountant
Anticipo + finiquito. Unpaid invoices block `completed`.

## Soft parallel rules

Allowed without advancing status:

- After P2 expert assigned: logistics may create draft trip; GPS/SV draft on case.
- Before P6: field prep notes allowed; **cannot** mark inspection complete until in `field_ops` (or after protesta for evidence upload — product: evidence gated to field_ops).

Hard gates still block `PATCH .../status` forward advance.

## Reject loops

```
P3 QA reject          → P3
P4 changes            → P3
P8 internal reject    → P8
P9 firm changes/reject → P8
```

## Listado badges (not case.status)

ACTIVO / EN REVISIÓN / EN ESPERA / VENCIDO / CERRADO / PAGADO — derived UI badges from clocks + finance flags.
