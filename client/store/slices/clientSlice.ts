import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { logout } from "./authSlice";
import type {
  CaseDetail,
  CaseDocumentItem,
  CaseNoteItem,
  CaseResponse,
  CasesListResponse,
  CaseSummary,
  ClientReviewReportRequest,
  CreateCaseDocumentRequest,
  CreateCaseRequest,
  DocumentCategory,
  DocumentCompletenessInfo,
  NotificationItem,
  UpdateCaseFlagsRequest,
  UpdateDocumentCategoryRequest,
  TechnicalReportItem,
} from "@shared/api";
import api from "@/lib/api";
import { uploadCaseDocumentsBatch } from "@/utils/caseDocumentUpload";

interface ClientState {
  cases: CaseSummary[];
  selected: CaseDetail | null;
  notes: CaseNoteItem[];
  documents: CaseDocumentItem[];
  technicalReports: TechnicalReportItem[];
  documentCompleteness: {
    intake: DocumentCompletenessInfo;
    additionalDocs: DocumentCompletenessInfo;
    courtFiling: DocumentCompletenessInfo;
  } | null;
  notifications: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  detailLoading: boolean;
  loadingNotifications: boolean;
  creating: boolean;
  reviewingReport: boolean;
  error: string | null;
}

const initialState: ClientState = {
  cases: [],
  selected: null,
  notes: [],
  documents: [],
  technicalReports: [],
  documentCompleteness: null,
  notifications: [],
  unreadCount: 0,
  loading: false,
  detailLoading: false,
  loadingNotifications: false,
  creating: false,
  reviewingReport: false,
  error: null,
};

function rejectMsg(err: unknown, fallback: string) {
  return (
    (err as { response?: { data?: { error?: string } } })?.response?.data
      ?.error || fallback
  );
}

export const fetchClientCases = createAsyncThunk(
  "client/fetchCases",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get<CasesListResponse>("/api/client/cases");
      return data.cases;
    } catch (err: unknown) {
      return rejectWithValue(rejectMsg(err, "fetch_failed"));
    }
  },
);

export const createClientCase = createAsyncThunk(
  "client/createCase",
  async (payload: CreateCaseRequest, { rejectWithValue }) => {
    try {
      const { data } = await api.post<CaseResponse>(
        "/api/client/cases",
        payload,
      );
      return data.case;
    } catch (err: unknown) {
      return rejectWithValue(rejectMsg(err, "create_failed"));
    }
  },
);

export const fetchClientCaseDetail = createAsyncThunk(
  "client/fetchCaseDetail",
  async (publicUuid: string, { rejectWithValue }) => {
    try {
      const { data } = await api.get<{
        case: CaseDetail;
        notes: CaseNoteItem[];
        documents: CaseDocumentItem[];
        technicalReports: TechnicalReportItem[];
        documentCompleteness?: ClientState["documentCompleteness"];
      }>(`/api/client/cases/${publicUuid}`);
      return data;
    } catch (err: unknown) {
      return rejectWithValue(rejectMsg(err, "fetch_failed"));
    }
  },
);

export const updateClientCaseFlags = createAsyncThunk(
  "client/updateCaseFlags",
  async (
    payload: { publicUuid: string } & UpdateCaseFlagsRequest,
    { rejectWithValue },
  ) => {
    try {
      const { publicUuid, ...body } = payload;
      const { data } = await api.patch<CaseResponse>(
        `/api/client/cases/${publicUuid}`,
        body,
      );
      return data.case;
    } catch (err: unknown) {
      return rejectWithValue(rejectMsg(err, "flags_failed"));
    }
  },
);

export const updateClientDocumentCategory = createAsyncThunk(
  "client/updateDocumentCategory",
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
        `/api/client/cases/${publicUuid}/documents/${documentUuid}`,
        body,
      );
      return data.document;
    } catch (err: unknown) {
      return rejectWithValue(rejectMsg(err, "category_failed"));
    }
  },
);

export const uploadClientDocument = createAsyncThunk(
  "client/uploadDocument",
  async (
    payload: { publicUuid: string } & CreateCaseDocumentRequest,
    { rejectWithValue },
  ) => {
    try {
      const { data } = await api.post<{ document: CaseDocumentItem }>(
        `/api/client/cases/${payload.publicUuid}/documents`,
        payload,
      );
      return data.document;
    } catch (err: unknown) {
      return rejectWithValue(rejectMsg(err, "upload_failed"));
    }
  },
);

export const uploadClientDocumentsSmart = createAsyncThunk(
  "client/uploadDocumentsSmart",
  async (
    payload: {
      publicUuid: string;
      files: File[];
      category: DocumentCategory;
    },
    { rejectWithValue },
  ) => {
    try {
      const result = await uploadCaseDocumentsBatch({
        publicUuid: payload.publicUuid,
        files: payload.files,
        category: payload.category,
        actor: "law_firm",
      });
      if (result.documents.length === 0) {
        return rejectWithValue(
          result.failures[0]?.error || "upload_failed",
        );
      }
      return result;
    } catch (err: unknown) {
      return rejectWithValue(rejectMsg(err, "upload_failed"));
    }
  },
);

export const reviewClientReport = createAsyncThunk(
  "client/reviewClientReport",
  async (
    payload: {
      publicUuid: string;
      reportUuid: string;
    } & ClientReviewReportRequest,
    { rejectWithValue },
  ) => {
    try {
      const { publicUuid, reportUuid, ...body } = payload;
      const { data } = await api.post<{ report: TechnicalReportItem }>(
        `/api/client/cases/${publicUuid}/technical-reports/${reportUuid}/review`,
        body,
      );
      return data.report;
    } catch (err: unknown) {
      return rejectWithValue(rejectMsg(err, "report_review_failed"));
    }
  },
);

export const fetchClientNotifications = createAsyncThunk(
  "client/fetchNotifications",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get<{
        notifications: NotificationItem[];
        unreadCount: number;
      }>("/api/notifications");
      return data;
    } catch (err: unknown) {
      return rejectWithValue(rejectMsg(err, "notifications_failed"));
    }
  },
);

export const markClientNotificationRead = createAsyncThunk(
  "client/markNotificationRead",
  async (publicUuid: string, { rejectWithValue }) => {
    try {
      await api.post(`/api/notifications/${publicUuid}/read`);
      return publicUuid;
    } catch (err: unknown) {
      return rejectWithValue(rejectMsg(err, "notification_read_failed"));
    }
  },
);

export const markAllClientNotificationsRead = createAsyncThunk(
  "client/markAllNotificationsRead",
  async (_, { rejectWithValue }) => {
    try {
      await api.post("/api/notifications/read-all");
      return true;
    } catch (err: unknown) {
      return rejectWithValue(rejectMsg(err, "notification_read_failed"));
    }
  },
);

const clientSlice = createSlice({
  name: "client",
  initialState,
  reducers: {
    clearClientError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchClientCases.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchClientCases.fulfilled, (state, action) => {
        state.loading = false;
        state.cases = action.payload;
      })
      .addCase(fetchClientCases.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) || "fetch_failed";
      })
      .addCase(createClientCase.pending, (state) => {
        state.creating = true;
      })
      .addCase(createClientCase.fulfilled, (state, action) => {
        state.creating = false;
        state.cases = [action.payload, ...state.cases];
      })
      .addCase(createClientCase.rejected, (state, action) => {
        state.creating = false;
        state.error = (action.payload as string) || "create_failed";
      })
      .addCase(fetchClientCaseDetail.pending, (state) => {
        state.detailLoading = true;
      })
      .addCase(fetchClientCaseDetail.fulfilled, (state, action) => {
        state.detailLoading = false;
        state.selected = action.payload.case;
        state.notes = action.payload.notes;
        state.documents = action.payload.documents;
        state.technicalReports = action.payload.technicalReports;
        state.documentCompleteness = action.payload.documentCompleteness ?? null;
      })
      .addCase(fetchClientCaseDetail.rejected, (state, action) => {
        state.detailLoading = false;
        state.error = (action.payload as string) || "fetch_failed";
      })
      .addCase(updateClientCaseFlags.pending, (state) => {
        state.error = null;
      })
      .addCase(updateClientCaseFlags.rejected, (state, action) => {
        state.error = (action.payload as string) || "flags_failed";
      })
      .addCase(updateClientCaseFlags.fulfilled, (state, action) => {
        state.selected = {
          ...(state.selected || action.payload),
          ...action.payload,
        };
        state.cases = state.cases.map((c) =>
          c.publicUuid === action.payload.publicUuid
            ? { ...c, ...action.payload }
            : c,
        );
      })
      .addCase(uploadClientDocument.fulfilled, (state, action) => {
        state.documents = [action.payload, ...state.documents];
      })
      .addCase(uploadClientDocument.rejected, (state, action) => {
        state.error = (action.payload as string) || "upload_failed";
      })
      .addCase(uploadClientDocumentsSmart.fulfilled, (state, action) => {
        state.documents = [...action.payload.documents, ...state.documents];
        if (action.payload.failures.length > 0) {
          state.error = action.payload.failures[0].error;
        }
      })
      .addCase(uploadClientDocumentsSmart.rejected, (state, action) => {
        state.error = (action.payload as string) || "upload_failed";
      })
      .addCase(updateClientDocumentCategory.fulfilled, (state, action) => {
        state.documents = state.documents.map((d) =>
          d.publicUuid === action.payload.publicUuid ? action.payload : d,
        );
      })
      .addCase(updateClientDocumentCategory.rejected, (state, action) => {
        state.error = (action.payload as string) || "category_failed";
      })
      .addCase(reviewClientReport.pending, (state) => {
        state.reviewingReport = true;
        state.error = null;
      })
      .addCase(reviewClientReport.fulfilled, (state, action) => {
        state.reviewingReport = false;
        state.technicalReports = state.technicalReports.map((r) =>
          r.publicUuid === action.payload.publicUuid ? action.payload : r,
        );
      })
      .addCase(reviewClientReport.rejected, (state, action) => {
        state.reviewingReport = false;
        state.error = (action.payload as string) || "report_review_failed";
      })
      .addCase(fetchClientNotifications.pending, (state) => {
        state.loadingNotifications = true;
      })
      .addCase(fetchClientNotifications.fulfilled, (state, action) => {
        state.loadingNotifications = false;
        state.notifications = action.payload.notifications;
        state.unreadCount = action.payload.unreadCount;
      })
      .addCase(fetchClientNotifications.rejected, (state, action) => {
        state.loadingNotifications = false;
        state.error = (action.payload as string) || "notifications_failed";
      })
      .addCase(markClientNotificationRead.fulfilled, (state, action) => {
        state.notifications = state.notifications.map((n) =>
          n.publicUuid === action.payload
            ? { ...n, readAt: n.readAt || new Date().toISOString() }
            : n,
        );
        state.unreadCount = state.notifications.filter((n) => !n.readAt).length;
      })
      .addCase(markAllClientNotificationsRead.fulfilled, (state) => {
        state.notifications = state.notifications.map((n) => ({
          ...n,
          readAt: n.readAt || new Date().toISOString(),
        }));
        state.unreadCount = 0;
      })
      .addCase(logout.fulfilled, () => initialState);
  },
});

export const { clearClientError } = clientSlice.actions;
export default clientSlice.reducer;
