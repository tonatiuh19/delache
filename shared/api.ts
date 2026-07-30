/**
 * Shared API contracts — keep in sync with database/schema.sql and api/index.ts
 */

import type { AppLocale } from "./i18n";

export interface DemoResponse {
  message: string;
}

export interface AppVersionResponse {
  version: string | null;
}

export type UserRole =
  | "admin"
  | "case_coordinator"
  | "expert"
  | "legal"
  | "logistics"
  | "accountant";

export type AuthActor = "staff" | "law_firm";

export type UserStatus = "active" | "inactive" | "suspended" | "invited";

export type CaseStatus =
  | "intake"
  | "assignment"
  | "questionnaire"
  | "legal_review_questionnaire"
  | "additional_docs"
  | "court_acceptance"
  | "logistics"
  | "inspection"
  | "technical_report"
  | "legal_validation"
  | "court_delivery"
  | "accounting"
  | "completed"
  | "on_hold"
  | "cancelled";

export type CasePriority = "low" | "normal" | "high" | "urgent";

export interface AuthUser {
  id: number;
  publicUuid: string;
  email: string;
  firstName: string;
  lastName: string;
  /** Staff portal only; null for law-firm actors */
  role: UserRole | null;
  actor: AuthActor;
  status: UserStatus;
  phone: string | null;
  avatarUrl: string | null;
  preferredLanguage: AppLocale;
  preferredTheme: "light" | "dark" | "system";
  lastLoginAt: string | null;
}

export interface RequestOtpRequest {
  email: string;
  locale?: AppLocale;
}

export interface RequestOtpResponse {
  ok: true;
  message: string;
}

export interface VerifyOtpRequest {
  email: string;
  code: string;
}

export interface VerifyOtpResponse {
  token: string;
  user: AuthUser;
}

export interface AuthMeResponse {
  user: AuthUser;
}

export interface ApiErrorResponse {
  error: string;
  missing?: string[];
}

export interface CaseSummary {
  id: number;
  publicUuid: string;
  caseNumber: string;
  title: string;
  status: CaseStatus;
  priority: CasePriority;
  courtName: string | null;
  propertyCity: string | null;
  propertyState: string | null;
  lawFirmId: number | null;
  assignedExpertId: number | null;
  inspectionDeadlineAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CaseDetail extends CaseSummary {
  description: string | null;
  externalReference: string | null;
  courtFileNumber: string | null;
  plaintiffName: string | null;
  defendantName: string | null;
  propertyAddress: string | null;
  propertyPostalCode: string | null;
  propertyCountry: string;
  propertyLat: number | null;
  propertyLng: number | null;
  assignedCoordinatorId: number | null;
  intakeReceivedAt: string | null;
  completedAt: string | null;
}

export interface CasesListResponse {
  cases: CaseSummary[];
  pagination: PaginationInfo;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface GridListParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortDir?: "ASC" | "DESC";
}

export interface CasesListQuery extends GridListParams {
  q?: string;
  status?: string;
  priority?: string;
}

export interface TeamListQuery extends GridListParams {
  q?: string;
  role?: string;
  status?: string;
}

export interface TeamListResponse {
  members: TeamMemberItem[];
  pagination: PaginationInfo;
}

export interface InvoicesListQuery extends GridListParams {
  q?: string;
  status?: string;
}

export interface InvoicesListResponse {
  invoices: InvoiceSummary[];
  pagination: PaginationInfo;
}

export interface CaseResponse {
  case: CaseDetail;
}

export interface CaseStatusHistoryItem {
  id: number;
  fromStatus: string | null;
  toStatus: string;
  reason: string | null;
  changedBy: number | null;
  createdAt: string;
}

export interface CaseNoteItem {
  id: number;
  body: string;
  visibility: "internal" | "law_firm" | "all";
  authorId: number | null;
  createdAt: string;
}

export type DocumentCategory =
  | "lawsuit"
  | "medical_record"
  | "cfe_report"
  | "preliminary_photo"
  | "defendant_response"
  | "death_certificate"
  | "sketch"
  | "plaintiff_questionnaire"
  | "questionnaire"
  | "technical_report"
  | "court_filing"
  | "protesta"
  | "ratification"
  | "invoice"
  | "receipt"
  | "logistics"
  | "other";

export interface CaseDocumentItem {
  id: number;
  publicUuid: string;
  category: DocumentCategory;
  title: string;
  status: string;
  currentVersion: number;
  fileName: string | null;
  mimeType: string | null;
  storageKey: string | null;
  fileSizeBytes: number | null;
  createdAt: string;
}

export type AssignmentRole =
  | "expert"
  | "coordinator"
  | "legal_reviewer"
  | "logistics"
  | "accountant"
  | "qa"
  | "technical_director"
  | "observer";

export interface CaseAssignmentItem {
  id: number;
  userId: number;
  userName: string;
  userEmail: string;
  assignmentRole: AssignmentRole;
  isPrimary: boolean;
  assignedAt: string;
  notes: string | null;
}

export type DeadlineType =
  | "questionnaire"
  | "legal_review"
  | "court_acceptance_window"
  | "inspection"
  | "technical_report"
  | "external_legal_validation"
  | "court_delivery"
  | "payment"
  | "custom";

export type DeadlineSeverity = "safe" | "warning" | "critical" | "overdue";

export interface CaseDeadlineItem {
  id: number;
  deadlineType: DeadlineType;
  title: string;
  dueAt: string;
  businessDays: number | null;
  severityLevel: DeadlineSeverity;
  completedAt: string | null;
}

export type QuestionnaireStatus =
  | "draft"
  | "submitted"
  | "legal_review"
  | "changes_requested"
  | "approved"
  | "rejected";

export interface QuestionnaireItem {
  id: number;
  publicUuid: string;
  status: QuestionnaireStatus;
  contentJson: Record<string, unknown> | null;
  chronologyJson: Record<string, unknown> | null;
  technicalObservations: string | null;
  submittedAt: string | null;
  createdAt: string;
}

export type InspectionStatus =
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled";

export interface InspectionItem {
  id: number;
  publicUuid: string;
  status: InspectionStatus;
  scheduledAt: string | null;
  completedAt: string | null;
  notes: string | null;
  leadExpertId: number | null;
}

export type MeasurementType =
  | "horizontal_distance"
  | "vertical_distance"
  | "pole_distance"
  | "other";

export interface MeasurementItem {
  id: number;
  inspectionId: number | null;
  measurementType: MeasurementType;
  valueNumeric: number;
  unit: "m" | "cm" | "ft" | "in";
  poleId: string | null;
  notes: string | null;
  recordedAt: string;
}

export type LogisticsTripStatus =
  | "planned"
  | "booked"
  | "in_progress"
  | "completed"
  | "cancelled";

export interface LogisticsTripItem {
  id: number;
  publicUuid: string;
  status: LogisticsTripStatus;
  departureAt: string | null;
  returnAt: string | null;
  originCity: string | null;
  destinationCity: string | null;
  notes: string | null;
}

export type ExpenseType =
  | "flight"
  | "hotel"
  | "rental_car"
  | "fuel"
  | "meals"
  | "other";

export interface LogisticsExpenseItem {
  id: number;
  tripId: number;
  expenseType: ExpenseType;
  vendorName: string | null;
  amount: number;
  currency: string;
  expenseDate: string | null;
  notes: string | null;
}

export type TechnicalReportStatus =
  | "draft"
  | "grammar_qa"
  | "technical_director"
  | "approved_internal"
  | "external_review"
  | "changes_requested"
  | "approved"
  | "rejected"
  | "delivered";

export interface TechnicalReportItem {
  id: number;
  publicUuid: string;
  status: TechnicalReportStatus;
  versionNumber: number;
  investigationSummary: string | null;
  conclusions: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  allowedNextStatuses: TechnicalReportStatus[];
}

export type NotificationType =
  | "new_assignment"
  | "missing_documents"
  | "deadline_approaching"
  | "inspection_scheduled"
  | "travel_confirmed"
  | "qa_requested"
  | "report_approved"
  | "court_filing"
  | "payment_received"
  | "invoice_pending"
  | "otp_login"
  | "general";

export interface NotificationItem {
  id: number;
  publicUuid: string;
  caseId: number | null;
  notificationType: NotificationType;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
}

export interface LawFirmSummary {
  id: number;
  publicUuid: string;
  name: string;
  email: string | null;
  status: "active" | "inactive";
  city: string | null;
  state: string | null;
}

export interface CaseDetailResponse {
  case: CaseDetail;
  history: CaseStatusHistoryItem[];
  notes: CaseNoteItem[];
  documents: CaseDocumentItem[];
  assignments: CaseAssignmentItem[];
  deadlines: CaseDeadlineItem[];
  questionnaires: QuestionnaireItem[];
  inspections: InspectionItem[];
  measurements: MeasurementItem[];
  trips: LogisticsTripItem[];
  expenses: LogisticsExpenseItem[];
  technicalReports: TechnicalReportItem[];
  allowedNextStatuses: CaseStatus[];
}

export interface CreateAssignmentRequest {
  userId: number;
  assignmentRole: AssignmentRole;
  isPrimary?: boolean;
  notes?: string;
}

export interface CreateQuestionnaireRequest {
  contentJson?: Record<string, unknown>;
  chronologyJson?: Record<string, unknown>;
  technicalObservations?: string;
  submit?: boolean;
}

export interface CreateInspectionRequest {
  scheduledAt?: string;
  notes?: string;
  leadExpertId?: number | null;
}

export interface CreateMeasurementRequest {
  inspectionId?: number | null;
  measurementType: MeasurementType;
  valueNumeric: number;
  unit?: "m" | "cm" | "ft" | "in";
  poleId?: string;
  notes?: string;
}

export interface CreateLogisticsTripRequest {
  originCity?: string;
  destinationCity?: string;
  departureAt?: string;
  returnAt?: string;
  notes?: string;
  status?: LogisticsTripStatus;
}

export interface CreateLogisticsExpenseRequest {
  tripId: number;
  expenseType: ExpenseType;
  amount: number;
  currency?: string;
  vendorName?: string;
  expenseDate?: string;
  notes?: string;
}

export interface CreateTechnicalReportRequest {
  investigationSummary?: string;
  conclusions?: string;
  submit?: boolean;
}

export interface UpdateTechnicalReportStatusRequest {
  status: TechnicalReportStatus;
}

export interface CreateLawFirmRequest {
  name: string;
  legalName?: string;
  email?: string;
  phone?: string;
  city?: string;
  state?: string;
}

export interface CreateCalendarEventRequest {
  title: string;
  eventType?:
    | "court_date"
    | "inspection"
    | "travel"
    | "deadline"
    | "meeting"
    | "ratification"
    | "other";
  startsAt: string;
  endsAt?: string;
  location?: string;
  caseId?: number | null;
  description?: string;
}

export interface CreateInvoiceRequest {
  caseId: number;
  invoiceType: "advance" | "final" | "expense" | "other";
  totalAmount: number;
  currency?: string;
  dueAt?: string;
  notes?: string;
  issue?: boolean;
}

export interface CreatePaymentRequest {
  amount: number;
  method?: "transfer" | "check" | "cash" | "card" | "other";
  reference?: string;
  notes?: string;
  paidAt?: string;
}

export interface InviteTeamMemberRequest {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole | "law_firm_user";
  phone?: string;
  lawFirmId?: number | null;
}

export interface UpdateCaseStatusRequest {
  status: CaseStatus;
  reason?: string;
}

export interface CreateCaseNoteRequest {
  body: string;
  visibility?: "internal" | "law_firm" | "all";
}

export interface CreateCaseDocumentRequest {
  title: string;
  category?: DocumentCategory;
  fileName: string;
  contentType?: string;
  data: string;
}

export interface DashboardStatsResponse {
  totalCases: number;
  byStatus: Partial<Record<CaseStatus, number>>;
  urgentOpen: number;
  completed: number;
  onHold: number;
}

export interface CalendarEventItem {
  id: number;
  publicUuid: string;
  caseId: number | null;
  eventType: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  location: string | null;
}

export interface InvoiceSummary {
  id: number;
  publicUuid: string;
  caseId: number;
  invoiceNumber: string;
  invoiceType: string;
  status: string;
  totalAmount: number;
  currency: string;
  dueAt: string | null;
}

export interface TeamMemberItem {
  id: number;
  publicUuid: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole | "law_firm_user";
  status: UserStatus;
  lastLoginAt: string | null;
}

export interface CreateCaseRequest {
  title: string;
  description?: string;
  lawFirmId?: number | null;
  courtName?: string;
  externalReference?: string;
  priority?: CasePriority;
  plaintiffName?: string;
  defendantName?: string;
  propertyAddress?: string;
  propertyCity?: string;
  propertyState?: string;
  propertyPostalCode?: string;
  propertyCountry?: string;
}

export interface CaseNumberSettings {
  format: string;
  nextSeq: number;
  preview: string;
}

export interface UploadBlobResponse {
  url: string;
  pathname: string;
  contentType: string | null;
  size: number | null;
}

