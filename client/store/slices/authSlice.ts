import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import type {
  AuthUser,
  RequestOtpResponse,
  VerifyOtpResponse,
} from "@shared/api";
import type { AuthActor } from "@shared/authActors";
import { normalizeLocale } from "@shared/i18n";
import api, { getSessionToken, setSessionToken } from "@/lib/api";
import i18n from "@/i18n";

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  requestingOtp: boolean;
  verifyingOtp: boolean;
  error: string | null;
  otpSentTo: string | null;
}

function inferActor(): AuthActor {
  if (
    typeof window !== "undefined" &&
    window.location.pathname.startsWith("/client")
  ) {
    return "law_firm";
  }
  return "staff";
}

function authPrefix(actor: AuthActor = inferActor()): string {
  return actor === "law_firm" ? "/api/auth/client" : "/api/auth/staff";
}

const initialToken =
  typeof window !== "undefined" ? getSessionToken(inferActor()) : null;

const initialState: AuthState = {
  user: null,
  token: initialToken,
  loading: Boolean(initialToken),
  requestingOtp: false,
  verifyingOtp: false,
  error: null,
  otpSentTo: null,
};

export const requestOtp = createAsyncThunk(
  "auth/requestOtp",
  async (email: string, { rejectWithValue }) => {
    try {
      const { data } = await api.post<RequestOtpResponse>(
        `${authPrefix()}/request-otp`,
        {
          email,
          locale: normalizeLocale(i18n.language),
        },
      );
      return { email, message: data.message };
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error || "request_failed";
      return rejectWithValue(message);
    }
  },
);

export const verifyOtp = createAsyncThunk(
  "auth/verifyOtp",
  async (
    payload: { email: string; code: string },
    { rejectWithValue },
  ) => {
    try {
      const { data } = await api.post<VerifyOtpResponse>(
        `${authPrefix()}/verify-otp`,
        payload,
      );
      setSessionToken(data.token, data.user.actor);
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
      setSessionToken(null, actor);
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data
          ?.error || "unauthorized";
      return rejectWithValue(message);
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
    setSessionToken(null, actor);
  }
});

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearAuthError(state) {
      state.error = null;
    },
    clearOtpSent(state) {
      state.otpSentTo = null;
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
      })
      .addCase(requestOtp.rejected, (state, action) => {
        state.requestingOtp = false;
        state.error = (action.payload as string) || "request_failed";
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
      })
      .addCase(verifyOtp.rejected, (state, action) => {
        state.verifyingOtp = false;
        state.error = (action.payload as string) || "verify_failed";
      })
      .addCase(fetchMe.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchMe.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
      })
      .addCase(fetchMe.rejected, (state) => {
        state.loading = false;
        state.user = null;
        state.token = null;
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.otpSentTo = null;
        state.error = null;
        state.loading = false;
      });
  },
});

export const { clearAuthError, clearOtpSent } = authSlice.actions;
export default authSlice.reducer;
