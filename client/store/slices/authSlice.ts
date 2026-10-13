import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type {
  AuthUser,
  RequestOtpResponse,
  UpdatePreferencesRequest,
  UpdatePreferencesResponse,
  VerifyOtpResponse,
} from "@shared/api";
import type { AuthActor } from "@shared/authActors";
import {
  CLIENT_TOKEN_KEY,
  STAFF_TOKEN_KEY,
} from "@shared/authActors";
import { resolvePortalSessionActor } from "@shared/portalSessionRules";
import {
  OTP_PENDING_STORAGE_KEY,
  parseOtpPending,
  serializeOtpPending,
} from "@shared/unifiedLoginRules";
import { shouldDropSessionAfterMe } from "@shared/sessionPersistRules";
import { normalizeLocale } from "@shared/i18n";
import api, {
  getSessionToken,
  setSessionToken,
  clearAllSessionTokens,
} from "@/lib/api";
import i18n from "@/i18n";

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  requestingOtp: boolean;
  verifyingOtp: boolean;
  updatingPrefs: boolean;
  error: string | null;
  /** Saved token is still in localStorage; /me failed for a transient reason. */
  sessionRestoreFailed: boolean;
  otpSentTo: string | null;
  /** Actor used for the in-flight / last successful OTP request. */
  otpActor: AuthActor | null;
}

/** Prefer whichever session token exists (portal hosts both actors). */
function inferActor(): AuthActor {
  if (typeof window === "undefined") return "staff";
  return (
    resolvePortalSessionActor({
      staffToken: localStorage.getItem(STAFF_TOKEN_KEY),
      lawFirmToken: localStorage.getItem(CLIENT_TOKEN_KEY),
    }) ?? "staff"
  );
}

function authPrefix(actor: AuthActor): string {
  return actor === "law_firm" ? "/api/auth/client" : "/api/auth/staff";
}

function otpErrorCode(err: unknown): string {
  const data = (err as { response?: { data?: { error?: string; code?: string } } })
    ?.response?.data;
  return data?.code || data?.error || "request_failed";
}

function readPendingOtp(): { email: string; actor: AuthActor } | null {
  if (typeof window === "undefined") return null;
  try {
    return parseOtpPending(sessionStorage.getItem(OTP_PENDING_STORAGE_KEY));
  } catch {
    return null;
  }
}

function writePendingOtp(email: string, actor: AuthActor) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      OTP_PENDING_STORAGE_KEY,
      serializeOtpPending({ email, actor }),
    );
  } catch {
    // ignore quota / private mode
  }
}

function clearPendingOtp() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(OTP_PENDING_STORAGE_KEY);
  } catch {
    // ignore
  }
}

const pendingOtp = typeof window !== "undefined" ? readPendingOtp() : null;

const initialToken =
  typeof window !== "undefined" ? getSessionToken(inferActor()) : null;

const initialState: AuthState = {
  user: null,
  token: initialToken,
  loading: Boolean(initialToken),
  requestingOtp: false,
  verifyingOtp: false,
  updatingPrefs: false,
  error: null,
  sessionRestoreFailed: false,
  otpSentTo: pendingOtp?.email ?? null,
  otpActor: pendingOtp?.actor ?? null,
};

async function postRequestOtpActor(
  email: string,
  actor: AuthActor,
): Promise<{ email: string; message: string; actor: AuthActor }> {
  const { data } = await api.post<RequestOtpResponse>(
    `${authPrefix(actor)}/request-otp`,
    {
      email,
      locale: normalizeLocale(i18n.language),
    },
  );
  return { email, message: data.message, actor };
}

async function postRequestOtpUnified(
  email: string,
): Promise<{ email: string; message: string; actor: AuthActor }> {
  const { data } = await api.post<RequestOtpResponse>(
    "/api/auth/request-otp",
    {
      email,
      locale: normalizeLocale(i18n.language),
    },
  );
  const actor = data.actor;
  if (actor !== "staff" && actor !== "law_firm") {
    throw Object.assign(new Error("missing_actor"), {
      response: { data: { code: "request_failed", error: "request_failed" } },
    });
  }
  return { email, message: data.message, actor };
}

export const requestOtp = createAsyncThunk(
  "auth/requestOtp",
  async (
    payload: string | { email: string; actor?: AuthActor },
    { rejectWithValue },
  ) => {
    const email =
      typeof payload === "string" ? payload.trim() : payload.email.trim();
    const forcedActor =
      typeof payload === "string" ? undefined : payload.actor;

    try {
      if (forcedActor) {
        return await postRequestOtpActor(email, forcedActor);
      }
      return await postRequestOtpUnified(email);
    } catch (err: unknown) {
      return rejectWithValue(otpErrorCode(err));
    }
  },
);

export const verifyOtp = createAsyncThunk(
  "auth/verifyOtp",
  async (
    payload: { email: string; code: string; actor?: AuthActor },
    { getState, rejectWithValue },
  ) => {
    const state = getState() as { auth: AuthState };
    const actor = payload.actor ?? state.auth.otpActor ?? inferActor();
    try {
      const { data } = await api.post<VerifyOtpResponse>(
        `${authPrefix(actor)}/verify-otp`,
        { email: payload.email, code: payload.code },
      );
      clearAllSessionTokens();
      setSessionToken(data.token, data.user.actor);
      clearPendingOtp();
      if (data.user.preferredLanguage) {
        await i18n.changeLanguage(data.user.preferredLanguage);
      }
      return data;
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error || "verify_failed";
      return rejectWithValue(message);
    }
  },
);

export const fetchMe = createAsyncThunk(
  "auth/fetchMe",
  async (_, { rejectWithValue }) => {
    const actor = inferActor();
    try {
      const { data } = await api.get<{ user: AuthUser }>(
        `${authPrefix(actor)}/me`,
      );
      if (data.user.preferredLanguage) {
        await i18n.changeLanguage(data.user.preferredLanguage);
      }
      return data.user;
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response
        ?.status;
      if (shouldDropSessionAfterMe(status)) {
        setSessionToken(null, actor);
        return rejectWithValue("unauthorized");
      }
      return rejectWithValue("session_check_failed");
    }
  },
);

export const logout = createAsyncThunk("auth/logout", async () => {
  const actor = inferActor();
  try {
    await api.post(`${authPrefix(actor)}/logout`);
  } catch {
    // ignore network errors on logout
  } finally {
    clearAllSessionTokens();
  }
});

export const updatePreferences = createAsyncThunk(
  "auth/updatePreferences",
  async (payload: UpdatePreferencesRequest, { rejectWithValue }) => {
    const actor = inferActor();
    try {
      const { data } = await api.patch<UpdatePreferencesResponse>(
        `${authPrefix(actor)}/preferences`,
        payload,
      );
      return data.user;
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error || "preferences_failed";
      return rejectWithValue(message);
    }
  },
);
const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearAuthError(state) {
      state.error = null;
    },
    clearOtpSent(state) {
      state.otpSentTo = null;
      state.otpActor = null;
      clearPendingOtp();
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(requestOtp.pending, (state) => {
        state.requestingOtp = true;
        state.error = null;
      })
      .addCase(requestOtp.fulfilled, (state, action) => {
        state.requestingOtp = false;
        state.otpSentTo = action.payload.email;
        state.otpActor = action.payload.actor;
        writePendingOtp(action.payload.email, action.payload.actor);
      })
      .addCase(requestOtp.rejected, (state, action) => {
        state.requestingOtp = false;
        state.error = (action.payload as string) || "request_failed";
        state.otpActor = null;
        clearPendingOtp();
      })
      .addCase(verifyOtp.pending, (state) => {
        state.verifyingOtp = true;
        state.error = null;
      })
      .addCase(verifyOtp.fulfilled, (state, action) => {
        state.verifyingOtp = false;
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.loading = false;
        state.sessionRestoreFailed = false;
        state.otpActor = action.payload.user.actor;
        state.otpSentTo = null;
        clearPendingOtp();
      })
      .addCase(verifyOtp.rejected, (state, action) => {
        state.verifyingOtp = false;
        state.error = (action.payload as string) || "verify_failed";
      })
      .addCase(fetchMe.pending, (state) => {
        state.loading = true;
        state.sessionRestoreFailed = false;
      })
      .addCase(fetchMe.fulfilled, (state, action) => {
        state.loading = false;
        state.sessionRestoreFailed = false;
        state.user = action.payload;
      })
      .addCase(fetchMe.rejected, (state, action) => {
        state.loading = false;
        if (action.payload === "unauthorized") {
          state.user = null;
          state.token = null;
          state.sessionRestoreFailed = false;
          return;
        }
        state.sessionRestoreFailed = true;
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.otpSentTo = null;
        state.otpActor = null;
        state.error = null;
        state.sessionRestoreFailed = false;
        state.loading = false;
        state.updatingPrefs = false;
        clearPendingOtp();
      })
      .addCase(updatePreferences.pending, (state) => {
        state.updatingPrefs = true;
        state.error = null;
      })
      .addCase(updatePreferences.fulfilled, (state, action) => {
        state.updatingPrefs = false;
        state.user = action.payload;
      })
      .addCase(updatePreferences.rejected, (state, action) => {
        state.updatingPrefs = false;
        state.error = (action.payload as string) || "preferences_failed";
      });
  },
});

export const { clearAuthError, clearOtpSent } = authSlice.actions;
export default authSlice.reducer;
