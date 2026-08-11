# ⚡ Electrical Expert Witness Platform

# Product Proposal & Functional Specification

---

# Vision

Develop the leading digital platform for managing **Electrical Expert Witness (Peritaje Eléctrico)** cases from the moment a law firm submits a new lawsuit until the final accounting and payment reconciliation.

The platform must eliminate spreadsheets, WhatsApp dependencies, email chaos and manual tracking by providing a centralized, secure and fully auditable workflow.

Every participant should always know:

- What needs to happen next
- Who is responsible
- Which documents are missing
- Which deadlines are approaching
- Which payments should be collected
- Current status of every case
- Complete evidence history

The system becomes the operational backbone of the consulting company.

---

# Core Objectives

- Digitalize the complete workflow
- Centralize all documents
- Automate status changes
- Track legal deadlines
- Manage field operations
- Manage accounting
- Generate reports
- Provide complete audit trails
- Improve communication
- Reduce human error

---

# User Roles

## Administrator

Full platform access.

Responsibilities:

- User management
- Permissions
- Dashboard
- Reports
- Configuration
- Financial overview
- Assignment management

---

## Case Coordinator

Responsible for operational coordination.

Responsibilities:

- Receive new lawsuits
- Assign experts
- Validate documentation
- Track progress
- Schedule inspections
- Monitor deadlines

---

## Expert Witness (Perito)

Responsible for technical investigation.

Capabilities:

- View assigned cases
- Upload evidence
- Generate reports
- Complete questionnaires
- Update progress
- Submit final expert opinion

---

## Legal Team

Responsible for legal validation.

Capabilities:

- Review reports
- Request corrections
- Approve documents
- Track court deadlines

---

## Logistics Coordinator

Responsible for travel.

Capabilities:

- Flights
- Hotels
- Rental vehicles
- Expenses
- Inspection scheduling

---

## Accountant

Responsible for finances.

Capabilities:

- Advance invoices
- Final invoices
- Payment tracking
- Financial reports

---

## External Law Firm Portal

Secure client portal.

Capabilities:

- Submit new cases
- Upload documents
- View status
- Download reports
- Receive notifications

---

# Complete Workflow

Canonical operational SOP (roles, RACI, gates, nested SLAs, reject loops, single listado):

[docs/Proceso_Peritaje_Electrico_12_Puntos.md](./Proceso_Peritaje_Electrico_12_Puntos.md)

Executable rules: `shared/processGates.ts` (aligned to `CASE_STATUS_FLOW`).

| Point | Status | Accountable | SLA |
|------:|--------|-------------|-----|
| 1 | `intake` | Coordinator | — |
| 2 | `assignment` | Coordinator | — (starts P3 3-day clock on exit) |
| 3 | `questionnaire` | Assigned expert | **3 business days** |
| 4 | `legal_review_questionnaire` | Internal legal | **2 business days** (changes → P3; fondo reject → `on_hold`) |
| 5 | `additional_docs` | Coordinator | Plaintiff Q requested same day; death certificate only if fatality |
| 6 | `court_acceptance` | Assigned expert | **10 business days start when protesta is filed** (not when the status is entered) |
| 7 | `logistics` | Logistics | Inside the 10-day clock |
| 8 | `inspection` | Assigned expert | Inside the 10-day clock; mandatory evidence checklist |
| 9 | `technical_report` | Technical director | Inside the 10-day clock (reject stays P9) |
| 10 | `legal_validation` | Law firm | **3 business days nested inside the 10** (changes → P9 + report `changes_requested`; fondo reject → `on_hold`) |
| 11 | `court_delivery` | Assigned expert | Filing + ratification; releases final invoice flag |
| 12 | `accounting` | Accountant | Collect advance (P3) and final (P11); unpaid issued invoices block `completed` |

Hold resume: coordinator returns to the paused status; admin may jump. Fatality is an explicit `involves_fatality` flag (death certificate is not inferred).

There is **one** listado (staff case grid): avance + cobro flags from `GET /api/cases` (`listado`) — not three spreadsheets.

Documents must be tagged with `category` on upload (or recategorized). Omitted category is rejected. Gates ignore `other`. Missing-doc alerts: intake (P1/P2), additional docs (P5), court filing (P11 only). Despacho cannot retag staff-only files (protesta, ratification…).

Business days = Mon–Fri excluding official Mexican holidays (LFT art. 74). Day 0 = trigger day (not counted). P3 questionnaire GPS (`propertyGps`) writes case coordinates.

---

# Phase 1

## Case Intake

Law firm submits:

- Initial lawsuit
- Medical records
- CFE report
- Preliminary photographs

System automatically:

- Creates case
- Generates Case ID
- Stores documents
- Sends notifications
- Creates audit log

---

# Phase 2

## Assignment

Coordinator assigns:

- Responsible expert
- Internal team
- Priority
- Estimated deadlines

Automatic updates:

- Dashboard
- Calendar
- Notifications

---

# Phase 3

## Questionnaire Preparation

Tasks:

- Property GPS
- Google Street View validation
- Existing power line verification
- Questionnaire generation

When completed:

✔ Status changes

✔ Advance payment milestone triggered

✔ QA review requested

Deadline:

3 Business Days (QA reject stays in this phase; advance invoice only after questionnaire **approved**)

---

# Phase 4

## Legal Review

Legal department reviews:

- Questionnaire
- Chronology
- Technical observations

Possible outcomes:

- Approved
- Requires corrections

---

# Phase 5

## Additional Documentation

Documents received:

- Defendant response
- Death certificate
- Sketches
- Additional evidence
- Plaintiff questionnaire

System verifies completeness automatically.

Missing documents generate alerts.

---

# Phase 6

## Court Acceptance

Tasks:

- Protesta del Cargo
- Court filing
- Acceptance evidence

Platform activates:

10 Business Day countdown (starts when protesta evidence is filed, not merely on status change)

Visual deadline indicators:

🟢 Safe

🟡 Warning

🔴 Critical

---

# Phase 7

## Logistics

Travel management:

Flights

Hotels

Rental cars

Expenses

Inspection schedule

Travel itinerary

Maps

GPS

---

# Phase 8

## Technical Inspection

Mandatory evidence checklist:

### Measurements

- Horizontal distance
- Vertical distance
- Pole distance

### Infrastructure

- Pole ID
- Electrical structures
- Conductors

### Property

- Facade
- Sidewalk
- Construction

### Risk Analysis

- Property invasion
- Oversized construction
- Safety observations

Platform supports:

Photo uploads

Video uploads

GPS

Timestamp

Digital signatures

---

# Phase 9

## Technical Report

Expert prepares:

- Investigation
- Conclusions
- Measurements
- Photo catalog
- Questionnaires

Review process:

Expert

↓

Grammar QA

↓

Technical Director

↓

Approved

---

# Phase 10

## Legal Validation

External law firm reviews.

Possible outcomes:

Approved

Revision requested

Rejected

Maximum:

3 Business Days **inside the 10-day protesta clock**. Changes requested → return to technical report.

---

# Phase 11

## Court Delivery

Tasks:

- Final report upload
- Court submission
- Ratification evidence
- Closing documents

Case becomes:

Completed

---

# Phase 12

## Accounting

Finance automatically detects:

Advance invoice

Final invoice

Pending payments

Completed payments

Revenue reports

---

# Case Dashboard

Each case includes:

## General Information

Case Number

Court

Law Firm

Assigned Expert

Priority

Current Status

Deadline

Location

GPS

---

## Timeline

Complete activity history

Every action

Every upload

Every approval

Every notification

---

## Documents

Categorized folders

Search

Preview

Download

Version control

---

## Evidence

Photos

Videos

GPS

Measurements

Observations

Court filings

---

## Financial

Advance payment

Balance

Invoices

Receipts

Payment history

---

# Notifications

Automatic notifications for:

New assignment

Missing documents

Deadline approaching

Inspection scheduled

Travel confirmed

QA requested

Report approved

Court filing

Payment received

Invoice pending

---

# Calendar

Integrated calendar

Displays:

Court dates

Inspections

Travel

Deadlines

Meetings

Ratification

---

# Reports

## Operational

Cases by status

Cases by expert

Average completion time

Delayed cases

Completed cases

---

## Financial

Revenue

Pending invoices

Cash flow

Payments

Forecast

---

## Productivity

Cases per expert

Review times

Inspection durations

Approval times

---

# Search

Global search:

Case Number

Law Firm

Expert

Court

Address

City

Status

Client

Document name

---

# Document Management

Version history

Digital signatures

OCR

PDF preview

Image gallery

Bulk uploads

Drag & Drop

Metadata

---

# Automation

Examples:

If questionnaire approved

↓

Trigger payment request

---

If inspection completed

↓

Notify QA

---

If deadline < 2 days

↓

Escalation

---

If report approved

↓

Notify legal

---

If ratification completed

↓

Enable final invoice

---

# Audit Trail

Every action recorded:

User

Date

Time

Location

IP

Previous value

New value

Comments

---

# Security

Role-based permissions

Encrypted storage (platform/ops: TiDB + Blob encryption at rest — not an in-app feature)

Daily backups (platform/ops: provider backups — not an in-app feature)

Activity logs

Document versioning

Passwordless email OTP authentication

Session management

---

# KPIs

Average case duration

Average inspection duration

Expert productivity

Revenue

Pending collections

Approval time

Travel costs

Success rate

Cases completed

Monthly growth

# Success Criteria

The platform should reduce administrative workload by over 70%, eliminate manual tracking, provide complete visibility into every expert witness case, ensure legal compliance through auditable workflows, and become the single source of truth for all operational, legal, technical, logistical, and financial activities throughout the lifecycle of every electrical expert witness engagement.
