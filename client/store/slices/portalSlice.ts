import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { logout } from "./authSlice";
import { completeReviewRequest } from "./casesSlice";
import type {
  CalendarEventItem,
  CaseNumberSettings,
  CreateCalendarEventRequest,
  CreateInvoiceRequest,
  CreateLawFirmRequest,
  CreatePaymentRequest,
  DashboardStatsResponse,
  DocumentsIndexItem,
  DocumentsIndexResponse,
  GlobalSearchHit,
  GlobalSearchResponse,
  InviteTeamMemberRequest,
  InvoiceSummary,
  InvoicesListQuery,
  InvoicesListResponse,
  LawFirmSummary,
  NotificationItem,
  PaginationInfo,
  PendingReviewQueueItem,
  PendingReviewsResponse,
  ReportsKpiResponse,
  TeamListQuery,
  TeamListResponse,
  TeamMemberDetailResponse,
  TeamMemberItem,
  UpdateTeamMemberRequest,
} from "@shared/api";
import api from "@/lib/api";

interface PortalState {
  stats: DashboardStatsResponse | null;
  events: CalendarEventItem[];
  invoices: InvoiceSummary[];
  invoicesPagination: PaginationInfo | null;
  members: TeamMemberItem[];
  membersPagination: PaginationInfo | null;
  selectedMemberDetail: TeamMemberDetailResponse | null;
  lawFirms: LawFirmSummary[];
  notifications: NotificationItem[];
  unreadCount: number;
  caseNumberSettings: CaseNumberSettings | null;
  documentsIndex: DocumentsIndexItem[];
  documentsPagination: PaginationInfo | null;
  searchResults: GlobalSearchHit[];
  searchQuery: string;
  kpis: ReportsKpiResponse | null;
  pendingReviews: PendingReviewQueueItem[];
  pendingReviewsTotal: number;
  loadingStats: boolean;
  loadingEvents: boolean;
  loadingInvoices: boolean;
  loadingMembers: boolean;
  loadingMemberDetail: boolean;
  loadingSettings: boolean;
  loadingNotifications: boolean;
  loadingDocuments: boolean;
  loadingSearch: boolean;
  loadingKpis: boolean;
  loadingPendingReviews: boolean;
  pendingReviewsError: string | null;
  savingSettings: boolean;
  creating: boolean;
  updatingMember: boolean;
  error: string | null;
}

const initialState: PortalState = {
  stats: null,
  events: [],
  invoices: [],
  invoicesPagination: null,
  members: [],
  membersPagination: null,
  selectedMemberDetail: null,
  lawFirms: [],
  notifications: [],
  unreadCount: 0,
  caseNumberSettings: null,
  documentsIndex: [],
  documentsPagination: null,
  searchResults: [],
  searchQuery: "",
  kpis: null,
  pendingReviews: [],
  pendingReviewsTotal: 0,
  loadingStats: false,
  loadingPendingReviews: false,
  pendingReviewsError: null,
  loadingEvents: false,
  loadingInvoices: false,
  loadingMembers: false,
  loadingMemberDetail: false,
  loadingSettings: false,
  loadingNotifications: false,
  loadingDocuments: false,
  loadingSearch: false,
  loadingKpis: false,
  savingSettings: false,
  creating: false,
  updatingMember: false,
  error: null,
};

function rejectMsg(err: unknown, fallback: string) {
  return (
    (err as { response?: { data?: { error?: string } } })?.response?.data
      ?.error || fallback
  );
}

export const fetchPendingReviews = createAsyncThunk(
  "portal/fetchPendingReviews",
  async (args: { limit?: number } = {}, { rejectWithValue }) => {
    try {
      const params =
        args?.limit != null ? { limit: args.limit } : undefined;
      const { data } = await api.get<PendingReviewsResponse>(
        "/api/reviews/pending",
        { params },
      );
      return data;
    } catch (err: unknown) {
      return rejectWithValue(
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error || "reviews_failed",
      );
    }
  },
);

export const fetchDashboardStats = createAsyncThunk(
  "portal/fetchDashboardStats",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get<DashboardStatsResponse>(
        "/api/dashboard/stats",
      );
      return data;
    } catch (err: unknown) {
      return rejectWithValue(
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error || "stats_failed",
      );
    }
  },
);

export const fetchCalendarEvents = createAsyncThunk(
  "portal/fetchCalendarEvents",
  async (
    range: { from?: string; to?: string } | undefined,
    { rejectWithValue },
  ) => {
    try {
      const { data } = await api.get<{ events: CalendarEventItem[] }>(
        "/api/calendar/events",
        {
          params: {
            from: range?.from,
            to: range?.to,
          },
        },
      );
      return data.events;
    } catch (err: unknown) {
      return rejectWithValue(
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error || "events_failed",
      );
    }
  },
);

export const fetchInvoices = createAsyncThunk(
  "portal/fetchInvoices",
  async (params: InvoicesListQuery | undefined, { rejectWithValue }) => {
    try {
      const { data } = await api.get<InvoicesListResponse>(
        "/api/finance/invoices",
        { params: params || undefined },
      );
      return data;
    } catch (err: unknown) {
      return rejectWithValue(
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error || "invoices_failed",
      );
    }
  },
);

export const fetchTeamMembers = createAsyncThunk(
  "portal/fetchTeamMembers",
  async (params: TeamListQuery | undefined, { rejectWithValue }) => {
    try {
      const { data } = await api.get<TeamListResponse>("/api/team/members", {
        params: params || undefined,
      });
      return data;
    } catch (err: unknown) {
      return rejectWithValue(
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error || "team_failed",
      );
    }
  },
);

export const fetchCaseNumberSettings = createAsyncThunk(
  "portal/fetchCaseNumberSettings",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get<CaseNumberSettings>(
        "/api/settings/case-number",
      );
      return data;
    } catch (err: unknown) {
      return rejectWithValue(
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error || "settings_failed",
      );
    }
  },
);

export const saveCaseNumberSettings = createAsyncThunk(
  "portal/saveCaseNumberSettings",
  async (format: string, { rejectWithValue }) => {
    try {
      const { data } = await api.put<CaseNumberSettings>(
        "/api/settings/case-number",
        { format },
      );
      return data;
    } catch (err: unknown) {
      return rejectWithValue(rejectMsg(err, "settings_save_failed"));
    }
  },
);

export const createCalendarEvent = createAsyncThunk(
  "portal/createCalendarEvent",
  async (payload: CreateCalendarEventRequest, { rejectWithValue }) => {
    try {
      const { data } = await api.post<{ event: CalendarEventItem }>(
        "/api/calendar/events",
        payload,
      );
      return data.event;
    } catch (err: unknown) {
      return rejectWithValue(rejectMsg(err, "event_create_failed"));
    }
  },
);

export const createInvoice = createAsyncThunk(
  "portal/createInvoice",
  async (payload: CreateInvoiceRequest, { rejectWithValue }) => {
    try {
      const { data } = await api.post<{ invoice: InvoiceSummary }>(
        "/api/finance/invoices",
        payload,
      );
      return data.invoice;
    } catch (err: unknown) {
      return rejectWithValue(rejectMsg(err, "invoice_create_failed"));
    }
  },
);

export const recordPayment = createAsyncThunk(
  "portal/recordPayment",
  async (
    payload: { publicUuid: string } & CreatePaymentRequest,
    { rejectWithValue },
  ) => {
    try {
      const { data } = await api.post<{
        payment: { publicUuid: string; amount: number; invoiceStatus: string };
      }>(`/api/finance/invoices/${payload.publicUuid}/payments`, payload);
      return { invoiceUuid: payload.publicUuid, ...data.payment };
    } catch (err: unknown) {
      return rejectWithValue(rejectMsg(err, "payment_failed"));
    }
  },
);

export const inviteTeamMember = createAsyncThunk(
  "portal/inviteTeamMember",
  async (payload: InviteTeamMemberRequest, { rejectWithValue }) => {
    try {
      const { data } = await api.post<{ member: TeamMemberItem }>(
        "/api/team/members",
        payload,
      );
      return data.member;
    } catch (err: unknown) {
      return rejectWithValue(rejectMsg(err, "invite_failed"));
    }
  },
);

export const resendTeamInvite = createAsyncThunk(
  "portal/resendTeamInvite",
  async (publicUuid: string, { rejectWithValue }) => {
    try {
      await api.post(`/api/team/members/${publicUuid}/resend-invite`);
      return publicUuid;
    } catch (err: unknown) {
      return rejectWithValue(rejectMsg(err, "resend_invite_failed"));
    }
  },
);

export const fetchTeamMemberDetail = createAsyncThunk(
  "portal/fetchTeamMemberDetail",
  async (publicUuid: string, { rejectWithValue }) => {
    try {
      const { data } = await api.get<TeamMemberDetailResponse>(
        `/api/team/members/${publicUuid}`,
      );
      return data;
    } catch (err: unknown) {
      return rejectWithValue(rejectMsg(err, "member_detail_failed"));
    }
  },
);

export const updateTeamMember = createAsyncThunk(
  "portal/updateTeamMember",
  async (
    payload: { publicUuid: string } & UpdateTeamMemberRequest,
    { rejectWithValue },
  ) => {
    try {
      const { publicUuid, ...body } = payload;
      const { data } = await api.patch<{ member: TeamMemberItem }>(
        `/api/team/members/${publicUuid}`,
        body,
      );
      return data.member;
    } catch (err: unknown) {
      return rejectWithValue(rejectMsg(err, "member_update_failed"));
    }
  },
);

export const removeTeamMember = createAsyncThunk(
  "portal/removeTeamMember",
  async (publicUuid: string, { rejectWithValue }) => {
    try {
      await api.delete(`/api/team/members/${publicUuid}`);
      return publicUuid;
    } catch (err: unknown) {
      return rejectWithValue(rejectMsg(err, "member_remove_failed"));
    }
  },
);

export const fetchNotifications = createAsyncThunk(
  "portal/fetchNotifications",
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

export const markNotificationRead = createAsyncThunk(
  "portal/markNotificationRead",
  async (publicUuid: string, { rejectWithValue }) => {
    try {
      await api.post(`/api/notifications/${publicUuid}/read`);
      return publicUuid;
    } catch (err: unknown) {
      return rejectWithValue(rejectMsg(err, "notification_read_failed"));
    }
  },
);

export const markAllNotificationsRead = createAsyncThunk(
  "portal/markAllNotificationsRead",
  async (_, { rejectWithValue }) => {
    try {
      await api.post("/api/notifications/read-all");
      return true;
    } catch (err: unknown) {
      return rejectWithValue(rejectMsg(err, "notification_read_failed"));
    }
  },
);

export const fetchLawFirms = createAsyncThunk(
  "portal/fetchLawFirms",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get<{ lawFirms: LawFirmSummary[] }>(
        "/api/law-firms",
      );
      return data.lawFirms;
    } catch (err: unknown) {
      return rejectWithValue(rejectMsg(err, "law_firms_failed"));
    }
  },
);

export const createLawFirm = createAsyncThunk(
  "portal/createLawFirm",
  async (payload: CreateLawFirmRequest, { rejectWithValue }) => {
    try {
      const { data } = await api.post<{ lawFirm: LawFirmSummary }>(
        "/api/law-firms",
        payload,
      );
      return data.lawFirm;
    } catch (err: unknown) {
      return rejectWithValue(rejectMsg(err, "law_firm_create_failed"));
    }
  },
);

export const fetchDocumentsIndex = createAsyncThunk(
  "portal/fetchDocumentsIndex",
  async (
    params: { q?: string; page?: number; limit?: number } | undefined,
    { rejectWithValue },
  ) => {
    try {
      const { data } = await api.get<DocumentsIndexResponse>("/api/documents", {
        params: params || undefined,
      });
      return data;
    } catch (err: unknown) {
      return rejectWithValue(rejectMsg(err, "documents_failed"));
    }
  },
);

export const globalSearch = createAsyncThunk(
  "portal/globalSearch",
  async (q: string, { rejectWithValue }) => {
    try {
      const { data } = await api.get<GlobalSearchResponse>("/api/search", {
        params: { q },
      });
      return data;
    } catch (err: unknown) {
      return rejectWithValue(rejectMsg(err, "search_failed"));
    }
  },
);

export const fetchReportsKpis = createAsyncThunk(
  "portal/fetchReportsKpis",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get<ReportsKpiResponse>("/api/reports/kpis");
      return data;
    } catch (err: unknown) {
      return rejectWithValue(rejectMsg(err, "kpis_failed"));
    }
  },
);

const portalSlice = createSlice({
  name: "portal",
  initialState,
  reducers: {
    clearPortalError(state) {
      state.error = null;
    },
    clearSelectedMember(state) {
      state.selectedMemberDetail = null;
      state.loadingMemberDetail = false;
    },
    clearSearchResults(state) {
      state.searchResults = [];
      state.searchQuery = "";
      state.loadingSearch = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboardStats.pending, (state) => {
        state.loadingStats = true;
      })
      .addCase(fetchDashboardStats.fulfilled, (state, action) => {
        state.loadingStats = false;
        state.stats = action.payload;
      })
      .addCase(fetchDashboardStats.rejected, (state, action) => {
        state.loadingStats = false;
        state.error = (action.payload as string) || "stats_failed";
      })
      .addCase(fetchPendingReviews.pending, (state, action) => {
        const countOnly = action.meta.arg?.limit === 1;
        if (!countOnly) {
          state.loadingPendingReviews = true;
          state.pendingReviewsError = null;
        }
      })
      .addCase(fetchPendingReviews.fulfilled, (state, action) => {
        const countOnly = action.meta.arg?.limit === 1;
        if (!countOnly) {
          state.loadingPendingReviews = false;
          state.pendingReviewsError = null;
          state.pendingReviews = action.payload.reviews ?? [];
        }
        state.pendingReviewsTotal = action.payload.total ?? 0;
      })
      .addCase(fetchPendingReviews.rejected, (state, action) => {
        const countOnly = action.meta.arg?.limit === 1;
        if (countOnly) return;
        state.loadingPendingReviews = false;
        const msg = (action.payload as string) || "reviews_failed";
        state.pendingReviewsError = msg;
        if (msg === "Insufficient permissions") {
          state.pendingReviews = [];
          state.pendingReviewsTotal = 0;
        }
      })
      .addCase(completeReviewRequest.fulfilled, (state, action) => {
        const completedId = action.payload.id;
        const before = state.pendingReviews.length;
        state.pendingReviews = state.pendingReviews.filter(
          (r) => r.id !== completedId,
        );
        if (state.pendingReviews.length < before && state.pendingReviewsTotal > 0) {
          state.pendingReviewsTotal -= 1;
        }
      })
      .addCase(fetchCalendarEvents.pending, (state) => {
        state.loadingEvents = true;
      })
      .addCase(fetchCalendarEvents.fulfilled, (state, action) => {
        state.loadingEvents = false;
        state.events = action.payload;
      })
      .addCase(fetchCalendarEvents.rejected, (state, action) => {
        state.loadingEvents = false;
        state.error = (action.payload as string) || "events_failed";
      })
      .addCase(fetchInvoices.pending, (state) => {
        state.loadingInvoices = true;
      })
      .addCase(fetchInvoices.fulfilled, (state, action) => {
        state.loadingInvoices = false;
        state.invoices = action.payload.invoices;
        state.invoicesPagination = action.payload.pagination;
      })
      .addCase(fetchInvoices.rejected, (state, action) => {
        state.loadingInvoices = false;
        state.error = (action.payload as string) || "invoices_failed";
      })
      .addCase(fetchTeamMembers.pending, (state) => {
        state.loadingMembers = true;
      })
      .addCase(fetchTeamMembers.fulfilled, (state, action) => {
        state.loadingMembers = false;
        state.members = action.payload.members;
        state.membersPagination = action.payload.pagination;
      })
      .addCase(fetchTeamMembers.rejected, (state, action) => {
        state.loadingMembers = false;
        state.error = (action.payload as string) || "team_failed";
      })
      .addCase(fetchCaseNumberSettings.pending, (state) => {
        state.loadingSettings = true;
      })
      .addCase(fetchCaseNumberSettings.fulfilled, (state, action) => {
        state.loadingSettings = false;
        state.caseNumberSettings = action.payload;
      })
      .addCase(fetchCaseNumberSettings.rejected, (state, action) => {
        state.loadingSettings = false;
        state.error = (action.payload as string) || "settings_failed";
      })
      .addCase(saveCaseNumberSettings.pending, (state) => {
        state.savingSettings = true;
      })
      .addCase(saveCaseNumberSettings.fulfilled, (state, action) => {
        state.savingSettings = false;
        state.caseNumberSettings = action.payload;
      })
      .addCase(saveCaseNumberSettings.rejected, (state, action) => {
        state.savingSettings = false;
        state.error = (action.payload as string) || "settings_save_failed";
      })
      .addCase(createCalendarEvent.fulfilled, (state, action) => {
        state.events = [...state.events, action.payload].sort(
          (a, b) =>
            new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
        );
      })
      .addCase(createCalendarEvent.rejected, (state, action) => {
        state.error = (action.payload as string) || "calendar_create_failed";
      })
      .addCase(createInvoice.fulfilled, (state, action) => {
        state.invoices = [action.payload, ...state.invoices];
      })
      .addCase(createInvoice.rejected, (state, action) => {
        state.error = (action.payload as string) || "invoice_create_failed";
      })
      .addCase(recordPayment.fulfilled, (state, action) => {
        state.invoices = state.invoices.map((inv) =>
          inv.publicUuid === action.payload.invoiceUuid
            ? { ...inv, status: action.payload.invoiceStatus }
            : inv,
        );
      })
      .addCase(recordPayment.rejected, (state, action) => {
        state.error = (action.payload as string) || "payment_failed";
      })
      .addCase(inviteTeamMember.fulfilled, (state, action) => {
        state.members = [action.payload, ...state.members];
      })
      .addCase(inviteTeamMember.rejected, (state, action) => {
        state.error = (action.payload as string) || "invite_failed";
      })
      .addCase(fetchTeamMemberDetail.pending, (state) => {
        state.loadingMemberDetail = true;
        state.error = null;
      })
      .addCase(fetchTeamMemberDetail.fulfilled, (state, action) => {
        state.loadingMemberDetail = false;
        state.selectedMemberDetail = action.payload;
      })
      .addCase(fetchTeamMemberDetail.rejected, (state, action) => {
        state.loadingMemberDetail = false;
        state.error = (action.payload as string) || "member_detail_failed";
      })
      .addCase(updateTeamMember.pending, (state) => {
        state.updatingMember = true;
        state.error = null;
      })
      .addCase(updateTeamMember.fulfilled, (state, action) => {
        state.updatingMember = false;
        state.members = state.members.map((m) =>
          m.publicUuid === action.payload.publicUuid ? action.payload : m,
        );
        if (
          state.selectedMemberDetail?.member.publicUuid ===
          action.payload.publicUuid
        ) {
          state.selectedMemberDetail = {
            ...state.selectedMemberDetail,
            member: action.payload,
          };
        }
      })
      .addCase(updateTeamMember.rejected, (state, action) => {
        state.updatingMember = false;
        state.error = (action.payload as string) || "member_update_failed";
      })
      .addCase(removeTeamMember.pending, (state) => {
        state.updatingMember = true;
        state.error = null;
      })
      .addCase(removeTeamMember.fulfilled, (state, action) => {
        state.updatingMember = false;
        state.members = state.members.filter(
          (m) => m.publicUuid !== action.payload,
        );
        if (
          state.selectedMemberDetail?.member.publicUuid === action.payload
        ) {
          state.selectedMemberDetail = null;
        }
      })
      .addCase(removeTeamMember.rejected, (state, action) => {
        state.updatingMember = false;
        state.error = (action.payload as string) || "member_remove_failed";
      })
      .addCase(fetchNotifications.pending, (state) => {
        state.loadingNotifications = true;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loadingNotifications = false;
        state.notifications = action.payload.notifications;
        state.unreadCount = action.payload.unreadCount;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.loadingNotifications = false;
        state.error = (action.payload as string) || "notifications_failed";
      })
      .addCase(markNotificationRead.fulfilled, (state, action) => {
        state.notifications = state.notifications.map((n) =>
          n.publicUuid === action.payload && !n.readAt
            ? { ...n, readAt: new Date().toISOString() }
            : n,
        );
        state.unreadCount = state.notifications.filter((n) => !n.readAt).length;
      })
      .addCase(markAllNotificationsRead.fulfilled, (state) => {
        const now = new Date().toISOString();
        state.notifications = state.notifications.map((n) => ({
          ...n,
          readAt: n.readAt || now,
        }));
        state.unreadCount = 0;
      })
      .addCase(fetchLawFirms.fulfilled, (state, action) => {
        state.lawFirms = action.payload;
      })
      .addCase(createLawFirm.fulfilled, (state, action) => {
        state.lawFirms = [...state.lawFirms, action.payload].sort((a, b) =>
          a.name.localeCompare(b.name),
        );
      })
      .addCase(createLawFirm.rejected, (state, action) => {
        state.error = (action.payload as string) || "law_firm_create_failed";
      })
      .addCase(fetchDocumentsIndex.pending, (state) => {
        state.loadingDocuments = true;
      })
      .addCase(fetchDocumentsIndex.fulfilled, (state, action) => {
        state.loadingDocuments = false;
        state.documentsIndex = action.payload.documents;
        state.documentsPagination = action.payload.pagination;
      })
      .addCase(fetchDocumentsIndex.rejected, (state, action) => {
        state.loadingDocuments = false;
        state.error = (action.payload as string) || "documents_failed";
      })
      .addCase(globalSearch.pending, (state) => {
        state.loadingSearch = true;
      })
      .addCase(globalSearch.fulfilled, (state, action) => {
        state.loadingSearch = false;
        state.searchQuery = action.payload.query;
        state.searchResults = action.payload.results;
      })
      .addCase(globalSearch.rejected, (state, action) => {
        state.loadingSearch = false;
        state.error = (action.payload as string) || "search_failed";
      })
      .addCase(fetchReportsKpis.pending, (state) => {
        state.loadingKpis = true;
      })
      .addCase(fetchReportsKpis.fulfilled, (state, action) => {
        state.loadingKpis = false;
        state.kpis = action.payload;
      })
      .addCase(fetchReportsKpis.rejected, (state, action) => {
        state.loadingKpis = false;
        state.error = (action.payload as string) || "kpis_failed";
      })
      .addCase(logout.fulfilled, () => initialState);
  },
});

export const { clearPortalError, clearSelectedMember, clearSearchResults } =
  portalSlice.actions;
export default portalSlice.reducer;
