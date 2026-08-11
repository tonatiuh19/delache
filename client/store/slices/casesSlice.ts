import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type {
  CaseAssignmentItem,
  CaseAuditLogItem,
  CaseDeadlineItem,
  CaseDetail,
  CaseDetailResponse,
  CaseDocumentItem,
  CaseNoteItem,
  CaseResponse,
  CasesListQuery,
  CasesListResponse,
  CaseStatus,
  CaseStatusHistoryItem,
  CaseSummary,
  CompleteReviewRequest,
  CreateAssignmentRequest,
  CreateCaseDocumentRequest,
  CreateCaseNoteRequest,
  CreateCaseRequest,
  CreateEvidenceRequest,
  CreateEvidenceResponse,
  CreateInspectionRequest,
  CreateLogisticsExpenseRequest,
  CreateLogisticsTripRequest,
  CreateMeasurementRequest,
  CreateQuestionnaireRequest,
  CreateTechnicalReportRequest,
  DeleteEvidenceResponse,
  DocumentCompletenessInfo,
  EvidenceChecklistStatus,
  EvidenceItem,
  GeocodeResponse,
  InspectionItem,
  InspectionStatus,
  LogisticsExpenseItem,
  LogisticsTripItem,
  MeasurementItem,
  PaginationInfo,
  QuestionnaireItem,
  ReviewRequestItem,
  TechnicalReportItem,
  TechnicalReportStatus,
  UpdateCaseFlagsRequest,
  UpdateCaseLocationRequest,
  UpdateDocumentCategoryRequest,
  UpdateQuestionnaireStatusRequest,
} from "@shared/api";
import type { CaseProcessGateSnapshot } from "@shared/processGates";
import api from "@/lib/api";

interface CasesState {
  items: CaseSummary[];
  pagination: PaginationInfo | null;
  selected: CaseDetail | null;
  history: CaseStatusHistoryItem[];
  notes: CaseNoteItem[];
  documents: CaseDocumentItem[];
  assignments: CaseAssignmentItem[];
  deadlines: CaseDeadlineItem[];
  questionnaires: QuestionnaireItem[];
  inspections: InspectionItem[];
  measurements: MeasurementItem[];
  evidence: EvidenceItem[];
  evidenceChecklist: EvidenceChecklistStatus | null;
  reviewRequests: ReviewRequestItem[];
  documentCompleteness: {
    intake: DocumentCompletenessInfo;
    additionalDocs: DocumentCompletenessInfo;
    courtFiling: DocumentCompletenessInfo;
  } | null;
  auditLogs: CaseAuditLogItem[];
  trips: LogisticsTripItem[];
  expenses: LogisticsExpenseItem[];
  technicalReports: TechnicalReportItem[];
  allowedNextStatuses: CaseStatus[];
  hasUnpaidInvoices: boolean;
  processGate: CaseProcessGateSnapshot | null;
  statusGateMissing: string[];
  loading: boolean;
  detailLoading: boolean;
  creating: boolean;
  updatingStatus: boolean;
  error: string | null;
}

const initialState: CasesState = {
  items: [],
  pagination: null,
  selected: null,
  history: [],
  notes: [],
  documents: [],
  assignments: [],
  deadlines: [],
  questionnaires: [],
  inspections: [],
  measurements: [],
  evidence: [],
  evidenceChecklist: null,
  reviewRequests: [],
  documentCompleteness: null,
  auditLogs: [],
  trips: [],
  expenses: [],
  technicalReports: [],
  allowedNextStatuses: [],
  hasUnpaidInvoices: false,
  processGate: null,
  statusGateMissing: [],
  loading: false,
  detailLoading: false,
  creating: false,
  updatingStatus: false,
  error: null,
};

function rejectMsg(err: unknown, fallback: string) {
  return (
    (err as { response?: { data?: { error?: string } } })?.response?.data
      ?.error || fallback
  );
}

export const fetchCases = createAsyncThunk(
  "cases/fetchCases",
  async (params: CasesListQuery | undefined, { rejectWithValue }) => {
    try {
      const { data } = await api.get<CasesListResponse>("/api/cases", {
        params: params || undefined,
      });
      return data;
    } catch (err: unknown) {
      return rejectWithValue(rejectMsg(err, "fetch_failed"));
    }
  },
);

export const createCase = createAsyncThunk(
  "cases/createCase",
  async (payload: CreateCaseRequest, { rejectWithValue }) => {
    try {
      const { data } = await api.post<CaseResponse>("/api/cases", payload);
      return data.case;
    } catch (err: unknown) {
      return rejectWithValue(rejectMsg(err, "create_failed"));
    }
  },
);

export const fetchCaseDetail = createAsyncThunk(
  "cases/fetchCaseDetail",
  async (publicUuid: string, { rejectWithValue }) => {
    try {
      const { data } = await api.get<CaseDetailResponse>(
        `/api/cases/${publicUuid}`,
      );
      return data;
    } catch (err: unknown) {
      return rejectWithValue(rejectMsg(err, "fetch_failed"));
    }
  },
);

export const updateCaseStatus = createAsyncThunk(
  "cases/updateCaseStatus",
  async (
    payload: { publicUuid: string; status: CaseStatus; reason?: string },
    { rejectWithValue },
  ) => {
    try {
      const { data } = await api.patch<CaseResponse>(
        `/api/cases/${payload.publicUuid}/status`,
        { status: payload.status, reason: payload.reason },
      );
      return data.case;
    } catch (err: unknown) {
      const data = (
        err as { response?: { data?: { error?: string; missing?: unknown } } }
      )?.response?.data;
      const missing = Array.isArray(data?.missing)
        ? data.missing.filter(
            (item): item is string => typeof item === "string",
          )
        : [];
      return rejectWithValue({
        message: data?.error || "status_failed",
        missing,
      });
    }
  },
);

export const updateCaseFlags = createAsyncThunk(
  "cases/updateCaseFlags",
  async (
    payload: { publicUuid: string } & UpdateCaseFlagsRequest,
    { rejectWithValue },
  ) => {
    try {
      const { publicUuid, ...body } = payload;
      const { data } = await api.patch<CaseResponse>(
        `/api/cases/${publicUuid}`,
        body,
      );
      return data.case;
    } catch (err: unknown) {
      return rejectWithValue(rejectMsg(err, "flags_failed"));
    }
  },
);

export const updateCaseLocation = createAsyncThunk(
  "cases/updateCaseLocation",
  async (
    payload: { publicUuid: string } & UpdateCaseLocationRequest,
    { rejectWithValue },
  ) => {
    try {
      const { publicUuid, ...body } = payload;
      const { data } = await api.patch<CaseResponse>(
        `/api/cases/${publicUuid}/location`,
        body,
      );
      return data.case;
    } catch (err: unknown) {
      return rejectWithValue(rejectMsg(err, "location_failed"));
    }
  },
);

export const geocodeAddress = createAsyncThunk(
  "cases/geocodeAddress",
  async (query: string, { rejectWithValue }) => {
    try {
      const { data } = await api.post<GeocodeResponse>("/api/geo/geocode", {
        query,
      });
      return data;
    } catch (err: unknown) {
      return rejectWithValue(rejectMsg(err, "geocode_failed"));
    }
  },
);

export const addCaseNote = createAsyncThunk(
  "cases/addCaseNote",
  async (
    payload: { publicUuid: string } & CreateCaseNoteRequest,
    { rejectWithValue },
  ) => {
    try {
      const { data } = await api.post<{ note: CaseNoteItem }>(
        `/api/cases/${payload.publicUuid}/notes`,
        { body: payload.body, visibility: payload.visibility },
      );
      return data.note;
    } catch (err: unknown) {
      return rejectWithValue(rejectMsg(err, "note_failed"));
    }
  },
);

export const uploadCaseDocument = createAsyncThunk(
  "cases/uploadCaseDocument",
  async (
    payload: { publicUuid: string } & CreateCaseDocumentRequest,
    { rejectWithValue },
  ) => {
    try {
      const { data } = await api.post<{ document: CaseDocumentItem }>(
        `/api/cases/${payload.publicUuid}/documents`,
        payload,
      );
      return data.document;
    } catch (err: unknown) {
      return rejectWithValue(rejectMsg(err, "upload_failed"));
    }
  },
);

export const bulkUploadCaseDocuments = createAsyncThunk(
  "cases/bulkUploadCaseDocuments",
  async (
    payload: { publicUuid: string; files: CreateCaseDocumentRequest[] },
    { rejectWithValue },
  ) => {
    try {
      const { data } = await api.post<{ documents: CaseDocumentItem[] }>(
        `/api/cases/${payload.publicUuid}/documents/bulk`,
        { files: payload.files },
      );
      return data.documents;
    } catch (err: unknown) {
      return rejectWithValue(rejectMsg(err, "bulk_upload_failed"));
    }
  },
);

export const updateDocumentCategory = createAsyncThunk(
  "cases/updateDocumentCategory",
  async (
    payload: {
      publicUuid: string;
      documentUuid: string;
    } & UpdateDocumentCategoryRequest,
    { rejectWithValue },
  ) => {
    try {
      const { publicUuid, documentUuid, ...body } = payload;
      const { data } = await api.patch<{ document: CaseDocumentItem }>(
        `/api/cases/${publicUuid}/documents/${documentUuid}`,
        body,
      );
      return data.document;
    } catch (err: unknown) {
      return rejectWithValue(rejectMsg(err, "category_failed"));
    }
  },
);

export const runDocumentOcr = createAsyncThunk(
  "cases/runDocumentOcr",
  async (
    payload: {
      publicUuid: string;
      documentUuid: string;
      ocrText?: string;
    },
    { rejectWithValue },
  ) => {
    try {
      const { data } = await api.post<{ document: CaseDocumentItem }>(
        `/api/cases/${payload.publicUuid}/documents/${payload.documentUuid}/ocr`,
        payload.ocrText != null ? { ocrText: payload.ocrText } : {},
      );
      return data.document;
    } catch (err: unknown) {
      return rejectWithValue(rejectMsg(err, "ocr_failed"));
    }
  },
);

export const assignCaseMember = createAsyncThunk(
  "cases/assignCaseMember",
  async (
    payload: { publicUuid: string } & CreateAssignmentRequest,
    { rejectWithValue },
  ) => {
    try {
      const { data } = await api.post<{ assignment: CaseAssignmentItem }>(
        `/api/cases/${payload.publicUuid}/assignments`,
        payload,
      );
      return data.assignment;
    } catch (err: unknown) {
      return rejectWithValue(rejectMsg(err, "assign_failed"));
    }
  },
);

export const unassignCaseMember = createAsyncThunk(
  "cases/unassignCaseMember",
  async (
    payload: { publicUuid: string; assignmentId: number },
    { rejectWithValue },
  ) => {
    try {
      await api.delete(
        `/api/cases/${payload.publicUuid}/assignments/${payload.assignmentId}`,
      );
      return payload.assignmentId;
    } catch (err: unknown) {
      return rejectWithValue(rejectMsg(err, "unassign_failed"));
    }
  },
);

export const createQuestionnaire = createAsyncThunk(
  "cases/createQuestionnaire",
  async (
    payload: { publicUuid: string } & CreateQuestionnaireRequest,
    { rejectWithValue },
  ) => {
    try {
      const { data } = await api.post<{ questionnaire: QuestionnaireItem }>(
        `/api/cases/${payload.publicUuid}/questionnaires`,
        payload,
      );
      return data.questionnaire;
    } catch (err: unknown) {
      return rejectWithValue(rejectMsg(err, "questionnaire_failed"));
    }
  },
);

export const createInspection = createAsyncThunk(
  "cases/createInspection",
  async (
    payload: { publicUuid: string } & CreateInspectionRequest,
    { rejectWithValue },
  ) => {
    try {
      const { data } = await api.post<{ inspection: InspectionItem }>(
        `/api/cases/${payload.publicUuid}/inspections`,
        payload,
      );
      return data.inspection;
    } catch (err: unknown) {
      return rejectWithValue(rejectMsg(err, "inspection_failed"));
    }
  },
);

export const createMeasurement = createAsyncThunk(
  "cases/createMeasurement",
  async (
    payload: { publicUuid: string } & CreateMeasurementRequest,
    { rejectWithValue },
  ) => {
    try {
      const { data } = await api.post<{ measurement: MeasurementItem }>(
        `/api/cases/${payload.publicUuid}/measurements`,
        payload,
      );
      return data.measurement;
    } catch (err: unknown) {
      return rejectWithValue(rejectMsg(err, "measurement_failed"));
    }
  },
);

export const createEvidence = createAsyncThunk(
  "cases/createEvidence",
  async (
    payload: { publicUuid: string } & CreateEvidenceRequest,
    { rejectWithValue },
  ) => {
    try {
      const { publicUuid, ...body } = payload;
      const { data } = await api.post<CreateEvidenceResponse>(
        `/api/cases/${publicUuid}/evidence`,
        body,
      );
      return data;
    } catch (err: unknown) {
      return rejectWithValue(rejectMsg(err, "evidence_failed"));
    }
  },
);

export const deleteEvidence = createAsyncThunk(
  "cases/deleteEvidence",
  async (
    payload: { publicUuid: string; evidenceUuid: string },
    { rejectWithValue },
  ) => {
    try {
      const { data } = await api.delete<DeleteEvidenceResponse>(
        `/api/cases/${payload.publicUuid}/evidence/${payload.evidenceUuid}`,
      );
      return { ...data, evidenceUuid: payload.evidenceUuid };
    } catch (err: unknown) {
      return rejectWithValue(rejectMsg(err, "evidence_delete_failed"));
    }
  },
);

export const createTrip = createAsyncThunk(
  "cases/createTrip",
  async (
    payload: { publicUuid: string } & CreateLogisticsTripRequest,
    { rejectWithValue },
  ) => {
    try {
      const { data } = await api.post<{ trip: LogisticsTripItem }>(
        `/api/cases/${payload.publicUuid}/trips`,
        payload,
      );
      return data.trip;
    } catch (err: unknown) {
      return rejectWithValue(rejectMsg(err, "trip_failed"));
    }
  },
);

export const createExpense = createAsyncThunk(
  "cases/createExpense",
  async (
    payload: { publicUuid: string } & CreateLogisticsExpenseRequest,
    { rejectWithValue },
  ) => {
    try {
      const { data } = await api.post<{ expense: LogisticsExpenseItem }>(
        `/api/cases/${payload.publicUuid}/expenses`,
        payload,
      );
      return data.expense;
    } catch (err: unknown) {
      return rejectWithValue(rejectMsg(err, "expense_failed"));
    }
  },
);

export const createTechnicalReport = createAsyncThunk(
  "cases/createTechnicalReport",
  async (
    payload: { publicUuid: string } & CreateTechnicalReportRequest,
    { rejectWithValue },
  ) => {
    try {
      const { data } = await api.post<{ report: TechnicalReportItem }>(
        `/api/cases/${payload.publicUuid}/technical-reports`,
        payload,
      );
      return data.report;
    } catch (err: unknown) {
      return rejectWithValue(rejectMsg(err, "report_failed"));
    }
  },
);

export const updateTechnicalReportStatus = createAsyncThunk(
  "cases/updateTechnicalReportStatus",
  async (
    payload: {
      publicUuid: string;
      reportUuid: string;
      status: TechnicalReportStatus;
    },
    { rejectWithValue },
  ) => {
    try {
      const { data } = await api.patch<{ report: TechnicalReportItem }>(
        `/api/cases/${payload.publicUuid}/technical-reports/${payload.reportUuid}/status`,
        { status: payload.status },
      );
      return data.report;
    } catch (err: unknown) {
      return rejectWithValue(rejectMsg(err, "report_status_failed"));
    }
  },
);

export const updateQuestionnaireStatus = createAsyncThunk(
  "cases/updateQuestionnaireStatus",
  async (
    payload: {
      publicUuid: string;
      questionnaireUuid: string;
    } & UpdateQuestionnaireStatusRequest,
    { rejectWithValue },
  ) => {
    try {
      const { publicUuid, questionnaireUuid, ...body } = payload;
      const { data } = await api.patch<{ questionnaire: QuestionnaireItem }>(
        `/api/cases/${publicUuid}/questionnaires/${questionnaireUuid}/status`,
        body,
      );
      return data.questionnaire;
    } catch (err: unknown) {
      return rejectWithValue(rejectMsg(err, "questionnaire_status_failed"));
    }
  },
);

export const completeReviewRequest = createAsyncThunk(
  "cases/completeReviewRequest",
  async (
    payload: {
      publicUuid: string;
      reviewId: number;
    } & CompleteReviewRequest,
    { rejectWithValue },
  ) => {
    try {
      const { publicUuid, reviewId, ...body } = payload;
      const { data } = await api.post<{ review: ReviewRequestItem }>(
        `/api/cases/${publicUuid}/reviews/${reviewId}/complete`,
        body,
      );
      return data.review;
    } catch (err: unknown) {
      return rejectWithValue(rejectMsg(err, "review_complete_failed"));
    }
  },
);

export const updateInspectionStatus = createAsyncThunk(
  "cases/updateInspectionStatus",
  async (
    payload: {
      publicUuid: string;
      inspectionUuid: string;
      status: InspectionStatus;
    },
    { rejectWithValue },
  ) => {
    try {
      const { data } = await api.patch<{ inspection: InspectionItem }>(
        `/api/cases/${payload.publicUuid}/inspections/${payload.inspectionUuid}/status`,
        { status: payload.status },
      );
      return data.inspection;
    } catch (err: unknown) {
      return rejectWithValue(rejectMsg(err, "inspection_status_failed"));
    }
  },
);

const casesSlice = createSlice({
  name: "cases",
  initialState,
  reducers: {
    clearCasesError(state) {
      state.error = null;
    },
    clearSelectedCase(state) {
      state.selected = null;
      state.history = [];
      state.notes = [];
      state.documents = [];
      state.assignments = [];
      state.deadlines = [];
      state.questionnaires = [];
      state.inspections = [];
      state.measurements = [];
      state.evidence = [];
      state.evidenceChecklist = null;
      state.reviewRequests = [];
      state.documentCompleteness = null;
      state.auditLogs = [];
      state.trips = [];
      state.expenses = [];
      state.technicalReports = [];
      state.allowedNextStatuses = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCases.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCases.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.cases;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchCases.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || "fetch_failed";
      })
      .addCase(createCase.pending, (state) => {
        state.creating = true;
        state.error = null;
      })
      .addCase(createCase.fulfilled, (state, action) => {
        state.creating = false;
        state.items = [action.payload, ...state.items];
      })
      .addCase(createCase.rejected, (state, action) => {
        state.creating = false;
        state.error = (action.payload as string) || "create_failed";
      })
      .addCase(fetchCaseDetail.pending, (state) => {
        state.detailLoading = true;
        state.error = null;
        state.processGate = null;
      })
      .addCase(fetchCaseDetail.fulfilled, (state, action) => {
        state.detailLoading = false;
        state.selected = action.payload.case;
        state.history = action.payload.history ?? [];
        state.notes = action.payload.notes ?? [];
        state.documents = action.payload.documents ?? [];
        state.assignments = action.payload.assignments ?? [];
        state.deadlines = action.payload.deadlines ?? [];
        state.questionnaires = action.payload.questionnaires ?? [];
        state.inspections = action.payload.inspections ?? [];
        state.measurements = action.payload.measurements ?? [];
        state.evidence = action.payload.evidence ?? [];
        state.evidenceChecklist = action.payload.evidenceChecklist ?? null;
        state.reviewRequests = action.payload.reviewRequests ?? [];
        state.documentCompleteness =
          action.payload.documentCompleteness ?? null;
        state.auditLogs = action.payload.auditLogs ?? [];
        state.trips = action.payload.trips ?? [];
        state.expenses = action.payload.expenses ?? [];
        state.technicalReports = action.payload.technicalReports ?? [];
        state.allowedNextStatuses = action.payload.allowedNextStatuses ?? [];
        state.hasUnpaidInvoices = Boolean(action.payload.hasUnpaidInvoices);
        state.processGate = action.payload.processGate ?? null;
        state.statusGateMissing = [];
      })
      .addCase(fetchCaseDetail.rejected, (state, action) => {
        state.detailLoading = false;
        state.error = (action.payload as string) || "fetch_failed";
      })
      .addCase(updateCaseStatus.pending, (state) => {
        state.updatingStatus = true;
        state.error = null;
        state.statusGateMissing = [];
      })
      .addCase(updateCaseStatus.fulfilled, (state, action) => {
        state.updatingStatus = false;
        state.statusGateMissing = [];
        state.selected = {
          ...(state.selected || action.payload),
          ...action.payload,
        };
        state.items = state.items.map((c) =>
          c.publicUuid === action.payload.publicUuid ? action.payload : c,
        );
      })
      .addCase(updateCaseStatus.rejected, (state, action) => {
        state.updatingStatus = false;
        const payload = action.payload as
          { message?: string; missing?: string[] } | undefined;
        state.error = payload?.message || "status_failed";
        state.statusGateMissing = payload?.missing ?? [];
      })
      .addCase(updateCaseFlags.pending, (state) => {
        state.error = null;
      })
      .addCase(updateCaseFlags.fulfilled, (state, action) => {
        state.selected = {
          ...(state.selected || action.payload),
          ...action.payload,
        };
        state.items = state.items.map((c) =>
          c.publicUuid === action.payload.publicUuid
            ? { ...c, ...action.payload }
            : c,
        );
      })
      .addCase(updateCaseFlags.rejected, (state, action) => {
        state.error = (action.payload as string) || "flags_failed";
      })
      .addCase(updateCaseLocation.fulfilled, (state, action) => {
        state.selected = {
          ...(state.selected || action.payload),
          ...action.payload,
        };
        state.items = state.items.map((c) =>
          c.publicUuid === action.payload.publicUuid
            ? { ...c, ...action.payload }
            : c,
        );
      })
      .addCase(addCaseNote.fulfilled, (state, action) => {
        state.notes = [action.payload, ...state.notes];
      })
      .addCase(uploadCaseDocument.fulfilled, (state, action) => {
        state.documents = [action.payload, ...state.documents];
      })
      .addCase(uploadCaseDocument.rejected, (state, action) => {
        state.error = (action.payload as string) || "upload_failed";
      })
      .addCase(bulkUploadCaseDocuments.fulfilled, (state, action) => {
        state.documents = [...action.payload, ...state.documents];
      })
      .addCase(bulkUploadCaseDocuments.rejected, (state, action) => {
        state.error = (action.payload as string) || "bulk_upload_failed";
      })
      .addCase(updateDocumentCategory.fulfilled, (state, action) => {
        state.documents = state.documents.map((d) =>
          d.publicUuid === action.payload.publicUuid ? action.payload : d,
        );
      })
      .addCase(updateDocumentCategory.rejected, (state, action) => {
        state.error = (action.payload as string) || "category_failed";
      })
      .addCase(runDocumentOcr.fulfilled, (state, action) => {
        state.documents = state.documents.map((d) =>
          d.publicUuid === action.payload.publicUuid ? action.payload : d,
        );
      })
      .addCase(runDocumentOcr.rejected, (state, action) => {
        state.error = (action.payload as string) || "ocr_failed";
      })
      .addCase(assignCaseMember.fulfilled, (state, action) => {
        const next = state.assignments.filter(
          (a) =>
            !(
              a.userId === action.payload.userId &&
              a.assignmentRole === action.payload.assignmentRole
            ),
        );
        state.assignments = [action.payload, ...next];
      })
      .addCase(unassignCaseMember.fulfilled, (state, action) => {
        state.assignments = state.assignments.filter(
          (a) => a.id !== action.payload,
        );
      })
      .addCase(createQuestionnaire.fulfilled, (state, action) => {
        const next = action.payload;
        const without = state.questionnaires.filter(
          (q) => q.publicUuid !== next.publicUuid && q.id !== next.id,
        );
        state.questionnaires = [next, ...without];
      })
      .addCase(createInspection.fulfilled, (state, action) => {
        state.inspections = [action.payload, ...state.inspections];
      })
      .addCase(createMeasurement.fulfilled, (state, action) => {
        state.measurements = [action.payload, ...state.measurements];
      })
      .addCase(createEvidence.fulfilled, (state, action) => {
        state.evidence = [action.payload.evidence, ...state.evidence];
        state.evidenceChecklist = action.payload.evidenceChecklist;
      })
      .addCase(createEvidence.rejected, (state, action) => {
        state.error = (action.payload as string) || "evidence_failed";
      })
      .addCase(deleteEvidence.fulfilled, (state, action) => {
        state.evidence = state.evidence.filter(
          (e) => e.publicUuid !== action.payload.evidenceUuid,
        );
        state.evidenceChecklist = action.payload.evidenceChecklist;
      })
      .addCase(deleteEvidence.rejected, (state, action) => {
        state.error = (action.payload as string) || "evidence_delete_failed";
      })
      .addCase(createTrip.fulfilled, (state, action) => {
        state.trips = [action.payload, ...state.trips];
      })
      .addCase(createExpense.fulfilled, (state, action) => {
        state.expenses = [action.payload, ...state.expenses];
      })
      .addCase(createTechnicalReport.fulfilled, (state, action) => {
        state.technicalReports = [action.payload, ...state.technicalReports];
      })
      .addCase(updateTechnicalReportStatus.fulfilled, (state, action) => {
        state.technicalReports = state.technicalReports.map((r) =>
          r.publicUuid === action.payload.publicUuid ? action.payload : r,
        );
      })
      .addCase(updateQuestionnaireStatus.fulfilled, (state, action) => {
        state.questionnaires = state.questionnaires.map((q) =>
          q.publicUuid === action.payload.publicUuid ? action.payload : q,
        );
      })
      .addCase(updateQuestionnaireStatus.rejected, (state, action) => {
        state.error =
          (action.payload as string) || "questionnaire_status_failed";
      })
      .addCase(completeReviewRequest.fulfilled, (state, action) => {
        state.reviewRequests = state.reviewRequests.map((r) =>
          r.id === action.payload.id ? action.payload : r,
        );
      })
      .addCase(completeReviewRequest.rejected, (state, action) => {
        state.error = (action.payload as string) || "review_complete_failed";
      })
      .addCase(updateInspectionStatus.fulfilled, (state, action) => {
        state.inspections = state.inspections.map((i) =>
          i.publicUuid === action.payload.publicUuid ? action.payload : i,
        );
      })
      .addCase(updateInspectionStatus.rejected, (state, action) => {
        state.error = (action.payload as string) || "inspection_status_failed";
      });
  },
});

export const { clearCasesError, clearSelectedCase } = casesSlice.actions;
export default casesSlice.reducer;
