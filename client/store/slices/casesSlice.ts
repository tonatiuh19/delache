import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type {
  CaseAssignmentItem,
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
  CreateAssignmentRequest,
  CreateCaseDocumentRequest,
  CreateCaseNoteRequest,
  CreateCaseRequest,
  CreateInspectionRequest,
  CreateLogisticsExpenseRequest,
  CreateLogisticsTripRequest,
  CreateMeasurementRequest,
  CreateQuestionnaireRequest,
  CreateTechnicalReportRequest,
  InspectionItem,
  LogisticsExpenseItem,
  LogisticsTripItem,
  MeasurementItem,
  PaginationInfo,
  QuestionnaireItem,
  TechnicalReportItem,
  TechnicalReportStatus,
} from "@shared/api";
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
  trips: LogisticsTripItem[];
  expenses: LogisticsExpenseItem[];
  technicalReports: TechnicalReportItem[];
  allowedNextStatuses: CaseStatus[];
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
  trips: [],
  expenses: [],
  technicalReports: [],
  allowedNextStatuses: [],
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
      return rejectWithValue(rejectMsg(err, "status_failed"));
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
      })
      .addCase(fetchCaseDetail.fulfilled, (state, action) => {
        state.detailLoading = false;
        state.selected = action.payload.case;
        state.history = action.payload.history;
        state.notes = action.payload.notes;
        state.documents = action.payload.documents;
        state.assignments = action.payload.assignments;
        state.deadlines = action.payload.deadlines;
        state.questionnaires = action.payload.questionnaires;
        state.inspections = action.payload.inspections;
        state.measurements = action.payload.measurements;
        state.trips = action.payload.trips;
        state.expenses = action.payload.expenses;
        state.technicalReports = action.payload.technicalReports;
        state.allowedNextStatuses = action.payload.allowedNextStatuses;
      })
      .addCase(fetchCaseDetail.rejected, (state, action) => {
        state.detailLoading = false;
        state.error = (action.payload as string) || "fetch_failed";
      })
      .addCase(updateCaseStatus.pending, (state) => {
        state.updatingStatus = true;
        state.error = null;
      })
      .addCase(updateCaseStatus.fulfilled, (state, action) => {
        state.updatingStatus = false;
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
        state.error = (action.payload as string) || "status_failed";
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
        state.questionnaires = [action.payload, ...state.questionnaires];
      })
      .addCase(createInspection.fulfilled, (state, action) => {
        state.inspections = [action.payload, ...state.inspections];
      })
      .addCase(createMeasurement.fulfilled, (state, action) => {
        state.measurements = [action.payload, ...state.measurements];
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
      });
  },
});

export const { clearCasesError, clearSelectedCase } = casesSlice.actions;
export default casesSlice.reducer;
