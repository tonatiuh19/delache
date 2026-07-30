import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type {
  CaseDetail,
  CaseDocumentItem,
  CaseNoteItem,
  CaseResponse,
  CasesListResponse,
  CaseSummary,
  CreateCaseDocumentRequest,
  CreateCaseRequest,
  TechnicalReportItem,
} from "@shared/api";
import api from "@/lib/api";

interface ClientState {
  cases: CaseSummary[];
  selected: CaseDetail | null;
  notes: CaseNoteItem[];
  documents: CaseDocumentItem[];
  technicalReports: TechnicalReportItem[];
  loading: boolean;
  detailLoading: boolean;
  creating: boolean;
  error: string | null;
}

const initialState: ClientState = {
  cases: [],
  selected: null,
  notes: [],
  documents: [],
  technicalReports: [],
  loading: false,
  detailLoading: false,
  creating: false,
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
      }>(`/api/client/cases/${publicUuid}`);
      return data;
    } catch (err: unknown) {
      return rejectWithValue(rejectMsg(err, "fetch_failed"));
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
      })
      .addCase(fetchClientCaseDetail.rejected, (state, action) => {
        state.detailLoading = false;
        state.error = (action.payload as string) || "fetch_failed";
      })
      .addCase(uploadClientDocument.fulfilled, (state, action) => {
        state.documents = [action.payload, ...state.documents];
      });
  },
});

export const { clearClientError } = clientSlice.actions;
export default clientSlice.reducer;
