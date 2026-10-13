/**
 * Shared API contracts — keep in sync with database/schema.sql and api/index.ts
 */

import type { AppLocale } from "./i18n";
import type { CaseProcessGateSnapshot, ListadoProgress } from "./processGates";

export interface DemoResponse {
  message: string;
}

export interface AppVersionResponse {
  version: string | null;
}

export type UserRole =
  | "admin"
  | "expert"
  | "legal"
  | "logistics"
  | "accountant";

export type AuthActor = "staff" | "law_firm";

export type LawFirmMemberRole = "owner" | "admin" | "member" | "viewer";

export type UserStatus = "active" | "inactive" | "suspended" | "invited";

export type CaseStatus =
  | "intake"
  | "assignment"
  | "questionnaire"
  | "legal_review_questionnaire"
  | "additional_docs"
  | "court_acceptance"
  | "field_ops"
  | "technical_report"
  | "validation_delivery"
  | "accounting"
  | "completed"
  | "on_hold"
  | "cancelled";

/** @deprecated Legacy 12-point statuses — migrated to field_ops / validation_delivery */
export type LegacyCaseStatus =
  | "logistics"
  | "inspection"
  | "legal_validation"
  | "court_delivery";

export type ProtestaModality = "presencial" | "virtual";

export type CasePriority = "low" | "normal" | "high" | "urgent";

export interface AuthUser {
  id: number;
  publicUuid: string;
  email: string;
  firstName: string;
  lastName: string;
  /** Staff portal only; null for law-firm actors */
  role: UserRole | null;
  /**
   * Despacho membership role (owner|admin|member|viewer).
   * Null for staff actors or firm users without a membership row.
   */
  memberRole?: LawFirmMemberRole | null;
  actor: AuthActor;
  status: UserStatus;
  phone: string | null;
  avatarUrl: string | null;
  preferredLanguage: AppLocale;
  preferredTheme: "light" | "dark" | "system";
  /**
   * Legacy inline form-field tip helpers. Defaults OFF.
   * Tip helpers were removed from the UI; flag kept for API compatibility.
   */
  showFormHelpers: boolean;
  /** Optional process coaching panel; defaults OFF — opt in from Profile. */
  showProcessGuidance: boolean;
  lastLoginAt: string | null;
}

export interface UpdatePreferencesRequest {
  showFormHelpers?: boolean;
  showProcessGuidance?: boolean;
}

export interface UpdatePreferencesResponse {
  user: AuthUser;
}

export interface RequestOtpRequest {
  email: string;
  locale?: AppLocale;
}

export interface RequestOtpResponse {
  ok: true;
  message: string;
  /** True when a code was actually emailed. */
  sent: true;
  /**
   * Which auth table the code was issued for.
   * Present on unified `/api/auth/request-otp`; actor-specific routes may omit it.
   */
  actor?: AuthActor;
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
  /** Optional external court plazo; null = process SLAs only. */
  externalCourtDeadlineAt?: string | null;
  /** Date the technical report must be finished. Required to leave field ops. */
  dictamenDueAt?: string | null;
  involvesFatality: boolean;
  lawFirmName?: string | null;
  primaryExpertName?: string | null;
  /** Active staff assignments for card ownership badges (list/pipeline). */
  activeAssignments?: Array<{
    assignmentRole: AssignmentRole;
    userName: string;
    isPrimary: boolean;
  }>;
  listado?: ListadoProgress | null;
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
  streetViewValidatedAt: string | null;
  documentsHandoffConfirmedAt: string | null;
  /** P1: admin approved intake package (Aprobar expediente). */
  expedienteApprovedAt: string | null;
  ratificationScheduledAt: string | null;
  protestaModality: ProtestaModality | null;
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

export interface CasesPipelineColumnPage {
  items: CaseSummary[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}

export interface CasesPipelineQuery {
  q?: string;
  status?: string;
  priority?: string;
  limit?: number;
  /** When false, refetch keeps existing columns visible (background refresh). */
  resetColumns?: boolean;
  /** Load-more: column status key. */
  column?: string;
  offset?: number;
}

export interface CasesPipelineResponse {
  limit: number;
  columns: Record<string, CasesPipelineColumnPage>;
}

export interface CasesPipelineColumnMoreResponse {
  column: string;
  items: CaseSummary[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}

export interface TeamListQuery extends GridListParams {
  q?: string;
  role?: string;
  status?: string;
  /** Admin Equipo: staff list (default) or despacho contacts. */
  roster?: "staff" | "firm";
}

export interface TeamListResponse {
  members: TeamMemberItem[];
  pagination: PaginationInfo;
}

export interface InvoicesListQuery extends GridListParams {
  q?: string;
  status?: string;
  caseId?: number;
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
  | "street_view"
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
  ocrStatus?: OcrStatus | null;
  ocrText?: string | null;
  ocrProcessedAt?: string | null;
  approvedAt?: string | null;
  rejectionReason?: string | null;
  correctionRequestedAt?: string | null;
  createdAt: string;
}

export type OcrStatus =
  "pending" | "processing" | "completed" | "failed" | "skipped";

export interface BulkUploadDocumentsRequest {
  files: CreateCaseDocumentRequest[];
}

export interface BulkUploadDocumentsResponse {
  documents: CaseDocumentItem[];
}

export interface SaveDocumentOcrRequest {
  ocrText: string;
  ocrStatus?: OcrStatus;
}

export interface RunDocumentOcrResponse {
  document: CaseDocumentItem;
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
  | "custom"
  | "expert_delivery"
  | "intake_correction";

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
  | "grammar_qa"
  | "legal_review"
  | "changes_requested"
  | "approved"
  | "rejected";

export interface QuestionnaireItem {
  id: number;
  publicUuid: string;
  status: QuestionnaireStatus;
  contentJson: Record<string, unknown> | null;
  chronologyJson: Record<string, unknown> | unknown[] | null;
  technicalObservations: string | null;
  submittedAt: string | null;
  createdAt: string;
  allowedNextStatuses?: QuestionnaireStatus[];
}

export type ReviewEntityType =
  "questionnaire" | "technical_report" | "document" | "inspection";

export type ReviewStage =
  "grammar_qa" | "technical_director" | "internal_legal" | "external_law_firm";

export type ReviewStatus =
  "pending" | "approved" | "changes_requested" | "rejected";

export interface ReviewRequestItem {
  id: number;
  caseId: number;
  entityType: ReviewEntityType;
  entityId: number;
  reviewStage: ReviewStage;
  status: ReviewStatus;
  requestedBy: number | null;
  assignedTo: number | null;
  dueAt: string | null;
  completedAt: string | null;
  notes: string | null;
  createdAt: string;
}

export interface PendingReviewQueueItem extends ReviewRequestItem {
  casePublicUuid: string;
  caseNumber: string;
  caseTitle: string;
}

export interface PendingReviewsResponse {
  reviews: PendingReviewQueueItem[];
  total: number;
}

export interface CompleteReviewRequest {
  outcome: "approved" | "changes_requested" | "rejected";
  notes?: string;
}

export interface UpdateQuestionnaireStatusRequest {
  status: QuestionnaireStatus;
  notes?: string;
}

export interface DocumentCompletenessInfo {
  phase: "intake" | "additional_docs" | "court_filing";
  required: string[];
  present: string[];
  missing: string[];
  complete: boolean;
}

export interface CaseAuditLogItem {
  id: number;
  publicUuid: string;
  actorType: "staff" | "law_firm" | "system";
  actorId: number | null;
  entityType: string;
  entityId: string | null;
  action: string;
  comment: string | null;
  createdAt: string;
}

export interface GlobalSearchHit {
  kind: "case" | "document" | "invoice" | "member";
  id: number;
  publicUuid: string;
  title: string;
  subtitle: string | null;
  href: string;
}

export interface GlobalSearchResponse {
  query: string;
  results: GlobalSearchHit[];
}

export interface DocumentsIndexItem {
  id: number;
  publicUuid: string;
  casePublicUuid: string;
  caseNumber: string;
  category: string;
  title: string;
  status: string;
  mimeType: string | null;
  storageKey: string | null;
  fileName: string | null;
  ocrStatus: OcrStatus | null;
  ocrTextPreview: string | null;
  createdAt: string;
}

export interface DocumentsIndexResponse {
  documents: DocumentsIndexItem[];
  pagination: PaginationInfo;
}

export interface ReportsKpiResponse {
  casesByStatus: Record<string, number>;
  casesByExpert: Array<{ userId: number; name: string; count: number }>;
  completedCount: number;
  delayedCount: number;
  pendingInvoices: number;
  pendingReviews: number;
  averageCompletionDays: number | null;
}

export type InspectionStatus =
  "scheduled" | "in_progress" | "completed" | "cancelled";

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
  "horizontal_distance" | "vertical_distance" | "pole_distance" | "other";

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

export type EvidenceType =
  | "photo"
  | "video"
  | "voice_note"
  | "measurement"
  | "signature"
  | "gps_point"
  | "observation"
  | "court_filing"
  | "other";

export type EvidenceCategory =
  | "horizontal_distance"
  | "vertical_distance"
  | "pole_distance"
  | "pole_id"
  | "electrical_structure"
  | "conductor"
  | "facade"
  | "sidewalk"
  | "construction"
  | "property_invasion"
  | "oversized_construction"
  | "safety"
  | "general";

export interface EvidenceItem {
  id: number;
  publicUuid: string;
  inspectionId: number | null;
  evidenceType: EvidenceType;
  category: EvidenceCategory;
  title: string | null;
  caption: string | null;
  storageKey: string | null;
  mimeType: string | null;
  fileSizeBytes: number | null;
  capturedAt: string | null;
  lat: number | null;
  lng: number | null;
  capturedBy: number | null;
  createdAt: string;
}

export interface EvidenceChecklistStatus {
  covered: EvidenceCategory[];
  missing: EvidenceCategory[];
  coveredCount: number;
  totalCount: number;
  complete: boolean;
}

export interface CreateEvidenceRequest {
  evidenceType: EvidenceType;
  category?: EvidenceCategory;
  title?: string;
  caption?: string;
  inspectionId?: number | null;
  lat?: number | null;
  lng?: number | null;
  capturedAt?: string;
  fileName?: string;
  contentType?: string;
  /** Base64 file payload (required for photo/video/voice_note/signature/court_filing). */
  data?: string;
}

export type LogisticsTripStatus =
  "planned" | "booked" | "in_progress" | "completed" | "cancelled";

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
  "flight" | "hotel" | "rental_car" | "fuel" | "meals" | "other";

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
  defendantQuestionnaireSummary: string | null;
  plaintiffQuestionnaireSummary: string | null;
  photoCatalogJson: Record<string, unknown> | null;
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
  /** Preferred juzgado for new expedientes from this despacho. */
  defaultCourtName?: string | null;
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
  evidence: EvidenceItem[];
  evidenceChecklist: EvidenceChecklistStatus;
  reviewRequests: ReviewRequestItem[];
  documentCompleteness: {
    intake: DocumentCompletenessInfo;
    additionalDocs: DocumentCompletenessInfo;
    courtFiling: DocumentCompletenessInfo;
  };
  auditLogs: CaseAuditLogItem[];
  trips: LogisticsTripItem[];
  expenses: LogisticsExpenseItem[];
  technicalReports: TechnicalReportItem[];
  invoices: InvoiceSummary[];
  allowedNextStatuses: CaseStatus[];
  hasUnpaidInvoices: boolean;
  processGate: CaseProcessGateSnapshot;
}

export interface CreateAssignmentRequest {
  userId: number;
  assignmentRole: AssignmentRole;
  isPrimary?: boolean;
  notes?: string;
  /** Primary expert delivery due date (YYYY-MM-DD or ISO). Creates action item + notifies expert. */
  deliveryDueAt?: string;
}

export interface SetExpertDeliveryDeadlineRequest {
  /** YYYY-MM-DD or ISO datetime; omit/null to clear the active deadline. */
  deliveryDueAt?: string | null;
}

export interface ExpertDeliveryDeadlineResponse {
  deadline: CaseDeadlineItem | null;
}

export interface CreateQuestionnaireRequest {
  contentJson?: Record<string, unknown>;
  chronologyJson?: Record<string, unknown> | unknown[] | null;
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

export interface CreateEvidenceResponse {
  evidence: EvidenceItem;
  evidenceChecklist: EvidenceChecklistStatus;
}

export interface DeleteEvidenceResponse {
  ok: true;
  evidenceChecklist: EvidenceChecklistStatus;
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
  defendantQuestionnaireSummary?: string;
  plaintiffQuestionnaireSummary?: string;
  photoCatalogJson?: Record<string, unknown> | null;
  conclusions?: string;
  submit?: boolean;
}

export interface ConfirmDocumentsHandoffResponse {
  case: Pick<
    CaseDetail,
    "documentsHandoffConfirmedAt" | "publicUuid" | "updatedAt"
  >;
}

export interface SetRatificationScheduledRequest {
  ratificationScheduledAt: string | null;
}

export interface SetRatificationScheduledResponse {
  case: Pick<CaseDetail, "ratificationScheduledAt" | "publicUuid" | "updatedAt">;
}

export interface UpdateTechnicalReportStatusRequest {
  status: TechnicalReportStatus;
}

export interface ClientReviewReportRequest {
  outcome: "approved" | "changes_requested" | "rejected";
  notes?: string;
}

export interface CreateLawFirmRequest {
  name: string;
  legalName?: string;
  email?: string;
  phone?: string;
  city?: string;
  state?: string;
  defaultCourtName?: string;
  /** Required primary owner invite (Q2-C). */
  ownerEmail: string;
  ownerFirstName: string;
  ownerLastName: string;
  ownerPhone?: string;
  preferredLanguage?: string | null;
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
  /** Inline despacho create when inviting the primary owner (Equipo). */
  createLawFirm?: {
    name: string;
    email?: string | null;
    city?: string | null;
    state?: string | null;
    defaultCourtName?: string | null;
  } | null;
  memberRole?: LawFirmMemberRole | null;
  preferredLanguage?: string | null;
}

export interface FirmMemberItem {
  id: number;
  publicUuid: string;
  email: string;
  firstName: string;
  lastName: string;
  memberRole: LawFirmMemberRole;
  isPrimaryContact: boolean;
  status: UserStatus;
  lastLoginAt: string | null;
}

export interface FirmMembersResponse {
  members: FirmMemberItem[];
  canManage: boolean;
  lawFirmId: number;
  lawFirmName: string | null;
}

export interface InviteFirmMemberRequest {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  memberRole?: LawFirmMemberRole | null;
  preferredLanguage?: string | null;
}

export interface UpdateTeamMemberRequest {
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  status?: UserStatus;
  phone?: string | null;
}

export interface TeamMemberSessionItem {
  id: number;
  ipAddress: string | null;
  userAgent: string | null;
  isActive: boolean;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
}

export interface TeamMemberAuditItem {
  id: number;
  action: string;
  comment: string | null;
  previousValueJson: string | null;
  newValueJson: string | null;
  createdAt: string;
}

export interface TeamMemberDetailResponse {
  member: TeamMemberItem;
  sessions: TeamMemberSessionItem[];
  audit: TeamMemberAuditItem[];
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

export interface CreateCaseDocumentFromBlobRequest {
  title: string;
  category?: DocumentCategory;
  fileName: string;
  contentType?: string;
  storageKey: string;
  fileSizeBytes: number;
}

export interface UpdateDocumentCategoryRequest {
  category: DocumentCategory;
}

export interface DashboardStatsResponse {
  totalCases: number;
  byStatus: Partial<Record<CaseStatus, number>>;
  urgentOpen: number;
  completed: number;
  onHold: number;
  pendingReviews: number;
  pendingInvoices: number;
  delayedDeadlines: number;
  missingDocsCases: number;
}

export interface CalendarEventItem {
  id: number;
  publicUuid: string;
  caseId: number | null;
  caseDeadlineId?: number | null;
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
  /** Present when role is law_firm_user (admin Equipo despacho roster). */
  memberRole?: LawFirmMemberRole | null;
  lawFirmId?: number | null;
  lawFirmName?: string | null;
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
  propertyLat?: number | null;
  propertyLng?: number | null;
  involvesFatality?: boolean;
  /** Optional external court plazo; omit or null = no external clock. */
  externalCourtDeadlineAt?: string | null;
}

export interface UpdateCaseFlagsRequest {
  involvesFatality?: boolean;
  /** P6 protesta path: presencial (print+scan) or virtual (signed upload). */
  protestaModality?: "presencial" | "virtual" | null;
  /** Optional external court plazo; null clears. */
  externalCourtDeadlineAt?: string | null;
  /** Dictamen finish date; null clears. Required before leaving field ops. */
  dictamenDueAt?: string | null;
  /** Paso 1 folio. Staff intake pack only. */
  title?: string;
  /** Paso 1 note. Empty string clears. Max 500 characters. */
  description?: string | null;
  /** Despacho that owns the expediente. */
  lawFirmId?: number | null;
}

export interface ApproveCaseDocumentResponse {
  document: CaseDocumentItem;
}

export interface RejectCaseDocumentRequest {
  reason?: string | null;
}

export interface RejectCaseDocumentResponse {
  document: CaseDocumentItem;
}

export interface ApproveExpedienteResponse {
  case: Pick<
    CaseDetail,
    "publicUuid" | "expedienteApprovedAt" | "updatedAt"
  >;
}

export interface UpdateCaseLocationRequest {
  propertyAddress?: string | null;
  propertyCity?: string | null;
  propertyState?: string | null;
  propertyPostalCode?: string | null;
  propertyCountry?: string | null;
  /** Pass null to clear both coordinates. */
  propertyLat?: number | null;
  propertyLng?: number | null;
}

export interface GeocodeRequest {
  query: string;
}

export interface GeocodeResponse {
  lat: number;
  lng: number;
  displayName: string;
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
