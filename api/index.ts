import "dotenv/config";
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import cors from "cors";
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import mysql, {
  type Pool,
  type PoolConnection,
  type ResultSetHeader,
  type RowDataPacket,
} from "mysql2/promise";
import { Resend } from "resend";
import { put, del, get, head, issueSignedToken, presignUrl } from "@vercel/blob";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import type {
  AssignmentRole,
  AuthActor,
  AuthMeResponse,
  AuthUser,
  CalendarEventItem,
  CaseAssignmentItem,
  CaseAuditLogItem,
  CaseDeadlineItem,
  CaseDetail,
  CaseDetailResponse,
  BulkUploadDocumentsRequest,
  BulkUploadDocumentsResponse,
  CaseDocumentItem,
  CreateCaseDocumentFromBlobRequest,
  CaseNoteItem,
  CaseNumberSettings,
  CasePriority,
  CaseResponse,
  CasesListResponse,
  CasesPipelineColumnMoreResponse,
  CasesPipelineResponse,
  CaseStatus,
  CaseStatusHistoryItem,
  CaseSummary,
  ClientReviewReportRequest,
  CompleteReviewRequest,
  CreateAssignmentRequest,
  ExpertDeliveryDeadlineResponse,
  SetExpertDeliveryDeadlineRequest,
  CreateCalendarEventRequest,
  CreateCaseDocumentRequest,
  CreateCaseNoteRequest,
  CreateCaseRequest,
  CreateEvidenceRequest,
  CreateEvidenceResponse,
  CreateInspectionRequest,
  CreateInvoiceRequest,
  CreateLawFirmRequest,
  CreateLogisticsExpenseRequest,
  CreateLogisticsTripRequest,
  CreateMeasurementRequest,
  CreatePaymentRequest,
  CreateQuestionnaireRequest,
  CreateTechnicalReportRequest,
  DashboardStatsResponse,
  DeadlineSeverity,
  DeleteEvidenceResponse,
  DemoResponse,
  AppVersionResponse,
  DocumentCategory,
  DocumentCompletenessInfo,
  DocumentsIndexItem,
  DocumentsIndexResponse,
  OcrStatus,
  RunDocumentOcrResponse,
  SaveDocumentOcrRequest,
  EvidenceItem,
  ExpenseType,
  GlobalSearchHit,
  GlobalSearchResponse,
  InspectionItem,
  InspectionStatus,
  FirmMemberItem,
  FirmMembersResponse,
  InviteFirmMemberRequest,
  InviteTeamMemberRequest,
  InvoiceSummary,
  InvoicesListResponse,
  LawFirmSummary,
  LogisticsExpenseItem,
  LogisticsTripItem,
  MeasurementItem,
  NotificationItem,
  NotificationType,
  PaginationInfo,
  PendingReviewsResponse,
  QuestionnaireItem,
  QuestionnaireStatus,
  ReportsKpiResponse,
  RequestOtpResponse,
  ReviewEntityType,
  ReviewRequestItem,
  ReviewStage,
  TeamListResponse,
  TeamMemberAuditItem,
  TeamMemberDetailResponse,
  TeamMemberItem,
  TeamMemberSessionItem,
  TechnicalReportItem,
  TechnicalReportStatus,
  UpdateCaseStatusRequest,
  UpdateCaseFlagsRequest,
  UpdateCaseLocationRequest,
  UpdatePreferencesResponse,
  UpdateQuestionnaireStatusRequest,
  UpdateTeamMemberRequest,
  UpdateTechnicalReportStatusRequest,
  UploadBlobResponse,
  GeocodeRequest,
  GeocodeResponse,
  UserRole,
  UserStatus,
  VerifyOtpResponse,
} from "../shared/api";
import type { AppLocale } from "../shared/i18n";
import type { ReviewOutcome } from "../shared/reviewRequestRules";

// ============================================================================
// INLINED RUNTIME HELPERS (Vercel /api cannot import ../shared or ../lib)
// Source of truth for tests remains shared/ and lib/. Keep in sync.
// ============================================================================

// ---- inlined from lib/logger.ts ----
type LogLevel = "debug" | "info" | "warn" | "error";

const PREFIX = "[DELACHE:api]";

function formatArgs(level: LogLevel, args: unknown[]): unknown[] {
  const stamp = new Date().toISOString();
  return [`${PREFIX} ${stamp} ${level.toUpperCase()}:`, ...args];
}

/** Server-side logger (api / Node). Do not import client/utils/logger here. */
const apiLogger = {
  debug: (...args: unknown[]) => {
    if (process.env.NODE_ENV !== "production") {
      console.debug(...formatArgs("debug", args));
    }
  },
  info: (...args: unknown[]) => {
    console.info(...formatArgs("info", args));
  },
  warn: (...args: unknown[]) => {
    console.warn(...formatArgs("warn", args));
  },
  error: (...args: unknown[]) => {
    console.error(...formatArgs("error", args));
  },
};

// ---- inlined from shared/businessDays.ts ----
function nthWeekdayOfMonth(
  year: number,
  monthIndex: number,
  weekday: number,
  n: number,
): Date {
  const first = new Date(Date.UTC(year, monthIndex, 1));
  const firstDow = first.getUTCDay();
  const day = 1 + ((weekday - firstDow + 7) % 7) + (n - 1) * 7;
  return new Date(Date.UTC(year, monthIndex, day));
}

function isMexicanInaugurationYear(year: number): boolean {
  return (year - 2018) % 6 === 0;
}

function isMexicanPublicHoliday(date: Date): boolean {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  if (month === 0 && day === 1) return true;
  if (month === 4 && day === 1) return true;
  if (month === 8 && day === 16) return true;
  if (month === 11 && day === 25) return true;
  const constitution = nthWeekdayOfMonth(year, 1, 1, 1);
  if (
    month === constitution.getUTCMonth() &&
    day === constitution.getUTCDate()
  ) {
    return true;
  }
  const juarez = nthWeekdayOfMonth(year, 2, 1, 3);
  if (month === juarez.getUTCMonth() && day === juarez.getUTCDate()) {
    return true;
  }
  const revolution = nthWeekdayOfMonth(year, 10, 1, 3);
  if (month === revolution.getUTCMonth() && day === revolution.getUTCDate()) {
    return true;
  }
  if (isMexicanInaugurationYear(year)) {
    if (year >= 2024 && month === 9 && day === 1) return true;
    if (year < 2024 && month === 11 && day === 1) return true;
  }
  return false;
}

function isMexicanBusinessDay(date: Date): boolean {
  const dow = date.getUTCDay();
  if (dow === 0 || dow === 6) return false;
  return !isMexicanPublicHoliday(date);
}

/** Add N weekdays (Mon–Fri), skipping Mexican public holidays. Uses UTC date parts. */
function addBusinessDays(from: Date, days: number): Date {
  if (!Number.isFinite(days) || days < 0) {
    throw new Error("days must be a non-negative number");
  }
  const result = new Date(from.getTime());
  let added = 0;
  while (added < days) {
    result.setUTCDate(result.getUTCDate() + 1);
    if (isMexicanBusinessDay(result)) added += 1;
  }
  return result;
}

/** Traffic-light severity vs due date (calendar days remaining). */
function computeDeadlineSeverity(
  dueAt: Date,
  now: Date = new Date(),
): DeadlineSeverity {
  const ms = dueAt.getTime() - now.getTime();
  const days = ms / 86_400_000;
  if (days < 0) return "overdue";
  if (days <= 2) return "critical";
  if (days <= 5) return "warning";
  return "safe";
}

// ---- inlined from shared/rbac.ts ----
const STAFF_ROLES: readonly UserRole[] = [
  "admin",
  "expert",
  "legal",
  "logistics",
  "accountant",
] as const;

const ALL_LOGIN_ROLES: readonly UserRole[] = [...STAFF_ROLES] as const;

function isStaffRole(role: string | null | undefined): boolean {
  return STAFF_ROLES.includes(role as UserRole);
}

function isLawFirmRole(role: string | null | undefined): boolean {
  // Legacy helper — law firm users no longer share staff role enum
  return role === "law_firm_user";
}

function isAdminRole(role: string | null | undefined): boolean {
  return role === "admin";
}

/** Roles that can manage invoices/payments. */
function canManageFinance(role: string | null | undefined): boolean {
  return role === "admin" || role === "accountant";
}

/** Roles that can manage team + platform settings. */
function canManageAdmin(role: string | null | undefined): boolean {
  return role === "admin";
}

// ---- inlined from shared/i18n.ts ----
/** Supported app locales — Spanish (Mexico) default, English US */

const DEFAULT_LOCALE: AppLocale = "es";
const SUPPORTED_LOCALES: AppLocale[] = ["es", "en"];

const LOCALE_STORAGE_KEY = "delache_locale";

/** Normalize browser / DB / header values to es | en */
function normalizeLocale(input?: string | null): AppLocale {
  if (!input) return DEFAULT_LOCALE;
  const tag = input.trim().toLowerCase();
  if (tag.startsWith("en")) return "en";
  if (tag.startsWith("es")) return "es";
  return DEFAULT_LOCALE;
}

/** Parse Accept-Language header (first supported match) */
function localeFromAcceptLanguage(header?: string | null): AppLocale | null {
  if (!header) return null;
  const parts = header.split(",").map((p) => p.split(";")[0]?.trim());
  for (const part of parts) {
    if (!part) continue;
    const normalized = normalizeLocale(part);
    if (SUPPORTED_LOCALES.includes(normalized)) return normalized;
  }
  return null;
}

/** Browser navigator.language with es default */
function detectBrowserLocale(): AppLocale {
  if (typeof navigator === "undefined") return DEFAULT_LOCALE;
  return normalizeLocale(navigator.language);
}

function getStoredLocale(): AppLocale | null {
  if (typeof localStorage === "undefined") return null;
  const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
  return stored ? normalizeLocale(stored) : null;
}

function setStoredLocale(locale: AppLocale): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(LOCALE_STORAGE_KEY, locale);
}

function getLocaleStorageKey(): string {
  return LOCALE_STORAGE_KEY;
}

function resolveLocale(
  ...candidates: (string | null | undefined)[]
): AppLocale {
  for (const c of candidates) {
    if (c) return normalizeLocale(c);
  }
  return DEFAULT_LOCALE;
}

const LOCALE_LABELS: Record<AppLocale, string> = {
  es: "Español",
  en: "English",
};

const LOCALE_HTML_LANG: Record<AppLocale, string> = {
  es: "es-MX",
  en: "en",
};

// ---- inlined from shared/authUtils.ts ----
/** Normalize email for DB lookups (trim + lowercase) */
function normalizeLookupEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /.+@.+\..+/.test(email);
}

function sha256(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

/** 6-digit numeric OTP */
function generateOtpCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generatePublicUuid(): string {
  // UUID v4-ish without pulling uuid dep
  const bytes = crypto.randomBytes(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function otpExpiresAt(ttlMinutes: number): Date {
  return new Date(Date.now() + ttlMinutes * 60 * 1000);
}

function sessionExpiresAt(ttlDays: number): Date {
  return new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);
}

/** MySQL DATETIME in UTC. Compare with UTC_TIMESTAMP(), not session NOW(). */
function toMysqlDateTimeUtc(date: Date): string {
  return date.toISOString().slice(0, 19).replace("T", " ");
}

// ---- inlined from shared/caseNumber.ts ----
/**
 * Case number format helpers.
 * Template tokens: {YYYY}, {YY}, {MM}, {SEQ:n} where n is zero-pad width.
 * Example: DEL-{YYYY}-{SEQ:4} → DEL-2026-0001
 */

const TOKEN_RE = /\{(YYYY|YY|MM|SEQ(?::(\d+))?)\}/g;

function isValidCaseNumberFormat(format: string): boolean {
  const trimmed = format.trim();
  if (!trimmed || trimmed.length > 64) return false;
  if (!trimmed.includes("{SEQ")) return false;
  // Allow letters, numbers, dash, underscore, and tokens only
  const stripped = trimmed.replace(TOKEN_RE, "");
  return /^[A-Za-z0-9\-_]*$/.test(stripped);
}

function renderCaseNumber(
  format: string,
  seq: number,
  now = new Date(),
): string {
  const year = now.getUTCFullYear();
  return format.replace(TOKEN_RE, (_match, token: string, width?: string) => {
    if (token === "YYYY") return String(year);
    if (token === "YY") return String(year).slice(-2);
    if (token === "MM") return String(now.getUTCMonth() + 1).padStart(2, "0");
    if (token.startsWith("SEQ")) {
      const pad = Math.min(Math.max(Number(width || 4), 1), 12);
      return String(seq).padStart(pad, "0");
    }
    return _match;
  });
}

// ---- inlined from shared/listQuery.ts ----
function parsePageLimit(
  query: Record<string, unknown>,
  defaults: { page?: number; limit?: number; maxLimit?: number } = {},
): { page: number; limit: number; offset: number } {
  const maxLimit = defaults.maxLimit ?? 100;
  const page = Math.max(1, Number(query.page) || defaults.page || 1);
  const limit = Math.min(
    maxLimit,
    Math.max(1, Number(query.limit) || defaults.limit || 20),
  );
  return { page, limit, offset: (page - 1) * limit };
}

function parseSortDir(value: unknown): "ASC" | "DESC" {
  return String(value || "").toUpperCase() === "ASC" ? "ASC" : "DESC";
}

function pickSortColumn(
  value: unknown,
  allowed: Record<string, string>,
  fallback: string,
): string {
  const key = String(value || "");
  return allowed[key] || allowed[fallback] || fallback;
}

function buildPagination(
  page: number,
  limit: number,
  total: number,
): PaginationInfo {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / Math.max(1, limit))),
  };
}

// ---- inlined from shared/otpRateLimitRules.ts ----
/**
 * OTP request rate-limit rules (pure). API supplies storage + clock.
 */

const OTP_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const OTP_RATE_LIMIT_MAX_ATTEMPTS = 5;
/** Separate IP spray limit (tighter window still uses same helper). */
const OTP_IP_RATE_LIMIT_MAX_ATTEMPTS = 20;

/**
 * Vitest must not hit sticky DB rate buckets (shared TiDB IP keys → flaky 429).
 * Mirrors optimum-credit: tests never send real OTP email and must not block on
 * production-like rate limits. Callers still create OTP rows; sendEmail no-ops.
 */
function shouldEnforceOtpRateLimits(
  vitestFlag: string | undefined,
): boolean {
  return vitestFlag !== "true";
}

type OtpRateLimitBucket = {
  count: number;
  windowStartedAt: number;
};

type OtpRateLimitResult =
  | { ok: true; remaining: number; resetAt: number }
  | {
      ok: false;
      code: "rate_limited";
      error: string;
      retryAfterSec: number;
      resetAt: number;
    };

type OtpRateLimitScope = "email" | "ip";

function buildOtpRateLimitKey(opts: {
  scope: OtpRateLimitScope;
  portal: "staff" | "client" | "unified";
  value: string;
}): string {
  const normalized = opts.value.trim().toLowerCase();
  return `${opts.scope}:${opts.portal}:${normalized}`;
}

function resolveOtpRateLimit(
  bucket: OtpRateLimitBucket | null | undefined,
  nowMs: number,
  opts?: { windowMs?: number; maxAttempts?: number },
): OtpRateLimitResult & { nextBucket: OtpRateLimitBucket } {
  const windowMs = opts?.windowMs ?? OTP_RATE_LIMIT_WINDOW_MS;
  const maxAttempts = opts?.maxAttempts ?? OTP_RATE_LIMIT_MAX_ATTEMPTS;

  const fresh =
    !bucket || nowMs - bucket.windowStartedAt >= windowMs
      ? { count: 0, windowStartedAt: nowMs }
      : bucket;

  const resetAt = fresh.windowStartedAt + windowMs;
  if (fresh.count >= maxAttempts) {
    const retryAfterSec = Math.max(1, Math.ceil((resetAt - nowMs) / 1000));
    return {
      ok: false,
      code: "rate_limited",
      error: "Too many verification requests. Please try again later.",
      retryAfterSec,
      resetAt,
      nextBucket: fresh,
    };
  }

  const nextBucket = {
    count: fresh.count + 1,
    windowStartedAt: fresh.windowStartedAt,
  };
  return {
    ok: true,
    remaining: Math.max(0, maxAttempts - nextBucket.count),
    resetAt,
    nextBucket,
  };
}

/** Peek without incrementing — used to reject before charging email quota. */
function peekOtpRateLimit(
  bucket: OtpRateLimitBucket | null | undefined,
  nowMs: number,
  opts?: { windowMs?: number; maxAttempts?: number },
): OtpRateLimitResult {
  const windowMs = opts?.windowMs ?? OTP_RATE_LIMIT_WINDOW_MS;
  const maxAttempts = opts?.maxAttempts ?? OTP_RATE_LIMIT_MAX_ATTEMPTS;
  const fresh =
    !bucket || nowMs - bucket.windowStartedAt >= windowMs
      ? { count: 0, windowStartedAt: nowMs }
      : bucket;
  const resetAt = fresh.windowStartedAt + windowMs;
  if (fresh.count >= maxAttempts) {
    return {
      ok: false,
      code: "rate_limited",
      error: "Too many verification requests. Please try again later.",
      retryAfterSec: Math.max(1, Math.ceil((resetAt - nowMs) / 1000)),
      resetAt,
    };
  }
  return {
    ok: true,
    remaining: Math.max(0, maxAttempts - fresh.count),
    resetAt,
  };
}

// ---- inlined from shared/formHelperRules.ts ----
/**
 * User preference flags for optional coaching UI.
 * Defaults OFF — platform stays clean; users opt in from Profile.
 */

function isPreferenceFlagEnabled(
  value: boolean | number | string | null | undefined,
): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (v === "" || v === "0" || v === "false" || v === "off" || v === "no") {
      return false;
    }
    if (v === "1" || v === "true" || v === "on" || v === "yes") return true;
    return false;
  }
  return false;
}

function isShowFormHelpersEnabled(
  value: boolean | number | string | null | undefined,
): boolean {
  return isPreferenceFlagEnabled(value);
}

function isShowProcessGuidanceEnabled(
  value: boolean | number | string | null | undefined,
): boolean {
  return isPreferenceFlagEnabled(value);
}

type UpdatePreferencesResult =
  | {
      ok: true;
      showFormHelpers?: boolean;
      showProcessGuidance?: boolean;
    }
  | { ok: false; error: string };

/**
 * Validate PATCH body for self-serve preferences.
 * At least one of `showFormHelpers` / `showProcessGuidance` must be a boolean.
 * Omitted fields are left unchanged by the API handler.
 */
function parseUpdatePreferences(body: unknown): UpdatePreferencesResult {
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Invalid body" };
  }
  const record = body as Record<string, unknown>;
  const hasHelpers = Object.prototype.hasOwnProperty.call(
    record,
    "showFormHelpers",
  );
  const hasGuidance = Object.prototype.hasOwnProperty.call(
    record,
    "showProcessGuidance",
  );
  if (!hasHelpers && !hasGuidance) {
    return {
      ok: false,
      error: "showProcessGuidance or showFormHelpers is required",
    };
  }

  const out: {
    ok: true;
    showFormHelpers?: boolean;
    showProcessGuidance?: boolean;
  } = { ok: true };

  if (hasHelpers) {
    if (typeof record.showFormHelpers !== "boolean") {
      return { ok: false, error: "showFormHelpers must be a boolean" };
    }
    out.showFormHelpers = record.showFormHelpers;
  }
  if (hasGuidance) {
    if (typeof record.showProcessGuidance !== "boolean") {
      return { ok: false, error: "showProcessGuidance must be a boolean" };
    }
    out.showProcessGuidance = record.showProcessGuidance;
  }
  return out;
}

// ---- inlined from shared/lawFirmMemberRules.ts ----
/**
 * Despacho membership + firm create/invite rules.
 * External lawyers are law_firm_users (never staff.legal).
 */

const LAW_FIRM_MEMBER_ROLES = [
  "owner",
  "admin",
  "member",
  "viewer",
] as const;

type LawFirmMemberRole = (typeof LAW_FIRM_MEMBER_ROLES)[number];

function isLawFirmMemberRole(
  role: string | null | undefined,
): role is LawFirmMemberRole {
  return (LAW_FIRM_MEMBER_ROLES as readonly string[]).includes(String(role));
}

/** Owner/admin can invite and manage firm roster. */
function canManageFirmMembers(
  role: string | null | undefined,
): boolean {
  return role === "owner" || role === "admin";
}

/** Viewer is read-only; member+ can upload/review on cases they own as firm. */
function canMutateFirmCaseWork(
  role: string | null | undefined,
): boolean {
  return role === "owner" || role === "admin" || role === "member";
}

/**
 * One email = one actor (Q5-A).
 * Intending to create staff while law_firm exists (or vice versa) is forbidden.
 */
function emailActorConflict(opts: {
  intendingActor: "staff" | "law_firm";
  staffExists: boolean;
  lawFirmExists: boolean;
}): { ok: true } | { ok: false; error: string; code: "email_actor_conflict" } {
  if (opts.intendingActor === "staff" && opts.lawFirmExists) {
    return {
      ok: false,
      error: "Email already registered as a despacho user",
      code: "email_actor_conflict",
    };
  }
  if (opts.intendingActor === "law_firm" && opts.staffExists) {
    return {
      ok: false,
      error: "Email already registered as DELACHE staff",
      code: "email_actor_conflict",
    };
  }
  return { ok: true };
}

type EmailActorRow = { id: number; deleted: boolean };

/**
 * Invite occupancy: cross-actor forever blocked; same-actor soft-delete → reactivate.
 */
function resolveEmailInviteOccupancy(opts: {
  intendingActor: "staff" | "law_firm";
  staff: EmailActorRow | null;
  lawFirm: EmailActorRow | null;
}):
  | { ok: true; action: "create" }
  | {
      ok: true;
      action: "reactivate";
      actor: "staff" | "law_firm";
      id: number;
    }
  | {
      ok: false;
      error: string;
      code: "email_actor_conflict" | "email_already_registered";
    } {
  const other =
    opts.intendingActor === "staff" ? opts.lawFirm : opts.staff;
  if (other) {
    return {
      ok: false,
      error:
        opts.intendingActor === "staff"
          ? "Email already registered as a despacho user"
          : "Email already registered as DELACHE staff",
      code: "email_actor_conflict",
    };
  }
  const same =
    opts.intendingActor === "staff" ? opts.staff : opts.lawFirm;
  if (!same) {
    return { ok: true, action: "create" };
  }
  if (!same.deleted) {
    return {
      ok: false,
      error: "Email already registered",
      code: "email_already_registered",
    };
  }
  return {
    ok: true,
    action: "reactivate",
    actor: opts.intendingActor,
    id: same.id,
  };
}

/** Login blocked when the same email is alive in both actor tables. */
function resolveLoginEmailDualActor(opts: {
  staffAlive: boolean;
  lawFirmAlive: boolean;
}):
  | { ok: true }
  | { ok: false; error: string; code: "email_actor_conflict" } {
  if (opts.staffAlive && opts.lawFirmAlive) {
    return {
      ok: false,
      error:
        "This email is registered as both staff and despacho. Contact an admin to resolve.",
      code: "email_actor_conflict",
    };
  }
  return { ok: true };
}

type CreateLawFirmDraft = {
  name: string;
  email?: string | null;
  city?: string | null;
  state?: string | null;
  defaultCourtName?: string | null;
};

type FirmInviteTarget =
  | { mode: "existing"; lawFirmId: number }
  | { mode: "create"; firm: CreateLawFirmDraft };

/**
 * Despacho invite must attach to an existing firm or create one inline.
 * New firm primary contact defaults to owner.
 */
function resolveDespachoInviteTarget(input: {
  lawFirmId?: number | null;
  createLawFirm?: Partial<CreateLawFirmDraft> | null;
  memberRole?: string | null;
  isPrimaryContact?: boolean;
}):
  | {
      ok: true;
      target: FirmInviteTarget;
      memberRole: LawFirmMemberRole;
      isPrimaryContact: boolean;
    }
  | {
      ok: false;
      error: string;
      code: "law_firm_required" | "invalid_firm_name" | "invalid_member_role";
    } {
  const createName = String(input.createLawFirm?.name || "").trim();
  const lawFirmId = Number(input.lawFirmId);
  const hasExisting = Number.isFinite(lawFirmId) && lawFirmId > 0;
  const hasCreate = createName.length > 0;

  if (!hasExisting && !hasCreate) {
    return {
      ok: false,
      error: "Select an existing despacho or create a new one",
      code: "law_firm_required",
    };
  }
  if (hasCreate && createName.length < 2) {
    return {
      ok: false,
      error: "Despacho name is required",
      code: "invalid_firm_name",
    };
  }

  const creating = hasCreate && !hasExisting;
  const rawRole = String(input.memberRole || "").trim();
  const memberRole: LawFirmMemberRole = creating
    ? "owner"
    : isLawFirmMemberRole(rawRole)
      ? rawRole
      : "member";

  if (rawRole && !creating && !isLawFirmMemberRole(rawRole)) {
    return {
      ok: false,
      error: "Invalid despacho member role",
      code: "invalid_member_role",
    };
  }

  if (creating) {
    return {
      ok: true,
      target: {
        mode: "create",
        firm: {
          name: createName,
          email: input.createLawFirm?.email?.trim() || null,
          city: input.createLawFirm?.city?.trim() || null,
          state: input.createLawFirm?.state?.trim() || null,
          defaultCourtName:
            input.createLawFirm?.defaultCourtName?.trim() || null,
        },
      },
      memberRole,
      isPrimaryContact: true,
    };
  }

  return {
    ok: true,
    target: { mode: "existing", lawFirmId },
    memberRole,
    isPrimaryContact: Boolean(input.isPrimaryContact),
  };
}

/**
 * Creating a despacho org always requires a primary owner invite (Q2-C).
 */
function validateCreateLawFirmWithOwner(input: {
  name: string;
  ownerEmail: string;
  ownerFirstName: string;
  ownerLastName: string;
}):
  | {
      ok: true;
      name: string;
      ownerEmail: string;
      ownerFirstName: string;
      ownerLastName: string;
    }
  | { ok: false; error: string; code: "invalid_payload" } {
  const name = String(input.name || "").trim();
  const ownerEmail = String(input.ownerEmail || "").trim().toLowerCase();
  const ownerFirstName = String(input.ownerFirstName || "").trim();
  const ownerLastName = String(input.ownerLastName || "").trim();
  if (!name || !ownerEmail || !ownerFirstName || !ownerLastName) {
    return {
      ok: false,
      error: "name and primary owner (email, firstName, lastName) are required",
      code: "invalid_payload",
    };
  }
  return { ok: true, name, ownerEmail, ownerFirstName, ownerLastName };
}

// ---- inlined from shared/teamMemberRules.ts ----
/**
 * Team member invite/update/remove business rules.
 * Keep API handlers thin — all validation and edge cases live here and are unit-tested.
 */

const STAFF_EDIT_ROLES: readonly UserRole[] = [
  "admin",
  "expert",
  "legal",
  "logistics",
  "accountant",
] as const;

const INVITE_ROLES: readonly (UserRole | "law_firm_user")[] = [
  ...STAFF_EDIT_ROLES,
  "law_firm_user",
] as const;

/** Statuses admins may set via PATCH (suspend removed from product UI). */
const MUTABLE_MEMBER_STATUSES: readonly UserStatus[] = [
  "active",
  "inactive",
  "invited",
] as const;

type TeamMemberSnapshot = {
  id: number;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  phone?: string | null;
};

type TeamMemberUpdatePatch = {
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  status?: UserStatus;
  phone?: string | null;
};

type TeamMemberUpdateOk = {
  ok: true;
  next: {
    firstName: string;
    lastName: string;
    role: UserRole;
    status: UserStatus;
    phone?: string | null;
    phoneChanged: boolean;
  };
  revokeSessions: boolean;
  statusChanged: boolean;
};

type TeamMemberUpdateErr = {
  ok: false;
  error: string;
  code:
    "self_status_change" | "invalid_name" | "invalid_role" | "invalid_status";
};

type TeamMemberUpdateResult = TeamMemberUpdateOk | TeamMemberUpdateErr;

function isStaffEditRole(role: string): role is UserRole {
  return (STAFF_EDIT_ROLES as readonly string[]).includes(role);
}

function isInviteRole(role: string): role is UserRole | "law_firm_user" {
  return (INVITE_ROLES as readonly string[]).includes(role);
}

function isMutableMemberStatus(status: string): status is UserStatus {
  return (MUTABLE_MEMBER_STATUSES as readonly string[]).includes(status);
}

/** Login OTP is allowed only for active or invited accounts. */
function canRequestLoginOtp(status: UserStatus): boolean {
  return status === "active" || status === "invited";
}

/** Deactivate / inactive (and legacy suspended) must kill open sessions. */
function shouldRevokeSessionsOnStatus(status: UserStatus): boolean {
  return status === "inactive" || status === "suspended";
}

function canChangeOwnAccountStatus(
  actorId: number,
  memberId: number,
  currentStatus: UserStatus,
  nextStatus: UserStatus,
): boolean {
  if (actorId !== memberId) return true;
  return currentStatus === nextStatus;
}

function canRemoveMember(actorId: number, memberId: number): boolean {
  return actorId !== memberId;
}

/**
 * Resolve a PATCH payload against the current member.
 * Enforces self-status lock, name/role/status validity, and session revoke flag.
 */
function resolveTeamMemberUpdate(
  actorId: number,
  current: TeamMemberSnapshot,
  patch: TeamMemberUpdatePatch,
): TeamMemberUpdateResult {
  const nextFirst =
    patch.firstName !== undefined
      ? String(patch.firstName).trim()
      : current.firstName;
  const nextLast =
    patch.lastName !== undefined
      ? String(patch.lastName).trim()
      : current.lastName;
  const nextRole = patch.role !== undefined ? patch.role : current.role;
  const nextStatus = patch.status !== undefined ? patch.status : current.status;

  if (
    !canChangeOwnAccountStatus(actorId, current.id, current.status, nextStatus)
  ) {
    return {
      ok: false,
      error: "Cannot change your own account status",
      code: "self_status_change",
    };
  }

  if (!nextFirst || !nextLast) {
    return {
      ok: false,
      error: "firstName and lastName required",
      code: "invalid_name",
    };
  }

  if (!isStaffEditRole(nextRole)) {
    return { ok: false, error: "Invalid role", code: "invalid_role" };
  }

  if (!isMutableMemberStatus(nextStatus)) {
    return { ok: false, error: "Invalid status", code: "invalid_status" };
  }

  const phoneChanged = patch.phone !== undefined;
  const nextPhone = phoneChanged
    ? patch.phone?.trim() || null
    : (current.phone ?? null);

  return {
    ok: true,
    next: {
      firstName: nextFirst,
      lastName: nextLast,
      role: nextRole,
      status: nextStatus,
      phone: nextPhone,
      phoneChanged,
    },
    revokeSessions: shouldRevokeSessionsOnStatus(nextStatus),
    statusChanged: nextStatus !== current.status,
  };
}

type InviteValidationOk = {
  ok: true;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole | "law_firm_user";
  lawFirmId: number | null;
  createLawFirm: CreateLawFirmDraft | null;
  memberRole: LawFirmMemberRole | null;
  isPrimaryContact: boolean;
};

type InviteValidationErr = {
  ok: false;
  error: string;
  code:
    | "invalid_payload"
    | "law_firm_required"
    | "invalid_firm_name"
    | "invalid_member_role";
};

function validateTeamInvite(input: {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  lawFirmId?: number | null;
  createLawFirm?: Partial<CreateLawFirmDraft> | null;
  memberRole?: string | null;
}): InviteValidationOk | InviteValidationErr {
  const email = String(input.email || "")
    .trim()
    .toLowerCase();
  const firstName = String(input.firstName || "").trim();
  const lastName = String(input.lastName || "").trim();
  const role = String(input.role || "").trim();

  if (!email || !firstName || !lastName || !isInviteRole(role)) {
    return {
      ok: false,
      error: "email, firstName, lastName and role required",
      code: "invalid_payload",
    };
  }

  if (role === "law_firm_user") {
    const target = resolveDespachoInviteTarget({
      lawFirmId: input.lawFirmId,
      createLawFirm: input.createLawFirm,
      memberRole: input.memberRole,
    });
    if (target.ok === false) {
      return {
        ok: false,
        error: target.error,
        code: target.code,
      };
    }
    return {
      ok: true,
      email,
      firstName,
      lastName,
      role: "law_firm_user",
      lawFirmId:
        target.target.mode === "existing" ? target.target.lawFirmId : null,
      createLawFirm:
        target.target.mode === "create" ? target.target.firm : null,
      memberRole: target.memberRole,
      isPrimaryContact: target.isPrimaryContact,
    };
  }

  return {
    ok: true,
    email,
    firstName,
    lastName,
    role: role as UserRole,
    lawFirmId: null,
    createLawFirm: null,
    memberRole: null,
    isPrimaryContact: false,
  };
}

// ---- inlined from shared/otpRequestRules.ts ----
/**
 * Auth OTP request eligibility — decide whether to send a code or return an error.
 */

type OtpRequestDenyCode =
  "account_not_found" | "account_inactive" | "login_not_allowed";

type OtpRequestEligibility =
  { ok: true } | { ok: false; code: OtpRequestDenyCode; error: string };

const MESSAGES: Record<OtpRequestDenyCode, string> = {
  account_not_found: "No account found for this email",
  account_inactive: "This account is not active",
  login_not_allowed: "Login is not allowed for this account",
};

function resolveOtpRequestEligibility(opts: {
  found: boolean;
  deleted?: boolean | null;
  status?: string | null;
  /** When set (staff), role must be allowed to log in. */
  roleAllowed?: boolean;
}): OtpRequestEligibility {
  if (!opts.found || opts.deleted) {
    return {
      ok: false,
      code: "account_not_found",
      error: MESSAGES.account_not_found,
    };
  }
  if (!canRequestLoginOtp((opts.status || "") as UserStatus)) {
    return {
      ok: false,
      code: "account_inactive",
      error: MESSAGES.account_inactive,
    };
  }
  if (opts.roleAllowed === false) {
    return {
      ok: false,
      code: "login_not_allowed",
      error: MESSAGES.login_not_allowed,
    };
  }
  return { ok: true };
}

// ---- inlined from shared/reportWorkflow.ts ----
const REPORT_STATUS_FORWARD: Partial<
  Record<TechnicalReportStatus, TechnicalReportStatus[]>
> = {
  draft: ["grammar_qa", "rejected"],
  grammar_qa: ["technical_director", "changes_requested", "rejected"],
  technical_director: ["approved_internal", "changes_requested", "rejected"],
  approved_internal: ["external_review", "changes_requested"],
  external_review: ["approved", "changes_requested", "rejected"],
  changes_requested: ["draft", "grammar_qa"],
  approved: ["delivered", "changes_requested"],
  rejected: ["changes_requested", "draft"],
  delivered: [],
};

function getAllowedReportStatuses(
  from: TechnicalReportStatus,
): TechnicalReportStatus[] {
  return REPORT_STATUS_FORWARD[from] || [];
}

function canTransitionReport(
  from: TechnicalReportStatus,
  to: TechnicalReportStatus,
): { ok: true } | { ok: false; reason: string } {
  if (from === to) return { ok: false, reason: "Already in that status" };
  const allowed = getAllowedReportStatuses(from);
  if (!allowed.includes(to)) {
    return {
      ok: false,
      reason: `Cannot move technical report from ${from} to ${to}`,
    };
  }
  return { ok: true };
}

// ---- inlined from shared/questionnaireWorkflow.ts ----
/**
 * Questionnaire status transitions (Product.md Phases 3–4).
 */

const QUESTIONNAIRE_STATUS_FORWARD: Partial<
  Record<QuestionnaireStatus, QuestionnaireStatus[]>
> = {
  draft: ["grammar_qa", "rejected"],
  grammar_qa: ["legal_review", "changes_requested", "rejected"],
  legal_review: ["approved", "changes_requested", "rejected"],
  changes_requested: ["draft", "grammar_qa"],
  approved: ["changes_requested"],
  rejected: ["changes_requested", "draft"],
};

function getAllowedQuestionnaireStatuses(
  from: QuestionnaireStatus,
): QuestionnaireStatus[] {
  return QUESTIONNAIRE_STATUS_FORWARD[from] || [];
}

function canTransitionQuestionnaire(
  from: QuestionnaireStatus,
  to: QuestionnaireStatus,
): { ok: true } | { ok: false; reason: string } {
  if (from === to) return { ok: false, reason: "Already in that status" };
  const allowed = getAllowedQuestionnaireStatuses(from);
  if (!allowed.includes(to)) {
    return {
      ok: false,
      reason: `Cannot move questionnaire from ${from} to ${to}`,
    };
  }
  return { ok: true };
}

const REVIEW_ONLY_DIRECT_PATCH = new Set([
  "grammar_qa→legal_review",
  "legal_review→approved",
]);

function canDirectPatchQuestionnaireStatus(
  from: QuestionnaireStatus,
  to: QuestionnaireStatus,
): { ok: true } | { ok: false; reason: string } {
  const base = canTransitionQuestionnaire(from, to);
  if (!base.ok) return base;
  if (REVIEW_ONLY_DIRECT_PATCH.has(`${from}→${to}`)) {
    return {
      ok: false,
      reason: "Complete the pending review in the Reviews panel",
    };
  }
  return { ok: true };
}

function getAllowedQuestionnaireStatusesForDirectPatch(
  from: QuestionnaireStatus,
): QuestionnaireStatus[] {
  return getAllowedQuestionnaireStatuses(from).filter(
    (to) => canDirectPatchQuestionnaireStatus(from, to).ok,
  );
}

/** Entering grammar_qa opens QA review (P3). */
function shouldOpenGrammarQaReview(to: QuestionnaireStatus): boolean {
  return to === "grammar_qa";
}

/** Entering legal_review should open an internal_legal review request. */
function shouldOpenInternalLegalReview(to: QuestionnaireStatus): boolean {
  return to === "legal_review";
}

/** QA passed — P3 advance milestone (before legal approval). */
function questionnaireQaComplete(status: string | null | undefined): boolean {
  return status === "legal_review" || status === "approved";
}

// ---- inlined from shared/reviewRequestRules.ts ----
/**
 * Review request lifecycle (Product.md Phases 4, 9, 10).
 */

const REVIEW_ENTITY_TYPES = [
  "questionnaire",
  "technical_report",
  "document",
  "inspection",
] as const;

const REVIEW_STAGES = [
  "grammar_qa",
  "technical_director",
  "internal_legal",
  "external_law_firm",
] as const;

const REVIEW_STATUSES = [
  "pending",
  "approved",
  "changes_requested",
  "rejected",
] as const;

const REVIEW_OUTCOMES = ["approved", "changes_requested", "rejected"] as const;

/** Map technical report status → review stage when entering a review gate. */
function reviewStageForReportStatus(status: string): ReviewStage | null {
  if (status === "grammar_qa") return "grammar_qa";
  if (status === "technical_director") return "technical_director";
  if (status === "external_review") return "external_law_firm";
  return null;
}

function isReviewEntityType(v: unknown): v is ReviewEntityType {
  return (
    typeof v === "string" &&
    (REVIEW_ENTITY_TYPES as readonly string[]).includes(v)
  );
}

function isReviewStage(v: unknown): v is ReviewStage {
  return (
    typeof v === "string" && (REVIEW_STAGES as readonly string[]).includes(v)
  );
}

function isReviewOutcome(v: unknown): v is ReviewOutcome {
  return (
    typeof v === "string" && (REVIEW_OUTCOMES as readonly string[]).includes(v)
  );
}

/** Default SLA in business days by stage (Product.md). */
function defaultReviewSlaBusinessDays(stage: ReviewStage): number {
  if (stage === "external_law_firm") return 3;
  if (stage === "internal_legal") return 2;
  return 2;
}

type CompleteReviewResult =
  | { ok: true; nextStatus: ReviewOutcome; completed: true }
  | { ok: false; error: string; code: "not_pending" | "invalid_outcome" };

function resolveReviewCompletion(
  currentStatus: string,
  outcome: unknown,
): CompleteReviewResult {
  if (currentStatus !== "pending") {
    return {
      ok: false,
      error: "Only pending reviews can be completed",
      code: "not_pending",
    };
  }
  if (!isReviewOutcome(outcome)) {
    return {
      ok: false,
      error: "outcome must be approved, changes_requested, or rejected",
      code: "invalid_outcome",
    };
  }
  return { ok: true, nextStatus: outcome, completed: true };
}

/** Map review outcome → questionnaire status from stage. */
function questionnaireStatusFromReviewStage(
  stage: ReviewStage,
  outcome: ReviewOutcome,
): QuestionnaireStatus | null {
  if (outcome === "changes_requested") return "changes_requested";
  if (outcome === "rejected") return "rejected";
  if (outcome === "approved") {
    if (stage === "grammar_qa") return "legal_review";
    if (stage === "internal_legal") return "approved";
  }
  return null;
}

/** @deprecated Use questionnaireStatusFromReviewStage. */
function questionnaireStatusFromReview(
  outcome: ReviewOutcome,
): "approved" | "changes_requested" | "rejected" {
  return outcome;
}

/** Map review outcome → technical report status from a given stage. */
function reportStatusFromReview(
  stage: ReviewStage,
  outcome: ReviewOutcome,
): string | null {
  if (outcome === "changes_requested") return "changes_requested";
  if (outcome === "rejected") return "rejected";
  if (outcome === "approved") {
    if (stage === "grammar_qa") return "technical_director";
    if (stage === "technical_director") return "approved_internal";
    if (stage === "external_law_firm") return "approved";
  }
  return null;
}

// ---- inlined from shared/documentCompleteness.ts ----
/**
 * Document completeness vs Product.md Phases 1 and 5.
 */

const INTAKE_REQUIRED_CATEGORIES = [
  "lawsuit",
  "medical_record",
  "cfe_report",
  "preliminary_photo",
] as const;

const ADDITIONAL_DOCS_CATEGORIES = [
  "defendant_response",
  "death_certificate",
  "sketch",
  "plaintiff_questionnaire",
] as const;

const COURT_FILING_CATEGORIES = [
  "protesta",
  "court_filing",
  "ratification",
] as const;

type CourtFilingCategory = (typeof COURT_FILING_CATEGORIES)[number];

type DocumentCompletenessStatus = {
  phase: "intake" | "additional_docs" | "court_filing";
  required: string[];
  present: string[];
  missing: string[];
  complete: boolean;
};

function uniquePresent(
  categories: readonly string[],
  required: readonly string[],
): string[] {
  const set = new Set(categories);
  return required.filter((c) => set.has(c));
}

function getIntakeCompleteness(
  documentCategories: readonly string[],
): DocumentCompletenessStatus {
  const required = [...INTAKE_REQUIRED_CATEGORIES];
  const present = uniquePresent(documentCategories, required);
  const missing = required.filter((c) => !present.includes(c));
  return {
    phase: "intake",
    required,
    present,
    missing,
    complete: missing.length === 0,
  };
}

type AdditionalDocsOptions = {
  involvesFatality?: boolean;
};

const INACTIVE_DOCUMENT_STATUSES = ["rejected", "archived"] as const;

const ADDITIONAL_DOCS_ALWAYS_REQUIRED = [
  "defendant_response",
  "sketch",
  "plaintiff_questionnaire",
] as const;

function additionalDocsRequiredCount(involvesFatality: boolean): number {
  return ADDITIONAL_DOCS_ALWAYS_REQUIRED.length + (involvesFatality ? 1 : 0);
}

function isActiveDocumentStatus(status: string | null | undefined): boolean {
  if (!status) return true;
  return !(INACTIVE_DOCUMENT_STATUSES as readonly string[]).includes(status);
}

function getAdditionalDocsCompleteness(
  documentCategories: readonly string[],
  opts: AdditionalDocsOptions = {},
): DocumentCompletenessStatus {
  const required = ADDITIONAL_DOCS_CATEGORIES.filter((c) => {
    if (c === "death_certificate") return opts.involvesFatality === true;
    return true;
  });
  const present = uniquePresent(documentCategories, required);
  const missing = required.filter((c) => !present.includes(c));
  return {
    phase: "additional_docs",
    required,
    present,
    missing,
    complete: missing.length === 0,
  };
}

function getCourtFilingCompleteness(
  documentCategories: readonly string[],
): DocumentCompletenessStatus {
  const required = [...COURT_FILING_CATEGORIES];
  const present = uniquePresent(documentCategories, required);
  const missing = required.filter((c) => !present.includes(c));
  return {
    phase: "court_filing",
    required,
    present,
    missing,
    complete: missing.length === 0,
  };
}

/** True when case is in a phase that cares about missing docs and any are missing. */
function shouldEmitMissingDocumentsAlert(
  caseStatus: string,
  completeness: DocumentCompletenessStatus,
): boolean {
  if (completeness.complete) return false;
  if (completeness.phase === "intake") {
    return caseStatus === "intake" || caseStatus === "assignment";
  }
  if (completeness.phase === "court_filing") {
    return caseStatus === "validation_delivery";
  }
  return caseStatus === "additional_docs";
}

/** Throttle repeated missing-doc notifications (e.g. every upload). */
const MISSING_DOCS_NOTIFY_COOLDOWN_MS = 6 * 60 * 60 * 1000;

function shouldThrottleMissingDocumentsAlert(
  lastNotifiedAtMs: number | null | undefined,
  nowMs: number,
  cooldownMs: number = MISSING_DOCS_NOTIFY_COOLDOWN_MS,
): boolean {
  if (lastNotifiedAtMs == null) return false;
  return nowMs - lastNotifiedAtMs < cooldownMs;
}

/** Active completeness checklist for a case status (dashboard KPI + alerts). */
function activeCompletenessForCaseStatus(
  caseStatus: string,
  documentCategories: readonly string[],
  opts: AdditionalDocsOptions = {},
): DocumentCompletenessStatus {
  if (caseStatus === "validation_delivery") {
    return getCourtFilingCompleteness(documentCategories);
  }
  if (caseStatus === "additional_docs") {
    return getAdditionalDocsCompleteness(documentCategories, opts);
  }
  return getIntakeCompleteness(documentCategories);
}

/** Case statuses where missing-docs KPI / alerts apply. */
const MISSING_DOCS_KPI_STATUSES = [
  "intake",
  "assignment",
  "additional_docs",
  "validation_delivery",
] as const;

function caseStatusCountsTowardMissingDocsKpi(caseStatus: string): boolean {
  return (MISSING_DOCS_KPI_STATUSES as readonly string[]).includes(caseStatus);
}

function shouldNotifyLawFirmOfMissingDocs(completeness: {
  phase: string;
}): boolean {
  return (
    completeness.phase === "intake" || completeness.phase === "additional_docs"
  );
}

function shouldWriteLawFirmMissingDocsNote(completeness: {
  phase: string;
}): boolean {
  return completeness.phase === "additional_docs";
}

// ---- inlined from shared/documentApprovalRules.ts ----
const DOCUMENT_LOCKED_STATUSES = [
  "uploaded",
  "under_review",
  "approved",
] as const;

const INTAKE_CORRECTION_BUSINESS_DAYS = 3;
const INTAKE_CORRECTION_DEADLINE_TYPE = "intake_correction" as const;
const INTAKE_CORRECTION_DEADLINE_TITLE =
  "Intake document correction (3 business days)";

type DocumentApprovalRow = {
  category: string;
  status: string | null | undefined;
};

function isIntakeDocumentCategory(
  category: string | null | undefined,
): boolean {
  if (!category) return false;
  return (INTAKE_REQUIRED_CATEGORIES as readonly string[]).includes(category);
}

function canApproveIntakeDocument(role: string | null | undefined): boolean {
  return role === "admin";
}

function canRejectIntakeDocument(role: string | null | undefined): boolean {
  return role === "admin";
}

function canApproveExpediente(role: string | null | undefined): boolean {
  return role === "admin";
}

function canSetExternalCourtDeadline(
  role: string | null | undefined,
): boolean {
  return role === "admin" || role === "legal";
}

/** Keep in sync with canEditIntakePack (document mutators). */
function canEditIntakePackInline(role: string | null | undefined): boolean {
  return (
    role === "admin" ||
    role === "expert" ||
    role === "legal" ||
    role === "accountant"
  );
}

function isDocumentStatusLocked(status: string | null | undefined): boolean {
  if (!status) return false;
  return (DOCUMENT_LOCKED_STATUSES as readonly string[]).includes(status);
}

function canLawFirmMutateDocument(opts: {
  status: string | null | undefined;
}): boolean {
  return !isDocumentStatusLocked(opts.status);
}

function canLawFirmUploadCategory(opts: {
  existingStatuses: readonly (string | null | undefined)[];
}): boolean {
  return !opts.existingStatuses.some((s) => isDocumentStatusLocked(s));
}

function documentIsApprovable(status: string | null | undefined): boolean {
  return status === "uploaded" || status === "under_review";
}

function documentIsRejectable(status: string | null | undefined): boolean {
  return (
    status === "uploaded" ||
    status === "under_review" ||
    status === "approved"
  );
}

function approvedCategoriesFromDocs(
  docs: readonly DocumentApprovalRow[],
): string[] {
  const set = new Set<string>();
  for (const d of docs) {
    if (d.status === "approved" && d.category) set.add(d.category);
  }
  return [...set];
}

function intakeDocsAllApproved(docs: readonly DocumentApprovalRow[]): boolean {
  const approved = new Set(approvedCategoriesFromDocs(docs));
  return INTAKE_REQUIRED_CATEGORIES.every((c) => approved.has(c));
}

function missingApprovedIntakeCategories(
  docs: readonly DocumentApprovalRow[],
): string[] {
  const approved = new Set(approvedCategoriesFromDocs(docs));
  return INTAKE_REQUIRED_CATEGORIES.filter((c) => !approved.has(c));
}

function canApproveExpedienteNow(opts: {
  role: string | null | undefined;
  docs: readonly DocumentApprovalRow[];
  alreadyApproved: boolean;
}): { ok: true } | { ok: false; error: string; code: string } {
  if (!canApproveExpediente(opts.role)) {
    return { ok: false, error: "Insufficient permissions", code: "forbidden" };
  }
  if (opts.alreadyApproved) {
    return {
      ok: false,
      error: "Expediente already approved",
      code: "already_approved",
    };
  }
  const missing = missingApprovedIntakeCategories(opts.docs);
  if (missing.length > 0) {
    return {
      ok: false,
      error: `Approve all intake documents first (missing: ${missing.join(", ")})`,
      code: "intake_docs_not_approved",
    };
  }
  return { ok: true };
}

function intakeCorrectionDeadlineSpec(): {
  deadlineType: typeof INTAKE_CORRECTION_DEADLINE_TYPE;
  title: string;
  businessDays: number;
} {
  return {
    deadlineType: INTAKE_CORRECTION_DEADLINE_TYPE,
    title: INTAKE_CORRECTION_DEADLINE_TITLE,
    businessDays: INTAKE_CORRECTION_BUSINESS_DAYS,
  };
}

function normalizeRejectionReason(reason: unknown): string | null {
  if (reason == null) return null;
  const trimmed = String(reason).trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 2000);
}

function parseDocumentRejectBody(body: unknown):
  | { ok: true; reason: string | null }
  | { ok: false; error: string } {
  if (body == null) return { ok: true, reason: null };
  if (typeof body !== "object") {
    return { ok: false, error: "Invalid body" };
  }
  const rec = body as Record<string, unknown>;
  if (!("reason" in rec) && !("rejectionReason" in rec)) {
    return { ok: true, reason: null };
  }
  const raw = "reason" in rec ? rec.reason : rec.rejectionReason;
  if (raw != null && typeof raw !== "string") {
    return { ok: false, error: "reason must be a string" };
  }
  return { ok: true, reason: normalizeRejectionReason(raw) };
}

/** Optional external court deadline — null/empty clears; invalid → error. */
function parseExternalCourtDeadlineAtInline(
  raw: unknown,
):
  | { ok: true; value: string | null }
  | { ok: false; error: string } {
  if (raw === undefined || raw === null || raw === "") {
    return { ok: true, value: null };
  }
  if (typeof raw !== "string" && typeof raw !== "number") {
    return {
      ok: false,
      error: "externalCourtDeadlineAt must be a date string or null",
    };
  }
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) {
    return { ok: false, error: "Invalid externalCourtDeadlineAt" };
  }
  return { ok: true, value: d.toISOString() };
}

// ---- inlined from shared/documentCategoryRules.ts ----
const DOCUMENT_CATEGORIES: readonly DocumentCategory[] = [
  "lawsuit",
  "medical_record",
  "cfe_report",
  "preliminary_photo",
  "defendant_response",
  "death_certificate",
  "sketch",
  "plaintiff_questionnaire",
  "questionnaire",
  "technical_report",
  "court_filing",
  "protesta",
  "ratification",
  "invoice",
  "receipt",
  "logistics",
  "street_view",
  "other",
];

const CLIENT_DOCUMENT_CATEGORIES: readonly DocumentCategory[] = [
  "lawsuit",
  "medical_record",
  "cfe_report",
  "preliminary_photo",
  "defendant_response",
  "death_certificate",
  "sketch",
  "plaintiff_questionnaire",
  "other",
];

function isDocumentCategory(value: unknown): value is DocumentCategory {
  return (
    typeof value === "string" &&
    (DOCUMENT_CATEGORIES as readonly string[]).includes(value)
  );
}

function parseDocumentCategory(
  raw: unknown,
  fallback: DocumentCategory = "other",
): DocumentCategory {
  return isDocumentCategory(raw) ? raw : fallback;
}

function parseDocumentCategoryStrict(
  raw: unknown,
): { ok: true; value: DocumentCategory } | { ok: false; error: string } {
  if (!isDocumentCategory(raw)) {
    return { ok: false, error: "Invalid document category" };
  }
  return { ok: true, value: raw };
}

function canClientSetDocumentCategory(category: DocumentCategory): boolean {
  return (CLIENT_DOCUMENT_CATEGORIES as readonly string[]).includes(category);
}

function canClientRecategorizeDocument(currentCategory: unknown): boolean {
  if (!isDocumentCategory(currentCategory)) return false;
  return (
    canClientSetDocumentCategory(currentCategory) || currentCategory === "other"
  );
}

function parseRequiredDocumentCategory(
  raw: unknown,
): { ok: true; value: DocumentCategory } | { ok: false; error: string } {
  if (raw == null || (typeof raw === "string" && raw.trim() === "")) {
    return { ok: false, error: "category is required" };
  }
  return parseDocumentCategoryStrict(raw);
}

function parseUpdateDocumentCategory(
  body: unknown,
  opts: { clientPortal?: boolean; currentCategory?: unknown } = {},
):
  | { ok: true; value: { category: DocumentCategory } }
  | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid body" };
  }
  const parsed = parseDocumentCategoryStrict(
    (body as { category?: unknown }).category,
  );
  if (parsed.ok === false) return parsed;
  if (opts.clientPortal && !canClientSetDocumentCategory(parsed.value)) {
    return {
      ok: false,
      error: "Law firm users can only set intake and additional-doc categories",
    };
  }
  if (
    opts.clientPortal &&
    opts.currentCategory !== undefined &&
    !canClientRecategorizeDocument(opts.currentCategory)
  ) {
    return {
      ok: false,
      error: "Law firm users cannot recategorize staff documents",
    };
  }
  return { ok: true, value: { category: parsed.value } };
}

function parseClientUploadCategory(
  raw: unknown,
): { ok: true; value: DocumentCategory } | { ok: false; error: string } {
  const required = parseRequiredDocumentCategory(raw);
  if (required.ok === false) return required;
  if (!canClientSetDocumentCategory(required.value)) {
    return {
      ok: false,
      error:
        "Law firm users can only upload intake and additional-doc categories",
    };
  }
  return required;
}

// ---- inlined from shared/documentDmsRules.ts ----
/**
 * DMS rules: bulk upload, preview MIME types, OCR eligibility.
 */

const DMS_MAX_FILE_BYTES = 15 * 1024 * 1024;
const DMS_MAX_BULK_FILES = 20;
/** Cap total decoded bulk payload so JSON body stays within parser limits. */
const DMS_MAX_BULK_TOTAL_BYTES = 20 * 1024 * 1024;
/** express.json limit for base64 uploads (single 15MB file ≈ 20MB encoded). */
const DMS_JSON_BODY_LIMIT = "25mb";
/** Default JSON body limit for non-upload routes. */
const JSON_BODY_LIMIT_DEFAULT = "1mb";
const VERCEL_SAFE_JSON_UPLOAD_BYTES = 3 * 1024 * 1024;

function estimateBase64DecodedBytes(dataBase64: string): number {
  const cleaned = dataBase64.replace(/\s/g, "");
  if (!cleaned) return 0;
  const padding = cleaned.endsWith("==") ? 2 : cleaned.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((cleaned.length * 3) / 4) - padding);
}

const DMS_ALLOWED_MIME_PREFIXES = [
  "application/pdf",
  "image/",
  "text/",
  "application/msword",
  "application/vnd.openxmlformats-officedocument",
] as const;

type BulkDocumentInput = {
  title?: unknown;
  fileName?: unknown;
  contentType?: unknown;
  data?: unknown;
  category?: unknown;
};

type BulkValidateOk = {
  ok: true;
  files: Array<{
    title: string;
    fileName: string;
    contentType: string;
    dataBase64: string;
    category: string;
  }>;
};

type BulkValidateErr = {
  ok: false;
  error: string;
  code: "empty" | "too_many" | "invalid_file" | "too_large";
};

function isOcrableMime(mime: string | null | undefined): boolean {
  if (!mime) return false;
  const m = mime.toLowerCase();
  return m === "application/pdf" || m.startsWith("image/");
}

function isPreviewableMime(mime: string | null | undefined): boolean {
  if (!mime) return false;
  const m = mime.toLowerCase();
  return (
    m === "application/pdf" || m.startsWith("image/") || m.startsWith("text/")
  );
}

function isAllowedDmsMime(mime: string | null | undefined): boolean {
  if (!mime) return true; // allow unknown; server still size-checks
  const m = mime.toLowerCase();
  return DMS_ALLOWED_MIME_PREFIXES.some(
    (p) => m === p || m.startsWith(p.endsWith("/") ? p : `${p}`),
  );
}

function initialOcrStatusForMime(mime: string | null | undefined): OcrStatus {
  return isOcrableMime(mime) ? "pending" : "skipped";
}

function validateBulkDocuments(
  files: unknown,
): BulkValidateOk | BulkValidateErr {
  if (!Array.isArray(files) || files.length === 0) {
    return { ok: false, error: "files array is required", code: "empty" };
  }
  if (files.length > DMS_MAX_BULK_FILES) {
    return {
      ok: false,
      error: `Maximum ${DMS_MAX_BULK_FILES} files per upload`,
      code: "too_many",
    };
  }

  const normalized: BulkValidateOk["files"] = [];
  let totalBytes = 0;
  for (let i = 0; i < files.length; i += 1) {
    const raw = files[i] as BulkDocumentInput;
    const fileName = String(raw?.fileName || "").trim();
    const dataBase64 = String(raw?.data || "").trim();
    const contentType =
      String(raw?.contentType || "application/octet-stream").trim() ||
      "application/octet-stream";
    const title =
      String(raw?.title || "").trim() ||
      fileName.replace(/\.[^.]+$/, "") ||
      `Document ${i + 1}`;
    if (!fileName || !dataBase64) {
      return {
        ok: false,
        error: `File ${i + 1}: fileName and data are required`,
        code: "invalid_file",
      };
    }
    const categoryRaw =
      raw?.category != null && String(raw.category).trim()
        ? String(raw.category).trim()
        : "";
    if (!categoryRaw) {
      return {
        ok: false,
        error: `File ${i + 1}: category is required`,
        code: "invalid_file",
      };
    }
    if (!isAllowedDmsMime(contentType)) {
      return {
        ok: false,
        error: `File ${i + 1}: unsupported type ${contentType}`,
        code: "invalid_file",
      };
    }
    const estimated = estimateBase64DecodedBytes(dataBase64);
    if (estimated <= 0 || estimated > DMS_MAX_FILE_BYTES) {
      return {
        ok: false,
        error: `File ${i + 1}: invalid file size`,
        code: "too_large",
      };
    }
    totalBytes += estimated;
    if (totalBytes > DMS_MAX_BULK_TOTAL_BYTES) {
      return {
        ok: false,
        error: `Total bulk upload exceeds ${Math.floor(DMS_MAX_BULK_TOTAL_BYTES / (1024 * 1024))}MB`,
        code: "too_large",
      };
    }
    normalized.push({
      title,
      fileName,
      contentType,
      dataBase64,
      category: categoryRaw,
    });
  }
  return { ok: true, files: normalized };
}

function truncateOcrText(text: string, maxChars = 200_000): string {
  const trimmed = text.replace(/\u0000/g, "").trim();
  if (trimmed.length <= maxChars) return trimmed;
  return trimmed.slice(0, maxChars);
}

function shouldUseDirectBlobUpload(fileSizeBytes: number): boolean {
  return Number.isFinite(fileSizeBytes) && fileSizeBytes > VERCEL_SAFE_JSON_UPLOAD_BYTES;
}

// ---- inlined from shared/blobDirectUploadRules.ts ----
type DirectUploadActor = "staff" | "law_firm";

type DirectUploadClientPayload = {
  casePublicUuid: string;
  actor: DirectUploadActor;
};

type FromBlobDocumentInput = {
  title?: unknown;
  fileName?: unknown;
  contentType?: unknown;
  category?: unknown;
  storageKey?: unknown;
  fileSizeBytes?: unknown;
};

function blobUploadPathPrefix(
  actor: DirectUploadActor,
  casePublicUuid: string,
): string {
  const uuid = String(casePublicUuid || "").trim();
  const base = actor === "law_firm" ? "client-cases" : "cases";
  return `${base}/${uuid}`;
}

function isAllowedDirectUploadPathname(
  pathname: string,
  actor: DirectUploadActor,
  casePublicUuid: string,
): boolean {
  const uuid = String(casePublicUuid || "").trim();
  if (!uuid) return false;
  const prefix = `${blobUploadPathPrefix(actor, uuid)}/`;
  const path = String(pathname || "")
    .trim()
    .replace(/^\//, "");
  return (
    path.startsWith(prefix) &&
    path.length > prefix.length &&
    !path.includes("..")
  );
}

function parseDirectUploadClientPayload(
  raw: string | null | undefined,
):
  | { ok: true; value: DirectUploadClientPayload }
  | { ok: false; error: string } {
  if (raw == null || String(raw).trim() === "") {
    return { ok: false, error: "clientPayload is required" };
  }
  try {
    const parsed = JSON.parse(String(raw)) as {
      casePublicUuid?: unknown;
      actor?: unknown;
    };
    const casePublicUuid = String(parsed?.casePublicUuid || "").trim();
    const actor = parsed?.actor;
    if (!casePublicUuid) {
      return { ok: false, error: "casePublicUuid is required" };
    }
    if (actor !== "staff" && actor !== "law_firm") {
      return { ok: false, error: "actor must be staff or law_firm" };
    }
    return { ok: true, value: { casePublicUuid, actor } };
  } catch {
    return { ok: false, error: "clientPayload must be JSON" };
  }
}

function validateFromBlobDocument(
  body: FromBlobDocumentInput,
  opts: {
    actor: DirectUploadActor;
    casePublicUuid: string;
    maxFileBytes: number;
    isAllowedMime: (mime: string) => boolean;
    blobPathnameFromUrl: (storageKey: string) => string | null;
    isPrivateBlobUrl: (storageKey: string) => boolean;
  },
):
  | {
      ok: true;
      value: {
        title: string;
        fileName: string;
        contentType: string;
        storageKey: string;
        fileSizeBytes: number;
        pathname: string;
      };
    }
  | { ok: false; error: string } {
  const fileName = String(body?.fileName || "").trim();
  const storageKey = String(body?.storageKey || "").trim();
  const title =
    String(body?.title || "").trim() ||
    fileName.replace(/\.[^.]+$/, "") ||
    "Document";
  const contentType =
    String(body?.contentType || "application/octet-stream").trim() ||
    "application/octet-stream";
  const fileSizeBytes = Number(body?.fileSizeBytes);
  if (!fileName || !storageKey) {
    return { ok: false, error: "fileName and storageKey are required" };
  }
  if (!opts.isPrivateBlobUrl(storageKey)) {
    return { ok: false, error: "storageKey must be a private blob URL" };
  }
  if (!opts.isAllowedMime(contentType)) {
    return { ok: false, error: `unsupported type ${contentType}` };
  }
  if (
    !Number.isFinite(fileSizeBytes) ||
    fileSizeBytes <= 0 ||
    fileSizeBytes > opts.maxFileBytes
  ) {
    return { ok: false, error: "Invalid file size" };
  }
  const pathname = opts.blobPathnameFromUrl(storageKey);
  if (
    !pathname ||
    !isAllowedDirectUploadPathname(pathname, opts.actor, opts.casePublicUuid)
  ) {
    return { ok: false, error: "Blob pathname does not belong to this case" };
  }
  return {
    ok: true,
    value: {
      title,
      fileName,
      contentType,
      storageKey,
      fileSizeBytes,
      pathname,
    },
  };
}

const DMS_CLIENT_UPLOAD_CONTENT_TYPES = [
  "application/pdf",
  "image/*",
  "text/*",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

// ---- inlined from shared/inspectionStatusRules.ts ----
/**
 * Inspection status transition graph.
 */

const INSPECTION_STATUSES = [
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
] as const;

type InspectionStatusValue = (typeof INSPECTION_STATUSES)[number];

const ALLOWED: Record<InspectionStatusValue, readonly InspectionStatusValue[]> =
  {
    scheduled: ["in_progress", "completed", "cancelled"],
    in_progress: ["completed", "cancelled"],
    completed: [],
    cancelled: [],
  };

function isInspectionStatus(v: unknown): v is InspectionStatusValue {
  return (
    typeof v === "string" &&
    (INSPECTION_STATUSES as readonly string[]).includes(v)
  );
}

type InspectionTransitionResult = { ok: true } | { ok: false; error: string };

function canTransitionInspection(
  from: string,
  to: unknown,
): InspectionTransitionResult {
  if (!isInspectionStatus(from)) {
    return { ok: false, error: "Invalid current inspection status" };
  }
  if (!isInspectionStatus(to)) {
    return {
      ok: false,
      error: "status must be scheduled, in_progress, completed, or cancelled",
    };
  }
  if (from === to) return { ok: true };
  if (!ALLOWED[from].includes(to)) {
    return {
      ok: false,
      error: `Cannot move inspection from ${from} to ${to}`,
    };
  }
  return { ok: true };
}

// ---- inlined from shared/blobAccessRules.ts ----
/**
 * Blob storage helpers — private uploads, signed client URLs, cleanup.
 */

const BLOB_SIGNED_URL_TTL_MS = 15 * 60 * 1000;

/** Extract pathname from a Vercel Blob URL when possible. */
function blobPathnameFromUrl(storageKey: string): string | null {
  const raw = String(storageKey || "").trim();
  if (!raw) return null;
  try {
    if (!/^https?:\/\//i.test(raw)) {
      return raw.replace(/^\//, "");
    }
    const u = new URL(raw);
    const path = u.pathname.replace(/^\//, "");
    return path || null;
  } catch {
    return null;
  }
}

function isPrivateBlobUrl(storageKey: string): boolean {
  return /\.private\.blob\./i.test(storageKey);
}

/** Allow server-side fetch only for Vercel Blob hosts (blocks SSRF via arbitrary URLs). */
function isAllowedBlobFetchUrl(storageKey: string): boolean {
  const raw = String(storageKey || "").trim();
  if (!raw || !/^https?:\/\//i.test(raw)) return false;
  try {
    const host = new URL(raw).hostname.toLowerCase();
    return (
      host.endsWith(".blob.vercel-storage.com") ||
      host === "blob.vercel-storage.com"
    );
  } catch {
    return false;
  }
}

// ---- inlined from shared/locationRules.ts ----
/**
 * GPS / maps helpers (property location, evidence pins, Street View links).
 */

type LatLng = { lat: number; lng: number };

type ParseCoordsResult =
  | { ok: true; lat: number; lng: number }
  | { ok: false; error: string; code: "invalid" | "out_of_range" | "empty" };

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function isValidLatitude(lat: number): boolean {
  return isFiniteNumber(lat) && lat >= -90 && lat <= 90;
}

function isValidLongitude(lng: number): boolean {
  return isFiniteNumber(lng) && lng >= -180 && lng <= 180;
}

function isValidLatLng(lat: number, lng: number): boolean {
  return isValidLatitude(lat) && isValidLongitude(lng);
}

type ParseSingleCoordResult =
  | { ok: true; value: number }
  | { ok: false; error: string; code: "invalid" | "out_of_range" | "empty" };

function hemisphereFromToken(token: string | undefined): string | null {
  if (!token) return null;
  const h = token.trim().toUpperCase();
  if (h === "N" || h === "S" || h === "E" || h === "W") return h;
  if (h === "O") return "W";
  return null;
}

function parseCoordinateValue(
  raw: unknown,
  axis: "lat" | "lng",
): ParseSingleCoordResult {
  if (typeof raw === "number") {
    if (!Number.isFinite(raw)) {
      return {
        ok: false,
        error: "Coordinate must be a valid number",
        code: "invalid",
      };
    }
    if (axis === "lat" && !isValidLatitude(raw)) {
      return {
        ok: false,
        error: "lat must be [-90,90]",
        code: "out_of_range",
      };
    }
    if (axis === "lng" && !isValidLongitude(raw)) {
      return {
        ok: false,
        error: "lng must be [-180,180]",
        code: "out_of_range",
      };
    }
    return { ok: true, value: raw };
  }

  const text = String(raw ?? "")
    .trim()
    .replace(/[′’]/g, "'")
    .replace(/[″“”]/g, '"');
  if (!text) {
    return { ok: false, error: "Coordinate is empty", code: "empty" };
  }

  let hemi: string | null = null;
  let body = text;
  const hemiMatch = body.match(/([NnSsEeWwOo])\s*$/);
  if (hemiMatch) {
    hemi = hemisphereFromToken(hemiMatch[1]);
    body = body.slice(0, hemiMatch.index).trim();
  }

  if (hemi) {
    if (axis === "lat" && (hemi === "E" || hemi === "W")) {
      return {
        ok: false,
        error: "Latitude hemisphere must be N or S",
        code: "invalid",
      };
    }
    if (axis === "lng" && (hemi === "N" || hemi === "S")) {
      return {
        ok: false,
        error: "Longitude hemisphere must be E or W",
        code: "invalid",
      };
    }
  }

  const nums = body.match(/[+-]?\d+(?:\.\d+)?/g);
  if (!nums || nums.length === 0) {
    return {
      ok: false,
      error: "Coordinate must be a valid number",
      code: "invalid",
    };
  }

  const hasDmsMarks = /[°'"″]/.test(body) || nums.length > 1 || hemi != null;
  let decimal: number;
  if (!hasDmsMarks) {
    decimal = Number(nums[0]);
  } else {
    const deg = Number(nums[0]);
    const minutes = nums[1] != null ? Number(nums[1]) : 0;
    const seconds = nums[2] != null ? Number(nums[2]) : 0;
    if (
      !Number.isFinite(deg) ||
      !Number.isFinite(minutes) ||
      !Number.isFinite(seconds) ||
      minutes < 0 ||
      minutes >= 60 ||
      seconds < 0 ||
      seconds >= 60
    ) {
      return {
        ok: false,
        error: "Invalid degrees/minutes/seconds",
        code: "invalid",
      };
    }
    decimal = Math.abs(deg) + minutes / 60 + seconds / 3600;
    if (deg < 0) decimal = -decimal;
  }

  if (!Number.isFinite(decimal)) {
    return {
      ok: false,
      error: "Coordinate must be a valid number",
      code: "invalid",
    };
  }

  if (hemi === "S" || hemi === "W") decimal = -Math.abs(decimal);
  if (hemi === "N" || hemi === "E") decimal = Math.abs(decimal);

  if (axis === "lat" && !isValidLatitude(decimal)) {
    return {
      ok: false,
      error: "lat must be [-90,90]",
      code: "out_of_range",
    };
  }
  if (axis === "lng" && !isValidLongitude(decimal)) {
    return {
      ok: false,
      error: "lng must be [-180,180]",
      code: "out_of_range",
    };
  }
  return { ok: true, value: decimal };
}

/** Parse numeric, decimal-string, or DMS lat/lng independently. */
function parseCoordinatePair(
  latRaw: unknown,
  lngRaw: unknown,
): ParseCoordsResult {
  if (
    (latRaw == null || String(latRaw).trim() === "") &&
    (lngRaw == null || String(lngRaw).trim() === "")
  ) {
    return { ok: false, error: "Coordinates are required", code: "empty" };
  }
  const lat = parseCoordinateValue(latRaw, "lat");
  if (lat.ok === false) {
    return { ok: false, error: lat.error, code: lat.code };
  }
  const lng = parseCoordinateValue(lngRaw, "lng");
  if (lng.ok === false) {
    return { ok: false, error: lng.error, code: lng.code };
  }
  return { ok: true, lat: lat.value, lng: lng.value };
}

/**
 * Parse free-text GPS like "19.4326, -99.1332", DMS pairs, or whitespace decimals.
 */
function parseGpsText(raw: unknown): ParseCoordsResult {
  const text = String(raw ?? "").trim();
  if (!text) {
    return { ok: false, error: "GPS text is empty", code: "empty" };
  }

  if (/[,;]/.test(text)) {
    const parts = text
      .split(/[,;]/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length >= 2) {
      return parseCoordinatePair(parts[0], parts[1]);
    }
  }

  const latHemi = text.match(/([+-]?\d[\d\s°'"″.]*[NnSs])/);
  const lngHemi = text.match(/([+-]?\d[\d\s°'"″.]*[EeWwOo])/);
  if (latHemi && lngHemi) {
    return parseCoordinatePair(latHemi[1].trim(), lngHemi[1].trim());
  }

  const cleaned = text.replace(/°/g, " ").replace(/\s+/g, " ").trim();
  const parts = cleaned.split(/[,;\s]+/).filter(Boolean);
  if (parts.length < 2) {
    return {
      ok: false,
      error: "Expected lat,lng pair",
      code: "invalid",
    };
  }
  return parseCoordinatePair(parts[0], parts[1]);
}

function gpsFromQuestionnaireContent(
  contentJson: Record<string, unknown> | null | undefined,
): { lat: number; lng: number } | null {
  if (!contentJson) return null;
  const parsed = parseGpsText(contentJson.propertyGps);
  if (parsed.ok === false) return null;
  return { lat: parsed.lat, lng: parsed.lng };
}

type QuestionnaireGpsWrite =
  | { action: "set"; lat: number; lng: number }
  | { action: "clear" }
  | { action: "keep" };

function questionnaireGpsWrite(
  contentJson: Record<string, unknown> | null | undefined,
): QuestionnaireGpsWrite {
  if (!contentJson || !("propertyGps" in contentJson))
    return { action: "keep" };
  const raw = contentJson.propertyGps;
  if (raw == null || String(raw).trim() === "") return { action: "clear" };
  const parsed = parseGpsText(raw);
  if (parsed.ok === false) return { action: "keep" };
  return { action: "set", lat: parsed.lat, lng: parsed.lng };
}

function questionnaireStreetViewWrite(
  contentJson: Record<string, unknown> | null | undefined,
): "set" | "clear" | "keep" {
  if (!contentJson) return "keep";
  const hasKey =
    "streetViewValidated" in contentJson || "streetView" in contentJson;
  if (!hasKey) return "keep";
  const raw = contentJson.streetViewValidated ?? contentJson.streetView;
  if (typeof raw === "string" && raw.trim().length > 0) return "set";
  return "clear";
}

/** Optional coords: empty clears; otherwise must validate. */
function resolveOptionalLatLng(
  latRaw: unknown,
  lngRaw: unknown,
): { ok: true; value: LatLng | null } | { ok: false; error: string } {
  const latEmpty = latRaw == null || String(latRaw).trim() === "";
  const lngEmpty = lngRaw == null || String(lngRaw).trim() === "";
  if (latEmpty && lngEmpty) return { ok: true, value: null };
  if (latEmpty !== lngEmpty) {
    return { ok: false, error: "Provide both lat and lng, or neither" };
  }
  const parsed = parseCoordinatePair(latRaw, lngRaw);
  if (parsed.ok === false) return { ok: false, error: parsed.error };
  return { ok: true, value: { lat: parsed.lat, lng: parsed.lng } };
}

/** Prefer explicit court; else despacho default_court_name (keep in sync with shared/caseCourtNameRules). */
function resolveCaseCourtNameInline(opts: {
  provided?: string | null;
  firmDefaultCourtName?: string | null;
}): string | null {
  const provided = (opts.provided ?? "").trim();
  if (provided) return provided;
  const fallback = (opts.firmDefaultCourtName ?? "").trim();
  return fallback || null;
}

async function fetchLawFirmDefaultCourtName(
  lawFirmId: number | null | undefined,
): Promise<string | null> {
  if (lawFirmId == null || !Number.isFinite(lawFirmId) || lawFirmId <= 0) {
    return null;
  }
  const db = getPool();
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT default_court_name FROM law_firms
     WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
    [lawFirmId],
  );
  if (!rows[0]) return null;
  const v = String(rows[0].default_court_name || "").trim();
  return v || null;
}

function googleMapsSearchUrl(opts: {
  lat?: number | null;
  lng?: number | null;
  query?: string | null;
}): string | null {
  if (
    opts.lat != null &&
    opts.lng != null &&
    isValidLatLng(opts.lat, opts.lng)
  ) {
    return `https://www.google.com/maps/search/?api=1&query=${opts.lat},${opts.lng}`;
  }
  if (opts.query?.trim()) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(opts.query.trim())}`;
  }
  return null;
}

function googleMapsDirectionsUrl(opts: {
  lat?: number | null;
  lng?: number | null;
  query?: string | null;
}): string | null {
  if (
    opts.lat != null &&
    opts.lng != null &&
    isValidLatLng(opts.lat, opts.lng)
  ) {
    return `https://www.google.com/maps/dir/?api=1&destination=${opts.lat},${opts.lng}`;
  }
  if (opts.query?.trim()) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(opts.query.trim())}`;
  }
  return null;
}

/** Street View deep link (no API key). */
function googleStreetViewUrl(opts: {
  lat: number;
  lng: number;
}): string | null {
  if (!isValidLatLng(opts.lat, opts.lng)) return null;
  return `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${opts.lat},${opts.lng}`;
}

function osmEmbedUrl(opts: {
  lat?: number | null;
  lng?: number | null;
}): string | null {
  if (
    opts.lat == null ||
    opts.lng == null ||
    !isValidLatLng(opts.lat, opts.lng)
  ) {
    return null;
  }
  const delta = 0.02;
  const left = opts.lng - delta;
  const right = opts.lng + delta;
  const top = opts.lat + delta;
  const bottom = opts.lat - delta;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${opts.lat}%2C${opts.lng}`;
}

const GEOCODE_QUERY_MIN_LEN = 3;
const GEOCODE_QUERY_MAX_LEN = 500;

function normalizeGeocodeQuery(
  raw: unknown,
): { ok: true; query: string } | { ok: false; error: string } {
  const query = String(raw ?? "").trim();
  if (query.length < GEOCODE_QUERY_MIN_LEN) {
    return {
      ok: false,
      error: `query must be at least ${GEOCODE_QUERY_MIN_LEN} characters`,
    };
  }
  if (query.length > GEOCODE_QUERY_MAX_LEN) {
    return {
      ok: false,
      error: `query must be at most ${GEOCODE_QUERY_MAX_LEN} characters`,
    };
  }
  return { ok: true, query };
}

/** Build address query from case property fields. */
function buildPropertyQuery(parts: {
  address?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
}): string | null {
  const q = [
    parts.address,
    parts.city,
    parts.state,
    parts.postalCode,
    parts.country,
  ]
    .map((p) => String(p || "").trim())
    .filter(Boolean)
    .join(", ");
  return q || null;
}

// ---- inlined from shared/automationRules.ts ----
/**
 * Product.md automation decision helpers.
 * API executes the returned actions; this module stays pure.
 */

type AutomationAction =
  | {
      type: "create_invoice";
      invoiceType: "advance" | "final";
      reason: string;
    }
  | {
      type: "notify";
      notificationType:
        | "qa_requested"
        | "invoice_pending"
        | "deadline_approaching"
        | "report_approved"
        | "missing_documents"
        | "inspection_scheduled"
        | "travel_confirmed"
        | "payment_received"
        | "court_filing";
      reason: string;
    }
  | {
      type: "open_review";
      stage:
        | "grammar_qa"
        | "technical_director"
        | "internal_legal"
        | "external_law_firm";
      reason: string;
    };

function automationOnQuestionnaireQaApproved(): AutomationAction[] {
  return [
    {
      type: "create_invoice",
      invoiceType: "advance",
      reason: "Questionnaire passed QA — trigger advance payment (P3)",
    },
    {
      type: "notify",
      notificationType: "invoice_pending",
      reason: "Advance invoice pending after questionnaire QA approval",
    },
  ];
}

function automationOnQuestionnaireApproved(): AutomationAction[] {
  return automationOnQuestionnaireQaApproved();
}

function automationOnInspectionCompleted(): AutomationAction[] {
  return [
    {
      type: "notify",
      notificationType: "qa_requested",
      reason: "Inspection completed — notify QA",
    },
  ];
}

function automationOnDeadlineApproaching(severity: string): AutomationAction[] {
  if (severity !== "critical" && severity !== "overdue") return [];
  return [
    {
      type: "notify",
      notificationType: "deadline_approaching",
      reason: "Deadline within 2 days or overdue — escalate",
    },
  ];
}

function automationOnReportApproved(): AutomationAction[] {
  return [
    {
      type: "notify",
      notificationType: "report_approved",
      reason: "Report approved — notify legal",
    },
  ];
}

function automationOnCaseCompletedOrRatified(
  caseStatus: string,
): AutomationAction[] {
  if (caseStatus !== "completed" && caseStatus !== "accounting") return [];
  return [
    {
      type: "create_invoice",
      invoiceType: "final",
      reason: "Case accounting/completed — enable final invoice",
    },
    {
      type: "notify",
      notificationType: "invoice_pending",
      reason: "Final invoice pending",
    },
  ];
}

function automationOnReportEnterExternalReview(): AutomationAction[] {
  return [
    {
      type: "open_review",
      stage: "external_law_firm",
      reason: "Report entered external law firm review",
    },
  ];
}

// ---- inlined from shared/notificationRules.ts ----
/**
 * Notification dual-channel + invite resend rules (unit-testable).
 */

/** Types that should also send email when creating an in-app notification. */
const DUAL_CHANNEL_NOTIFICATION_TYPES: readonly NotificationType[] = [
  "new_assignment",
  "missing_documents",
  "deadline_approaching",
  "inspection_scheduled",
  "travel_confirmed",
  "qa_requested",
  "report_approved",
  "court_filing",
  "payment_received",
  "invoice_pending",
  "general",
] as const;

function shouldDualChannelEmail(
  type: NotificationType | null | undefined,
): boolean {
  if (!type) return true;
  if (type === "otp_login") return false;
  return (DUAL_CHANNEL_NOTIFICATION_TYPES as readonly string[]).includes(type);
}

/** Invite emails / preferred_language on invite payload. */
function resolveInviteLocale(preferredLanguage?: string | null): AppLocale {
  return normalizeLocale(preferredLanguage);
}

/** Only invited members can receive a resend invite email. */
function canResendInvite(
  status: UserStatus | string | null | undefined,
): boolean {
  return status === "invited";
}

type OpsEmailTone = "info" | "warn" | "success" | "accent";

function toneForNotificationType(
  type: NotificationType | null | undefined,
): OpsEmailTone {
  switch (type) {
    case "missing_documents":
    case "deadline_approaching":
      return "warn";
    case "payment_received":
    case "report_approved":
      return "success";
    case "inspection_scheduled":
    case "travel_confirmed":
    case "qa_requested":
    case "new_assignment":
      return "accent";
    default:
      return "info";
  }
}

// ---- inlined from shared/caseWorkflow.ts ----
/** Primary forward workflow (10 process points → completed) */
const CASE_STATUS_FLOW: CaseStatus[] = [
  "intake",
  "questionnaire",
  "assignment",
  "legal_review_questionnaire",
  "additional_docs",
  "court_acceptance",
  "field_ops",
  "technical_report",
  "validation_delivery",
  "accounting",
  "completed",
];

const LEGACY_CASE_STATUS_MAP: Record<string, CaseStatus> = {
  logistics: "field_ops",
  inspection: "field_ops",
  legal_validation: "validation_delivery",
  court_delivery: "validation_delivery",
};

function normalizeCaseStatus(status: string): CaseStatus | null {
  if (LEGACY_CASE_STATUS_MAP[status]) return LEGACY_CASE_STATUS_MAP[status];
  if ((CASE_STATUS_FLOW as string[]).includes(status)) {
    return status as CaseStatus;
  }
  if (status === "on_hold" || status === "cancelled") {
    return status;
  }
  return null;
}

// ---- inlined from shared/softParallelRules.ts ----
type SoftParallelAction =
  | "draft_logistics_trip"
  | "draft_gps_street_view"
  | "field_prep_notes"
  | "mark_inspection_complete"
  | "upload_field_evidence";

type SoftParallelOpts = {
  holdResumeStatus?: CaseStatus | string | null;
};

function softParallelEffectiveStatus(
  status: CaseStatus | string,
  opts?: SoftParallelOpts,
): CaseStatus | null {
  const normalized = normalizeCaseStatus(String(status));
  if (!normalized || normalized === "completed" || normalized === "cancelled") {
    return null;
  }
  if (normalized === "on_hold") {
    const resume = opts?.holdResumeStatus
      ? normalizeCaseStatus(String(opts.holdResumeStatus))
      : null;
    return resume && resume !== "completed" && resume !== "cancelled"
      ? resume
      : null;
  }
  return normalized;
}

function softParallelAllowed(
  status: CaseStatus | string,
  action: SoftParallelAction,
  opts?: SoftParallelOpts,
): boolean {
  const effective = softParallelEffectiveStatus(status, opts);
  if (!effective) return false;

  const idx = CASE_STATUS_FLOW.indexOf(effective);
  const questionnaireIdx = CASE_STATUS_FLOW.indexOf("questionnaire");
  const assignmentIdx = CASE_STATUS_FLOW.indexOf("assignment");
  const fieldOpsIdx = CASE_STATUS_FLOW.indexOf("field_ops");

  switch (action) {
    case "draft_gps_street_view":
      return idx >= questionnaireIdx && idx <= fieldOpsIdx;
    case "draft_logistics_trip":
      return idx >= assignmentIdx && idx <= fieldOpsIdx;
    case "field_prep_notes":
      return idx >= assignmentIdx && idx < fieldOpsIdx;
    case "mark_inspection_complete":
    case "upload_field_evidence":
      return idx === fieldOpsIdx;
    default:
      return false;
  }
}

function softParallelBlockMessage(action: SoftParallelAction): string {
  switch (action) {
    case "draft_logistics_trip":
      return "Logistics trips can be drafted from assignment through field_ops only";
    case "draft_gps_street_view":
      return "GPS / Street View drafts are allowed from assignment through field_ops only";
    case "field_prep_notes":
      return "Field prep notes are allowed after assignment until field_ops begins";
    case "mark_inspection_complete":
      return "Inspection can only be marked complete while the case is in field_ops (or on hold from field_ops)";
    case "upload_field_evidence":
      return "Field evidence uploads are only allowed during field_ops (or on hold from field_ops)";
    default:
      return "This action is not allowed at the current process stage";
  }
}

async function softParallelOptsForCaseRow(
  caseRow: RowDataPacket,
): Promise<SoftParallelOpts> {
  if (String(caseRow.status) !== "on_hold") return {};
  const holdResumeStatus = await loadHoldResumeStatus(Number(caseRow.id));
  return { holdResumeStatus };
}

function requiresProtestaScanUpload(
  modality: "presencial" | "virtual" | null | undefined,
): boolean {
  return modality === "presencial";
}
// ---- end softParallelRules ----

const CASE_PIPELINE_STATUSES: CaseStatus[] = [
  ...CASE_STATUS_FLOW,
  "on_hold",
  "cancelled",
];

function casePipelineVisibleStatusesInline(
  statusFilter?: string,
): CaseStatus[] {
  const raw = String(statusFilter || "").trim();
  if (raw && (CASE_PIPELINE_STATUSES as readonly string[]).includes(raw)) {
    return [raw as CaseStatus];
  }
  return [...CASE_PIPELINE_STATUSES];
}

function isTerminalStatus(status: CaseStatus): boolean {
  return status === "completed" || status === "cancelled";
}

type WorkflowTransitionOpts = {
  role?: UserRole | null;
  /** Workflow status the case left when it went on_hold. */
  lastWorkflowStatus?: CaseStatus | null;
  /** Last to_status still on the 10-point flow (legacy hold with no from_status). */
  fallbackWorkflowStatus?: CaseStatus | null;
};

function resolveHoldResumeStatus(
  lastHoldFromStatus?: CaseStatus | null,
  lastWorkflowToStatus?: CaseStatus | null,
): CaseStatus {
  for (const candidate of [
    lastHoldFromStatus,
    lastWorkflowToStatus,
    "intake" as const,
  ]) {
    if (!candidate) continue;
    const normalized = normalizeCaseStatus(candidate) ?? candidate;
    if (
      CASE_STATUS_FLOW.includes(normalized) &&
      normalized !== "completed"
    ) {
      return normalized;
    }
  }
  return "intake";
}

// ---- inlined from shared/holdResumeRules.ts ----
function latestHoldFromStatusByCaseInline(
  rows: Array<{ caseId: number; fromStatus: string }>,
): Map<number, CaseStatus> {
  const map = new Map<number, CaseStatus>();
  for (const row of rows) {
    if (!map.has(row.caseId)) {
      map.set(row.caseId, row.fromStatus as CaseStatus);
    }
  }
  return map;
}

function latestFlowToStatusByCaseInline(
  rows: Array<{ caseId: number; toStatus: string }>,
): Map<number, CaseStatus> {
  const map = new Map<number, CaseStatus>();
  for (const row of rows) {
    if (!map.has(row.caseId)) {
      map.set(row.caseId, row.toStatus as CaseStatus);
    }
  }
  return map;
}

function buildHoldResumeStatusByCaseInline(
  onHoldCaseIds: readonly number[],
  holdFromByCase: ReadonlyMap<number, CaseStatus>,
  flowToByCase: ReadonlyMap<number, CaseStatus>,
): Map<number, CaseStatus> {
  const result = new Map<number, CaseStatus>();
  for (const cid of onHoldCaseIds) {
    result.set(
      cid,
      resolveHoldResumeStatus(
        holdFromByCase.get(cid) ?? null,
        flowToByCase.get(cid) ?? null,
      ),
    );
  }
  return result;
}

/** Allowed next statuses from current. */
function getAllowedNextStatuses(
  current: CaseStatus,
  opts: WorkflowTransitionOpts = {},
): CaseStatus[] {
  if (isTerminalStatus(current)) return [];

  if (current === "on_hold") {
    if (canManageAdmin(opts.role ?? null)) {
      return [
        ...CASE_STATUS_FLOW.filter((s) => s !== "completed"),
        "cancelled",
      ];
    }
    const resume = resolveHoldResumeStatus(
      opts.lastWorkflowStatus,
      opts.fallbackWorkflowStatus,
    );
    return [resume, "cancelled"];
  }

  if (current === "legal_review_questionnaire") {
    return ["court_acceptance", "questionnaire", "on_hold", "cancelled"];
  }

  if (current === "validation_delivery") {
    return ["accounting", "technical_report", "on_hold", "cancelled"];
  }

  const idx = CASE_STATUS_FLOW.indexOf(current);
  const next: CaseStatus[] = [];
  if (idx >= 0 && idx < CASE_STATUS_FLOW.length - 1) {
    next.push(CASE_STATUS_FLOW[idx + 1]);
  }
  next.push("on_hold", "cancelled");
  return next;
}

function canTransition(
  from: CaseStatus,
  to: CaseStatus,
  opts: WorkflowTransitionOpts = {},
): { ok: true } | { ok: false; reason: string } {
  if (from === to) {
    return { ok: false, reason: "Status is already set to that value." };
  }
  const allowed = getAllowedNextStatuses(from, opts);
  if (!allowed.includes(to)) {
    return {
      ok: false,
      reason: `Cannot move from ${from} to ${to}. Allowed: ${allowed.join(", ") || "none"}.`,
    };
  }
  return { ok: true };
}

function caseStatusAfterArtifactReject(opts: {
  caseStatus: CaseStatus;
  artifact: "questionnaire" | "technical_report";
  outcome: string;
}): CaseStatus | null {
  const atP4 =
    opts.artifact === "questionnaire" &&
    opts.caseStatus === "legal_review_questionnaire";
  const atP9 =
    opts.artifact === "technical_report" &&
    opts.caseStatus === "validation_delivery";
  if (!atP4 && !atP9) return null;
  if (opts.outcome === "changes_requested") {
    return atP4 ? "questionnaire" : "technical_report";
  }
  if (opts.outcome === "rejected") return "on_hold";
  return null;
}

function shouldReopenArtifactAfterCaseReturn(
  toStatus: CaseStatus,
): "questionnaire" | "technical_report" | null {
  if (toStatus === "questionnaire") return "questionnaire";
  if (toStatus === "technical_report") return "technical_report";
  return null;
}

// ---- inlined from shared/rejectLoopRules.ts ----
function deadlineTypesForCaseStatus(status: CaseStatus): readonly string[] {
  if (status === "questionnaire") return ["questionnaire"];
  if (status === "legal_review_questionnaire") return ["legal_review"];
  if (status === "validation_delivery") return ["external_legal_validation"];
  return [];
}

function deadlineTypesToCompleteOnTransition(
  from: CaseStatus,
  to: CaseStatus,
): string[] {
  if (from === to) return [];
  const owned = deadlineTypesForCaseStatus(from);
  if (owned.length === 0) return [];
  if (to === "on_hold" || to === "cancelled") return [...owned];
  if (deadlineTypesForCaseStatus(to).join() !== owned.join()) {
    return [...owned];
  }
  return [];
}

const QUESTIONNAIRE_REOPEN_FROM_STATUSES = [
  "grammar_qa",
  "legal_review",
  "approved",
  "rejected",
] as const;

const REPORT_REOPEN_FROM_STATUSES = [
  "approved_internal",
  "external_review",
  "approved",
  "rejected",
] as const;

function artifactToForceChangesRequested(opts: {
  artifact: "questionnaire" | "technical_report";
  outcome: string;
  toStatus: CaseStatus;
}): "questionnaire" | "technical_report" | null {
  if (opts.outcome !== "changes_requested" && opts.outcome !== "rejected") {
    return null;
  }
  const byReturn = shouldReopenArtifactAfterCaseReturn(opts.toStatus);
  if (byReturn) return byReturn;
  if (opts.outcome === "rejected" && opts.toStatus === "on_hold") {
    return opts.artifact;
  }
  return null;
}

function shouldNotifyLawFirmAfterArtifactReject(opts: {
  auditActorType?: "staff" | "law_firm" | "system" | null;
}): boolean {
  return opts.auditActorType !== "law_firm";
}

function authoringDeadlineSpec(toStatus: CaseStatus): {
  deadlineType: string;
  title: string;
  businessDays: number;
} | null {
  if (toStatus === "questionnaire") {
    return {
      deadlineType: "questionnaire",
      title: "Questionnaire, GPS and Street View (3 business days)",
      businessDays: 3,
    };
  }
  if (toStatus === "technical_report") {
    return {
      deadlineType: "technical_report",
      title: "Technical report (inside 10-day clock)",
      businessDays: 5,
    };
  }
  return null;
}

// ---- inlined from shared/evidenceRules.ts ----
/**
 * Field evidence capture rules (Product.md Phase 8).
 * Keep API handlers thin — validation and checklist coverage live here.
 */

const EVIDENCE_TYPES = [
  "photo",
  "video",
  "voice_note",
  "measurement",
  "signature",
  "gps_point",
  "observation",
  "court_filing",
  "other",
] as const;

type EvidenceType = (typeof EVIDENCE_TYPES)[number];

const EVIDENCE_CATEGORIES = [
  "horizontal_distance",
  "vertical_distance",
  "pole_distance",
  "pole_id",
  "electrical_structure",
  "conductor",
  "facade",
  "sidewalk",
  "construction",
  "property_invasion",
  "oversized_construction",
  "safety",
  "general",
] as const;

type EvidenceCategory = (typeof EVIDENCE_CATEGORIES)[number];

/** Product.md Phase 8 mandatory checklist categories (excludes general). */
const EVIDENCE_CHECKLIST_CATEGORIES: readonly EvidenceCategory[] = [
  "horizontal_distance",
  "vertical_distance",
  "pole_distance",
  "pole_id",
  "electrical_structure",
  "conductor",
  "facade",
  "sidewalk",
  "construction",
  "property_invasion",
  "oversized_construction",
  "safety",
] as const;

/** Types that must include an uploaded file. */
const EVIDENCE_TYPES_REQUIRING_FILE: readonly EvidenceType[] = [
  "photo",
  "video",
  "voice_note",
  "signature",
  "court_filing",
] as const;

const EVIDENCE_MAX_FILE_BYTES = 15 * 1024 * 1024;

type CreateEvidenceInput = {
  evidenceType?: unknown;
  category?: unknown;
  title?: unknown;
  caption?: unknown;
  inspectionId?: unknown;
  lat?: unknown;
  lng?: unknown;
  capturedAt?: unknown;
  fileName?: unknown;
  contentType?: unknown;
  data?: unknown;
  fileSizeBytes?: unknown;
};

type NormalizedEvidenceCreate = {
  evidenceType: EvidenceType;
  category: EvidenceCategory;
  title: string | null;
  caption: string | null;
  inspectionId: number | null;
  lat: number | null;
  lng: number | null;
  capturedAt: Date | null;
  fileName: string | null;
  contentType: string | null;
  dataBase64: string | null;
  requiresFile: boolean;
};

type EvidenceValidationOk = {
  ok: true;
  value: NormalizedEvidenceCreate;
};

type EvidenceValidationErr = {
  ok: false;
  error: string;
  code:
    | "invalid_type"
    | "invalid_category"
    | "file_required"
    | "gps_required"
    | "invalid_coordinates"
    | "invalid_captured_at"
    | "empty_content"
    | "invalid_file_size"
    | "invalid_inspection_id";
};

type EvidenceValidationResult = EvidenceValidationOk | EvidenceValidationErr;

function isEvidenceType(value: unknown): value is EvidenceType {
  return (
    typeof value === "string" &&
    (EVIDENCE_TYPES as readonly string[]).includes(value)
  );
}

function isEvidenceCategory(value: unknown): value is EvidenceCategory {
  return (
    typeof value === "string" &&
    (EVIDENCE_CATEGORIES as readonly string[]).includes(value)
  );
}

function evidenceRequiresFile(type: EvidenceType): boolean {
  return (EVIDENCE_TYPES_REQUIRING_FILE as readonly string[]).includes(type);
}

function parseOptionalNumber(value: unknown): number | null | undefined {
  if (value === undefined || value === null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return undefined;
  return n;
}

function trimOrNull(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return s.length > 0 ? s : null;
}

/**
 * Validate and normalize a create-evidence payload.
 * File bytes can be pre-checked via `fileSizeBytes` when buffer length is known.
 */
function validateCreateEvidence(
  input: CreateEvidenceInput,
): EvidenceValidationResult {
  if (!isEvidenceType(input.evidenceType)) {
    return {
      ok: false,
      error: "Valid evidenceType is required",
      code: "invalid_type",
    };
  }

  const categoryRaw = input.category ?? "general";
  if (!isEvidenceCategory(categoryRaw)) {
    return {
      ok: false,
      error: "Invalid evidence category",
      code: "invalid_category",
    };
  }

  let inspectionId: number | null = null;
  if (
    input.inspectionId !== undefined &&
    input.inspectionId !== null &&
    input.inspectionId !== ""
  ) {
    const id = Number(input.inspectionId);
    if (!Number.isInteger(id) || id <= 0) {
      return {
        ok: false,
        error: "Invalid inspectionId",
        code: "invalid_inspection_id",
      };
    }
    inspectionId = id;
  }

  const lat = parseOptionalNumber(input.lat);
  const lng = parseOptionalNumber(input.lng);
  if (lat === undefined || lng === undefined) {
    return {
      ok: false,
      error: "lat and lng must be valid numbers when provided",
      code: "invalid_coordinates",
    };
  }
  if (lat != null && (lat < -90 || lat > 90)) {
    return {
      ok: false,
      error: "lat must be between -90 and 90",
      code: "invalid_coordinates",
    };
  }
  if (lng != null && (lng < -180 || lng > 180)) {
    return {
      ok: false,
      error: "lng must be between -180 and 180",
      code: "invalid_coordinates",
    };
  }
  if ((lat == null) !== (lng == null)) {
    return {
      ok: false,
      error: "lat and lng must both be set or both omitted",
      code: "invalid_coordinates",
    };
  }

  if (input.evidenceType === "gps_point" && (lat == null || lng == null)) {
    return {
      ok: false,
      error: "gps_point evidence requires lat and lng",
      code: "gps_required",
    };
  }

  let capturedAt: Date | null = null;
  if (input.capturedAt != null && String(input.capturedAt).trim() !== "") {
    const d = new Date(String(input.capturedAt));
    if (Number.isNaN(d.getTime())) {
      return {
        ok: false,
        error: "Invalid capturedAt",
        code: "invalid_captured_at",
      };
    }
    capturedAt = d;
  }

  const title = trimOrNull(input.title);
  const caption = trimOrNull(input.caption);
  const fileName = trimOrNull(input.fileName);
  const contentType = trimOrNull(input.contentType);
  const dataBase64 = trimOrNull(input.data);
  const requiresFile = evidenceRequiresFile(input.evidenceType);

  if (requiresFile && (!fileName || !dataBase64)) {
    return {
      ok: false,
      error: "fileName and data are required for this evidence type",
      code: "file_required",
    };
  }

  if (input.fileSizeBytes != null) {
    const size = Number(input.fileSizeBytes);
    if (!Number.isFinite(size) || size <= 0 || size > EVIDENCE_MAX_FILE_BYTES) {
      return {
        ok: false,
        error: "Invalid file size",
        code: "invalid_file_size",
      };
    }
  }

  const hasFile = Boolean(fileName && dataBase64);
  const hasText = Boolean(title || caption);
  const hasGps = lat != null && lng != null;
  if (!hasFile && !hasText && !hasGps) {
    return {
      ok: false,
      error: "Evidence needs a file, title/caption, or GPS coordinates",
      code: "empty_content",
    };
  }

  return {
    ok: true,
    value: {
      evidenceType: input.evidenceType,
      category: categoryRaw,
      title,
      caption,
      inspectionId,
      lat,
      lng,
      capturedAt,
      fileName,
      contentType,
      dataBase64,
      requiresFile,
    },
  };
}

type EvidenceChecklistItem = {
  category: EvidenceCategory;
};

type EvidenceChecklistStatus = {
  covered: EvidenceCategory[];
  missing: EvidenceCategory[];
  coveredCount: number;
  totalCount: number;
  complete: boolean;
};

/** Which Phase 8 checklist categories are covered by at least one evidence item. */
function getEvidenceChecklistStatus(
  items: readonly EvidenceChecklistItem[],
): EvidenceChecklistStatus {
  const present = new Set(
    items
      .map((i) => i.category)
      .filter((c) =>
        (EVIDENCE_CHECKLIST_CATEGORIES as readonly string[]).includes(c),
      ),
  );
  const covered = EVIDENCE_CHECKLIST_CATEGORIES.filter((c) => present.has(c));
  const missing = EVIDENCE_CHECKLIST_CATEGORIES.filter((c) => !present.has(c));
  return {
    covered: [...covered],
    missing: [...missing],
    coveredCount: covered.length,
    totalCount: EVIDENCE_CHECKLIST_CATEGORIES.length,
    complete: missing.length === 0,
  };
}

// ---- inlined from shared/portalCapabilities.ts ----
/**
 * Portal case-detail section visibility + server-aligned action RBAC by staff role.
 */

const CASE_SECTIONS = [
  "workflow",
  "timeline",
  "notes",
  "documents",
  "assignments",
  "deadlines",
  "questionnaire",
  "reviews",
  "inspections",
  "evidence",
  "logistics",
  "reports",
  "finance",
  "audit",
  "completeness",
] as const;

type CaseSection = (typeof CASE_SECTIONS)[number];

/** Sections that imply mutate permission when visible (API must match). */
type CaseMutateSection = Extract<
  CaseSection,
  | "documents"
  | "questionnaire"
  | "reviews"
  | "inspections"
  | "evidence"
  | "logistics"
  | "reports"
>;

const ALL = new Set<CaseSection>(CASE_SECTIONS);

const BY_ROLE: Record<UserRole, ReadonlySet<CaseSection>> = {
  admin: ALL,
  expert: new Set([
    "workflow",
    "timeline",
    "notes",
    "documents",
    "deadlines",
    "questionnaire",
    "inspections",
    "evidence",
    "logistics",
    "reports",
    "reviews",
    "completeness",
  ]),
  legal: new Set([
    "workflow",
    "timeline",
    "notes",
    "documents",
    "deadlines",
    "questionnaire",
    "reviews",
    "reports",
    "audit",
    "completeness",
  ]),
  logistics: new Set([
    "workflow",
    "timeline",
    "notes",
    "deadlines",
    "inspections",
    "logistics",
    "evidence",
  ]),
  accountant: new Set([
    "workflow",
    "timeline",
    "notes",
    "documents",
    "deadlines",
    "finance",
    "audit",
    "completeness",
  ]),
};

const REVIEW_STAGE_ROLES: Record<ReviewStage, readonly UserRole[]> = {
  grammar_qa: ["admin", "expert"],
  technical_director: ["admin", "expert"],
  internal_legal: ["admin", "legal"],
  /** External law-firm stage is completed via client portal; staff admin can override. */
  external_law_firm: ["admin"],
};

function canViewCaseSection(
  role: string | null | undefined,
  section: CaseSection,
): boolean {
  if (!role) return false;
  const set = BY_ROLE[role as UserRole];
  if (!set) return role === "admin";
  return set.has(section);
}

function visibleCaseSections(role: string | null | undefined): CaseSection[] {
  return CASE_SECTIONS.filter((s) => canViewCaseSection(role, s));
}

function canMutateCaseSection(
  role: string | null | undefined,
  section: CaseMutateSection,
): boolean {
  if (!canViewCaseSection(role, section)) return false;
  if (role === "expert" && section === "logistics") return false;
  return true;
}

function canCompleteReviewStage(
  role: string | null | undefined,
  stage: string,
): boolean {
  if (!role) return false;
  const allowed = REVIEW_STAGE_ROLES[stage as ReviewStage];
  if (!allowed) return false;
  return allowed.includes(role as UserRole);
}

const ALL_REVIEW_STAGES_INLINE: ReviewStage[] = [
  "grammar_qa",
  "technical_director",
  "internal_legal",
  "external_law_firm",
];

function actionableReviewStagesForRoleInline(
  role: string | null | undefined,
): ReviewStage[] {
  if (!canViewCaseSection(role, "reviews")) return [];
  return ALL_REVIEW_STAGES_INLINE.filter((stage) =>
    canCompleteReviewStage(role, stage),
  );
}

// ---- inlined from shared/reviewQueueRules.ts ----
function buildReviewStageFilterSql(
  role: string | null | undefined,
  rrAlias = "rr",
): { sql: string; params: ReviewStage[] } {
  const stages = actionableReviewStagesForRoleInline(role);
  if (stages.length === 0) return { sql: " AND 1=0", params: [] };
  return {
    sql: ` AND ${rrAlias}.review_stage IN (${stages.map(() => "?").join(", ")})`,
    params: stages,
  };
}

function reviewCompleteNotificationTypeInline(
  stage: string,
): "qa_requested" | "general" {
  if (stage === "grammar_qa" || stage === "technical_director") {
    return "qa_requested";
  }
  return "general";
}

/**
 * Staff must not approve reports out of external_review — that is law-firm review.
 * Admin may override for operational recovery.
 */
function canStaffApproveExternalReview(
  role: string | null | undefined,
): boolean {
  return role === "admin";
}

/** Questionnaire approve / reject / changes_requested — legal gate. */
function canDecideQuestionnaireReview(
  role: string | null | undefined,
): boolean {
  return role === "admin" || role === "legal";
}

/** Edit property GPS / address on a case. */
function canEditCaseLocation(role: string | null | undefined): boolean {
  return (
    role === "admin" || role === "expert" || role === "logistics"
  );
}

/** Case workflow status transitions — coordinators and admins. */
function canChangeCaseStatus(role: string | null | undefined): boolean {
  return role === "admin";
}

function canApplyCaseStatusChange(
  role: string | null | undefined,
  from: string,
  to: string,
): boolean {
  if (canChangeCaseStatus(role)) return true;
  return role === "accountant" && from === "accounting" && to === "completed";
}

/** Assignments — coordinators and admins. */
function canManageCaseAssignments(role: string | null | undefined): boolean {
  return role === "admin";
}

/** Calendar create/update — ops roles. */
function canManageCalendar(role: string | null | undefined): boolean {
  return (
    role === "admin" || role === "logistics" || role === "expert"
  );
}

/** Generic blob upload endpoint — documents or evidence roles. */
function canUploadBlobs(role: string | null | undefined): boolean {
  return (
    canMutateCaseSection(role, "documents") ||
    canMutateCaseSection(role, "evidence")
  );
}

type CaseDetailSectionsPayload = {
  notes: unknown[];
  documents: Array<{ ocrText?: string | null; storageKey?: string | null }>;
  assignments: unknown[];
  deadlines: unknown[];
  questionnaires: unknown[];
  inspections: unknown[];
  measurements: unknown[];
  evidence: unknown[];
  evidenceChecklist: unknown;
  reviewRequests: unknown[];
  documentCompleteness: unknown;
  auditLogs: unknown[];
  trips: unknown[];
  expenses: unknown[];
  technicalReports: unknown[];
  invoices?: unknown[];
};

/**
 * Strip case-detail sections the role cannot view (server-side RBAC).
 * Mutates a shallow copy-friendly object and returns it.
 */
function filterCaseDetailSectionsForRole<T extends CaseDetailSectionsPayload>(
  role: string | null | undefined,
  payload: T,
): T {
  const next = { ...payload };
  if (!canViewCaseSection(role, "notes")) next.notes = [];
  if (!canViewCaseSection(role, "documents")) {
    next.documents = [];
  } else {
    // Hide full OCR text from roles that can see docs but shouldn't scrape content?
    // Keep OCR for document viewers; strip storageKey is handled by signed URLs.
    next.documents = payload.documents.map((d) => ({ ...d }));
  }
  if (!canViewCaseSection(role, "assignments")) next.assignments = [];
  if (!canViewCaseSection(role, "deadlines")) next.deadlines = [];
  if (!canViewCaseSection(role, "questionnaire")) next.questionnaires = [];
  if (!canViewCaseSection(role, "inspections")) {
    next.inspections = [];
    next.measurements = [];
  }
  if (!canViewCaseSection(role, "evidence")) {
    next.evidence = [];
    next.evidenceChecklist = null;
  }
  if (!canViewCaseSection(role, "reviews")) next.reviewRequests = [];
  if (!canViewCaseSection(role, "completeness"))
    next.documentCompleteness = null;
  if (!canViewCaseSection(role, "audit")) next.auditLogs = [];
  if (!canViewCaseSection(role, "logistics")) {
    next.trips = [];
    next.expenses = [];
  }
  if (!canViewCaseSection(role, "reports")) next.technicalReports = [];
  if (!canViewCaseSection(role, "finance")) next.invoices = [];
  return next;
}

// ---- inlined from shared/processGates.ts ----
/**
 * Canonical 10-point electrical expert-witness process (decision Y).
 * Operational narrative: docs/Proceso_Peritaje_Electrico_10_Puntos.md
 * Case statuses stay aligned with CASE_STATUS_FLOW.
 */

const PROCESS_POINT_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

type ProcessPointId = (typeof PROCESS_POINT_IDS)[number];

type ProcessActor =
  | "law_firm"
  | "coordinator"
  | "expert"
  | "questionnaire_author"
  | "qa"
  | "legal_internal"
  | "technical_director"
  | "logistics"
  | "accountant"
  | "admin";

type RaciLetter = "R" | "A" | "C" | "I";

type ProcessSla = {
  businessDays: number;
  deadlineType:
    | "questionnaire"
    | "legal_review"
    | "inspection"
    | "external_legal_validation";
  /** Starts when this event happens, not merely when the status is entered. */
  startsOn: "status_enter" | "protesta_filed" | "report_sent_to_firm";
  /** Nested inside another point's clock (P9 validation SLA inside the 10-day P6 clock). */
  nestedInside: ProcessPointId | null;
};

type ProcessPointDef = {
  id: ProcessPointId;
  caseStatus: CaseStatus;
  slug: string;
  sla: ProcessSla | null;
  /** Must finish before this parent clock expires (no own SLA). */
  boundedByPoint: ProcessPointId | null;
  raci: Partial<Record<ProcessActor, RaciLetter>>;
  requiredDocumentCategories: readonly string[];
  conditionalDocumentCategories: readonly string[];
  requiredEvidenceCategories: readonly string[];
  rejectReturnsTo: ProcessPointId | null;
  listadoFlags: readonly string[];
};

/** Example people → system actors (never hard-code in product logic). */
const PROCESS_ACTOR_EXAMPLES: Record<ProcessActor, string> = {
  law_firm: "Despacho jurídico externo",
  coordinator: "Coordinación operativa (p. ej. Ulises Enrique León López)",
  expert: "Perito asignado (responsable absoluto del expediente)",
  questionnaire_author:
    "Redacción de cuestionario (p. ej. Josué Noé Mendoza Luengas)",
  qa: "Control de calidad gramatical / datos / fechas",
  legal_internal: "Área legal interna",
  technical_director: "Jefe de la Consultoría",
  logistics: "Logística de diligencias",
  accountant: "Contador (p. ej. Erick Flores Martínez)",
  admin: "Administración de la plataforma",
};

const LISTADO_COLUMNS = [
  "caseNumber",
  "title",
  "court",
  "city",
  "lawFirm",
  "primaryExpert",
  "processPoint",
  "status",
  "intakeComplete",
  "questionnaireApproved",
  "streetViewDone",
  "advanceReleased",
  "advancePaid",
  "plaintiffQuestionnaire",
  "protestaFiled",
  "clock10DueAt",
  "logisticsReady",
  "inspectionComplete",
  "reportInternalOk",
  "reportFirmOk",
  "ratified",
  "attendedWithReport",
  "finalReleased",
  "finalPaid",
] as const;

type ListadoColumn = (typeof LISTADO_COLUMNS)[number];

const PROCESS_POINTS: Record<ProcessPointId, ProcessPointDef> = {
  1: {
    id: 1,
    caseStatus: "intake",
    slug: "intake",
    sla: null,
    boundedByPoint: null,
    raci: { law_firm: "R", coordinator: "A", admin: "I" },
    requiredDocumentCategories: [...INTAKE_REQUIRED_CATEGORIES],
    conditionalDocumentCategories: [],
    requiredEvidenceCategories: [],
    rejectReturnsTo: null,
    listadoFlags: ["intakeComplete"],
  },
  2: {
    id: 2,
    caseStatus: "questionnaire",
    slug: "questionnaire",
    sla: {
      businessDays: 3,
      deadlineType: "questionnaire",
      startsOn: "status_enter",
      nestedInside: null,
    },
    boundedByPoint: null,
    raci: {
      questionnaire_author: "R",
      coordinator: "A",
      qa: "C",
      expert: "I",
    },
    requiredDocumentCategories: ["questionnaire"],
    conditionalDocumentCategories: [],
    requiredEvidenceCategories: [],
    rejectReturnsTo: 2,
    listadoFlags: [
      "questionnaireApproved",
      "streetViewDone",
      "advanceReleased",
    ],
  },
  3: {
    id: 3,
    caseStatus: "assignment",
    slug: "assignment",
    sla: null,
    boundedByPoint: null,
    raci: { coordinator: "A", expert: "I", logistics: "I", accountant: "I" },
    requiredDocumentCategories: [],
    conditionalDocumentCategories: [],
    requiredEvidenceCategories: [],
    rejectReturnsTo: null,
    listadoFlags: ["primaryExpert"],
  },
  4: {
    id: 4,
    caseStatus: "legal_review_questionnaire",
    slug: "legal_review_questionnaire",
    sla: {
      businessDays: 2,
      deadlineType: "legal_review",
      startsOn: "status_enter",
      nestedInside: null,
    },
    boundedByPoint: null,
    raci: { law_firm: "A", legal_internal: "C", expert: "C", qa: "I" },
    requiredDocumentCategories: ["questionnaire"],
    conditionalDocumentCategories: [],
    requiredEvidenceCategories: [],
    rejectReturnsTo: 2,
    listadoFlags: ["questionnaireApproved"],
  },
  5: {
    id: 5,
    caseStatus: "additional_docs",
    slug: "additional_docs",
    sla: null,
    boundedByPoint: null,
    raci: { law_firm: "R", coordinator: "A", expert: "I" },
    requiredDocumentCategories: ADDITIONAL_DOCS_CATEGORIES.filter(
      (c) => c !== "death_certificate" && c !== "plaintiff_questionnaire",
    ),
    conditionalDocumentCategories: ["death_certificate"],
    requiredEvidenceCategories: [],
    rejectReturnsTo: null,
    listadoFlags: ["plaintiffQuestionnaire"],
  },
  6: {
    id: 6,
    caseStatus: "court_acceptance",
    slug: "court_acceptance",
    sla: {
      businessDays: 10,
      deadlineType: "inspection",
      startsOn: "protesta_filed",
      nestedInside: null,
    },
    boundedByPoint: null,
    raci: { expert: "A", coordinator: "C", legal_internal: "I" },
    requiredDocumentCategories: ["protesta", "plaintiff_questionnaire"],
    conditionalDocumentCategories: ["death_certificate"],
    requiredEvidenceCategories: [],
    rejectReturnsTo: null,
    listadoFlags: ["protestaFiled", "clock10DueAt", "plaintiffQuestionnaire"],
  },
  7: {
    id: 7,
    caseStatus: "field_ops",
    slug: "field_ops",
    sla: null,
    boundedByPoint: 6,
    raci: {
      expert: "A",
      logistics: "C",
      coordinator: "I",
      accountant: "I",
    },
    requiredDocumentCategories: [],
    conditionalDocumentCategories: [],
    requiredEvidenceCategories: [...EVIDENCE_CHECKLIST_CATEGORIES],
    rejectReturnsTo: 7,
    listadoFlags: ["logisticsReady", "inspectionComplete"],
  },
  8: {
    id: 8,
    caseStatus: "technical_report",
    slug: "technical_report",
    sla: null,
    boundedByPoint: 6,
    raci: {
      expert: "R",
      qa: "C",
      technical_director: "A",
      coordinator: "I",
    },
    requiredDocumentCategories: ["technical_report"],
    conditionalDocumentCategories: [],
    requiredEvidenceCategories: [],
    rejectReturnsTo: 8,
    listadoFlags: ["reportInternalOk"],
  },
  9: {
    id: 9,
    caseStatus: "validation_delivery",
    slug: "validation_delivery",
    sla: {
      businessDays: 3,
      deadlineType: "external_legal_validation",
      startsOn: "report_sent_to_firm",
      nestedInside: 6,
    },
    boundedByPoint: 6,
    raci: {
      expert: "A",
      law_firm: "C",
      technical_director: "I",
      coordinator: "C",
    },
    requiredDocumentCategories: [
      "technical_report",
      "court_filing",
      "ratification",
    ],
    conditionalDocumentCategories: [],
    requiredEvidenceCategories: [],
    rejectReturnsTo: 8,
    listadoFlags: [
      "reportFirmOk",
      "ratified",
      "attendedWithReport",
      "finalReleased",
    ],
  },
  10: {
    id: 10,
    caseStatus: "accounting",
    slug: "accounting",
    sla: null,
    boundedByPoint: null,
    raci: { accountant: "A", coordinator: "I", admin: "I" },
    requiredDocumentCategories: [],
    conditionalDocumentCategories: [],
    requiredEvidenceCategories: [],
    rejectReturnsTo: null,
    listadoFlags: ["advancePaid", "finalPaid"],
  },
};

const STATUS_TO_POINT = new Map<CaseStatus, ProcessPointId>(
  PROCESS_POINT_IDS.map((id) => [PROCESS_POINTS[id].caseStatus, id]),
);

function processPointForStatus(status: CaseStatus): ProcessPointId | null {
  return STATUS_TO_POINT.get(status) ?? null;
}

/**
 * Forward advance along the 10-point flow evaluates gates on the *current* point.
 * Hold, cancel, and resume from hold are not gated.
 */
function processPointToEnforceOnTransition(
  from: CaseStatus,
  to: CaseStatus,
): ProcessPointId | null {
  if (to === "on_hold" || to === "cancelled") return null;
  if (from === "on_hold" || from === "cancelled" || from === "completed") {
    return null;
  }
  const fromPoint = processPointForStatus(from);
  if (!fromPoint) return null;
  const idx = CASE_STATUS_FLOW.indexOf(from);
  if (idx < 0 || idx >= CASE_STATUS_FLOW.length - 1) return null;
  return to === CASE_STATUS_FLOW[idx + 1] ? fromPoint : null;
}

function questionnaireHasStreetView(contentJson: unknown): boolean {
  if (!contentJson || typeof contentJson !== "object") return false;
  const rec = contentJson as Record<string, unknown>;
  const raw = rec.streetViewValidated ?? rec.streetView;
  const url = typeof raw === "string" ? raw.trim() : "";
  if (!url) return false;
  const pre = rec.streetViewPreexistence;
  return (
    typeof pre === "string" &&
    ["preexists", "not_preexists", "inconclusive"].includes(pre)
  );
}

function questionnaireDefendantBodyCompleteInline(
  contentJson: unknown,
): boolean {
  if (!contentJson || typeof contentJson !== "object") return false;
  const body = (contentJson as Record<string, unknown>).defendantQuestionnaire;
  return Boolean(typeof body === "string" && body.trim().length >= 20);
}

function validateQuestionnaireSubmitContentInline(
  contentJson: unknown,
  opts?: { hasQuestionnairePdf?: boolean },
): { ok: true } | { ok: false; error: string } {
  if (opts?.hasQuestionnairePdf === false) {
    return {
      ok: false,
      error: "Defendant questionnaire PDF required",
    };
  }
  if (!questionnaireHasStreetView(contentJson)) {
    return {
      ok: false,
      error: "Street View URL and preexistence conclusion required",
    };
  }
  return { ok: true };
}

function ratificationGateSatisfiedInline(input: {
  ratificationPresent: boolean;
  courtFilingPresent: boolean;
  ratificationScheduledAt: string | null | undefined;
}): boolean {
  return input.ratificationPresent === true;
}

function ratificationGateMissingCodeInline(input: {
  ratificationPresent: boolean;
  courtFilingPresent: boolean;
  ratificationScheduledAt: string | null | undefined;
}): string | null {
  if (ratificationGateSatisfiedInline(input)) return null;
  return "doc:ratification";
}

function anyQuestionnaireHasStreetView(contents: readonly unknown[]): boolean {
  return contents.some((c) => questionnaireHasStreetView(c));
}

type RankedArtifact = {
  status: string;
  createdAt?: string | number | Date | null;
};

function createdAtMs(value: RankedArtifact["createdAt"]): number {
  if (value == null) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : 0;
}

/** Higher rank wins when several questionnaire rows exist. */
const QUESTIONNAIRE_STATUS_RANK: Record<string, number> = {
  approved: 6,
  legal_review: 5,
  grammar_qa: 4,
  changes_requested: 2,
  draft: 1,
  rejected: 0,
};

/** Leaving P3 requires QA passed (legal_review or approved). */
const QUESTIONNAIRE_READY_TO_LEAVE_P3 = new Set([
  "legal_review",
  "approved",
]);

const REPORT_STATUS_RANK: Record<string, number> = {
  delivered: 8,
  approved: 7,
  external_review: 6,
  approved_internal: 5,
  technical_director: 4,
  grammar_qa: 3,
  changes_requested: 2,
  draft: 1,
  rejected: 0,
};

function pickBestByStatusRank<T extends { status: string }>(
  rows: readonly T[],
  rank: Record<string, number>,
): T | null {
  if (rows.length === 0) return null;
  return rows.reduce((best, row) => {
    const nextRank = rank[row.status] ?? -1;
    const bestRank = rank[best.status] ?? -1;
    return nextRank > bestRank ? row : best;
  });
}

/**
 * Strongest status wins, unless a newer row is a weaker revision
 * (draft / changes_requested after an older approved).
 */
function pickCurrentProcessArtifact<T extends RankedArtifact>(
  rows: readonly T[],
  rank: Record<string, number>,
): T | null {
  if (rows.length === 0) return null;
  const nonRejected = rows.filter((r) => r.status !== "rejected");
  const pool = nonRejected.length > 0 ? nonRejected : [...rows];
  const byRank = pickBestByStatusRank(pool, rank);
  if (!byRank) return null;
  const latest = pool.reduce((a, b) =>
    createdAtMs(b.createdAt) > createdAtMs(a.createdAt) ? b : a,
  );
  if (
    latest !== byRank &&
    createdAtMs(latest.createdAt) > createdAtMs(byRank.createdAt) &&
    (rank[latest.status] ?? -1) < (rank[byRank.status] ?? -1)
  ) {
    return latest;
  }
  return byRank;
}

const QUESTIONNAIRE_UPSERT_STATUSES = new Set([
  "draft",
  "changes_requested",
]);

function canUpsertQuestionnaire(status: string | null | undefined): boolean {
  return Boolean(status && QUESTIONNAIRE_UPSERT_STATUSES.has(status));
}

function resolveQuestionnaireUpsert(opts: {
  currentStatus: string | null | undefined;
  submit: boolean;
}):
  | { ok: true; reuse: boolean; nextStatus: string }
  | { ok: false; error: string } {
  const current = opts.currentStatus ?? null;
  if (!current) {
    return {
      ok: true,
      reuse: false,
      nextStatus: opts.submit ? "grammar_qa" : "draft",
    };
  }
  if (!canUpsertQuestionnaire(current)) {
    return {
      ok: false,
      error:
        current === "grammar_qa"
          ? "Questionnaire is in QA review; wait for QA or request changes"
          : current === "legal_review"
            ? "Questionnaire is in legal review; request changes before editing"
            : "Questionnaire cannot be edited in its current status",
    };
  }
  if (!opts.submit) {
    return { ok: true, reuse: true, nextStatus: current };
  }
  return { ok: true, reuse: true, nextStatus: "grammar_qa" };
}

function isActiveLogisticsTripStatus(
  status: string | null | undefined,
): boolean {
  return Boolean(status && status !== "cancelled");
}

function shouldClearOtherPrimaryAssignments(
  role: string,
  isPrimary: boolean,
): boolean {
  return isPrimary && (role === "expert" || role === "coordinator");
}

/** Measurement types that also satisfy the P8 evidence checklist. */
function mergeEvidenceCategories(
  evidenceCategories: readonly string[],
  measurementTypes: readonly string[] = [],
): string[] {
  const allowed = new Set<string>(EVIDENCE_CHECKLIST_CATEGORIES);
  const set = new Set(evidenceCategories.filter((c) => allowed.has(c)));
  for (const type of measurementTypes) {
    if (allowed.has(type)) set.add(type);
  }
  return [...set];
}

function hasPropertyGpsFromCoordsInline(
  lat: unknown,
  lng: unknown,
): boolean {
  return (
    lat != null &&
    lng != null &&
    String(lat).trim() !== "" &&
    String(lng).trim() !== ""
  );
}

type ProcessGateInputSourceInline = {
  documentCategories: readonly string[];
  approvedDocumentCategories?: readonly string[];
  evidenceCategories?: readonly string[];
  measurementTypes?: readonly string[];
  hasPrimaryExpert: boolean;
  questionnaireStatus?: string | null;
  questionnaireContentJson?: unknown;
  streetViewValidatedAt?: unknown;
  propertyLat?: unknown;
  propertyLng?: unknown;
  documentsHandoffConfirmedAt?: unknown;
  expedienteApprovedAt?: unknown;
  ratificationScheduledAt?: unknown;
  involvesFatality?: boolean;
  inspectionComplete: boolean;
  reportStatus?: string | null;
  logisticsReady: boolean;
  invoices: readonly FinanceInvoiceInput[];
  dictamenDueAt?: unknown;
};

function buildProcessGateInputFromSourceInline(
  source: ProcessGateInputSourceInline,
): ProcessGateInput {
  const documentCategories = source.documentCategories;
  return {
    documentCategories,
    approvedDocumentCategories: source.approvedDocumentCategories ?? [],
    evidenceCategories: mergeEvidenceCategories(
      source.evidenceCategories ?? [],
      source.measurementTypes ?? [],
    ),
    hasPrimaryExpert: source.hasPrimaryExpert,
    questionnaireStatus: source.questionnaireStatus ?? null,
    questionnaireContentJson: source.questionnaireContentJson,
    hasStreetView:
      Boolean(source.streetViewValidatedAt) ||
      questionnaireHasStreetView(source.questionnaireContentJson),
    hasPropertyGps: hasPropertyGpsFromCoordsInline(
      source.propertyLat,
      source.propertyLng,
    ),
    documentsHandoffConfirmed: Boolean(source.documentsHandoffConfirmedAt),
    expedienteApproved: Boolean(source.expedienteApprovedAt),
    ratificationScheduledAt:
      source.ratificationScheduledAt != null
        ? String(source.ratificationScheduledAt)
        : null,
    plaintiffQuestionnairePresent: documentCategories.includes(
      "plaintiff_questionnaire",
    ),
    protestaFiled: documentCategories.includes("protesta"),
    inspectionComplete: source.inspectionComplete,
    reportStatus: source.reportStatus ?? null,
    ratificationPresent: documentCategories.includes("ratification"),
    courtFilingPresent: documentCategories.includes("court_filing"),
    involvesFatality: Boolean(source.involvesFatality),
    logisticsReady: source.logisticsReady,
    hasUnpaidInvoices: hasBlockingFinanceForCompletion(source.invoices),
    dictamenDueAt: source.dictamenDueAt
      ? toIso(source.dictamenDueAt)
      : null,
  };
}

const UNPAID_INVOICE_STATUSES = [
  "issued",
  "partially_paid",
  "overdue",
] as const;

function hasBlockingUnpaidInvoices(
  invoiceStatuses: readonly string[],
): boolean {
  return invoiceStatuses.some((s) =>
    (UNPAID_INVOICE_STATUSES as readonly string[]).includes(s),
  );
}

type FinanceInvoiceInput = {
  status: string;
  invoiceType?: string | null;
};

/** P10: unpaid issued invoices, plus draft advance/final that were never squared. */
function isPendingFinanceInvoice(inv: FinanceInvoiceInput): boolean {
  if (hasBlockingUnpaidInvoices([inv.status])) return true;
  return (
    (inv.invoiceType === "advance" || inv.invoiceType === "final") &&
    inv.status === "draft"
  );
}

function hasBlockingFinanceForCompletion(
  invoices: readonly FinanceInvoiceInput[],
): boolean {
  return invoices.some((inv) => isPendingFinanceInvoice(inv));
}

type ListadoProgress = {
  processPoint: ProcessPointId | null;
  gatesOk: boolean;
  holdResumeStatus?: CaseStatus | null;
  primaryExpert: boolean;
  intakeComplete: boolean;
  questionnaireApproved: boolean;
  streetViewDone: boolean;
  advanceReleased: boolean;
  advancePaid: boolean;
  plaintiffQuestionnaire: boolean;
  protestaFiled: boolean;
  clock10DueAt: string | null;
  logisticsReady: boolean;
  inspectionComplete: boolean;
  reportInternalOk: boolean;
  reportFirmOk: boolean;
  ratified: boolean;
  attendedWithReport: boolean;
  finalReleased: boolean;
  finalPaid: boolean;
};

type CaseProcessGateSnapshot = {
  point: ProcessPointId | null;
  ok: boolean;
  missing: string[];
};

function buildProcessGateSnapshot(
  status: CaseStatus,
  input: ProcessGateInput,
): CaseProcessGateSnapshot {
  const point = processPointForStatus(status);
  if (!point) return { point: null, ok: true, missing: [] };
  const gates = evaluateProcessGates(point, input);
  return { point, ok: gates.ok, missing: [...gates.missing] };
}

function buildListadoProgress(opts: {
  status: CaseStatus;
  inspectionDeadlineAt?: string | null;
  input: ProcessGateInput;
  invoices?: readonly FinanceInvoiceInput[];
  holdResumeStatus?: CaseStatus | null;
}): ListadoProgress {
  const input = opts.input;
  const invoices = opts.invoices ?? [];
  const qApproved = input.questionnaireStatus === "approved";
  const hasAdvance = invoices.some((i) => i.invoiceType === "advance");
  const hasFinal = invoices.some((i) => i.invoiceType === "final");
  const advancePaid = invoices.some(
    (i) => i.invoiceType === "advance" && i.status === "paid",
  );
  const finalPaid = invoices.some(
    (i) => i.invoiceType === "final" && i.status === "paid",
  );
  const intake = getIntakeCompleteness(input.documentCategories).complete;
  const currentPoint = processPointForStatus(opts.status);
  const gatesOk = currentPoint
    ? evaluateProcessGates(currentPoint, input).ok
    : true;
  const reportInternal =
    input.reportStatus === "approved_internal" ||
    input.reportStatus === "external_review" ||
    input.reportStatus === "approved" ||
    input.reportStatus === "delivered";
  const reportFirm =
    input.reportStatus === "approved" || input.reportStatus === "delivered";
  const ratified = Boolean(
    input.ratificationPresent ||
    input.documentCategories.includes("ratification"),
  );
  const filed = Boolean(
    input.courtFilingPresent ||
    input.documentCategories.includes("court_filing"),
  );
  return {
    processPoint: currentPoint,
    gatesOk,
    holdResumeStatus: opts.holdResumeStatus ?? null,
    primaryExpert: Boolean(input.hasPrimaryExpert),
    intakeComplete: intake,
    questionnaireApproved: qApproved,
    streetViewDone: Boolean(input.hasStreetView),
    advanceReleased:
      questionnaireQaComplete(input.questionnaireStatus) || hasAdvance,
    advancePaid,
    plaintiffQuestionnaire: Boolean(input.plaintiffQuestionnairePresent),
    protestaFiled: Boolean(
      input.protestaFiled || input.documentCategories.includes("protesta"),
    ),
    clock10DueAt: opts.inspectionDeadlineAt ?? null,
    logisticsReady: input.logisticsReady === true,
    inspectionComplete: input.inspectionComplete === true,
    reportInternalOk: reportInternal,
    reportFirmOk: reportFirm,
    ratified,
    attendedWithReport: ratified && filed,
    finalReleased: ratified || hasFinal,
    finalPaid,
  };
}

function parseUpdateCaseFlags(
  body: unknown,
):
  | {
      ok: true;
      value: {
        involvesFatality?: boolean;
        protestaModality?: "presencial" | "virtual" | null;
        externalCourtDeadlineAt?: string | null;
        dictamenDueAt?: string | null;
        title?: string;
        description?: string | null;
        lawFirmId?: number | null;
      };
    }
  | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid body" };
  }
  const rec = body as Record<string, unknown>;
  const value: {
    involvesFatality?: boolean;
    protestaModality?: "presencial" | "virtual" | null;
    externalCourtDeadlineAt?: string | null;
    dictamenDueAt?: string | null;
    title?: string;
    description?: string | null;
    lawFirmId?: number | null;
  } = {};
  let touched = false;
  if ("involvesFatality" in rec) {
    if (typeof rec.involvesFatality !== "boolean") {
      return { ok: false, error: "involvesFatality must be a boolean" };
    }
    value.involvesFatality = rec.involvesFatality;
    touched = true;
  }
  if ("protestaModality" in rec) {
    const m = rec.protestaModality;
    if (m !== null && m !== "presencial" && m !== "virtual") {
      return {
        ok: false,
        error: "protestaModality must be presencial, virtual, or null",
      };
    }
    value.protestaModality = m as "presencial" | "virtual" | null;
    touched = true;
  }
  if ("externalCourtDeadlineAt" in rec) {
    const raw = rec.externalCourtDeadlineAt;
    if (raw === null || raw === "") {
      value.externalCourtDeadlineAt = null;
      touched = true;
    } else if (typeof raw === "string" || typeof raw === "number") {
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) {
        return { ok: false, error: "Invalid externalCourtDeadlineAt" };
      }
      value.externalCourtDeadlineAt = d.toISOString();
      touched = true;
    } else {
      return {
        ok: false,
        error: "externalCourtDeadlineAt must be a date string or null",
      };
    }
  }
  if ("dictamenDueAt" in rec) {
    const raw = rec.dictamenDueAt;
    if (raw === null || raw === "") {
      value.dictamenDueAt = null;
      touched = true;
    } else if (typeof raw === "string" || typeof raw === "number") {
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) {
        return { ok: false, error: "Invalid dictamenDueAt" };
      }
      value.dictamenDueAt = d.toISOString();
      touched = true;
    } else {
      return {
        ok: false,
        error: "dictamenDueAt must be a date string or null",
      };
    }
  }
  if ("title" in rec) {
    if (typeof rec.title !== "string" || !rec.title.trim()) {
      return { ok: false, error: "Title is required" };
    }
    if (rec.title.trim().length > 255) {
      return { ok: false, error: "Title is too long" };
    }
    value.title = rec.title.trim();
    touched = true;
  }
  if ("description" in rec) {
    if (rec.description != null && typeof rec.description !== "string") {
      return { ok: false, error: "description must be a string or null" };
    }
    const note = String(rec.description ?? "");
    if (note.length > 500) {
      return { ok: false, error: "description exceeds 500 characters" };
    }
    value.description = note.trim() || null;
    touched = true;
  }
  if ("lawFirmId" in rec) {
    if (rec.lawFirmId === null || rec.lawFirmId === "") {
      value.lawFirmId = null;
      touched = true;
    } else {
      const id = Number(rec.lawFirmId);
      if (!Number.isFinite(id) || id <= 0) {
        return { ok: false, error: "Invalid lawFirmId" };
      }
      value.lawFirmId = id;
      touched = true;
    }
  }
  if (!touched) {
    return {
      ok: false,
      error:
        "Provide involvesFatality, protestaModality, externalCourtDeadlineAt, dictamenDueAt, title, description, and/or lawFirmId",
    };
  }
  return { ok: true, value };
}

function accountableActor(point: ProcessPointId): ProcessActor | null {
  const raci = PROCESS_POINTS[point].raci;
  const found = (Object.entries(raci) as [ProcessActor, RaciLetter][]).find(
    ([, letter]) => letter === "A",
  );
  return found ? found[0] : null;
}

type ProcessGateInput = {
  documentCategories: readonly string[];
  approvedDocumentCategories?: readonly string[];
  evidenceCategories?: readonly string[];
  hasPrimaryExpert?: boolean;
  questionnaireStatus?: string | null;
  questionnaireContentJson?: unknown;
  hasStreetView?: boolean;
  hasPropertyGps?: boolean;
  protestaFiled?: boolean;
  plaintiffQuestionnairePresent?: boolean;
  inspectionComplete?: boolean;
  reportStatus?: string | null;
  ratificationPresent?: boolean;
  courtFilingPresent?: boolean;
  ratificationScheduledAt?: string | null;
  involvesFatality?: boolean;
  logisticsReady?: boolean;
  hasUnpaidInvoices?: boolean;
  documentsHandoffConfirmed?: boolean;
  expedienteApproved?: boolean;
  dictamenDueAt?: string | null;
};

type ProcessGateResult =
  { ok: true; missing: [] } | { ok: false; missing: string[] };

function hasCategory(present: readonly string[], category: string): boolean {
  return present.includes(category);
}

/**
 * Blocking gates to *leave* a process point (advance to the next status).
 * Plaintiff questionnaire is required to leave protesta (P6) together with
 * the signed protesta. Field ops also requires a dictamen due date.
 */
function evaluateProcessGates(
  point: ProcessPointId,
  input: ProcessGateInput,
): ProcessGateResult {
  const def = PROCESS_POINTS[point];
  const docs = input.documentCategories;
  const missing: string[] = [];

  for (const cat of def.requiredDocumentCategories) {
    // Miro / sample-flow PDFs are required file artifacts.
    // Form content / report status / schedule do not substitute for the file.
    if (!hasCategory(docs, cat)) missing.push(`doc:${cat}`);
  }
  if (input.involvesFatality) {
    for (const cat of def.conditionalDocumentCategories) {
      if (!hasCategory(docs, cat)) missing.push(`doc:${cat}`);
    }
  }

  if (point === 1) {
    const intakeMissing = INTAKE_REQUIRED_CATEGORIES.filter(
      (c) => !hasCategory(docs, c),
    );
    for (const cat of intakeMissing) {
      const key = `doc:${cat}`;
      if (!missing.includes(key)) missing.push(key);
    }
    const approved = input.approvedDocumentCategories ?? [];
    for (const cat of INTAKE_REQUIRED_CATEGORIES) {
      if (!hasCategory(approved, cat)) {
        const key = `doc_approved:${cat}`;
        if (!missing.includes(key)) missing.push(key);
      }
    }
    if (input.expedienteApproved !== true) {
      missing.push("expediente:approved");
    }
  }

  if (point === 3 && !input.hasPrimaryExpert) {
    missing.push("assignment:primary_expert");
  }

  if (point === 3 && input.documentsHandoffConfirmed !== true) {
    missing.push("handoff:documents_confirmed");
  }

  if (point === 2) {
    if (!input.hasPropertyGps) missing.push("location:gps");
    if (
      !input.hasStreetView &&
      !questionnaireHasStreetView(input.questionnaireContentJson)
    ) {
      missing.push("location:street_view");
    }
    if (!QUESTIONNAIRE_READY_TO_LEAVE_P3.has(input.questionnaireStatus ?? "")) {
      missing.push("questionnaire:ready");
    }
  }

  if (point === 4 && input.questionnaireStatus !== "approved") {
    missing.push("questionnaire:legal_approved");
  }

  if (point === 6 && !input.protestaFiled && !hasCategory(docs, "protesta")) {
    missing.push("doc:protesta");
  }

  if ((point === 7 || point === 8) && !input.plaintiffQuestionnairePresent) {
    missing.push("doc:plaintiff_questionnaire");
  }

  if (point === 7) {
    if (!input.dictamenDueAt) {
      missing.push("dictamen:due");
    }
    if (input.logisticsReady !== true) {
      missing.push("logistics:ready");
    }
    const evidence = input.evidenceCategories || [];
    for (const cat of def.requiredEvidenceCategories) {
      if (!evidence.includes(cat)) missing.push(`evidence:${cat}`);
    }
    if (input.inspectionComplete !== true) {
      missing.push("inspection:complete");
    }
  }

  if (point === 8) {
    const ok =
      input.reportStatus === "approved_internal" ||
      input.reportStatus === "external_review" ||
      input.reportStatus === "approved" ||
      input.reportStatus === "delivered";
    if (!ok) missing.push("report:internal_approved");
  }

  if (point === 9) {
    const firmOk =
      input.reportStatus === "approved" || input.reportStatus === "delivered";
    if (!firmOk) missing.push("report:firm_approved");
    // court_filing + ratification PDFs come from requiredDocumentCategories.
  }

  if (point === 10 && input.hasUnpaidInvoices) {
    missing.push("finance:unpaid_invoices");
  }

  return missing.length === 0
    ? { ok: true, missing: [] }
    : { ok: false, missing };
}

function rejectReturnsTo(point: ProcessPointId): ProcessPointId | null {
  return PROCESS_POINTS[point].rejectReturnsTo;
}

function pointsInsideParentClock(parent: ProcessPointId): ProcessPointId[] {
  return PROCESS_POINT_IDS.filter(
    (id) =>
      PROCESS_POINTS[id].boundedByPoint === parent ||
      PROCESS_POINTS[id].sla?.nestedInside === parent,
  );
}

/** Assignment roles that must exist after P2 (primary expert is required). */
const REQUIRED_ASSIGNMENT_ROLES_AFTER_P2: AssignmentRole[] = ["expert"];

const RECOMMENDED_ASSIGNMENT_ROLES_AFTER_P2: AssignmentRole[] = [
  "coordinator",
  "qa",
  "legal_reviewer",
  "logistics",
  "accountant",
];

/** Status flow 1–10 matches process points; completed is after P10. */
function assertProcessAlignsWithCaseFlow(): {
  ok: true;
  statuses: CaseStatus[];
} {
  const statuses = PROCESS_POINT_IDS.map((id) => PROCESS_POINTS[id].caseStatus);
  const expected = CASE_STATUS_FLOW.filter((s) => s !== "completed");
  if (statuses.join("|") !== expected.join("|")) {
    throw new Error(
      `Process points drifted from CASE_STATUS_FLOW: ${statuses.join(",")} vs ${expected.join(",")}`,
    );
  }
  return { ok: true, statuses };
}

// ---- inlined from lib/emails.ts ----
/**
 * DELACHE transactional email templates.
 * Strategy mirrors athlete-hub (shared shell + i18n strings + builders)
 * and optimum-credit (table layout, preheader, CTA button).
 */

const EMAIL_BRAND = {
  bg: "#f7f4ee",
  surface: "#ffffff",
  header: "#1A1408",
  primary: "#E6AB40",
  accent: "#C9922A",
  onPrimary: "#0F172A",
  text: "#0e1b31",
  muted: "#475569",
  dim: "#64748b",
  border: "#ebe4d6",
  codeBg: "#fbf5e8",
  success: "#15803d",
  successBg: "#f0fdf4",
  warn: "#b45309",
  warnBg: "#fffbeb",
  fontFamily:
    "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
} as const;

type EmailPayload = {
  subject: string;
  html: string;
  text: string;
};

type EmailTemplateKind =
  | "otp"
  | "inviteStaff"
  | "inviteClient"
  | "assignment"
  | "caseStatus"
  | "reportDelivered"
  | "newCaseIntake";

type EmailStrings = {
  subjects: Record<EmailTemplateKind, string>;
  footer: {
    tagline: string;
    help: string;
    copyright: string;
  };
  otp: {
    preheader: string;
    title: string;
    greeting: string;
    introStaff: string;
    introClient: string;
    expiry: string;
    security: string;
  };
  inviteStaff: {
    preheader: string;
    title: string;
    greeting: string;
    intro: string;
    roleLabel: string;
    steps: [string, string, string];
    cta: string;
  };
  inviteClient: {
    preheader: string;
    title: string;
    greeting: string;
    intro: string;
    firmLabel: string;
    steps: [string, string, string];
    cta: string;
  };
  assignment: {
    preheader: string;
    title: string;
    greeting: string;
    intro: string;
    caseLabel: string;
    roleLabel: string;
    deliveryDueLabel: string;
    cta: string;
  };
  caseStatus: {
    preheader: string;
    title: string;
    greeting: string;
    intro: string;
    caseLabel: string;
    fromLabel: string;
    toLabel: string;
    cta: string;
  };
  reportDelivered: {
    preheader: string;
    title: string;
    greeting: string;
    intro: string;
    caseLabel: string;
    cta: string;
  };
  newCaseIntake: {
    preheader: string;
    title: string;
    greeting: string;
    intro: string;
    caseLabel: string;
    titleLabel: string;
    cta: string;
  };
};

const EMAIL_STRINGS_ES: EmailStrings = {
  subjects: {
    otp: "{{code}} es tu código de acceso DELACHE",
    inviteStaff: "Te invitaron al portal DELACHE",
    inviteClient: "Acceso al portal de despachos DELACHE",
    assignment: "Nueva asignación · {{caseNumber}}",
    caseStatus: "Actualización de expediente · {{caseNumber}}",
    reportDelivered: "Dictamen disponible · {{caseNumber}}",
    newCaseIntake: "Nuevo expediente · {{caseNumber}}",
  },
  footer: {
    tagline: "Precisión pericial, trazabilidad total.",
    help: "¿Necesitas ayuda? Responde este correo o escribe a tu contacto DELACHE.",
    copyright: "© {{year}} DELACHE. Todos los derechos reservados.",
  },
  otp: {
    preheader: "Tu código expira en {{minutes}} minutos",
    title: "Código de acceso",
    greeting: "Hola {{name}},",
    introStaff: "Usa este código para entrar al portal interno DELACHE:",
    introClient: "Usa este código para entrar al portal de despachos DELACHE:",
    expiry: "Expira en {{minutes}} minutos. No lo compartas con nadie.",
    security:
      "Si no solicitaste este código, ignora este correo de forma segura.",
  },
  inviteStaff: {
    preheader: "Tu acceso al centro de operaciones está listo",
    title: "Bienvenido al equipo DELACHE",
    greeting: "Hola {{name}},",
    intro:
      "Te invitaron a colaborar en el centro de operaciones DELACHE. Inicia sesión con tu correo — sin contraseña, solo un código de un solo uso.",
    roleLabel: "Rol",
    steps: [
      "Abre el portal interno",
      "Ingresa con tu correo institucional",
      "Confirma el código que te enviaremos",
    ],
    cta: "Abrir portal interno",
  },
  inviteClient: {
    preheader: "Tu despacho ya puede dar seguimiento a expedientes",
    title: "Acceso al portal de despachos",
    greeting: "Hola {{name}},",
    intro:
      "DELACHE te habilitó acceso externo para consultar expedientes, notas compartidas y dictámenes. Entra con tu correo — te enviaremos un código de un solo uso.",
    firmLabel: "Despacho",
    steps: [
      "Abre el portal de despachos",
      "Ingresa con el correo de esta invitación",
      "Confirma el código OTP",
    ],
    cta: "Abrir portal de despachos",
  },
  assignment: {
    preheader: "Te asignaron un expediente",
    title: "Nueva asignación",
    greeting: "Hola {{name}},",
    intro:
      "Te asignaron al expediente siguiente. Entra al portal para revisar el detalle.",
    caseLabel: "Expediente",
    roleLabel: "Asignación",
    deliveryDueLabel: "Entrega antes de",
    cta: "Ver expediente",
  },
  caseStatus: {
    preheader: "El expediente cambió de etapa",
    title: "Actualización de expediente",
    greeting: "Hola {{name}},",
    intro: "El estatus del expediente se actualizó.",
    caseLabel: "Expediente",
    fromLabel: "Anterior",
    toLabel: "Nuevo",
    cta: "Ver expediente",
  },
  reportDelivered: {
    preheader: "Hay un dictamen listo para revisar",
    title: "Dictamen disponible",
    greeting: "Hola {{name}},",
    intro:
      "DELACHE entregó un dictamen técnico en tu expediente. Puedes consultarlo en el portal de despachos.",
    caseLabel: "Expediente",
    cta: "Ver dictamen",
  },
  newCaseIntake: {
    preheader: "Un despacho envió un expediente nuevo",
    title: "Nuevo expediente recibido",
    greeting: "Hola {{name}},",
    intro: "Un despacho envió un expediente nuevo al intake.",
    caseLabel: "Expediente",
    titleLabel: "Título",
    cta: "Abrir expediente",
  },
};

const EMAIL_STRINGS_EN: EmailStrings = {
  subjects: {
    otp: "{{code}} is your DELACHE access code",
    inviteStaff: "You're invited to the DELACHE portal",
    inviteClient: "DELACHE law firm portal access",
    assignment: "New assignment · {{caseNumber}}",
    caseStatus: "Case update · {{caseNumber}}",
    reportDelivered: "Report available · {{caseNumber}}",
    newCaseIntake: "New case · {{caseNumber}}",
  },
  footer: {
    tagline: "Expert precision, full traceability.",
    help: "Need help? Reply to this email or contact your DELACHE liaison.",
    copyright: "© {{year}} DELACHE. All rights reserved.",
  },
  otp: {
    preheader: "Your code expires in {{minutes}} minutes",
    title: "Access code",
    greeting: "Hi {{name}},",
    introStaff: "Use this code to sign in to the DELACHE internal portal:",
    introClient: "Use this code to sign in to the DELACHE law firm portal:",
    expiry: "Expires in {{minutes}} minutes. Do not share it with anyone.",
    security:
      "If you did not request this code, you can safely ignore this email.",
  },
  inviteStaff: {
    preheader: "Your operations center access is ready",
    title: "Welcome to the DELACHE team",
    greeting: "Hi {{name}},",
    intro:
      "You've been invited to collaborate in the DELACHE operations center. Sign in with your email — no password, just a one-time code.",
    roleLabel: "Role",
    steps: [
      "Open the internal portal",
      "Sign in with your work email",
      "Confirm the code we send you",
    ],
    cta: "Open internal portal",
  },
  inviteClient: {
    preheader: "Your firm can now track cases",
    title: "Law firm portal access",
    greeting: "Hi {{name}},",
    intro:
      "DELACHE enabled external access so you can review cases, shared notes, and reports. Sign in with your email — we'll send a one-time code.",
    firmLabel: "Firm",
    steps: [
      "Open the law firm portal",
      "Sign in with this invitation email",
      "Confirm the OTP code",
    ],
    cta: "Open law firm portal",
  },
  assignment: {
    preheader: "You were assigned to a case",
    title: "New assignment",
    greeting: "Hi {{name}},",
    intro:
      "You were assigned to the following case. Open the portal to review details.",
    caseLabel: "Case",
    roleLabel: "Assignment",
    deliveryDueLabel: "Deliver by",
    cta: "View case",
  },
  caseStatus: {
    preheader: "A case moved to a new stage",
    title: "Case update",
    greeting: "Hi {{name}},",
    intro: "The case status was updated.",
    caseLabel: "Case",
    fromLabel: "Previous",
    toLabel: "New",
    cta: "View case",
  },
  reportDelivered: {
    preheader: "A technical report is ready to review",
    title: "Report available",
    greeting: "Hi {{name}},",
    intro:
      "DELACHE delivered a technical report on your case. You can review it in the law firm portal.",
    caseLabel: "Case",
    cta: "View report",
  },
  newCaseIntake: {
    preheader: "A law firm submitted a new case",
    title: "New case received",
    greeting: "Hi {{name}},",
    intro: "A law firm submitted a new case into intake.",
    caseLabel: "Case",
    titleLabel: "Title",
    cta: "Open case",
  },
};

const EMAIL_STRINGS: Record<AppLocale, EmailStrings> = {
  es: EMAIL_STRINGS_ES,
  en: EMAIL_STRINGS_EN,
};

function emailStrings(locale: AppLocale): EmailStrings {
  return EMAIL_STRINGS[locale] ?? EMAIL_STRINGS.es;
}

function interpolateEmail(
  template: string,
  vars: Record<string, string | number>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) =>
    String(vars[key] ?? ""),
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function brandMarkHtml(appUrl: string): string {
  const assetBase = resolveEmailAssetBaseUrlInline(appUrl, {
    publicAssetOrigin:
      process.env.EMAIL_ASSET_BASE_URL || process.env.PUBLIC_APP_URL,
  });
  const logoSrc = `${assetBase}/brand/logo-full.png`;
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
  <tr>
    <td align="center" style="text-align:center;">
      <img src="${escapeHtml(logoSrc)}" width="140" height="140" alt="DELACHE" style="display:block;margin:0 auto;width:140px;max-width:56%;height:auto;border:0;outline:none;text-decoration:none;background:transparent;" />
      <div style="margin-top:10px;font-size:18px;font-weight:800;letter-spacing:0.18em;color:${EMAIL_BRAND.primary};font-family:${EMAIL_BRAND.fontFamily};">DELACHE</div>
    </td>
  </tr>
</table>`;
}

function emailButton(url: string, label: string): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:28px 0 8px;">
  <tr>
    <td align="center" bgcolor="${EMAIL_BRAND.primary}" style="border-radius:12px;background:linear-gradient(135deg,${EMAIL_BRAND.primary} 0%,${EMAIL_BRAND.accent} 100%);">
      <a href="${escapeHtml(url)}" target="_blank" style="display:inline-block;padding:14px 28px;color:${EMAIL_BRAND.onPrimary};font-weight:700;font-size:15px;text-decoration:none;border-radius:12px;font-family:${EMAIL_BRAND.fontFamily};">${escapeHtml(label)}</a>
    </td>
  </tr>
</table>`;
}

function otpCodeBlock(code: string): string {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
  <tr>
    <td align="center" style="padding:8px 0 4px;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" bgcolor="${EMAIL_BRAND.codeBg}" style="border:2px solid ${EMAIL_BRAND.primary};border-radius:14px;background:${EMAIL_BRAND.codeBg};">
        <tr>
          <td align="center" style="padding:20px 32px;font-size:34px;font-weight:800;font-family:ui-monospace,'SF Mono',Consolas,monospace;color:${EMAIL_BRAND.primary};letter-spacing:0.14em;line-height:1.2;">${escapeHtml(code)}</td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
}

function highlightBanner(
  text: string,
  tone: "accent" | "warn" | "success" | "info" = "accent",
): string {
  const colors =
    tone === "warn"
      ? {
          bg: EMAIL_BRAND.warnBg,
          border: EMAIL_BRAND.warn,
          fg: EMAIL_BRAND.warn,
        }
      : tone === "success"
        ? {
            bg: EMAIL_BRAND.successBg,
            border: EMAIL_BRAND.success,
            fg: EMAIL_BRAND.success,
          }
        : tone === "info"
          ? {
              bg: EMAIL_BRAND.codeBg,
              border: EMAIL_BRAND.primary,
              fg: EMAIL_BRAND.primary,
            }
          : {
              bg: "#eef5ff",
              border: EMAIL_BRAND.accent,
              fg: EMAIL_BRAND.primary,
            };
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 18px;">
  <tr>
    <td style="padding:14px 16px;background:${colors.bg};border-radius:12px;border-left:4px solid ${colors.border};font-size:13px;font-weight:700;color:${colors.fg};line-height:1.5;">${escapeHtml(text)}</td>
  </tr>
</table>`;
}

function stepsList(steps: string[]): string {
  const rows = steps
    .map(
      (step, i) => `<tr>
      <td width="28" valign="top" style="padding:6px 0;font-size:13px;font-weight:800;color:${EMAIL_BRAND.accent};">${i + 1}.</td>
      <td valign="top" style="padding:6px 0;font-size:14px;color:${EMAIL_BRAND.muted};line-height:1.5;">${escapeHtml(step)}</td>
    </tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:16px 0 8px;">${rows}</table>`;
}

function metaCard(rows: Array<{ label: string; value: string }>): string {
  const body = rows
    .map(
      (r, i) => `<tr>
      <td style="padding:10px 0;${i < rows.length - 1 ? `border-bottom:1px solid ${EMAIL_BRAND.border};` : ""}">
        <div style="font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:${EMAIL_BRAND.dim};">${escapeHtml(r.label)}</div>
        <div style="margin-top:4px;font-size:15px;font-weight:700;color:${EMAIL_BRAND.text};">${escapeHtml(r.value)}</div>
      </td>
    </tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:18px 0;padding:4px 16px;background:${EMAIL_BRAND.codeBg};border-radius:12px;border:1px solid ${EMAIL_BRAND.border};">
    <tr><td style="padding:8px 16px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">${body}</table>
    </td></tr>
  </table>`;
}

interface BaseEmailOptions {
  locale: AppLocale;
  preheader: string;
  title: string;
  bodyHtml: string;
  cta?: { label: string; url: string };
  appUrl: string;
}

function emailShell(opts: BaseEmailOptions): string {
  const { locale, preheader, title, bodyHtml, cta, appUrl } = opts;
  const s = emailStrings(locale);
  const year = new Date().getFullYear();
  const ctaBlock = cta
    ? `<tr><td align="center" style="padding:0 32px 8px;">${emailButton(cta.url, cta.label)}</td></tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="${locale === "es" ? "es-MX" : "en"}">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <meta name="color-scheme" content="light"/>
  <meta name="supported-color-schemes" content="light"/>
  <title>${escapeHtml(title)}</title>
  <!--[if mso]><style>table{border-collapse:collapse;}td{font-family:Arial,sans-serif;}</style><![endif]-->
  <style type="text/css">
    body, table, td { margin: 0; padding: 0; }
    table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    @media only screen and (max-width: 620px) {
      .email-container { width: 100% !important; max-width: 100% !important; }
      .email-content, .email-header, .email-footer { padding-left: 20px !important; padding-right: 20px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${EMAIL_BRAND.bg};font-family:${EMAIL_BRAND.fontFamily};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;color:${EMAIL_BRAND.text};">
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeHtml(preheader)}&#847;&zwnj;&nbsp;</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${EMAIL_BRAND.bg}">
    <tr>
      <td align="center" valign="top" style="padding:36px 16px;">
        <table role="presentation" class="email-container" width="560" cellspacing="0" cellpadding="0" border="0" bgcolor="${EMAIL_BRAND.surface}" style="width:560px;max-width:560px;border-radius:16px;border:1px solid ${EMAIL_BRAND.border};overflow:hidden;box-shadow:0 10px 30px rgba(11,30,61,0.06);">
          <tr>
            <td class="email-header" bgcolor="${EMAIL_BRAND.header}" style="padding:28px 32px 22px;background:${EMAIL_BRAND.header};border-bottom:3px solid ${EMAIL_BRAND.accent};text-align:center;">
              ${brandMarkHtml(appUrl)}
              <h1 style="margin:18px 0 0;font-size:24px;font-weight:800;color:#ffffff;line-height:1.3;text-align:center;">${escapeHtml(title)}</h1>
            </td>
          </tr>
          <tr>
            <td class="email-content" style="padding:28px 32px;font-size:16px;line-height:1.65;color:${EMAIL_BRAND.text};">
              ${bodyHtml}
            </td>
          </tr>
          ${ctaBlock}
          <tr>
            <td class="email-footer" style="padding:22px 32px 28px;border-top:1px solid ${EMAIL_BRAND.border};background:#f8fafc;">
              <p style="margin:0 0 8px;font-size:13px;color:${EMAIL_BRAND.primary};font-weight:700;">${escapeHtml(s.footer.tagline)}</p>
              <p style="margin:0 0 14px;font-size:12px;color:${EMAIL_BRAND.dim};line-height:1.5;">${escapeHtml(s.footer.help)}</p>
              <p style="margin:0;font-size:11px;color:${EMAIL_BRAND.muted};">${escapeHtml(interpolateEmail(s.footer.copyright, { year }))}</p>
              <p style="margin:10px 0 0;font-size:11px;"><a href="${escapeHtml(appUrl)}" style="color:${EMAIL_BRAND.accent};text-decoration:none;">${escapeHtml(appUrl.replace(/^https?:\/\//, ""))}</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildOtpEmail(opts: {
  locale: AppLocale;
  firstName: string;
  code: string;
  portal: AuthActor;
  minutes?: number;
  appUrl: string;
}): EmailPayload {
  const minutes = opts.minutes ?? 10;
  const s = emailStrings(opts.locale);
  const intro =
    opts.portal === "law_firm" ? s.otp.introClient : s.otp.introStaff;
  const bodyHtml = `
    <p style="margin:0 0 12px;font-size:17px;color:${EMAIL_BRAND.text};">${escapeHtml(interpolateEmail(s.otp.greeting, { name: opts.firstName }))}</p>
    <p style="margin:0 0 8px;color:${EMAIL_BRAND.muted};">${escapeHtml(intro)}</p>
    ${otpCodeBlock(opts.code)}
    <p style="margin:16px 0 0;text-align:center;font-size:13px;color:${EMAIL_BRAND.dim};">${escapeHtml(interpolateEmail(s.otp.expiry, { minutes }))}</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:22px;">
      <tr>
        <td style="padding:14px 16px;background:${EMAIL_BRAND.warnBg};border-radius:10px;border-left:3px solid ${EMAIL_BRAND.warn};font-size:13px;color:${EMAIL_BRAND.muted};line-height:1.5;">${escapeHtml(s.otp.security)}</td>
      </tr>
    </table>`;

  return {
    subject: interpolateEmail(s.subjects.otp, { code: opts.code }),
    html: emailShell({
      locale: opts.locale,
      preheader: interpolateEmail(s.otp.preheader, { minutes }),
      title: s.otp.title,
      bodyHtml,
      appUrl: opts.appUrl,
    }),
    text: `${interpolateEmail(s.otp.greeting, { name: opts.firstName })}\n\n${intro}\n\n${opts.code}\n\n${interpolateEmail(s.otp.expiry, { minutes })}\n\n${opts.appUrl}`,
  };
}

function buildInviteStaffEmail(opts: {
  locale: AppLocale;
  firstName: string;
  /** Staff role key (e.g. expert) — localized for the email locale */
  role: string;
  appUrl: string;
  resend?: boolean;
}): EmailPayload {
  const s = emailStrings(opts.locale);
  const roleLabel = emailStaffRoleLabelInline(opts.role, opts.locale);
  const loginUrl = `${opts.appUrl.replace(/\/$/, "")}/login`;
  const banner =
    opts.locale === "es"
      ? opts.resend
        ? "Reenviamos tu invitación — el acceso sigue activo."
        : "Sin contraseña · Código de un solo uso · Portal seguro"
      : opts.resend
        ? "We resent your invitation — access is still active."
        : "Passwordless · One-time code · Secure portal";
  const bodyHtml = `
    ${highlightBanner(banner, "accent")}
    <p style="margin:0 0 12px;font-size:17px;font-weight:600;">${escapeHtml(interpolateEmail(s.inviteStaff.greeting, { name: opts.firstName }))}</p>
    <p style="margin:0 0 8px;color:${EMAIL_BRAND.muted};">${escapeHtml(s.inviteStaff.intro)}</p>
    ${metaCard([{ label: s.inviteStaff.roleLabel, value: roleLabel }])}
    ${stepsList([...s.inviteStaff.steps])}`;

  return {
    subject: opts.resend
      ? opts.locale === "es"
        ? "Recordatorio: tu invitación DELACHE"
        : "Reminder: your DELACHE invitation"
      : s.subjects.inviteStaff,
    html: emailShell({
      locale: opts.locale,
      preheader: s.inviteStaff.preheader,
      title: s.inviteStaff.title,
      bodyHtml,
      cta: { label: s.inviteStaff.cta, url: loginUrl },
      appUrl: opts.appUrl,
    }),
    text: `${interpolateEmail(s.inviteStaff.greeting, { name: opts.firstName })}\n\n${s.inviteStaff.intro}\n\n${s.inviteStaff.roleLabel}: ${roleLabel}\n\n${loginUrl}`,
  };
}

function buildInviteClientEmail(opts: {
  locale: AppLocale;
  firstName: string;
  firmName?: string | null;
  appUrl: string;
  resend?: boolean;
}): EmailPayload {
  const s = emailStrings(opts.locale);
  const loginUrl = `${opts.appUrl.replace(/\/$/, "")}/login`;
  const banner =
    opts.locale === "es"
      ? opts.resend
        ? "Reenviamos tu acceso al portal de despachos."
        : "Seguimiento de expedientes · Notas compartidas · Dictámenes"
      : opts.resend
        ? "We resent your law firm portal access."
        : "Case tracking · Shared notes · Technical reports";
  const meta = opts.firmName
    ? metaCard([{ label: s.inviteClient.firmLabel, value: opts.firmName }])
    : "";
  const bodyHtml = `
    ${highlightBanner(banner, "accent")}
    <p style="margin:0 0 12px;font-size:17px;font-weight:600;">${escapeHtml(interpolateEmail(s.inviteClient.greeting, { name: opts.firstName }))}</p>
    <p style="margin:0 0 8px;color:${EMAIL_BRAND.muted};">${escapeHtml(s.inviteClient.intro)}</p>
    ${meta}
    ${stepsList([...s.inviteClient.steps])}`;

  return {
    subject: opts.resend
      ? opts.locale === "es"
        ? "Recordatorio: acceso al portal DELACHE"
        : "Reminder: your DELACHE portal access"
      : s.subjects.inviteClient,
    html: emailShell({
      locale: opts.locale,
      preheader: s.inviteClient.preheader,
      title: s.inviteClient.title,
      bodyHtml,
      cta: { label: s.inviteClient.cta, url: loginUrl },
      appUrl: opts.appUrl,
    }),
    text: `${interpolateEmail(s.inviteClient.greeting, { name: opts.firstName })}\n\n${s.inviteClient.intro}\n\n${loginUrl}`,
  };
}

function buildAssignmentEmail(opts: {
  locale: AppLocale;
  firstName: string;
  caseNumber: string;
  caseTitle: string;
  /** Assignment role key (e.g. expert) — localized for the email locale */
  role: string;
  caseUrl: string;
  appUrl: string;
  deliveryDueAt?: Date | null;
}): EmailPayload {
  const s = emailStrings(opts.locale);
  const roleLabel = emailAssignmentRoleLabelInline(opts.role, opts.locale);
  const meta: { label: string; value: string }[] = [
    {
      label: s.assignment.caseLabel,
      value: `${opts.caseNumber} — ${opts.caseTitle}`,
    },
    { label: s.assignment.roleLabel, value: roleLabel },
  ];
  if (opts.deliveryDueAt && opts.role === "expert") {
    meta.push({
      label: s.assignment.deliveryDueLabel,
      value: opts.deliveryDueAt.toLocaleDateString(
        opts.locale === "en" ? "en-US" : "es-MX",
        { weekday: "short", year: "numeric", month: "short", day: "numeric" },
      ),
    });
  }
  const bodyHtml = `
    <p style="margin:0 0 12px;font-size:17px;">${escapeHtml(interpolateEmail(s.assignment.greeting, { name: opts.firstName }))}</p>
    <p style="margin:0 0 8px;color:${EMAIL_BRAND.muted};">${escapeHtml(s.assignment.intro)}</p>
    ${metaCard(meta)}`;

  const dueText =
    opts.deliveryDueAt && opts.role === "expert"
      ? `\n${s.assignment.deliveryDueLabel}: ${meta[meta.length - 1]?.value ?? ""}`
      : "";

  return {
    subject: interpolateEmail(s.subjects.assignment, {
      caseNumber: opts.caseNumber,
    }),
    html: emailShell({
      locale: opts.locale,
      preheader: s.assignment.preheader,
      title: s.assignment.title,
      bodyHtml,
      cta: { label: s.assignment.cta, url: opts.caseUrl },
      appUrl: opts.appUrl,
    }),
    text: `${interpolateEmail(s.assignment.greeting, { name: opts.firstName })}\n\n${s.assignment.intro}\n\n${opts.caseNumber} — ${opts.caseTitle}\n${roleLabel}${dueText}\n\n${opts.caseUrl}`,
  };
}

function buildCaseStatusEmail(opts: {
  locale: AppLocale;
  firstName: string;
  caseNumber: string;
  caseTitle: string;
  fromStatus: string;
  toStatus: string;
  caseUrl: string;
  appUrl: string;
}): EmailPayload {
  const s = emailStrings(opts.locale);
  const bodyHtml = `
    <p style="margin:0 0 12px;font-size:17px;">${escapeHtml(interpolateEmail(s.caseStatus.greeting, { name: opts.firstName }))}</p>
    <p style="margin:0 0 8px;color:${EMAIL_BRAND.muted};">${escapeHtml(s.caseStatus.intro)}</p>
    ${metaCard([
      {
        label: s.caseStatus.caseLabel,
        value: `${opts.caseNumber} — ${opts.caseTitle}`,
      },
      { label: s.caseStatus.fromLabel, value: opts.fromStatus },
      { label: s.caseStatus.toLabel, value: opts.toStatus },
    ])}`;

  return {
    subject: interpolateEmail(s.subjects.caseStatus, {
      caseNumber: opts.caseNumber,
    }),
    html: emailShell({
      locale: opts.locale,
      preheader: s.caseStatus.preheader,
      title: s.caseStatus.title,
      bodyHtml,
      cta: { label: s.caseStatus.cta, url: opts.caseUrl },
      appUrl: opts.appUrl,
    }),
    text: `${interpolateEmail(s.caseStatus.greeting, { name: opts.firstName })}\n\n${s.caseStatus.intro}\n\n${opts.caseNumber}\n${opts.fromStatus} → ${opts.toStatus}\n\n${opts.caseUrl}`,
  };
}

function buildReportDeliveredEmail(opts: {
  locale: AppLocale;
  firstName: string;
  caseNumber: string;
  caseTitle: string;
  caseUrl: string;
  appUrl: string;
}): EmailPayload {
  const s = emailStrings(opts.locale);
  const bodyHtml = `
    <p style="margin:0 0 12px;font-size:17px;">${escapeHtml(interpolateEmail(s.reportDelivered.greeting, { name: opts.firstName }))}</p>
    <p style="margin:0 0 8px;color:${EMAIL_BRAND.muted};">${escapeHtml(s.reportDelivered.intro)}</p>
    ${metaCard([
      {
        label: s.reportDelivered.caseLabel,
        value: `${opts.caseNumber} — ${opts.caseTitle}`,
      },
    ])}
    <div style="margin:16px 0 0;padding:14px 16px;background:${EMAIL_BRAND.successBg};border-radius:10px;border-left:3px solid ${EMAIL_BRAND.success};font-size:13px;color:${EMAIL_BRAND.success};font-weight:600;">
      ${opts.locale === "es" ? "Listo para revisar en el portal." : "Ready to review in the portal."}
    </div>`;

  return {
    subject: interpolateEmail(s.subjects.reportDelivered, {
      caseNumber: opts.caseNumber,
    }),
    html: emailShell({
      locale: opts.locale,
      preheader: s.reportDelivered.preheader,
      title: s.reportDelivered.title,
      bodyHtml,
      cta: { label: s.reportDelivered.cta, url: opts.caseUrl },
      appUrl: opts.appUrl,
    }),
    text: `${interpolateEmail(s.reportDelivered.greeting, { name: opts.firstName })}\n\n${s.reportDelivered.intro}\n\n${opts.caseNumber} — ${opts.caseTitle}\n\n${opts.caseUrl}`,
  };
}

function buildNewCaseIntakeEmail(opts: {
  locale: AppLocale;
  firstName: string;
  caseNumber: string;
  caseTitle: string;
  caseUrl: string;
  appUrl: string;
}): EmailPayload {
  const s = emailStrings(opts.locale);
  const bodyHtml = `
    <p style="margin:0 0 12px;font-size:17px;">${escapeHtml(interpolateEmail(s.newCaseIntake.greeting, { name: opts.firstName }))}</p>
    <p style="margin:0 0 8px;color:${EMAIL_BRAND.muted};">${escapeHtml(s.newCaseIntake.intro)}</p>
    ${metaCard([
      { label: s.newCaseIntake.caseLabel, value: opts.caseNumber },
      { label: s.newCaseIntake.titleLabel, value: opts.caseTitle },
    ])}`;

  return {
    subject: interpolateEmail(s.subjects.newCaseIntake, {
      caseNumber: opts.caseNumber,
    }),
    html: emailShell({
      locale: opts.locale,
      preheader: s.newCaseIntake.preheader,
      title: s.newCaseIntake.title,
      bodyHtml,
      cta: { label: s.newCaseIntake.cta, url: opts.caseUrl },
      appUrl: opts.appUrl,
    }),
    text: `${interpolateEmail(s.newCaseIntake.greeting, { name: opts.firstName })}\n\n${s.newCaseIntake.intro}\n\n${opts.caseNumber} — ${opts.caseTitle}\n\n${opts.caseUrl}`,
  };
}

/** Generic dual-channel ops email for in-app notification types. */
function buildOpsNotificationEmail(opts: {
  locale: AppLocale;
  firstName: string;
  notificationType: NotificationType;
  title: string;
  body: string;
  caseNumber?: string | null;
  ctaUrl?: string | null;
  appUrl: string;
}): EmailPayload {
  const tone = toneForNotificationType(opts.notificationType);
  const greeting =
    opts.locale === "es" ? `Hola ${opts.firstName},` : `Hi ${opts.firstName},`;
  const ctaLabel =
    opts.locale === "es" ? "Abrir en DELACHE" : "Open in DELACHE";
  const preheader = opts.body.slice(0, 120);
  const typeLabel = opts.notificationType.replace(/_/g, " ");
  const metaRows = [
    {
      label: opts.locale === "es" ? "Alerta" : "Alert",
      value: typeLabel,
    },
  ];
  if (opts.caseNumber) {
    metaRows.push({
      label: opts.locale === "es" ? "Expediente" : "Case",
      value: opts.caseNumber,
    });
  }
  const bannerText =
    opts.locale === "es"
      ? "Tienes una actualización en DELACHE"
      : "You have an update in DELACHE";
  const bodyHtml = `
    ${highlightBanner(bannerText, tone === "info" ? "info" : tone)}
    <p style="margin:0 0 12px;font-size:17px;font-weight:600;">${escapeHtml(greeting)}</p>
    <p style="margin:0 0 8px;font-size:16px;font-weight:700;color:${EMAIL_BRAND.text};">${escapeHtml(opts.title)}</p>
    <p style="margin:0 0 8px;color:${EMAIL_BRAND.muted};">${escapeHtml(opts.body)}</p>
    ${metaCard(metaRows)}`;

  return {
    subject: opts.title,
    html: emailShell({
      locale: opts.locale,
      preheader,
      title: opts.title,
      bodyHtml,
      cta: opts.ctaUrl
        ? { label: ctaLabel, url: opts.ctaUrl }
        : { label: ctaLabel, url: opts.appUrl },
      appUrl: opts.appUrl,
    }),
    text: `${greeting}\n\n${opts.title}\n\n${opts.body}\n\n${opts.ctaUrl || opts.appUrl}`,
  };
}

// ============================================================================
// CONFIG
// ============================================================================

const JWT_SECRET = process.env.JWT_SECRET || "";
const OTP_TTL_MIN = Number(process.env.OTP_TTL_MINUTES || 10);
const SESSION_TTL_DAYS = Number(process.env.SESSION_TTL_DAYS || 30);
/** Inlined from shared/appUrlRules.ts — keep in sync (no runtime import from shared/). */
function resolvePublicAppUrlInline(env: {
  APP_URL?: string | null;
  PUBLIC_APP_URL?: string | null;
  VITE_PUBLIC_APP_URL?: string | null;
  VERCEL_PROJECT_PRODUCTION_URL?: string | null;
  VERCEL_URL?: string | null;
  VERCEL_ENV?: string | null;
  NODE_ENV?: string | null;
}): string {
  const normalize = (raw: string) => raw.trim().replace(/\/$/, "");
  const withHttps = (hostOrUrl: string) => {
    const trimmed = hostOrUrl.trim().replace(/\/$/, "");
    if (/^https?:\/\//i.test(trimmed)) return normalize(trimmed);
    return normalize(`https://${trimmed}`);
  };
  const isLocal = (url: string) => {
    try {
      const host = new URL(url).hostname.toLowerCase();
      return host === "localhost" || host === "127.0.0.1" || host === "::1";
    } catch {
      return /localhost|127\.0\.0\.1/i.test(url);
    }
  };
  const skipLocal =
    env.VERCEL_ENV === "production" ||
    env.VERCEL_ENV === "preview" ||
    (env.NODE_ENV === "production" &&
      env.VERCEL_ENV !== "preview" &&
      env.VERCEL_ENV !== "development");
  for (const candidate of [
    env.APP_URL,
    env.PUBLIC_APP_URL,
    env.VITE_PUBLIC_APP_URL,
  ]) {
    if (typeof candidate === "string" && candidate.trim()) {
      const origin = withHttps(candidate);
      if (skipLocal && isLocal(origin)) continue;
      return origin;
    }
  }
  if (env.VERCEL_PROJECT_PRODUCTION_URL?.trim()) {
    return withHttps(env.VERCEL_PROJECT_PRODUCTION_URL);
  }
  if (env.VERCEL_URL?.trim()) {
    return withHttps(env.VERCEL_URL);
  }
  return normalize("http://localhost:8080");
}

/** Inlined from shared/appUrlRules.ts — email logo/asset origin (no shared runtime import). */
function resolveEmailAssetBaseUrlInline(
  appUrl: string,
  opts: { publicAssetOrigin?: string | null } = {},
): string {
  const normalize = (raw: string) => raw.trim().replace(/\/$/, "");
  const withHttps = (hostOrUrl: string) => {
    const trimmed = hostOrUrl.trim().replace(/\/$/, "");
    if (/^https?:\/\//i.test(trimmed)) return normalize(trimmed);
    return normalize(`https://${trimmed}`);
  };
  const isLocal = (url: string) => {
    try {
      const host = new URL(url).hostname.toLowerCase();
      return host === "localhost" || host === "127.0.0.1" || host === "::1";
    } catch {
      return /localhost|127\.0\.0\.1/i.test(url);
    }
  };
  const origin = normalize(appUrl);
  if (!isLocal(origin)) return origin;
  const override =
    typeof opts.publicAssetOrigin === "string"
      ? opts.publicAssetOrigin.trim()
      : "";
  if (override) {
    const resolved = withHttps(override);
    if (!isLocal(resolved)) return resolved;
  }
  return "https://www.delache.mx";
}

/** Inlined from shared/emailLabels.ts — keep in sync. */
function emailStaffRoleLabelInline(
  role: string,
  locale: AppLocale = "es",
): string {
  if (!role?.trim()) return role;
  const key = role.trim().toLowerCase();
  const es: Record<string, string> = {
    admin: "Admin",
    expert: "Perito",
    legal: "Legal",
    logistics: "Logística",
    accountant: "Contador",
    law_firm_user: "Despacho",
  };
  const en: Record<string, string> = {
    admin: "Admin",
    expert: "Expert",
    legal: "Legal",
    logistics: "Logistics",
    accountant: "Accountant",
    law_firm_user: "Law firm",
  };
  const map = locale === "en" ? en : es;
  return map[key] ?? es[key] ?? role.trim();
}

function emailAssignmentRoleLabelInline(
  role: string,
  locale: AppLocale = "es",
): string {
  if (!role?.trim()) return role;
  const key = role.trim().toLowerCase();
  const es: Record<string, string> = {
    expert: "Perito",
    coordinator: "Coordinador",
    legal_reviewer: "Revisor legal",
    logistics: "Logística",
    accountant: "Contador",
    qa: "QA",
    technical_director: "Director técnico",
    observer: "Observador",
  };
  const en: Record<string, string> = {
    expert: "Expert",
    coordinator: "Coordinator",
    legal_reviewer: "Legal reviewer",
    logistics: "Logistics",
    accountant: "Accountant",
    qa: "QA",
    technical_director: "Technical director",
    observer: "Observer",
  };
  const map = locale === "en" ? en : es;
  return map[key] ?? es[key] ?? role.trim();
}

/** Inlined from shared/notificationCopy.ts — keep in sync. */
function assignmentNotificationCopyInline(opts: {
  locale: AppLocale;
  caseNumber: string;
  role: string;
  deliveryDueAt?: Date | null;
}): { title: string; body: string } {
  const roleLabel = emailAssignmentRoleLabelInline(opts.role, opts.locale);
  const dueLine =
    opts.deliveryDueAt && opts.role === "expert"
      ? opts.deliveryDueAt.toLocaleDateString(
          opts.locale === "en" ? "en-US" : "es-MX",
          {
            weekday: "short",
            year: "numeric",
            month: "short",
            day: "numeric",
          },
        )
      : null;
  if (opts.locale === "en") {
    return {
      title: `Assigned to ${opts.caseNumber}`,
      body: dueLine
        ? `You were assigned as ${roleLabel} on case ${opts.caseNumber}. Deliver by ${dueLine}.`
        : `You were assigned as ${roleLabel} on case ${opts.caseNumber}.`,
    };
  }
  return {
    title: `Asignado a ${opts.caseNumber}`,
    body: dueLine
      ? `Te asignaron como ${roleLabel} en el expediente ${opts.caseNumber}. Entrega antes del ${dueLine}.`
      : `Te asignaron como ${roleLabel} en el expediente ${opts.caseNumber}.`,
  };
}

function expertDeliverySetNotificationCopyInline(opts: {
  locale: AppLocale;
  caseNumber: string;
  dueAt: Date;
}): { title: string; body: string } {
  const due = opts.dueAt.toLocaleDateString(
    opts.locale === "en" ? "en-US" : "es-MX",
    {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    },
  );
  if (opts.locale === "en") {
    return {
      title: `Delivery date · ${opts.caseNumber}`,
      body: `Your delivery deadline for case ${opts.caseNumber} is ${due}.`,
    };
  }
  return {
    title: `Fecha de entrega · ${opts.caseNumber}`,
    body: `Tu fecha de entrega para el expediente ${opts.caseNumber} es el ${due}.`,
  };
}

function expertDeliveryClearNotificationCopyInline(opts: {
  locale: AppLocale;
  caseNumber: string;
}): { title: string; body: string } {
  if (opts.locale === "en") {
    return {
      title: `Delivery date cleared · ${opts.caseNumber}`,
      body: `The delivery deadline for case ${opts.caseNumber} was removed.`,
    };
  }
  return {
    title: `Fecha de entrega eliminada · ${opts.caseNumber}`,
    body: `Se eliminó la fecha de entrega del expediente ${opts.caseNumber}.`,
  };
}

function parseExpertDeliveryDueDateInputInline(
  raw: unknown,
):
  | { ok: true; dueAt: Date }
  | { ok: false; error: string } {
  if (raw == null || raw === "") {
    return { ok: false, error: "deliveryDueAt is required" };
  }
  const text = String(raw).trim();
  if (!text) {
    return { ok: false, error: "deliveryDueAt is required" };
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const dueAt = new Date(`${text}T23:59:59`);
    if (Number.isNaN(dueAt.getTime())) {
      return { ok: false, error: "deliveryDueAt must be a valid date" };
    }
    return { ok: true, dueAt };
  }
  const dueAt = new Date(text);
  if (Number.isNaN(dueAt.getTime())) {
    return { ok: false, error: "deliveryDueAt must be a valid date" };
  }
  return { ok: true, dueAt };
}

const EXPERT_DELIVERY_DEADLINE_TYPE = "expert_delivery";
const EXPERT_DELIVERY_DEADLINE_TITLE = "Expert case delivery";
const EXPERT_DELIVERY_DEADLINE_TITLE_ES = "Entrega del expediente (perito)";

function expertDeliveryDeadlineTitleInline(locale: AppLocale): string {
  return locale === "en"
    ? EXPERT_DELIVERY_DEADLINE_TITLE
    : EXPERT_DELIVERY_DEADLINE_TITLE_ES;
}

const APP_URL = resolvePublicAppUrlInline({
  APP_URL: process.env.APP_URL,
  PUBLIC_APP_URL: process.env.PUBLIC_APP_URL,
  VITE_PUBLIC_APP_URL: process.env.VITE_PUBLIC_APP_URL,
  VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
  VERCEL_URL: process.env.VERCEL_URL,
  VERCEL_ENV: process.env.VERCEL_ENV,
  NODE_ENV: process.env.NODE_ENV,
});
/** Public origin for email CTAs/links (never localhost — clients cannot open it). */
const EMAIL_APP_URL = resolveEmailAssetBaseUrlInline(APP_URL, {
  publicAssetOrigin:
    process.env.EMAIL_ASSET_BASE_URL ||
    process.env.PUBLIC_APP_URL ||
    process.env.APP_URL,
});
const FROM_EMAIL =
  process.env.SMTP_FROM || "DELACHE <no-reply@disruptinglabs.com>";

const REQUIRED_DB_VARS = [
  "DB_HOST",
  "DB_PORT",
  "DB_USER",
  "DB_PASSWORD",
  "DB_NAME",
] as const;
const MISSING_DB_VARS = REQUIRED_DB_VARS.filter((k) => !process.env[k]?.trim());

let pool: Pool | null = null;

const UPLOAD_JSON_PATH_PREFIXES = [
  "/api/cases/",
  "/api/uploads",
] as const;

function wantsLargeJsonBody(req: Request): boolean {
  const path = req.path || "";
  if (path === "/api/uploads") return true;
  if (!UPLOAD_JSON_PATH_PREFIXES.some((p) => path.startsWith(p))) return false;
  return (
    path.includes("/documents") ||
    path.includes("/evidence") ||
    path === "/api/uploads"
  );
}

async function loadOtpRateBucket(
  rateKey: string,
): Promise<OtpRateLimitBucket | null> {
  const db = getPool();
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT window_started_at, attempt_count
       FROM otp_request_rate_limits
      WHERE rate_key = ?
      LIMIT 1`,
    [rateKey],
  );
  if (rows.length === 0) return null;
  return {
    count: Number(rows[0].attempt_count) || 0,
    windowStartedAt: new Date(
      rows[0].window_started_at as string | Date,
    ).getTime(),
  };
}

async function saveOtpRateBucket(
  rateKey: string,
  bucket: OtpRateLimitBucket,
): Promise<void> {
  const db = getPool();
  await db.query<ResultSetHeader>(
    `INSERT INTO otp_request_rate_limits (rate_key, window_started_at, attempt_count)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE
       window_started_at = VALUES(window_started_at),
       attempt_count = VALUES(attempt_count)`,
    [
      rateKey,
      toMysqlDateTimeUtc(new Date(bucket.windowStartedAt)),
      bucket.count,
    ],
  );
}

/**
 * Independent email + IP buckets. Use chargeIp / chargeEmail to control which
 * counters increment (IP on every request; email only after eligibility).
 */
async function enforceOtpRequestRateLimits(opts: {
  email: string;
  ip: string | undefined;
  portal: "staff" | "client" | "unified";
  chargeIp: boolean;
  chargeEmail: boolean;
}): Promise<
  { ok: true } | { ok: false; error: string; retryAfterSec: number }
> {
  // Optimum-credit pattern: under VITEST, never send real OTP email (sendEmail
  // no-ops) and do not enforce sticky IP/email rate buckets — shared TiDB keys
  // from prior suite runs otherwise flake as 429 on localhost.
  if (!shouldEnforceOtpRateLimits(process.env.VITEST)) {
    return { ok: true };
  }

  const now = Date.now();
  const ipKey = buildOtpRateLimitKey({
    scope: "ip",
    portal: opts.portal,
    value: opts.ip || "unknown",
  });
  const emailKey = buildOtpRateLimitKey({
    scope: "email",
    portal: opts.portal,
    value: opts.email,
  });

  const [ipBucket, emailBucket] = await Promise.all([
    loadOtpRateBucket(ipKey),
    loadOtpRateBucket(emailKey),
  ]);

  const ipPeek = peekOtpRateLimit(ipBucket, now, {
    maxAttempts: OTP_IP_RATE_LIMIT_MAX_ATTEMPTS,
    windowMs: OTP_RATE_LIMIT_WINDOW_MS,
  });
  if (ipPeek.ok === false) {
    return {
      ok: false,
      error: ipPeek.error,
      retryAfterSec: ipPeek.retryAfterSec,
    };
  }
  const emailPeek = peekOtpRateLimit(emailBucket, now, {
    maxAttempts: OTP_RATE_LIMIT_MAX_ATTEMPTS,
    windowMs: OTP_RATE_LIMIT_WINDOW_MS,
  });
  if (emailPeek.ok === false) {
    return {
      ok: false,
      error: emailPeek.error,
      retryAfterSec: emailPeek.retryAfterSec,
    };
  }

  if (opts.chargeIp) {
    const ipNext = resolveOtpRateLimit(ipBucket, now, {
      maxAttempts: OTP_IP_RATE_LIMIT_MAX_ATTEMPTS,
      windowMs: OTP_RATE_LIMIT_WINDOW_MS,
    });
    await saveOtpRateBucket(ipKey, ipNext.nextBucket);
  }

  if (opts.chargeEmail) {
    const emailNext = resolveOtpRateLimit(emailBucket, now, {
      maxAttempts: OTP_RATE_LIMIT_MAX_ATTEMPTS,
      windowMs: OTP_RATE_LIMIT_WINDOW_MS,
    });
    await saveOtpRateBucket(emailKey, emailNext.nextBucket);
  }

  return { ok: true };
}

async function putPrivateBlob(
  pathname: string,
  buffer: Buffer,
  contentType?: string,
): Promise<{ url: string; pathname: string }> {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const blob = await put(pathname, buffer, {
    access: "private",
    contentType: contentType || undefined,
    token,
  });
  return { url: blob.url, pathname: blob.pathname };
}

async function signBlobUrlForClient(storageKey: string): Promise<string> {
  if (!storageKey || !isPrivateBlobUrl(storageKey)) return storageKey;
  const pathname = blobPathnameFromUrl(storageKey);
  if (!pathname) return storageKey;
  try {
    const token = await issueSignedToken({
      pathname,
      operations: ["get"],
      validUntil: Date.now() + 60 * 60 * 1000,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    const { presignedUrl } = await presignUrl(token, {
      pathname,
      operation: "get",
      access: "private",
      validUntil: Date.now() + BLOB_SIGNED_URL_TTL_MS,
    });
    return presignedUrl;
  } catch (err) {
    apiLogger.warn("blob sign failed; returning stored key", err);
    return storageKey;
  }
}

async function fetchBlobBytes(storageKey: string): Promise<Buffer | null> {
  try {
    if (isPrivateBlobUrl(storageKey)) {
      const result = await get(storageKey, {
        access: "private",
        token: process.env.BLOB_READ_WRITE_TOKEN,
      });
      if (!result?.stream) return null;
      const reader = result.stream.getReader();
      const chunks: Buffer[] = [];
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) chunks.push(Buffer.from(value));
      }
      return Buffer.concat(chunks);
    }
    if (!isAllowedBlobFetchUrl(storageKey)) {
      apiLogger.warn("blob fetch blocked: host not allowlisted");
      return null;
    }
    const fetched = await fetch(storageKey);
    if (!fetched.ok) return null;
    return Buffer.from(await fetched.arrayBuffer());
  } catch (err) {
    apiLogger.warn("blob fetch failed", err);
    return null;
  }
}

async function safeDeleteBlobs(urls: string[]): Promise<void> {
  const cleaned = urls.map((u) => String(u || "").trim()).filter(Boolean);
  if (cleaned.length === 0) return;
  try {
    await del(cleaned, { token: process.env.BLOB_READ_WRITE_TOKEN });
  } catch (err) {
    apiLogger.warn("blob cleanup failed", err);
  }
}

function getPool(): Pool {
  if (!pool) {
    if (MISSING_DB_VARS.length > 0) {
      throw new Error(`Missing DB env: ${MISSING_DB_VARS.join(", ")}`);
    }
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 5,
      // UTC so session/OTP datetimes match UTC_TIMESTAMP() / toMysqlDateTimeUtc.
      timezone: "+00:00",
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
      connectTimeout: 60000,
      ssl:
        process.env.DB_SSL === "false"
          ? undefined
          : { minVersion: "TLSv1.2" as const },
    });
  }
  return pool;
}

async function getSetting(key: string, fallback = ""): Promise<string> {
  const db = getPool();
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT setting_value FROM system_settings WHERE setting_key = ? LIMIT 1`,
    [key],
  );
  if (rows.length === 0 || rows[0].setting_value == null) return fallback;
  return String(rows[0].setting_value);
}

async function setSetting(key: string, value: string): Promise<void> {
  const db = getPool();
  await db.query<ResultSetHeader>(
    `INSERT INTO system_settings (setting_key, setting_value)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
    [key, value],
  );
}

async function getLoginAllowedRoles(): Promise<Set<string>> {
  const raw = await getSetting("login_allowed_roles", "admin");
  return new Set(
    raw
      .split(",")
      .map((r) => r.trim())
      .filter(Boolean),
  );
}

async function allocateCaseNumber(): Promise<string> {
  const db = getPool();
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [formatRows] = await conn.query<RowDataPacket[]>(
      `SELECT setting_value FROM system_settings WHERE setting_key = 'case_number_format' LIMIT 1 FOR UPDATE`,
    );
    const [seqRows] = await conn.query<RowDataPacket[]>(
      `SELECT setting_value FROM system_settings WHERE setting_key = 'case_number_next_seq' LIMIT 1 FOR UPDATE`,
    );
    const format =
      (formatRows[0]?.setting_value as string) || "DEL-{YYYY}-{SEQ:4}";
    const seq = Number(seqRows[0]?.setting_value || 1);
    const caseNumber = renderCaseNumber(format, seq);
    await conn.query<ResultSetHeader>(
      `UPDATE system_settings SET setting_value = ? WHERE setting_key = 'case_number_next_seq'`,
      [String(seq + 1)],
    );
    await conn.commit();
    return caseNumber;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

function toIso(value: unknown): string | null {
  if (!value) return null;
  return new Date(value as string | Date).toISOString();
}

function mapCaseSummary(row: RowDataPacket): CaseSummary {
  return {
    id: row.id as number,
    publicUuid: row.public_uuid as string,
    caseNumber: row.case_number as string,
    title: row.title as string,
    status: row.status as CaseStatus,
    priority: row.priority as CasePriority,
    courtName: (row.court_name as string | null) ?? null,
    propertyCity: (row.property_city as string | null) ?? null,
    propertyState: (row.property_state as string | null) ?? null,
    lawFirmId: (row.law_firm_id as number | null) ?? null,
    lawFirmName: (row.law_firm_name as string | null) ?? null,
    assignedExpertId: (row.assigned_expert_id as number | null) ?? null,
    primaryExpertName: (row.primary_expert_name as string | null) ?? null,
    inspectionDeadlineAt: toIso(row.inspection_deadline_at),
    externalCourtDeadlineAt: toIso(row.external_court_deadline_at),
    dictamenDueAt: toIso(row.dictamen_due_at),
    involvesFatality: Boolean(row.involves_fatality),
    createdAt: toIso(row.created_at) || new Date().toISOString(),
    updatedAt: toIso(row.updated_at) || new Date().toISOString(),
  };
}

function mapCaseDetail(row: RowDataPacket): CaseDetail {
  return {
    ...mapCaseSummary(row),
    description: (row.description as string | null) ?? null,
    externalReference: (row.external_reference as string | null) ?? null,
    courtFileNumber: (row.court_file_number as string | null) ?? null,
    plaintiffName: (row.plaintiff_name as string | null) ?? null,
    defendantName: (row.defendant_name as string | null) ?? null,
    propertyAddress: (row.property_address as string | null) ?? null,
    propertyPostalCode: (row.property_postal_code as string | null) ?? null,
    propertyCountry: (row.property_country as string) || "MX",
    propertyLat: row.property_lat != null ? Number(row.property_lat) : null,
    propertyLng: row.property_lng != null ? Number(row.property_lng) : null,
    assignedCoordinatorId:
      (row.assigned_coordinator_id as number | null) ?? null,
    intakeReceivedAt: toIso(row.intake_received_at),
    completedAt: toIso(row.completed_at),
    streetViewValidatedAt: toIso(row.street_view_validated_at),
    documentsHandoffConfirmedAt: toIso(row.documents_handoff_confirmed_at),
    expedienteApprovedAt: toIso(row.expediente_approved_at),
    ratificationScheduledAt: toIso(row.ratification_scheduled_at),
    protestaModality:
      row.protesta_modality === "presencial" ||
      row.protesta_modality === "virtual"
        ? row.protesta_modality
        : null,
  };
}

let resendClient: Resend | null = null;
if (process.env.RESEND_API_KEY) {
  resendClient = new Resend(process.env.RESEND_API_KEY);
} else {
  apiLogger.warn("RESEND_API_KEY not set — emails will be logged, not sent");
}

// ============================================================================
// AUTH HELPERS
// ============================================================================

interface JwtPayload {
  actor: AuthActor;
  id: number;
  email: string;
  role?: UserRole;
  jti: string;
}

interface AuthedRequest extends Request {
  auth?: JwtPayload;
}

function mapUserRow(row: RowDataPacket): AuthUser {
  return {
    id: row.id as number,
    publicUuid: row.public_uuid as string,
    email: row.email as string,
    firstName: row.first_name as string,
    lastName: row.last_name as string,
    role: row.role as UserRole,
    actor: "staff",
    status: row.status as UserStatus,
    phone: (row.phone as string | null) ?? null,
    avatarUrl: (row.avatar_url as string | null) ?? null,
    preferredLanguage: normalizeLocale(row.preferred_language as string),
    preferredTheme:
      (row.preferred_theme as AuthUser["preferredTheme"]) || "system",
    showFormHelpers: isShowFormHelpersEnabled(
      row.show_form_helpers as boolean | number | null | undefined,
    ),
    showProcessGuidance: isShowProcessGuidanceEnabled(
      row.show_process_guidance as boolean | number | null | undefined,
    ),
    lastLoginAt: row.last_login_at
      ? new Date(row.last_login_at as string | Date).toISOString()
      : null,
  };
}

function mapLawFirmUserRow(row: RowDataPacket): AuthUser {
  return {
    id: row.id as number,
    publicUuid: row.public_uuid as string,
    email: row.email as string,
    firstName: row.first_name as string,
    lastName: row.last_name as string,
    role: null,
    actor: "law_firm",
    status: row.status as UserStatus,
    phone: (row.phone as string | null) ?? null,
    avatarUrl: (row.avatar_url as string | null) ?? null,
    preferredLanguage: normalizeLocale(row.preferred_language as string),
    preferredTheme:
      (row.preferred_theme as AuthUser["preferredTheme"]) || "system",
    showFormHelpers: isShowFormHelpersEnabled(
      row.show_form_helpers as boolean | number | null | undefined,
    ),
    showProcessGuidance: isShowProcessGuidanceEnabled(
      row.show_process_guidance as boolean | number | null | undefined,
    ),
    lastLoginAt: row.last_login_at
      ? new Date(row.last_login_at as string | Date).toISOString()
      : null,
  };
}

function signSessionToken(payload: Omit<JwtPayload, "jti">) {
  const jti = crypto.randomBytes(16).toString("hex");
  const token = jwt.sign({ ...payload, jti }, JWT_SECRET, {
    expiresIn: `${SESSION_TTL_DAYS}d`,
  });
  return { token, jti };
}

function verifySessionToken(token: string): JwtPayload | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    if (payload.actor !== "staff" && payload.actor !== "law_firm") {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) return header.slice(7);
  return null;
}

function resolveRequestLocale(
  req: Request,
  preferred?: string | null,
  bodyLocale?: string | null,
): AppLocale {
  if (bodyLocale) return normalizeLocale(bodyLocale);
  if (preferred) return normalizeLocale(preferred);
  const fromHeader = localeFromAcceptLanguage(
    req.headers["accept-language"] as string | undefined,
  );
  return fromHeader ?? DEFAULT_LOCALE;
}

function actorSessionTable(actor: AuthActor): {
  table: string;
  idCol: string;
} {
  return actor === "law_firm"
    ? { table: "law_firm_user_sessions", idCol: "law_firm_user_id" }
    : { table: "staff_sessions", idCol: "staff_user_id" };
}

function actorOtpTable(actor: AuthActor): { table: string; idCol: string } {
  return actor === "law_firm"
    ? { table: "law_firm_user_otp_codes", idCol: "law_firm_user_id" }
    : { table: "staff_otp_codes", idCol: "staff_user_id" };
}

async function createOtp(
  actor: AuthActor,
  actorId: number,
  purpose: "login" | "email_verify" | "invite",
  ip?: string,
  userAgent?: string,
): Promise<string> {
  const db = getPool();
  const code = generateOtpCode();
  const expiresAt = toMysqlDateTimeUtc(otpExpiresAt(OTP_TTL_MIN));
  const { table, idCol } = actorOtpTable(actor);
  await db.query<ResultSetHeader>(
    `INSERT INTO ${table}
      (${idCol}, code_hash, channel, purpose, expires_at, ip_address, user_agent)
     VALUES (?, ?, 'email', ?, ?, ?, ?)`,
    [
      actorId,
      sha256(code),
      purpose,
      expiresAt,
      ip || null,
      userAgent?.slice(0, 500) || null,
    ],
  );
  return code;
}

async function consumeOtp(
  actor: AuthActor,
  actorId: number,
  code: string,
  purpose: "login" | "email_verify" | "invite",
): Promise<boolean> {
  const db = getPool();
  const codeHash = sha256(code);
  const { table, idCol } = actorOtpTable(actor);

  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT id, attempts, max_attempts FROM ${table}
     WHERE ${idCol} = ? AND purpose = ?
       AND consumed_at IS NULL AND expires_at > UTC_TIMESTAMP()
     ORDER BY id DESC LIMIT 1`,
    [actorId, purpose],
  );
  if (rows.length === 0) return false;

  const otp = rows[0];
  const attempts = Number(otp.attempts) || 0;
  const maxAttempts = Number(otp.max_attempts) || 5;

  if (attempts >= maxAttempts) return false;

  await db.query<ResultSetHeader>(
    `UPDATE ${table} SET attempts = attempts + 1 WHERE id = ?`,
    [otp.id],
  );

  const [match] = await db.query<RowDataPacket[]>(
    `SELECT id FROM ${table}
     WHERE id = ? AND code_hash = ? AND consumed_at IS NULL AND expires_at > UTC_TIMESTAMP()
     LIMIT 1`,
    [otp.id, codeHash],
  );
  if (match.length === 0) return false;

  await db.query<ResultSetHeader>(
    `UPDATE ${table} SET consumed_at = NOW() WHERE id = ?`,
    [otp.id],
  );
  return true;
}

async function createSession(
  actor: AuthActor,
  user: AuthUser,
  ip?: string,
  userAgent?: string,
): Promise<string> {
  const db = getPool();
  const { token, jti } = signSessionToken({
    actor,
    id: user.id,
    email: user.email,
    ...(actor === "staff" && user.role ? { role: user.role } : {}),
  });
  const { table, idCol } = actorSessionTable(actor);
  await db.query<ResultSetHeader>(
    `INSERT INTO ${table}
      (${idCol}, token_hash, ip_address, user_agent, expires_at)
     VALUES (?, ?, ?, ?, ?)`,
    [
      user.id,
      sha256(jti),
      ip || null,
      userAgent?.slice(0, 500) || null,
      toMysqlDateTimeUtc(sessionExpiresAt(SESSION_TTL_DAYS)),
    ],
  );
  return token;
}

async function isSessionActive(payload: JwtPayload): Promise<boolean> {
  const db = getPool();
  const { table } = actorSessionTable(payload.actor);
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT id FROM ${table}
     WHERE token_hash = ? AND is_active = 1 AND expires_at > UTC_TIMESTAMP()
       AND revoked_at IS NULL
     LIMIT 1`,
    [sha256(payload.jti)],
  );
  return rows.length > 0;
}

async function revokeSession(token: string): Promise<void> {
  const payload = verifySessionToken(token);
  if (!payload) return;
  const db = getPool();
  const { table } = actorSessionTable(payload.actor);
  await db.query<ResultSetHeader>(
    `UPDATE ${table}
     SET is_active = 0, revoked_at = UTC_TIMESTAMP()
     WHERE token_hash = ?`,
    [sha256(payload.jti)],
  );
}

async function attachAuth(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
  predicate: (payload: JwtPayload) => boolean,
  forbiddenMessage?: string,
) {
  if (!JWT_SECRET) {
    return res.status(503).json({ error: "JWT_SECRET not configured" });
  }
  const token = extractToken(req);
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const payload = verifySessionToken(token);
  if (!payload) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const ok = await isSessionActive(payload);
    if (!ok) return res.status(401).json({ error: "Session expired" });

    if (payload.actor === "staff") {
      const db = getPool();
      const [rows] = await db.query<RowDataPacket[]>(
        `SELECT role, status, deleted_at
           FROM staff_users
          WHERE id = ?
          LIMIT 1`,
        [payload.id],
      );
      if (
        rows.length === 0 ||
        rows[0].deleted_at ||
        (rows[0].status !== "active" && rows[0].status !== "invited")
      ) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      payload.role = rows[0].role as UserRole;
    }

    if (payload.actor === "law_firm") {
      const db = getPool();
      const [rows] = await db.query<RowDataPacket[]>(
        `SELECT status, deleted_at
           FROM law_firm_users
          WHERE id = ?
          LIMIT 1`,
        [payload.id],
      );
      if (
        rows.length === 0 ||
        rows[0].deleted_at ||
        rows[0].status !== "active"
      ) {
        return res.status(401).json({ error: "Unauthorized" });
      }
    }

    if (!predicate(payload)) {
      return res.status(403).json({ error: forbiddenMessage || "Forbidden" });
    }
    req.auth = payload;
    next();
  } catch (err) {
    apiLogger.error("auth middleware failed", err);
    return res.status(503).json({ error: "Auth service unavailable" });
  }
}

async function requireAuth(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) {
  return attachAuth(req, res, next, () => true);
}

async function requireStaff(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) {
  return attachAuth(
    req,
    res,
    next,
    (p) => p.actor === "staff",
    "Staff access required",
  );
}

async function requireAdmin(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) {
  return attachAuth(
    req,
    res,
    next,
    (p) => p.actor === "staff" && canManageAdmin(p.role),
    "Admin access required",
  );
}

async function requireFinance(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) {
  return attachAuth(
    req,
    res,
    next,
    (p) => p.actor === "staff" && canManageFinance(p.role),
    "Finance access required",
  );
}

async function requireLawFirm(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) {
  return attachAuth(
    req,
    res,
    next,
    (p) => p.actor === "law_firm",
    "Law firm access required",
  );
}

async function requireStaffOrLawFirm(
  req: AuthedRequest,
  res: Response,
  next: NextFunction,
) {
  return attachAuth(
    req,
    res,
    next,
    (p) => p.actor === "staff" || p.actor === "law_firm",
    "Authentication required",
  );
}

async function lawFirmOwnsCaseRow(
  auth: JwtPayload,
  caseRow: RowDataPacket,
): Promise<boolean> {
  if (auth.actor !== "law_firm") return false;
  const firmId = await getLawFirmIdForUser(auth.id);
  if (firmId == null) return false;
  return Number(caseRow.law_firm_id) === firmId;
}

async function getLawFirmIdForUser(
  lawFirmUserId: number,
): Promise<number | null> {
  const membership = await getLawFirmMembershipForUser(lawFirmUserId);
  return membership?.lawFirmId ?? null;
}

async function getLawFirmMembershipForUser(
  lawFirmUserId: number,
): Promise<{ lawFirmId: number; memberRole: LawFirmMemberRole } | null> {
  const db = getPool();
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT law_firm_id, member_role FROM law_firm_members
     WHERE law_firm_user_id = ? AND deleted_at IS NULL
     LIMIT 1`,
    [lawFirmUserId],
  );
  if (!rows[0]?.law_firm_id) return null;
  const memberRole = String(rows[0].member_role || "member");
  return {
    lawFirmId: Number(rows[0].law_firm_id),
    memberRole: isLawFirmMemberRole(memberRole) ? memberRole : "member",
  };
}

/**
 * Q5-A exclusivity helpers. Soft-deleted same-actor rows can be reactivated;
 * any cross-actor row (incl. soft-deleted) blocks the other actor.
 */
async function lookupEmailActorRows(email: string): Promise<{
  staff: EmailActorRow | null;
  lawFirm: EmailActorRow | null;
}> {
  const db = getPool();
  const [staffRows] = await db.query<RowDataPacket[]>(
    `SELECT id, deleted_at FROM staff_users WHERE email = ? LIMIT 1`,
    [email],
  );
  const [firmRows] = await db.query<RowDataPacket[]>(
    `SELECT id, deleted_at FROM law_firm_users WHERE email = ? LIMIT 1`,
    [email],
  );
  return {
    staff: staffRows[0]
      ? {
          id: Number(staffRows[0].id),
          deleted: staffRows[0].deleted_at != null,
        }
      : null,
    lawFirm: firmRows[0]
      ? {
          id: Number(firmRows[0].id),
          deleted: firmRows[0].deleted_at != null,
        }
      : null,
  };
}

async function lookupEmailActors(email: string): Promise<{
  staffExists: boolean;
  lawFirmExists: boolean;
}> {
  const rows = await lookupEmailActorRows(email);
  return {
    staffExists: rows.staff != null,
    lawFirmExists: rows.lawFirm != null,
  };
}

/** Law-firm write paths (create case, docs, report review). Viewers are blocked. */
async function assertLawFirmCanMutate(
  auth: JwtPayload,
  res: Response,
): Promise<boolean> {
  if (auth.actor !== "law_firm") return true;
  const membership = await getLawFirmMembershipForUser(auth.id);
  if (!membership || !canMutateFirmCaseWork(membership.memberRole)) {
    res.status(403).json({ error: "Read-only firm access" });
    return false;
  }
  return true;
}

async function enrichLawFirmAuthUser(user: AuthUser): Promise<AuthUser> {
  const membership = await getLawFirmMembershipForUser(user.id);
  return {
    ...user,
    memberRole: membership?.memberRole ?? null,
  };
}

async function createNotification(opts: {
  recipientActor: AuthActor;
  recipientId: number;
  caseId?: number | null;
  type?: NotificationType;
  title: string;
  body: string;
  /** Explicit branded email; when omitted, dual-channel ops template is used when allowed. */
  email?: EmailPayload | null;
  /** Skip outbound email (rare). */
  skipEmail?: boolean;
  caseNumber?: string | null;
  caseUrl?: string | null;
  /** Override recipient email (e.g. known law-firm contact). */
  emailTo?: string | null;
}): Promise<void> {
  const db = getPool();
  const publicUuid = generatePublicUuid();
  const type = opts.type || "general";
  await db.query<ResultSetHeader>(
    `INSERT INTO notifications
       (public_uuid, recipient_actor, recipient_id, case_id, channel, notification_type, title, body)
     VALUES (?, ?, ?, ?, 'in_app', ?, ?, ?)`,
    [
      publicUuid,
      opts.recipientActor,
      opts.recipientId,
      opts.caseId ?? null,
      type,
      opts.title,
      opts.body,
    ],
  );

  if (opts.skipEmail) return;

  let payload = opts.email ?? null;
  let to = opts.emailTo?.trim() || null;
  let localeContact: Awaited<ReturnType<typeof getActorContact>> = null;

  if (!to || !payload) {
    localeContact = await getActorContact(
      opts.recipientActor,
      opts.recipientId,
    );
    if (!localeContact) return;
    to = to || localeContact.email;
  }

  if (!payload) {
    if (!shouldDualChannelEmail(type)) return;
    if (!localeContact) {
      localeContact = await getActorContact(
        opts.recipientActor,
        opts.recipientId,
      );
    }
    if (!localeContact) return;
    payload = buildOpsNotificationEmail({
      locale: localeContact.locale,
      firstName: localeContact.firstName,
      notificationType: type,
      title: opts.title,
      body: opts.body,
      caseNumber: opts.caseNumber,
      ctaUrl: opts.caseUrl,
      appUrl: EMAIL_APP_URL,
    });
  }

  if (!to || !payload) return;

  const providerId = await safeSendEmail(to, payload, `notify:${type}`);
  if (providerId === undefined) return;

  await db.query<ResultSetHeader>(
    `UPDATE notifications
     SET email_sent_at = NOW(), email_provider_id = ?
     WHERE public_uuid = ?`,
    [providerId, publicUuid],
  );
}

function mapTechnicalReport(row: RowDataPacket): TechnicalReportItem {
  const status = row.status as TechnicalReportStatus;
  const photoRaw = row.photo_catalog_json;
  let photoCatalogJson: Record<string, unknown> | null = null;
  if (photoRaw && typeof photoRaw === "object") {
    photoCatalogJson = photoRaw as Record<string, unknown>;
  } else if (typeof photoRaw === "string") {
    try {
      photoCatalogJson = JSON.parse(photoRaw) as Record<string, unknown>;
    } catch {
      photoCatalogJson = null;
    }
  }
  return {
    id: row.id as number,
    publicUuid: row.public_uuid as string,
    status,
    versionNumber: Number(row.version_number) || 1,
    investigationSummary: (row.investigation_summary as string | null) ?? null,
    defendantQuestionnaireSummary:
      (row.defendant_questionnaire_summary as string | null) ?? null,
    plaintiffQuestionnaireSummary:
      (row.plaintiff_questionnaire_summary as string | null) ?? null,
    photoCatalogJson,
    conclusions: (row.conclusions as string | null) ?? null,
    submittedAt: toIso(row.submitted_at),
    approvedAt: toIso(row.approved_at),
    deliveredAt: toIso(row.delivered_at),
    createdAt: toIso(row.created_at) || new Date().toISOString(),
    allowedNextStatuses: getAllowedReportStatuses(status),
  };
}

function mapExpense(row: RowDataPacket): LogisticsExpenseItem {
  return {
    id: row.id as number,
    tripId: row.trip_id as number,
    expenseType: row.expense_type as ExpenseType,
    vendorName: (row.vendor_name as string | null) ?? null,
    amount: Number(row.amount) || 0,
    currency: (row.currency as string) || "MXN",
    expenseDate: row.expense_date
      ? String(row.expense_date).slice(0, 10)
      : null,
    notes: (row.notes as string | null) ?? null,
  };
}

function mapEvidenceItem(row: RowDataPacket): EvidenceItem {
  return {
    id: row.id as number,
    publicUuid: row.public_uuid as string,
    inspectionId: (row.inspection_id as number | null) ?? null,
    evidenceType: row.evidence_type as EvidenceItem["evidenceType"],
    category: row.category as EvidenceItem["category"],
    title: (row.title as string | null) ?? null,
    caption: (row.caption as string | null) ?? null,
    storageKey: (row.storage_key as string | null) ?? null,
    mimeType: (row.mime_type as string | null) ?? null,
    fileSizeBytes:
      row.file_size_bytes != null ? Number(row.file_size_bytes) : null,
    capturedAt: toIso(row.captured_at),
    lat: row.lat != null ? Number(row.lat) : null,
    lng: row.lng != null ? Number(row.lng) : null,
    capturedBy: (row.captured_by as number | null) ?? null,
    createdAt: toIso(row.created_at) || new Date().toISOString(),
  };
}

function mapCaseDocumentItem(row: RowDataPacket): CaseDocumentItem {
  return {
    id: row.id as number,
    publicUuid: row.public_uuid as string,
    category: row.category as DocumentCategory,
    title: row.title as string,
    status: row.status as string,
    currentVersion: Number(row.current_version) || 1,
    fileName: (row.file_name as string | null) ?? null,
    mimeType: (row.mime_type as string | null) ?? null,
    storageKey: (row.storage_key as string | null) ?? null,
    fileSizeBytes:
      row.file_size_bytes != null ? Number(row.file_size_bytes) : null,
    ocrStatus: (row.ocr_status as OcrStatus | null) ?? null,
    ocrText: (row.ocr_text as string | null) ?? null,
    ocrProcessedAt: toIso(row.ocr_processed_at),
    approvedAt: toIso(row.approved_at),
    rejectionReason: (row.rejection_reason as string | null) ?? null,
    correctionRequestedAt: toIso(row.correction_requested_at),
    createdAt: toIso(row.created_at) || new Date().toISOString(),
  };
}

async function extractPdfOcrText(buffer: Buffer): Promise<string | null> {
  try {
    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const result = await extractText(pdf, { mergePages: true });
    const raw = result.text;
    const merged = Array.isArray(raw) ? raw.join("\n") : String(raw || "");
    const truncated = truncateOcrText(merged);
    return truncated.length > 0 ? truncated : null;
  } catch (err) {
    apiLogger.warn("PDF OCR extraction failed", err);
    return null;
  }
}

async function resolveUploadOcrFields(
  mimeType: string,
  buffer: Buffer,
): Promise<{
  ocrStatus: OcrStatus;
  ocrText: string | null;
  ocrProcessedAt: Date | null;
}> {
  let ocrStatus = initialOcrStatusForMime(mimeType);
  let ocrText: string | null = null;
  let ocrProcessedAt: Date | null = null;
  if (mimeType.toLowerCase() === "application/pdf") {
    const extracted = await extractPdfOcrText(buffer);
    if (extracted) {
      ocrStatus = "completed";
      ocrText = extracted;
      ocrProcessedAt = new Date();
    }
  }
  return { ocrStatus, ocrText, ocrProcessedAt };
}

async function insertCaseDocumentUpload(
  opts: {
    caseId: number;
    title: string;
    fileName: string;
    contentType: string;
    buffer: Buffer;
    category: DocumentCategory;
    uploadedByStaffId: number | null;
    blobPathPrefix: string;
  },
  conn?: PoolConnection,
): Promise<CaseDocumentItem> {
  const mimeType = opts.contentType || "application/octet-stream";
  const { ocrStatus, ocrText, ocrProcessedAt } = await resolveUploadOcrFields(
    mimeType,
    opts.buffer,
  );

  const safeName = opts.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const pathname = `${opts.blobPathPrefix}/${Date.now()}-${safeName}`;
  const blob = await putPrivateBlob(
    pathname,
    opts.buffer,
    opts.contentType || undefined,
  );

  const db = conn ?? getPool();
  const docUuid = generatePublicUuid();
  const [docResult] = await db.query<ResultSetHeader>(
    `INSERT INTO documents
       (public_uuid, case_id, category, title, current_version, status, uploaded_by)
     VALUES (?, ?, ?, ?, 1, 'uploaded', ?)`,
    [docUuid, opts.caseId, opts.category, opts.title, opts.uploadedByStaffId],
  );
  await db.query<ResultSetHeader>(
    `INSERT INTO document_versions
       (document_id, version_number, storage_key, file_name, mime_type, file_size_bytes,
        uploaded_by, ocr_text, ocr_status, ocr_processed_at)
     VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      docResult.insertId,
      blob.url,
      opts.fileName,
      mimeType,
      opts.buffer.length,
      opts.uploadedByStaffId,
      ocrText,
      ocrStatus,
      ocrProcessedAt ? toMysqlDateTimeUtc(ocrProcessedAt) : null,
    ],
  );

  return {
    id: docResult.insertId,
    publicUuid: docUuid,
    category: opts.category,
    title: opts.title,
    status: "uploaded",
    currentVersion: 1,
    fileName: opts.fileName,
    mimeType,
    storageKey: await signBlobUrlForClient(blob.url),
    fileSizeBytes: opts.buffer.length,
    ocrStatus,
    ocrText,
    ocrProcessedAt: ocrProcessedAt ? ocrProcessedAt.toISOString() : null,
    createdAt: new Date().toISOString(),
  };
}

async function insertCaseDocumentFromExistingBlob(opts: {
  caseId: number;
  title: string;
  fileName: string;
  contentType: string;
  storageKey: string;
  fileSizeBytes: number;
  category: DocumentCategory;
  uploadedByStaffId: number | null;
  uploadedByLawFirmUserId?: number | null;
}): Promise<CaseDocumentItem> {
  const mimeType = opts.contentType || "application/octet-stream";
  let ocrStatus = initialOcrStatusForMime(mimeType);
  let ocrText: string | null = null;
  let ocrProcessedAt: Date | null = null;
  if (
    ocrStatus === "pending" &&
    !shouldUseDirectBlobUpload(opts.fileSizeBytes)
  ) {
    const buffer = await fetchBlobBytes(opts.storageKey);
    if (buffer) {
      const ocr = await resolveUploadOcrFields(mimeType, buffer);
      ocrStatus = ocr.ocrStatus;
      ocrText = ocr.ocrText;
      ocrProcessedAt = ocr.ocrProcessedAt;
    }
  }

  const db = getPool();
  const docUuid = generatePublicUuid();
  const [docResult] = await db.query<ResultSetHeader>(
    `INSERT INTO documents
       (public_uuid, case_id, category, title, current_version, status,
        uploaded_by, uploaded_by_law_firm_user_id)
     VALUES (?, ?, ?, ?, 1, 'uploaded', ?, ?)`,
    [
      docUuid,
      opts.caseId,
      opts.category,
      opts.title,
      opts.uploadedByStaffId,
      opts.uploadedByLawFirmUserId ?? null,
    ],
  );
  await db.query<ResultSetHeader>(
    `INSERT INTO document_versions
       (document_id, version_number, storage_key, file_name, mime_type, file_size_bytes,
        uploaded_by, ocr_text, ocr_status, ocr_processed_at)
     VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      docResult.insertId,
      opts.storageKey,
      opts.fileName,
      mimeType,
      opts.fileSizeBytes,
      opts.uploadedByStaffId,
      ocrText,
      ocrStatus,
      ocrProcessedAt ? toMysqlDateTimeUtc(ocrProcessedAt) : null,
    ],
  );

  return {
    id: docResult.insertId,
    publicUuid: docUuid,
    category: opts.category,
    title: opts.title,
    status: "uploaded",
    currentVersion: 1,
    fileName: opts.fileName,
    mimeType,
    storageKey: await signBlobUrlForClient(opts.storageKey),
    fileSizeBytes: opts.fileSizeBytes,
    ocrStatus,
    ocrText,
    ocrProcessedAt: ocrProcessedAt ? ocrProcessedAt.toISOString() : null,
    createdAt: new Date().toISOString(),
  };
}

async function inspectPrivateBlob(
  storageKey: string,
  claimedSize: number,
): Promise<
  | { ok: true; size: number }
  | { ok: false; status: number; error: string }
> {
  try {
    const meta = await head(storageKey, {
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });
    const size = Number(meta.size);
    if (!Number.isFinite(size) || size <= 0 || size > DMS_MAX_FILE_BYTES) {
      return { ok: false, status: 400, error: "Invalid blob size" };
    }
    if (claimedSize > 0 && Math.abs(size - claimedSize) > 512) {
      return { ok: false, status: 400, error: "Blob size does not match" };
    }
    return { ok: true, size };
  } catch (err) {
    apiLogger.warn("blob head failed", err);
    return { ok: false, status: 400, error: "Blob not found" };
  }
}

async function loadEvidenceChecklistForCase(
  caseId: number,
): Promise<EvidenceChecklistStatus> {
  const db = getPool();
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT category FROM evidence_items
     WHERE case_id = ? AND deleted_at IS NULL`,
    [caseId],
  );
  return getEvidenceChecklistStatus(
    rows.map((r) => ({
      category: r.category as EvidenceItem["category"],
    })),
  );
}

async function findCaseByPublicUuid(
  publicUuid: string,
): Promise<RowDataPacket | null> {
  const db = getPool();
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT * FROM cases WHERE public_uuid = ? AND deleted_at IS NULL LIMIT 1`,
    [publicUuid],
  );
  return rows[0] || null;
}

/** Inlined from shared/caseVisibilityRules.ts — keep in sync. */
function canListAllStaffCasesInline(
  role: string | null | undefined,
): boolean {
  return role === "admin";
}

function canCreateStaffCaseInline(role: string | null | undefined): boolean {
  return role === "admin";
}

function staffRoleToAssignmentRolesInline(
  role: string | null | undefined,
): readonly string[] {
  switch (role) {
    case "expert":
      return ["expert"];
    case "legal":
      return ["legal_reviewer"];
    case "logistics":
      return ["logistics"];
    case "accountant":
      return ["accountant"];
    default:
      return [];
  }
}

function buildStaffCaseVisibilityFilterInline(opts: {
  role: string | null | undefined;
  userId: number;
  casesAlias?: string;
}): { sql: string; params: unknown[] } {
  if (canListAllStaffCasesInline(opts.role)) {
    return { sql: "", params: [] };
  }
  const alias = opts.casesAlias || "cases";
  const roles = staffRoleToAssignmentRolesInline(opts.role);
  if (roles.length === 0 || !Number.isFinite(opts.userId) || opts.userId <= 0) {
    return { sql: "1 = 0", params: [] };
  }
  const rolePlaceholders = roles.map(() => "?").join(", ");
  const parts: string[] = [
    `EXISTS (
      SELECT 1 FROM case_assignments a
      WHERE a.case_id = ${alias}.id
        AND a.user_id = ?
        AND a.unassigned_at IS NULL
        AND a.assignment_role IN (${rolePlaceholders})
    )`,
  ];
  const params: unknown[] = [opts.userId, ...roles];
  if (roles.includes("expert")) {
    parts.push(`${alias}.assigned_expert_id = ?`);
    params.push(opts.userId);
  }
  if (roles.includes("coordinator")) {
    parts.push(`${alias}.assigned_coordinator_id = ?`);
    params.push(opts.userId);
  }
  return { sql: `(${parts.join(" OR ")})`, params };
}

function canAccessStaffCaseInline(opts: {
  role: string | null | undefined;
  userId: number;
  assignedExpertId?: number | null;
  assignedCoordinatorId?: number | null;
  activeAssignmentRoles: readonly string[];
}): boolean {
  if (canListAllStaffCasesInline(opts.role)) return true;
  const needed = staffRoleToAssignmentRolesInline(opts.role);
  if (needed.length === 0) return false;
  if (needed.some((r) => opts.activeAssignmentRoles.includes(r))) return true;
  if (
    needed.includes("expert") &&
    opts.assignedExpertId != null &&
    Number(opts.assignedExpertId) === opts.userId
  ) {
    return true;
  }
  if (
    needed.includes("coordinator") &&
    opts.assignedCoordinatorId != null &&
    Number(opts.assignedCoordinatorId) === opts.userId
  ) {
    return true;
  }
  return false;
}

async function staffCanAccessCaseRow(
  auth: { role?: string; id: number },
  caseRow: RowDataPacket,
): Promise<boolean> {
  if (!auth.role) return false;
  if (canListAllStaffCasesInline(auth.role)) return true;
  const db = getPool();
  const [asg] = await db.query<RowDataPacket[]>(
    `SELECT assignment_role FROM case_assignments
     WHERE case_id = ? AND user_id = ? AND unassigned_at IS NULL`,
    [caseRow.id, auth.id],
  );
  return canAccessStaffCaseInline({
    role: auth.role,
    userId: auth.id,
    assignedExpertId: (caseRow.assigned_expert_id as number | null) ?? null,
    assignedCoordinatorId:
      (caseRow.assigned_coordinator_id as number | null) ?? null,
    activeAssignmentRoles: asg.map((r) => String(r.assignment_role)),
  });
}

/** Staff case lookup that enforces assignment visibility (404 when denied). */
async function findStaffAccessibleCase(
  req: AuthedRequest,
  publicUuid: string,
): Promise<RowDataPacket | null> {
  const caseRow = await findCaseByPublicUuid(publicUuid);
  if (!caseRow || !req.auth) return null;
  if (!(await staffCanAccessCaseRow(req.auth, caseRow))) return null;
  return caseRow;
}

function mapAssignment(row: RowDataPacket): CaseAssignmentItem {
  return {
    id: row.id as number,
    userId: row.user_id as number,
    userName: `${row.first_name || ""} ${row.last_name || ""}`.trim(),
    userEmail: (row.email as string) || "",
    assignmentRole: row.assignment_role as AssignmentRole,
    isPrimary: Boolean(row.is_primary),
    assignedAt: toIso(row.assigned_at) || new Date().toISOString(),
    notes: (row.notes as string | null) ?? null,
  };
}

function mapDeadline(row: RowDataPacket): CaseDeadlineItem {
  const dueAt = toIso(row.due_at) || new Date().toISOString();
  const completedAt = toIso(row.completed_at);
  const severity = completedAt
    ? (row.severity_level as DeadlineSeverity) || "safe"
    : computeDeadlineSeverity(new Date(dueAt));
  return {
    id: row.id as number,
    deadlineType: row.deadline_type as CaseDeadlineItem["deadlineType"],
    title: row.title as string,
    dueAt,
    businessDays: row.business_days != null ? Number(row.business_days) : null,
    severityLevel: severity,
    completedAt,
  };
}

async function ensureCourtAcceptanceDeadline(
  caseId: number,
  actorId: number | null,
): Promise<Date> {
  const db = getPool();
  const computed = addBusinessDays(new Date(), 10);
  await db.query<ResultSetHeader>(
    `UPDATE cases
     SET court_acceptance_at = COALESCE(court_acceptance_at, NOW()),
         inspection_deadline_at = COALESCE(inspection_deadline_at, ?)
     WHERE id = ?`,
    [computed, caseId],
  );
  const [caseRows] = await db.query<RowDataPacket[]>(
    `SELECT inspection_deadline_at FROM cases WHERE id = ? LIMIT 1`,
    [caseId],
  );
  const due = caseRows[0]?.inspection_deadline_at
    ? new Date(caseRows[0].inspection_deadline_at as string)
    : computed;
  const [existing] = await db.query<RowDataPacket[]>(
    `SELECT id FROM case_deadlines
     WHERE case_id = ? AND deadline_type = 'inspection' AND completed_at IS NULL
     LIMIT 1`,
    [caseId],
  );
  if (existing.length === 0) {
    await db.query<ResultSetHeader>(
      `INSERT INTO case_deadlines
         (case_id, deadline_type, title, due_at, business_days, severity_level, created_by)
       VALUES (?, 'inspection', 'Inspection within 10 business days', ?, 10, ?, ?)`,
      [caseId, due, computeDeadlineSeverity(due), actorId],
    );
    await db.query<ResultSetHeader>(
      `INSERT INTO calendar_events
         (public_uuid, case_id, event_type, title, starts_at, all_day, created_by)
       VALUES (?, ?, 'deadline', 'Inspection deadline', ?, 1, ?)`,
      [generatePublicUuid(), caseId, due, actorId],
    );
  }
  return due;
}

async function completeTypedDeadlines(
  caseId: number,
  deadlineTypes: readonly string[],
  conn?: PoolConnection,
): Promise<void> {
  if (deadlineTypes.length === 0) return;
  const db = conn ?? getPool();
  const placeholders = deadlineTypes.map(() => "?").join(", ");
  await db.query<ResultSetHeader>(
    `UPDATE case_deadlines
     SET completed_at = COALESCE(completed_at, NOW())
     WHERE case_id = ?
       AND deadline_type IN (${placeholders})
       AND completed_at IS NULL`,
    [caseId, ...deadlineTypes],
  );
}

async function assertLawFirmCanUploadCategory(opts: {
  caseId: number;
  category: string;
}): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const db = getPool();
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT status FROM documents
     WHERE case_id = ? AND category = ? AND deleted_at IS NULL`,
    [opts.caseId, opts.category],
  );
  const statuses = rows.map((r) => r.status as string | null);
  if (!canLawFirmUploadCategory({ existingStatuses: statuses })) {
    return {
      ok: false,
      status: 409,
      error:
        "Document is locked until admin requests correction for this category",
    };
  }
  return { ok: true };
}

async function maybeCompleteIntakeCorrectionDeadline(
  caseId: number,
): Promise<void> {
  const categories = await loadCaseDocumentCategories(caseId);
  if (!getIntakeCompleteness(categories).complete) return;
  await completeTypedDeadlines(caseId, [INTAKE_CORRECTION_DEADLINE_TYPE]);
}

async function clearExpedienteApproval(
  caseId: number,
  conn?: PoolConnection,
): Promise<void> {
  const db = conn ?? getPool();
  await db.query<ResultSetHeader>(
    `UPDATE cases
     SET expediente_approved_at = NULL, expediente_approved_by = NULL
     WHERE id = ? AND expediente_approved_at IS NOT NULL`,
    [caseId],
  );
}

async function loadCaseDocumentApprovalRows(
  caseId: number,
): Promise<DocumentApprovalRow[]> {
  const db = getPool();
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT category, status FROM documents
     WHERE case_id = ? AND deleted_at IS NULL`,
    [caseId],
  );
  return rows.map((r) => ({
    category: String(r.category),
    status: r.status as string | null,
  }));
}

async function fetchMappedCaseDocument(
  documentId: number,
): Promise<CaseDocumentItem | null> {
  const db = getPool();
  const [updated] = await db.query<RowDataPacket[]>(
    `SELECT d.id, d.public_uuid, d.category, d.title, d.status, d.current_version,
            d.approved_at, d.rejection_reason, d.correction_requested_at, d.created_at,
            v.file_name, v.mime_type, v.storage_key, v.file_size_bytes,
            v.ocr_status, v.ocr_text, v.ocr_processed_at
     FROM documents d
     LEFT JOIN document_versions v
       ON v.document_id = d.id AND v.version_number = d.current_version
     WHERE d.id = ?
     LIMIT 1`,
    [documentId],
  );
  if (updated.length === 0) return null;
  return mapCaseDocumentItem(updated[0]);
}

async function notifyLawFirmIntakeCorrection(opts: {
  caseRow: RowDataPacket;
  category: string;
  reason: string | null;
}): Promise<void> {
  const lawFirmId =
    opts.caseRow.law_firm_id != null
      ? Number(opts.caseRow.law_firm_id)
      : null;
  if (!lawFirmId) return;
  const contacts = await listLawFirmContacts(lawFirmId);
  const reasonBit = opts.reason ? ` Reason: ${opts.reason}` : "";
  const title = `Correction requested · ${opts.caseRow.case_number}`;
  const body = `Please re-upload ${opts.category} within 3 business days.${reasonBit}`;
  for (const contact of contacts) {
    await createNotification({
      recipientActor: "law_firm",
      recipientId: contact.id,
      caseId: Number(opts.caseRow.id),
      type: "missing_documents",
      title,
      body,
      emailTo: contact.email,
      caseNumber: String(opts.caseRow.case_number),
      caseUrl: `${EMAIL_APP_URL}/portal/cases/${opts.caseRow.public_uuid}`,
    });
  }
}

async function ensureTypedDeadline(opts: {
  caseId: number;
  deadlineType: string;
  title: string;
  businessDays: number;
  actorId: number | null;
  clampTo?: Date | null;
  conn?: PoolConnection;
}): Promise<void> {
  const db = opts.conn ?? getPool();
  const [existing] = await db.query<RowDataPacket[]>(
    `SELECT id FROM case_deadlines
     WHERE case_id = ? AND deadline_type = ? AND completed_at IS NULL
     LIMIT 1`,
    [opts.caseId, opts.deadlineType],
  );
  if (existing.length > 0) return;

  let due = addBusinessDays(new Date(), opts.businessDays);
  if (opts.clampTo && due.getTime() > opts.clampTo.getTime()) {
    due = opts.clampTo;
  }
  await db.query<ResultSetHeader>(
    `INSERT INTO case_deadlines
       (case_id, deadline_type, title, due_at, business_days, severity_level, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      opts.caseId,
      opts.deadlineType,
      opts.title,
      due,
      opts.businessDays,
      computeDeadlineSeverity(due),
      opts.actorId,
    ],
  );
  await db.query<ResultSetHeader>(
    `INSERT INTO calendar_events
       (public_uuid, case_id, event_type, title, starts_at, all_day, created_by)
     VALUES (?, ?, 'deadline', ?, ?, 1, ?)`,
    [generatePublicUuid(), opts.caseId, opts.title, due, opts.actorId],
  );
}

async function upsertExpertDeliveryDeadline(opts: {
  caseId: number;
  caseNumber: string;
  casePublicUuid: string;
  dueAt: Date;
  actorId: number | null;
  expertUserId: number | null;
  notifyExpert?: boolean;
}): Promise<CaseDeadlineItem> {
  const db = getPool();
  const title = EXPERT_DELIVERY_DEADLINE_TITLE;
  const severity = computeDeadlineSeverity(opts.dueAt);
  const [existing] = await db.query<RowDataPacket[]>(
    `SELECT id FROM case_deadlines
     WHERE case_id = ? AND deadline_type = ? AND completed_at IS NULL
     LIMIT 1`,
    [opts.caseId, EXPERT_DELIVERY_DEADLINE_TYPE],
  );
  if (existing.length > 0) {
    const deadlineId = Number(existing[0].id);
    await db.query<ResultSetHeader>(
      `UPDATE case_deadlines
       SET title = ?, due_at = ?, business_days = NULL, severity_level = ?
       WHERE id = ?`,
      [title, opts.dueAt, severity, deadlineId],
    );
    const [linkedCal] = await db.query<RowDataPacket[]>(
      `SELECT id FROM calendar_events
       WHERE case_deadline_id = ?
       LIMIT 1`,
      [deadlineId],
    );
    if (linkedCal.length > 0) {
      await db.query<ResultSetHeader>(
        `UPDATE calendar_events
         SET title = ?, starts_at = ?
         WHERE case_deadline_id = ?`,
        [title, opts.dueAt, deadlineId],
      );
    } else {
      const [legacyCal] = await db.query<RowDataPacket[]>(
        `SELECT id FROM calendar_events
         WHERE case_id = ? AND event_type = 'deadline' AND title = ?
         LIMIT 1`,
        [opts.caseId, title],
      );
      if (legacyCal.length > 0) {
        await db.query<ResultSetHeader>(
          `UPDATE calendar_events
           SET case_deadline_id = ?, title = ?, starts_at = ?
           WHERE id = ?`,
          [deadlineId, title, opts.dueAt, legacyCal[0].id],
        );
      } else {
        await db.query<ResultSetHeader>(
          `INSERT INTO calendar_events
             (public_uuid, case_id, case_deadline_id, event_type, title, starts_at, all_day, created_by)
           VALUES (?, ?, ?, 'deadline', ?, ?, 1, ?)`,
          [
            generatePublicUuid(),
            opts.caseId,
            deadlineId,
            title,
            opts.dueAt,
            opts.actorId,
          ],
        );
      }
    }
  } else {
    const [deadlineIns] = await db.query<ResultSetHeader>(
      `INSERT INTO case_deadlines
         (case_id, deadline_type, title, due_at, business_days, severity_level, created_by)
       VALUES (?, ?, ?, ?, NULL, ?, ?)`,
      [
        opts.caseId,
        EXPERT_DELIVERY_DEADLINE_TYPE,
        title,
        opts.dueAt,
        severity,
        opts.actorId,
      ],
    );
    const deadlineId = deadlineIns.insertId;
    await db.query<ResultSetHeader>(
      `INSERT INTO calendar_events
         (public_uuid, case_id, case_deadline_id, event_type, title, starts_at, all_day, created_by)
       VALUES (?, ?, ?, 'deadline', ?, ?, 1, ?)`,
      [
        generatePublicUuid(),
        opts.caseId,
        deadlineId,
        title,
        opts.dueAt,
        opts.actorId,
      ],
    );
  }

  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT id, deadline_type, title, due_at, business_days, severity_level, completed_at
     FROM case_deadlines
     WHERE case_id = ? AND deadline_type = ? AND completed_at IS NULL
     ORDER BY id DESC
     LIMIT 1`,
    [opts.caseId, EXPERT_DELIVERY_DEADLINE_TYPE],
  );
  const deadline = mapDeadline(rows[0]);

  const recipientId =
    opts.expertUserId ??
    (await (async () => {
      const [caseRows] = await db.query<RowDataPacket[]>(
        `SELECT assigned_expert_id FROM cases WHERE id = ? LIMIT 1`,
        [opts.caseId],
      );
      const id = caseRows[0]?.assigned_expert_id;
      return id != null ? Number(id) : null;
    })());

  if (opts.notifyExpert !== false && recipientId != null) {
    const assignee = await getActorContact("staff", recipientId);
    const locale = assignee?.locale ?? "es";
    const copy = expertDeliverySetNotificationCopyInline({
      locale,
      caseNumber: opts.caseNumber,
      dueAt: opts.dueAt,
    });
    await createNotification({
      recipientActor: "staff",
      recipientId,
      caseId: opts.caseId,
      type: "general",
      title: copy.title,
      body: copy.body,
      caseNumber: opts.caseNumber,
      caseUrl: `${EMAIL_APP_URL}/portal/cases/${opts.casePublicUuid}`,
      emailTo: assignee?.email,
    });
  }

  return deadline;
}

async function clearExpertDeliveryDeadline(opts: {
  caseId: number;
  caseNumber?: string;
  casePublicUuid?: string;
  expertUserId?: number | null;
  notifyExpert?: boolean;
}): Promise<void> {
  const db = getPool();
  const [activeRows] = await db.query<RowDataPacket[]>(
    `SELECT id FROM case_deadlines
     WHERE case_id = ? AND deadline_type = ? AND completed_at IS NULL`,
    [opts.caseId, EXPERT_DELIVERY_DEADLINE_TYPE],
  );
  for (const row of activeRows) {
    const deadlineId = Number(row.id);
    await db.query<ResultSetHeader>(
      `DELETE FROM calendar_events WHERE case_deadline_id = ?`,
      [deadlineId],
    );
  }
  await db.query<ResultSetHeader>(
    `DELETE FROM calendar_events
     WHERE case_id = ? AND event_type = 'deadline' AND case_deadline_id IS NULL
       AND title IN (?, ?)`,
    [
      opts.caseId,
      EXPERT_DELIVERY_DEADLINE_TITLE,
      EXPERT_DELIVERY_DEADLINE_TITLE_ES,
    ],
  );
  await db.query<ResultSetHeader>(
    `UPDATE case_deadlines
     SET completed_at = UTC_TIMESTAMP()
     WHERE case_id = ? AND deadline_type = ? AND completed_at IS NULL`,
    [opts.caseId, EXPERT_DELIVERY_DEADLINE_TYPE],
  );

  const shouldNotify = opts.notifyExpert !== false;
  const caseNumber = opts.caseNumber?.trim();
  const casePublicUuid = opts.casePublicUuid?.trim();
  if (!shouldNotify || !caseNumber || !casePublicUuid) return;

  let recipientId = opts.expertUserId ?? null;
  if (recipientId == null) {
    const [caseRows] = await db.query<RowDataPacket[]>(
      `SELECT assigned_expert_id FROM cases WHERE id = ? LIMIT 1`,
      [opts.caseId],
    );
    const id = caseRows[0]?.assigned_expert_id;
    recipientId = id != null ? Number(id) : null;
  }
  if (recipientId == null) return;

  const assignee = await getActorContact("staff", recipientId);
  const locale = assignee?.locale ?? "es";
  const copy = expertDeliveryClearNotificationCopyInline({
    locale,
    caseNumber,
  });
  await createNotification({
    recipientActor: "staff",
    recipientId,
    caseId: opts.caseId,
    type: "general",
    title: copy.title,
    body: copy.body,
    caseNumber,
    caseUrl: `${EMAIL_APP_URL}/portal/cases/${casePublicUuid}`,
    emailTo: assignee?.email,
  });
}

async function maybeStartTenDayClock(
  caseRow: RowDataPacket,
  actorId: number | null,
): Promise<void> {
  const status = String(caseRow.status) as CaseStatus;
  const flowIdx = CASE_STATUS_FLOW.indexOf(status);
  const p6Idx = CASE_STATUS_FLOW.indexOf("court_acceptance");
  if (flowIdx < 0 || p6Idx < 0 || flowIdx < p6Idx) return;
  const cats = await loadCaseDocumentCategories(Number(caseRow.id));
  if (!cats.includes("protesta")) return;
  await ensureCourtAcceptanceDeadline(Number(caseRow.id), actorId);
}

async function loadHoldResumeStatus(caseId: number): Promise<CaseStatus> {
  const db = getPool();
  const [holdRows] = await db.query<RowDataPacket[]>(
    `SELECT from_status FROM case_status_history
     WHERE case_id = ? AND to_status = 'on_hold'
     ORDER BY created_at DESC
     LIMIT 1`,
    [caseId],
  );
  const [flowRows] = await db.query<RowDataPacket[]>(
    `SELECT to_status FROM case_status_history
     WHERE case_id = ? AND to_status IN (${CASE_STATUS_FLOW.map(() => "?").join(", ")})
     ORDER BY created_at DESC
     LIMIT 1`,
    [caseId, ...CASE_STATUS_FLOW],
  );
  return resolveHoldResumeStatus(
    (holdRows[0]?.from_status as CaseStatus | undefined) ?? null,
    (flowRows[0]?.to_status as CaseStatus | undefined) ?? null,
  );
}

function mapReviewRequest(row: RowDataPacket): ReviewRequestItem {
  return {
    id: row.id as number,
    caseId: row.case_id as number,
    entityType: row.entity_type as ReviewEntityType,
    entityId: row.entity_id as number,
    reviewStage: row.review_stage as ReviewStage,
    status: row.status as ReviewRequestItem["status"],
    requestedBy: (row.requested_by as number | null) ?? null,
    assignedTo: (row.assigned_to as number | null) ?? null,
    dueAt: toIso(row.due_at),
    completedAt: toIso(row.completed_at),
    notes: (row.notes as string | null) ?? null,
    createdAt: toIso(row.created_at) || new Date().toISOString(),
  };
}

function mapAuditLog(row: RowDataPacket): CaseAuditLogItem {
  return {
    id: Number(row.id),
    publicUuid: row.public_uuid as string,
    actorType: row.actor_type as CaseAuditLogItem["actorType"],
    actorId: (row.actor_id as number | null) ?? null,
    entityType: row.entity_type as string,
    entityId: (row.entity_id as string | null) ?? null,
    action: row.action as string,
    comment: (row.comment as string | null) ?? null,
    createdAt: toIso(row.created_at) || new Date().toISOString(),
  };
}

async function openReviewRequest(opts: {
  caseId: number;
  entityType: ReviewEntityType;
  entityId: number;
  stage: ReviewStage;
  requestedBy: number | null;
  assignedTo?: number | null;
  notes?: string | null;
}): Promise<number> {
  const db = getPool();
  const [existing] = await db.query<RowDataPacket[]>(
    `SELECT id FROM review_requests
     WHERE case_id = ? AND entity_type = ? AND entity_id = ?
       AND review_stage = ? AND status = 'pending'
     LIMIT 1`,
    [opts.caseId, opts.entityType, opts.entityId, opts.stage],
  );
  if (existing.length > 0) return existing[0].id as number;

  const dueAt = addBusinessDays(
    new Date(),
    defaultReviewSlaBusinessDays(opts.stage),
  );
  const [result] = await db.query<ResultSetHeader>(
    `INSERT INTO review_requests
       (case_id, entity_type, entity_id, review_stage, status,
        requested_by, assigned_to, due_at, notes)
     VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?)`,
    [
      opts.caseId,
      opts.entityType,
      opts.entityId,
      opts.stage,
      opts.requestedBy,
      opts.assignedTo ?? null,
      dueAt,
      opts.notes ?? null,
    ],
  );
  return result.insertId;
}

async function createAutoInvoice(opts: {
  caseId: number;
  lawFirmId: number | null;
  invoiceType: "advance" | "final";
  createdBy: number;
  notes: string;
  amount?: number;
}): Promise<number | null> {
  const db = getPool();
  const [existing] = await db.query<RowDataPacket[]>(
    `SELECT id FROM invoices
     WHERE case_id = ? AND invoice_type = ?
       AND status NOT IN ('void', 'paid')
     LIMIT 1`,
    [opts.caseId, opts.invoiceType],
  );
  if (existing.length > 0) return null;

  const totalAmount =
    opts.amount != null && Number.isFinite(opts.amount)
      ? Number(opts.amount)
      : 0;
  const year = new Date().getUTCFullYear();
  const invoiceNumber = `INV-${year}-${Date.now().toString().slice(-8)}`;
  const publicUuid = generatePublicUuid();
  const [result] = await db.query<ResultSetHeader>(
    `INSERT INTO invoices
       (public_uuid, case_id, law_firm_id, invoice_number, invoice_type, status,
        subtotal, tax_amount, total_amount, currency, issued_at, notes, created_by)
     VALUES (?, ?, ?, ?, ?, 'issued', ?, 0, ?, 'MXN', NOW(), ?, ?)`,
    [
      publicUuid,
      opts.caseId,
      opts.lawFirmId,
      invoiceNumber,
      opts.invoiceType,
      totalAmount,
      totalAmount,
      opts.notes,
      opts.createdBy,
    ],
  );
  return result.insertId;
}

function parseJsonField(value: unknown): unknown {
  if (typeof value !== "string") return value ?? null;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

async function loadCaseDocumentCategories(caseId: number): Promise<string[]> {
  const db = getPool();
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT DISTINCT category FROM documents
     WHERE case_id = ? AND deleted_at IS NULL
       AND status NOT IN ('rejected', 'archived')`,
    [caseId],
  );
  return rows.map((r) => String(r.category));
}

async function loadCaseApprovedDocumentCategories(
  caseId: number,
): Promise<string[]> {
  const db = getPool();
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT DISTINCT category FROM documents
     WHERE case_id = ? AND deleted_at IS NULL AND status = 'approved'`,
    [caseId],
  );
  return rows.map((r) => String(r.category));
}

async function loadProcessGateInput(
  caseRow: RowDataPacket,
): Promise<ProcessGateInput> {
  const db = getPool();
  const caseId = caseRow.id as number;
  const documentCategories = await loadCaseDocumentCategories(caseId);
  const approvedDocumentCategories =
    await loadCaseApprovedDocumentCategories(caseId);

  const [evidenceRows] = await db.query<RowDataPacket[]>(
    `SELECT DISTINCT category FROM evidence_items
     WHERE case_id = ? AND deleted_at IS NULL`,
    [caseId],
  );
  const [measurementRows] = await db.query<RowDataPacket[]>(
    `SELECT DISTINCT measurement_type FROM measurements
     WHERE case_id = ?`,
    [caseId],
  );
  const [assignmentRows] = await db.query<RowDataPacket[]>(
    `SELECT id FROM case_assignments
     WHERE case_id = ? AND unassigned_at IS NULL
       AND assignment_role = 'expert' AND is_primary = 1
     LIMIT 1`,
    [caseId],
  );
  const [questionnaireRows] = await db.query<RowDataPacket[]>(
    `SELECT status, content_json, created_at FROM questionnaires
     WHERE case_id = ?`,
    [caseId],
  );
  const [inspectionRows] = await db.query<RowDataPacket[]>(
    `SELECT id FROM inspections
     WHERE case_id = ? AND status = 'completed'
     LIMIT 1`,
    [caseId],
  );
  const [reportRows] = await db.query<RowDataPacket[]>(
    `SELECT status, created_at FROM technical_reports
     WHERE case_id = ?`,
    [caseId],
  );
  const [tripRows] = await db.query<RowDataPacket[]>(
    `SELECT id FROM logistics_trips
     WHERE case_id = ? AND status <> 'cancelled'
     LIMIT 1`,
    [caseId],
  );
  const [invoiceRows] = await db.query<RowDataPacket[]>(
    `SELECT status, invoice_type FROM invoices WHERE case_id = ?`,
    [caseId],
  );

  const bestQuestionnaire = pickCurrentProcessArtifact(
    questionnaireRows.map((r) => ({
      status: String(r.status),
      createdAt: toIso(r.created_at),
      contentJson: parseJsonField(r.content_json),
    })),
    QUESTIONNAIRE_STATUS_RANK,
  );
  const bestReport = pickCurrentProcessArtifact(
    reportRows.map((r) => ({
      status: String(r.status),
      createdAt: toIso(r.created_at),
    })),
    REPORT_STATUS_RANK,
  );

  return buildProcessGateInputFromSourceInline({
    documentCategories,
    approvedDocumentCategories,
    evidenceCategories: evidenceRows.map((r) => String(r.category)),
    measurementTypes: measurementRows.map((r) => String(r.measurement_type)),
    hasPrimaryExpert: assignmentRows.length > 0,
    questionnaireStatus: bestQuestionnaire?.status ?? null,
    questionnaireContentJson: bestQuestionnaire?.contentJson,
    streetViewValidatedAt: caseRow.street_view_validated_at,
    propertyLat: caseRow.property_lat,
    propertyLng: caseRow.property_lng,
    documentsHandoffConfirmedAt: caseRow.documents_handoff_confirmed_at,
    expedienteApprovedAt: caseRow.expediente_approved_at,
    ratificationScheduledAt: caseRow.ratification_scheduled_at,
    involvesFatality: caseRow.involves_fatality,
    inspectionComplete: inspectionRows.length > 0,
    reportStatus: bestReport?.status ?? null,
    logisticsReady: tripRows.length > 0,
    dictamenDueAt: caseRow.dictamen_due_at,
    invoices: invoiceRows.map((r) => ({
      status: String(r.status),
      invoiceType: String(r.invoice_type || ""),
    })),
  });
}

function groupIds(
  rows: RowDataPacket[],
  key = "case_id",
): Map<number, RowDataPacket[]> {
  const map = new Map<number, RowDataPacket[]>();
  for (const row of rows) {
    const id = Number(row[key]);
    const list = map.get(id) || [];
    list.push(row);
    map.set(id, list);
  }
  return map;
}

async function attachListadoToCases(
  cases: CaseSummary[],
  rows: RowDataPacket[],
): Promise<CaseSummary[]> {
  if (cases.length === 0) return cases;
  const ids = cases.map((c) => c.id);
  const placeholders = ids.map(() => "?").join(", ");
  const db = getPool();

  const [docRows] = await db.query<RowDataPacket[]>(
    `SELECT case_id, category, status FROM documents
     WHERE case_id IN (${placeholders}) AND deleted_at IS NULL
       AND status NOT IN ('rejected', 'archived')`,
    ids,
  );
  const [assignmentRows] = await db.query<RowDataPacket[]>(
    `SELECT a.case_id, a.assignment_role, a.is_primary, u.first_name, u.last_name
     FROM case_assignments a
     JOIN staff_users u ON u.id = a.user_id
     WHERE a.case_id IN (${placeholders})
       AND a.unassigned_at IS NULL`,
    ids,
  );
  const [qRows] = await db.query<RowDataPacket[]>(
    `SELECT case_id, status, content_json, created_at FROM questionnaires
     WHERE case_id IN (${placeholders})`,
    ids,
  );
  const [inspRows] = await db.query<RowDataPacket[]>(
    `SELECT case_id FROM inspections
     WHERE case_id IN (${placeholders}) AND status = 'completed'`,
    ids,
  );
  const [reportRows] = await db.query<RowDataPacket[]>(
    `SELECT case_id, status, created_at FROM technical_reports
     WHERE case_id IN (${placeholders})`,
    ids,
  );
  const [tripRows] = await db.query<RowDataPacket[]>(
    `SELECT case_id FROM logistics_trips
     WHERE case_id IN (${placeholders}) AND status <> 'cancelled'`,
    ids,
  );
  const [invoiceRows] = await db.query<RowDataPacket[]>(
    `SELECT case_id, status, invoice_type FROM invoices
     WHERE case_id IN (${placeholders})`,
    ids,
  );
  const [evidenceRows] = await db.query<RowDataPacket[]>(
    `SELECT case_id, category FROM evidence_items
     WHERE case_id IN (${placeholders}) AND deleted_at IS NULL`,
    ids,
  );
  const [measurementRows] = await db.query<RowDataPacket[]>(
    `SELECT case_id, measurement_type FROM measurements
     WHERE case_id IN (${placeholders})`,
    ids,
  );
  const onHoldIds = cases
    .filter((c) => c.status === "on_hold")
    .map((c) => c.id);
  const holdResumeByCaseId = new Map<number, CaseStatus>();
  if (onHoldIds.length > 0) {
    const holdPh = onHoldIds.map(() => "?").join(", ");
    const flowPh = CASE_STATUS_FLOW.map(() => "?").join(", ");
    const [holdHistRows] = await db.query<RowDataPacket[]>(
      `SELECT case_id, from_status, created_at FROM case_status_history
       WHERE case_id IN (${holdPh}) AND to_status = 'on_hold'
       ORDER BY created_at DESC`,
      onHoldIds,
    );
    const [flowHistRows] = await db.query<RowDataPacket[]>(
      `SELECT case_id, to_status, created_at FROM case_status_history
       WHERE case_id IN (${holdPh}) AND to_status IN (${flowPh})
       ORDER BY created_at DESC`,
      [...onHoldIds, ...CASE_STATUS_FLOW],
    );
    const latestHoldFrom = latestHoldFromStatusByCaseInline(
      holdHistRows.map((row) => ({
        caseId: Number(row.case_id),
        fromStatus: String(row.from_status),
      })),
    );
    const latestFlowTo = latestFlowToStatusByCaseInline(
      flowHistRows.map((row) => ({
        caseId: Number(row.case_id),
        toStatus: String(row.to_status),
      })),
    );
    holdResumeByCaseId.clear();
    for (const [cid, status] of buildHoldResumeStatusByCaseInline(
      onHoldIds,
      latestHoldFrom,
      latestFlowTo,
    )) {
      holdResumeByCaseId.set(cid, status);
    }
  }
  const [firmRows] = await db.query<RowDataPacket[]>(
    `SELECT id, name FROM law_firms
     WHERE id IN (${cases.map(() => "?").join(", ")})`,
    cases.map((c) => c.lawFirmId || 0),
  );

  const docsBy = groupIds(docRows);
  const assignmentsBy = groupIds(assignmentRows);
  const qBy = groupIds(qRows);
  const inspBy = new Set(inspRows.map((r) => Number(r.case_id)));
  const reportsBy = groupIds(reportRows);
  const tripsBy = new Set(tripRows.map((r) => Number(r.case_id)));
  const invoicesBy = groupIds(invoiceRows);
  const evidenceBy = groupIds(evidenceRows);
  const measurementsBy = groupIds(measurementRows);
  const firmName = new Map(
    firmRows.map((r) => [Number(r.id), String(r.name || "")]),
  );
  const rowById = new Map(rows.map((r) => [Number(r.id), r]));

  return cases.map((item) => {
    const raw = rowById.get(item.id);
    const docs = (docsBy.get(item.id) || []).map((d) => String(d.category));
    const approvedDocs = [
      ...new Set(
        (docsBy.get(item.id) || [])
          .filter((d) => String(d.status) === "approved")
          .map((d) => String(d.category)),
      ),
    ];
    const assignmentRowsForCase = assignmentsBy.get(item.id) || [];
    const activeAssignments = assignmentRowsForCase.map((a) => ({
      assignmentRole: String(a.assignment_role || "expert") as AssignmentRole,
      userName:
        `${a.first_name || ""} ${a.last_name || ""}`.trim() || "—",
      isPrimary: Boolean(a.is_primary),
    }));
    const expert =
      assignmentRowsForCase.find(
        (a) =>
          String(a.assignment_role) === "expert" && Boolean(a.is_primary),
      ) ||
      assignmentRowsForCase.find(
        (a) => String(a.assignment_role) === "expert",
      );
    const bestQ = pickCurrentProcessArtifact(
      (qBy.get(item.id) || []).map((q) => ({
        status: String(q.status),
        createdAt: toIso(q.created_at),
        contentJson: parseJsonField(q.content_json),
      })),
      QUESTIONNAIRE_STATUS_RANK,
    );
    const bestReport = pickCurrentProcessArtifact(
      (reportsBy.get(item.id) || []).map((r) => ({
        status: String(r.status),
        createdAt: toIso(r.created_at),
      })),
      REPORT_STATUS_RANK,
    );
    const invoices = (invoicesBy.get(item.id) || []).map((r) => ({
      status: String(r.status),
      invoiceType: String(r.invoice_type || ""),
    }));
    const input = buildProcessGateInputFromSourceInline({
      documentCategories: docs,
      approvedDocumentCategories: approvedDocs,
      evidenceCategories: (evidenceBy.get(item.id) || []).map((r) =>
        String(r.category),
      ),
      measurementTypes: (measurementsBy.get(item.id) || []).map((r) =>
        String(r.measurement_type),
      ),
      hasPrimaryExpert: Boolean(expert),
      questionnaireStatus: bestQ?.status ?? null,
      questionnaireContentJson: bestQ?.contentJson,
      streetViewValidatedAt: raw?.street_view_validated_at,
      propertyLat: raw?.property_lat,
      propertyLng: raw?.property_lng,
      documentsHandoffConfirmedAt: raw?.documents_handoff_confirmed_at,
      expedienteApprovedAt: raw?.expediente_approved_at,
      ratificationScheduledAt: raw?.ratification_scheduled_at,
      involvesFatality: raw?.involves_fatality ?? item.involvesFatality,
      inspectionComplete: inspBy.has(item.id),
      reportStatus: bestReport?.status ?? null,
      logisticsReady: tripsBy.has(item.id),
      invoices,
    });
    const holdResumeStatus =
      item.status === "on_hold"
        ? (holdResumeByCaseId.get(item.id) ?? null)
        : null;
    return {
      ...item,
      lawFirmName:
        item.lawFirmName || firmName.get(item.lawFirmId || 0) || null,
      primaryExpertName: expert
        ? `${expert.first_name || ""} ${expert.last_name || ""}`.trim() || null
        : item.primaryExpertName || null,
      activeAssignments,
      listado: buildListadoProgress({
        status: item.status,
        inspectionDeadlineAt: item.inspectionDeadlineAt,
        input,
        invoices,
        holdResumeStatus,
      }),
    };
  });
}

function buildDocumentCompleteness(
  categories: readonly string[],
  involvesFatality = false,
): {
  intake: DocumentCompletenessInfo;
  additionalDocs: DocumentCompletenessInfo;
  courtFiling: DocumentCompletenessInfo;
} {
  const intake = getIntakeCompleteness(categories);
  const additionalDocs = getAdditionalDocsCompleteness(categories, {
    involvesFatality,
  });
  const courtFiling = getCourtFilingCompleteness(categories);
  return {
    intake: {
      phase: intake.phase,
      required: [...intake.required],
      present: [...intake.present],
      missing: [...intake.missing],
      complete: intake.complete,
    },
    additionalDocs: {
      phase: additionalDocs.phase,
      required: [...additionalDocs.required],
      present: [...additionalDocs.present],
      missing: [...additionalDocs.missing],
      complete: additionalDocs.complete,
    },
    courtFiling: {
      phase: courtFiling.phase,
      required: [...courtFiling.required],
      present: [...courtFiling.present],
      missing: [...courtFiling.missing],
      complete: courtFiling.complete,
    },
  };
}

async function resolveCoordinatorOrAdmin(
  caseRow: RowDataPacket,
): Promise<number | null> {
  if (caseRow.assigned_coordinator_id != null) {
    return Number(caseRow.assigned_coordinator_id);
  }
  const db = getPool();
  const [admins] = await db.query<RowDataPacket[]>(
    `SELECT id FROM staff_users
     WHERE role = 'admin' AND status = 'active' AND deleted_at IS NULL
     ORDER BY id ASC
     LIMIT 1`,
  );
  return admins[0]?.id != null ? Number(admins[0].id) : null;
}

async function notifyMissingDocumentsIfNeeded(
  caseRow: RowDataPacket,
): Promise<void> {
  const categories = await loadCaseDocumentCategories(Number(caseRow.id));
  const status = String(caseRow.status);
  const active = activeCompletenessForCaseStatus(status, categories, {
    involvesFatality: Boolean(caseRow.involves_fatality),
  });
  if (!shouldEmitMissingDocumentsAlert(status, active)) {
    return;
  }

  const db = getPool();
  const [recent] = await db.query<RowDataPacket[]>(
    `SELECT created_at FROM notifications
     WHERE case_id = ? AND notification_type = 'missing_documents'
     ORDER BY created_at DESC
     LIMIT 1`,
    [caseRow.id],
  );
  const lastAt = recent[0]?.created_at
    ? new Date(recent[0].created_at as string | Date).getTime()
    : null;
  if (shouldThrottleMissingDocumentsAlert(lastAt, Date.now())) {
    return;
  }

  const missingLabel = active.missing.join(", ") || "required documents";
  const title = `Missing documents · ${caseRow.case_number}`;
  const body = `Missing: ${missingLabel}.`;

  const recipientId = await resolveCoordinatorOrAdmin(caseRow);
  if (recipientId != null) {
    await createNotification({
      recipientActor: "staff",
      recipientId,
      caseId: Number(caseRow.id),
      type: "missing_documents",
      title,
      body,
      caseNumber: String(caseRow.case_number),
      caseUrl: `${EMAIL_APP_URL}/portal/cases/${caseRow.public_uuid}`,
    });
  }

  const lawFirmId =
    caseRow.law_firm_id != null ? Number(caseRow.law_firm_id) : null;
  if (lawFirmId && shouldNotifyLawFirmOfMissingDocs(active)) {
    const contacts = await listLawFirmContacts(lawFirmId);
    for (const contact of contacts) {
      await createNotification({
        recipientActor: "law_firm",
        recipientId: contact.id,
        caseId: Number(caseRow.id),
        type: "missing_documents",
        title,
        body,
        emailTo: contact.email,
        caseNumber: String(caseRow.case_number),
        caseUrl: `${EMAIL_APP_URL}/portal/cases/${caseRow.public_uuid}`,
      });
    }
    if (shouldWriteLawFirmMissingDocsNote(active)) {
      await db.query<ResultSetHeader>(
        `INSERT INTO case_notes (case_id, author_id, visibility, body)
         VALUES (?, NULL, 'law_firm', ?)`,
        [caseRow.id, body],
      );
    }
  }
}

async function applyArtifactRejectLoop(opts: {
  caseRow: RowDataPacket;
  artifact: "questionnaire" | "technical_report";
  outcome: string;
  actorId: number | null;
  reason?: string | null;
  conn?: PoolConnection;
  auditActorType?: "staff" | "law_firm" | "system";
  auditActorId?: number | null;
}): Promise<CaseStatus | null> {
  const fromStatus = opts.caseRow.status as CaseStatus;
  const toStatus = caseStatusAfterArtifactReject({
    caseStatus: fromStatus,
    artifact: opts.artifact,
    outcome: opts.outcome,
  });
  if (!toStatus) return null;
  const db = opts.conn ?? getPool();
  const caseId = Number(opts.caseRow.id);
  await completeTypedDeadlines(
    caseId,
    deadlineTypesToCompleteOnTransition(fromStatus, toStatus),
    opts.conn,
  );
  await db.query<ResultSetHeader>(`UPDATE cases SET status = ? WHERE id = ?`, [
    toStatus,
    caseId,
  ]);
  const reopen = artifactToForceChangesRequested({
    artifact: opts.artifact,
    outcome: opts.outcome,
    toStatus,
  });
  if (reopen === "questionnaire") {
    const statuses = QUESTIONNAIRE_REOPEN_FROM_STATUSES.map(() => "?").join(
      ", ",
    );
    await db.query<ResultSetHeader>(
      `UPDATE questionnaires
       SET status = 'changes_requested'
       WHERE case_id = ?
         AND status IN (${statuses})`,
      [caseId, ...QUESTIONNAIRE_REOPEN_FROM_STATUSES],
    );
  }
  if (reopen === "technical_report") {
    const statuses = REPORT_REOPEN_FROM_STATUSES.map(() => "?").join(", ");
    await db.query<ResultSetHeader>(
      `UPDATE technical_reports
       SET status = 'changes_requested'
       WHERE case_id = ?
         AND status IN (${statuses})`,
      [caseId, ...REPORT_REOPEN_FROM_STATUSES],
    );
  }
  await db.query<ResultSetHeader>(
    `INSERT INTO case_status_history
       (case_id, from_status, to_status, changed_by, reason)
     VALUES (?, ?, ?, ?, ?)`,
    [
      caseId,
      fromStatus,
      toStatus,
      opts.actorId,
      opts.reason?.trim() || `Review ${opts.outcome} returned the case`,
    ],
  );
  await db.query<ResultSetHeader>(
    `INSERT INTO audit_logs
       (public_uuid, actor_type, actor_id, case_id, entity_type, entity_id, action,
        previous_value_json, new_value_json)
     VALUES (?, ?, ?, ?, 'case', ?, 'status_change', ?, ?)`,
    [
      generatePublicUuid(),
      opts.auditActorType ?? "staff",
      opts.auditActorId ?? opts.actorId,
      caseId,
      String(caseId),
      JSON.stringify({ status: fromStatus }),
      JSON.stringify({ status: toStatus, outcome: opts.outcome }),
    ],
  );
  opts.caseRow.status = toStatus;
  return toStatus;
}

async function afterArtifactRejectLoop(opts: {
  caseRow: RowDataPacket;
  fromStatus: CaseStatus;
  toStatus: CaseStatus;
  actorId: number | null;
  auditActorType?: "staff" | "law_firm" | "system" | null;
}): Promise<void> {
  const spec = authoringDeadlineSpec(opts.toStatus);
  if (spec) {
    await ensureTypedDeadline({
      caseId: Number(opts.caseRow.id),
      deadlineType: spec.deadlineType,
      title: spec.title,
      businessDays: spec.businessDays,
      actorId: opts.actorId,
    });
  }
  if (
    !shouldNotifyLawFirmAfterArtifactReject({
      auditActorType: opts.auditActorType,
    })
  ) {
    return;
  }
  if (!opts.caseRow.law_firm_id) return;
  const contacts = await listLawFirmContacts(Number(opts.caseRow.law_firm_id));
  for (const contact of contacts) {
    await createNotification({
      recipientActor: "law_firm",
      recipientId: contact.id,
      caseId: Number(opts.caseRow.id),
      type: "general",
      title: `${opts.caseRow.case_number}: ${opts.toStatus}`,
      body: `Status updated from ${opts.fromStatus} to ${opts.toStatus}.`,
      emailTo: contact.email,
      caseNumber: String(opts.caseRow.case_number),
      caseUrl: `${EMAIL_APP_URL}/portal/cases/${opts.caseRow.public_uuid}`,
      email: buildCaseStatusEmail({
        locale: contact.locale,
        firstName: contact.firstName,
        caseNumber: String(opts.caseRow.case_number),
        caseTitle: String(opts.caseRow.title || opts.caseRow.case_number),
        fromStatus: String(opts.fromStatus),
        toStatus: String(opts.toStatus),
        caseUrl: `${EMAIL_APP_URL}/portal/cases/${opts.caseRow.public_uuid}`,
        appUrl: EMAIL_APP_URL,
      }),
    });
  }
}

async function findStaffIdsByRoles(roles: string[]): Promise<number[]> {
  if (roles.length === 0) return [];
  const db = getPool();
  const placeholders = roles.map(() => "?").join(", ");
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT id FROM staff_users
     WHERE role IN (${placeholders}) AND status = 'active' AND deleted_at IS NULL
     ORDER BY id ASC
     LIMIT 20`,
    roles,
  );
  return rows.map((r) => Number(r.id));
}

async function completePendingReviewsForEntity(opts: {
  entityType: ReviewEntityType;
  entityId: number;
  outcome: ReviewOutcome;
  notes?: string | null;
  stage?: ReviewStage | null;
  conn?: PoolConnection;
}): Promise<number> {
  const db = opts.conn ?? getPool();
  const params: unknown[] = [
    opts.outcome,
    opts.notes ?? null,
    opts.entityType,
    opts.entityId,
  ];
  let stageSql = "";
  if (opts.stage) {
    stageSql = " AND review_stage = ?";
    params.push(opts.stage);
  }
  const [result] = await db.query<ResultSetHeader>(
    `UPDATE review_requests
     SET status = ?, completed_at = NOW(), notes = COALESCE(?, notes)
     WHERE entity_type = ? AND entity_id = ? AND status = 'pending'${stageSql}`,
    params,
  );
  return result.affectedRows;
}

async function runAutomationActions(
  actions: AutomationAction[],
  ctx: {
    caseId: number;
    lawFirmId: number | null;
    actorId: number;
    caseNumber: string;
    entityType?: ReviewEntityType;
    entityId?: number;
    fallbackRecipientId?: number | null;
  },
): Promise<void> {
  for (const action of actions) {
    if (action.type === "create_invoice") {
      await createAutoInvoice({
        caseId: ctx.caseId,
        lawFirmId: ctx.lawFirmId,
        invoiceType: action.invoiceType,
        createdBy: ctx.actorId,
        notes: action.reason,
      });
    } else if (action.type === "open_review") {
      if (ctx.entityType != null && ctx.entityId != null) {
        await openReviewRequest({
          caseId: ctx.caseId,
          entityType: ctx.entityType,
          entityId: ctx.entityId,
          stage: action.stage,
          requestedBy: ctx.actorId,
          notes: action.reason,
        });
      }
    } else if (action.type === "notify") {
      let recipients = await findStaffIdsByRoles(
        action.notificationType === "invoice_pending"
          ? ["accountant", "admin"]
          : action.notificationType === "report_approved" ||
              action.notificationType === "qa_requested"
            ? ["legal", "admin"]
            : ["admin"],
      );
      if (recipients.length === 0 && ctx.fallbackRecipientId != null) {
        recipients = [ctx.fallbackRecipientId];
      }
      if (recipients.length === 0) {
        recipients = [ctx.actorId];
      }
      for (const recipientId of recipients) {
        await createNotification({
          recipientActor: "staff",
          recipientId,
          caseId: ctx.caseId,
          type: action.notificationType,
          title: `${action.notificationType} · ${ctx.caseNumber}`,
          body: action.reason,
          caseNumber: ctx.caseNumber,
          caseUrl: `${EMAIL_APP_URL}/portal/cases`,
        });
      }
    }
  }
}

async function maybeNotifyDeadlineApproaching(
  caseRow: RowDataPacket,
  deadlines: CaseDeadlineItem[],
): Promise<void> {
  const critical = deadlines.find(
    (d) =>
      !d.completedAt &&
      (d.severityLevel === "critical" || d.severityLevel === "overdue"),
  );
  if (!critical) return;
  const actions = automationOnDeadlineApproaching(critical.severityLevel);
  if (actions.length === 0) return;

  const db = getPool();
  const [recent] = await db.query<RowDataPacket[]>(
    `SELECT id FROM notifications
     WHERE case_id = ? AND notification_type = 'deadline_approaching'
       AND created_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 24 HOUR)
     LIMIT 1`,
    [caseRow.id],
  );
  if (recent.length > 0) return;

  const recipientIds = new Set<number>();
  if (caseRow.assigned_expert_id != null) {
    recipientIds.add(Number(caseRow.assigned_expert_id));
  }
  if (caseRow.assigned_coordinator_id != null) {
    recipientIds.add(Number(caseRow.assigned_coordinator_id));
  }
  if (recipientIds.size === 0) {
    const adminId = await resolveCoordinatorOrAdmin(caseRow);
    if (adminId != null) recipientIds.add(adminId);
  }
  for (const recipientId of recipientIds) {
    await createNotification({
      recipientActor: "staff",
      recipientId,
      caseId: Number(caseRow.id),
      type: "deadline_approaching",
      title: `Deadline · ${caseRow.case_number}`,
      body: `${critical.title} is ${critical.severityLevel}.`,
      caseNumber: String(caseRow.case_number),
      caseUrl: `${EMAIL_APP_URL}/portal/cases/${caseRow.public_uuid}`,
    });
  }
}

function dbUnavailable(req: Request, res: Response, next: NextFunction) {
  if (MISSING_DB_VARS.length > 0) {
    return res.status(503).json({
      error: "Database not configured",
      missing: MISSING_DB_VARS,
    });
  }
  if (!JWT_SECRET) {
    return res.status(503).json({ error: "JWT_SECRET not configured" });
  }
  next();
}

async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<string | null> {
  // Never hit Resend during vitest — integration suites use @example.test
  // addresses (bounce risk) and may resolve real admin/coordinator emails from TiDB.
  if (process.env.VITEST === "true") {
    apiLogger.info("[email:vitest-skip]", {
      to: opts.to,
      subject: opts.subject,
    });
    return "vitest-skip";
  }
  if (!resendClient) {
    apiLogger.info("[email:dev-fallback]", {
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
    });
    return "dev-fallback";
  }
  const { data, error } = await resendClient.emails.send({
    from: FROM_EMAIL,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
  });
  if (error) {
    throw new Error(error.message || "Resend send failed");
  }
  apiLogger.info("[email:sent]", { to: opts.to, id: data?.id });
  return data?.id ?? null;
}

/** Returns provider id on success, undefined on failure (errors logged). */
async function safeSendEmail(
  to: string,
  payload: EmailPayload,
  context: string,
): Promise<string | undefined> {
  try {
    const id = await sendEmail({ to, ...payload });
    return id ?? undefined;
  } catch (err) {
    apiLogger.error(`email failed (${context})`, err);
    return undefined;
  }
}

async function getActorContact(
  actor: AuthActor,
  id: number,
): Promise<{
  email: string;
  firstName: string;
  locale: AppLocale;
} | null> {
  const db = getPool();
  const table = actor === "staff" ? "staff_users" : "law_firm_users";
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT email, first_name, preferred_language
     FROM ${table}
     WHERE id = ? AND deleted_at IS NULL
     LIMIT 1`,
    [id],
  );
  if (!rows[0]?.email) return null;
  return {
    email: String(rows[0].email),
    firstName: String(rows[0].first_name || "Usuario"),
    locale: normalizeLocale(rows[0].preferred_language as string),
  };
}

async function listLawFirmContacts(lawFirmId: number): Promise<
  Array<{
    id: number;
    email: string;
    firstName: string;
    locale: AppLocale;
  }>
> {
  const db = getPool();
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT u.id, u.email, u.first_name, u.preferred_language
     FROM law_firm_users u
     JOIN law_firm_members m ON m.law_firm_user_id = u.id
     WHERE m.law_firm_id = ?
       AND m.deleted_at IS NULL
       AND u.deleted_at IS NULL
       AND u.status IN ('active', 'invited')
     LIMIT 50`,
    [lawFirmId],
  );
  return rows.map((r) => ({
    id: r.id as number,
    email: String(r.email),
    firstName: String(r.first_name || "Usuario"),
    locale: normalizeLocale(r.preferred_language as string),
  }));
}

// ============================================================================
// SERVER
// ============================================================================

/**
 * Express app used for:
 * - Vite middleware in local development (port 8080)
 * - Vercel serverless function (default export)
 *
 * All API routes must live in this file for the Vercel serverless architecture.
 */
function createServer() {
  const app = express();

  app.use(cors());
  app.use((req, res, next) => {
    const limit = wantsLargeJsonBody(req)
      ? DMS_JSON_BODY_LIMIT
      : JSON_BODY_LIMIT_DEFAULT;
    express.json({ limit })(req, res, next);
  });
  app.use(
    express.urlencoded({ extended: true, limit: JSON_BODY_LIMIT_DEFAULT }),
  );

  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", (_req, res) => {
    const response: DemoResponse = {
      message: "Hello from Express server",
    };
    res.json(response);
  });

  app.get("/api/config/app-version", async (_req, res) => {
    try {
      const db = getPool();
      const [rows] = await db.query<RowDataPacket[]>(
        `SELECT setting_value
           FROM system_settings
          WHERE setting_key = 'app_version'
          LIMIT 1`,
      );
      const dbVersion =
        (rows[0]?.setting_value as string | undefined)?.trim() || null;
      const response: AppVersionResponse = {
        version:
          dbVersion ||
          process.env.APP_VERSION?.trim() ||
          process.env.VITE_APP_VERSION?.trim() ||
          null,
      };
      return res.json(response);
    } catch {
      const response: AppVersionResponse = {
        version:
          process.env.APP_VERSION?.trim() ||
          process.env.VITE_APP_VERSION?.trim() ||
          null,
      };
      return res.json(response);
    }
  });

  // ---- Auth: passwordless OTP (staff + law firm client) ----

  const staffRequestOtp = async (req: Request, res: Response) => {
    try {
      const email = normalizeLookupEmail(String(req.body?.email || ""));
      if (!email || !isValidEmail(email)) {
        return res.status(400).json({ error: "Valid email required" });
      }

      const ipRate = await enforceOtpRequestRateLimits({
        email,
        ip: req.ip,
        portal: "staff",
        chargeIp: true,
        chargeEmail: false,
      });
      if (ipRate.ok === false) {
        res.setHeader("Retry-After", String(ipRate.retryAfterSec));
        return res.status(429).json({
          error: ipRate.error,
          code: "rate_limited",
          retryAfterSec: ipRate.retryAfterSec,
        });
      }

      const db = getPool();
      const actorRows = await lookupEmailActorRows(email);
      const dualStaff = resolveLoginEmailDualActor({
        staffAlive: Boolean(actorRows.staff && !actorRows.staff.deleted),
        lawFirmAlive: Boolean(actorRows.lawFirm && !actorRows.lawFirm.deleted),
      });
      if (dualStaff.ok === false) {
        return res.status(409).json({
          error: dualStaff.error,
          code: dualStaff.code,
        });
      }
      const [rows] = await db.query<RowDataPacket[]>(
        `SELECT id, email, first_name, preferred_language, status, role, deleted_at
         FROM staff_users
         WHERE LOWER(TRIM(email)) = ?
         LIMIT 1`,
        [email],
      );

      const found = rows.length > 0;
      const user = found ? rows[0] : null;
      const allowed = await getLoginAllowedRoles();
      const eligibility = resolveOtpRequestEligibility({
        found,
        deleted: user?.deleted_at != null,
        status: user ? String(user.status) : null,
        roleAllowed: user ? allowed.has(String(user.role)) : undefined,
      });
      if (eligibility.ok === false) {
        return res.status(404).json({
          error: eligibility.error,
          code: eligibility.code,
        });
      }

      const emailRate = await enforceOtpRequestRateLimits({
        email,
        ip: req.ip,
        portal: "staff",
        chargeIp: false,
        chargeEmail: true,
      });
      if (emailRate.ok === false) {
        res.setHeader("Retry-After", String(emailRate.retryAfterSec));
        return res.status(429).json({
          error: emailRate.error,
          code: "rate_limited",
          retryAfterSec: emailRate.retryAfterSec,
        });
      }

      const locale = resolveRequestLocale(
        req,
        user!.preferred_language as string,
        req.body?.locale,
      );
      const code = await createOtp(
        "staff",
        user!.id as number,
        "login",
        req.ip,
        req.headers["user-agent"] as string | undefined,
      );

      try {
        const emailContent = buildOtpEmail({
          locale,
          firstName: (user!.first_name as string) || "Usuario",
          code,
          portal: "staff",
          minutes: OTP_TTL_MIN,
          appUrl: EMAIL_APP_URL,
        });
        await sendEmail({
          to: user!.email as string,
          ...emailContent,
        });
      } catch (err) {
        apiLogger.error("OTP email failed", err);
        return res.status(502).json({
          error: "Could not send verification email. Please try again.",
        });
      }

      const response: RequestOtpResponse = {
        ok: true,
        sent: true,
        message: "Verification code sent.",
      };
      return res.json(response);
    } catch (err) {
      apiLogger.error("staff request-otp failed", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  };

  const staffVerifyOtp = async (req: Request, res: Response) => {
    try {
      const email = normalizeLookupEmail(String(req.body?.email || ""));
      const code = String(req.body?.code || "").trim();
      if (!email || !code) {
        return res.status(400).json({ error: "Email and code required" });
      }
      if (!/^\d{6}$/.test(code)) {
        return res.status(400).json({ error: "Code must be 6 digits" });
      }

      const db = getPool();
      const [rows] = await db.query<RowDataPacket[]>(
        `SELECT id, public_uuid, email, first_name, last_name, role, status,
                phone, avatar_url, preferred_language, preferred_theme,
                show_form_helpers, show_process_guidance, last_login_at, deleted_at
         FROM staff_users
         WHERE LOWER(TRIM(email)) = ?
         LIMIT 1`,
        [email],
      );

      if (rows.length === 0 || rows[0].deleted_at) {
        return res.status(401).json({ error: "Invalid or expired code" });
      }

      const row = rows[0];
      if (row.status !== "active" && row.status !== "invited") {
        return res.status(403).json({ error: "Account is not active" });
      }

      const allowed = await getLoginAllowedRoles();
      if (!allowed.has(String(row.role))) {
        return res
          .status(403)
          .json({ error: "Login not allowed for this role" });
      }

      const ok = await consumeOtp("staff", row.id as number, code, "login");
      if (!ok) {
        return res.status(401).json({ error: "Invalid or expired code" });
      }

      if (row.status === "invited") {
        await db.query<ResultSetHeader>(
          `UPDATE staff_users
           SET status = 'active',
               email_verified_at = COALESCE(email_verified_at, NOW()),
               last_login_at = NOW()
           WHERE id = ?`,
          [row.id],
        );
        row.status = "active";
      } else {
        await db.query<ResultSetHeader>(
          `UPDATE staff_users SET last_login_at = NOW() WHERE id = ?`,
          [row.id],
        );
      }

      const user = mapUserRow(row);
      const token = await createSession(
        "staff",
        user,
        req.ip,
        req.headers["user-agent"] as string | undefined,
      );

      const response: VerifyOtpResponse = { token, user };
      return res.json(response);
    } catch (err) {
      apiLogger.error("staff verify-otp failed", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  };

  const staffMe = async (req: AuthedRequest, res: Response) => {
    try {
      const db = getPool();
      const [rows] = await db.query<RowDataPacket[]>(
        `SELECT id, public_uuid, email, first_name, last_name, role, status,
                phone, avatar_url, preferred_language, preferred_theme,
                show_form_helpers, show_process_guidance, last_login_at
         FROM staff_users
         WHERE id = ? AND deleted_at IS NULL
         LIMIT 1`,
        [req.auth!.id],
      );
      if (rows.length === 0 || !canRequestLoginOtp(rows[0].status as UserStatus)) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const allowed = await getLoginAllowedRoles();
      if (!allowed.has(String(rows[0].role))) {
        return res
          .status(403)
          .json({ error: "Login not allowed for this role" });
      }
      const response: AuthMeResponse = { user: mapUserRow(rows[0]) };
      return res.json(response);
    } catch (err) {
      apiLogger.error("staff auth/me failed", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  };

  const authLogout = async (req: AuthedRequest, res: Response) => {
    try {
      const token = extractToken(req);
      if (token) await revokeSession(token);
      return res.json({ ok: true });
    } catch (err) {
      apiLogger.error("logout failed", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  };

  const clientRequestOtp = async (req: Request, res: Response) => {
    try {
      const email = normalizeLookupEmail(String(req.body?.email || ""));
      if (!email || !isValidEmail(email)) {
        return res.status(400).json({ error: "Valid email required" });
      }

      const ipRate = await enforceOtpRequestRateLimits({
        email,
        ip: req.ip,
        portal: "client",
        chargeIp: true,
        chargeEmail: false,
      });
      if (ipRate.ok === false) {
        res.setHeader("Retry-After", String(ipRate.retryAfterSec));
        return res.status(429).json({
          error: ipRate.error,
          code: "rate_limited",
          retryAfterSec: ipRate.retryAfterSec,
        });
      }

      const db = getPool();
      const actorRows = await lookupEmailActorRows(email);
      const dualClient = resolveLoginEmailDualActor({
        staffAlive: Boolean(actorRows.staff && !actorRows.staff.deleted),
        lawFirmAlive: Boolean(actorRows.lawFirm && !actorRows.lawFirm.deleted),
      });
      if (dualClient.ok === false) {
        return res.status(409).json({
          error: dualClient.error,
          code: dualClient.code,
        });
      }
      const [rows] = await db.query<RowDataPacket[]>(
        `SELECT id, email, first_name, preferred_language, status, deleted_at
         FROM law_firm_users
         WHERE LOWER(TRIM(email)) = ?
         LIMIT 1`,
        [email],
      );

      const found = rows.length > 0;
      const user = found ? rows[0] : null;
      const eligibility = resolveOtpRequestEligibility({
        found,
        deleted: user?.deleted_at != null,
        status: user ? String(user.status) : null,
      });
      if (eligibility.ok === false) {
        return res.status(404).json({
          error: eligibility.error,
          code: eligibility.code,
        });
      }

      const emailRate = await enforceOtpRequestRateLimits({
        email,
        ip: req.ip,
        portal: "client",
        chargeIp: false,
        chargeEmail: true,
      });
      if (emailRate.ok === false) {
        res.setHeader("Retry-After", String(emailRate.retryAfterSec));
        return res.status(429).json({
          error: emailRate.error,
          code: "rate_limited",
          retryAfterSec: emailRate.retryAfterSec,
        });
      }

      const locale = resolveRequestLocale(
        req,
        user!.preferred_language as string,
        req.body?.locale,
      );
      const code = await createOtp(
        "law_firm",
        user!.id as number,
        "login",
        req.ip,
        req.headers["user-agent"] as string | undefined,
      );

      try {
        const emailContent = buildOtpEmail({
          locale,
          firstName: (user!.first_name as string) || "Usuario",
          code,
          portal: "law_firm",
          minutes: OTP_TTL_MIN,
          appUrl: EMAIL_APP_URL,
        });
        await sendEmail({
          to: user!.email as string,
          ...emailContent,
        });
      } catch (err) {
        apiLogger.error("client OTP email failed", err);
        return res.status(502).json({
          error: "Could not send verification email. Please try again.",
        });
      }

      const response: RequestOtpResponse = {
        ok: true,
        sent: true,
        message: "Verification code sent.",
      };
      return res.json(response);
    } catch (err) {
      apiLogger.error("client request-otp failed", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  };

  /** Unified login OTP — one rate-limit bucket; staff first, then law_firm. */
  const unifiedRequestOtp = async (req: Request, res: Response) => {
    try {
      const email = normalizeLookupEmail(String(req.body?.email || ""));
      if (!email || !isValidEmail(email)) {
        return res.status(400).json({ error: "Valid email required" });
      }

      const ipRate = await enforceOtpRequestRateLimits({
        email,
        ip: req.ip,
        portal: "unified",
        chargeIp: true,
        chargeEmail: false,
      });
      if (ipRate.ok === false) {
        res.setHeader("Retry-After", String(ipRate.retryAfterSec));
        return res.status(429).json({
          error: ipRate.error,
          code: "rate_limited",
          retryAfterSec: ipRate.retryAfterSec,
        });
      }

      const db = getPool();
      const [staffRows] = await db.query<RowDataPacket[]>(
        `SELECT id, email, first_name, preferred_language, status, role, deleted_at
         FROM staff_users
         WHERE LOWER(TRIM(email)) = ?
         LIMIT 1`,
        [email],
      );
      const [clientRowsEarly] = await db.query<RowDataPacket[]>(
        `SELECT id, email, first_name, preferred_language, status, deleted_at
         FROM law_firm_users
         WHERE LOWER(TRIM(email)) = ?
         LIMIT 1`,
        [email],
      );
      const staffFound = staffRows.length > 0;
      const staffUser = staffFound ? staffRows[0] : null;
      const clientFoundEarly = clientRowsEarly.length > 0;
      const clientUserEarly = clientFoundEarly ? clientRowsEarly[0] : null;
      const dual = resolveLoginEmailDualActor({
        staffAlive: Boolean(staffUser && staffUser.deleted_at == null),
        lawFirmAlive: Boolean(
          clientUserEarly && clientUserEarly.deleted_at == null,
        ),
      });
      if (dual.ok === false) {
        return res.status(409).json({
          error: dual.error,
          code: dual.code,
        });
      }
      const allowed = await getLoginAllowedRoles();
      const staffEligibility = resolveOtpRequestEligibility({
        found: staffFound,
        deleted: staffUser?.deleted_at != null,
        status: staffUser ? String(staffUser.status) : null,
        roleAllowed: staffUser
          ? allowed.has(String(staffUser.role))
          : undefined,
      });

      let actor: "staff" | "law_firm" | null = null;
      let userRow: RowDataPacket | null = null;
      let deny:
        | { code: string; error: string }
        | null = null;

      if (staffEligibility.ok === true) {
        actor = "staff";
        userRow = staffUser;
      } else if (staffEligibility.code === "account_not_found") {
        const clientRows = clientRowsEarly;
        const clientFound = clientFoundEarly;
        const clientUser = clientUserEarly;
        const clientEligibility = resolveOtpRequestEligibility({
          found: clientFound,
          deleted: clientUser?.deleted_at != null,
          status: clientUser ? String(clientUser.status) : null,
        });
        if (clientEligibility.ok === true) {
          actor = "law_firm";
          userRow = clientUser;
        } else {
          deny = {
            code: clientEligibility.code,
            error: clientEligibility.error,
          };
        }
      } else {
        deny = {
          code: staffEligibility.code,
          error: staffEligibility.error,
        };
      }

      if (!actor || !userRow) {
        return res.status(404).json({
          error: deny?.error || "No account found for this email",
          code: deny?.code || "account_not_found",
        });
      }

      const emailRate = await enforceOtpRequestRateLimits({
        email,
        ip: req.ip,
        portal: "unified",
        chargeIp: false,
        chargeEmail: true,
      });
      if (emailRate.ok === false) {
        res.setHeader("Retry-After", String(emailRate.retryAfterSec));
        return res.status(429).json({
          error: emailRate.error,
          code: "rate_limited",
          retryAfterSec: emailRate.retryAfterSec,
        });
      }

      const locale = resolveRequestLocale(
        req,
        userRow.preferred_language as string,
        req.body?.locale,
      );
      const code = await createOtp(
        actor,
        userRow.id as number,
        "login",
        req.ip,
        req.headers["user-agent"] as string | undefined,
      );

      try {
        const emailContent = buildOtpEmail({
          locale,
          firstName: (userRow.first_name as string) || "Usuario",
          code,
          portal: actor,
          minutes: OTP_TTL_MIN,
          appUrl: EMAIL_APP_URL,
        });
        await sendEmail({
          to: userRow.email as string,
          ...emailContent,
        });
      } catch (err) {
        apiLogger.error("unified OTP email failed", err);
        return res.status(502).json({
          error: "Could not send verification email. Please try again.",
        });
      }

      const response: RequestOtpResponse = {
        ok: true,
        sent: true,
        message: "Verification code sent.",
        actor,
      };
      return res.json(response);
    } catch (err) {
      apiLogger.error("unified request-otp failed", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  };

  const clientVerifyOtp = async (req: Request, res: Response) => {
    try {
      const email = normalizeLookupEmail(String(req.body?.email || ""));
      const code = String(req.body?.code || "").trim();
      if (!email || !code) {
        return res.status(400).json({ error: "Email and code required" });
      }
      if (!/^\d{6}$/.test(code)) {
        return res.status(400).json({ error: "Code must be 6 digits" });
      }

      const db = getPool();
      const [rows] = await db.query<RowDataPacket[]>(
        `SELECT id, public_uuid, email, first_name, last_name, status,
                phone, avatar_url, preferred_language, preferred_theme,
                show_form_helpers, show_process_guidance, last_login_at, deleted_at
         FROM law_firm_users
         WHERE LOWER(TRIM(email)) = ?
         LIMIT 1`,
        [email],
      );

      if (rows.length === 0 || rows[0].deleted_at) {
        return res.status(401).json({ error: "Invalid or expired code" });
      }

      const row = rows[0];
      if (row.status !== "active" && row.status !== "invited") {
        return res.status(403).json({ error: "Account is not active" });
      }

      const ok = await consumeOtp("law_firm", row.id as number, code, "login");
      if (!ok) {
        return res.status(401).json({ error: "Invalid or expired code" });
      }

      if (row.status === "invited") {
        await db.query<ResultSetHeader>(
          `UPDATE law_firm_users
           SET status = 'active',
               email_verified_at = COALESCE(email_verified_at, NOW()),
               last_login_at = NOW()
           WHERE id = ?`,
          [row.id],
        );
        row.status = "active";
      } else {
        await db.query<ResultSetHeader>(
          `UPDATE law_firm_users SET last_login_at = NOW() WHERE id = ?`,
          [row.id],
        );
      }

      const user = await enrichLawFirmAuthUser(mapLawFirmUserRow(row));
      const token = await createSession(
        "law_firm",
        user,
        req.ip,
        req.headers["user-agent"] as string | undefined,
      );

      const response: VerifyOtpResponse = { token, user };
      return res.json(response);
    } catch (err) {
      apiLogger.error("client verify-otp failed", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  };

  const clientMe = async (req: AuthedRequest, res: Response) => {
    try {
      const db = getPool();
      const [rows] = await db.query<RowDataPacket[]>(
        `SELECT id, public_uuid, email, first_name, last_name, status,
                phone, avatar_url, preferred_language, preferred_theme,
                show_form_helpers, show_process_guidance, last_login_at
         FROM law_firm_users
         WHERE id = ? AND deleted_at IS NULL
         LIMIT 1`,
        [req.auth!.id],
      );
      if (rows.length === 0 || rows[0].status !== "active") {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const response: AuthMeResponse = {
        user: await enrichLawFirmAuthUser(mapLawFirmUserRow(rows[0])),
      };
      return res.json(response);
    } catch (err) {
      apiLogger.error("client auth/me failed", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  };

  app.post("/api/auth/staff/request-otp", dbUnavailable, staffRequestOtp);
  app.post("/api/auth/staff/verify-otp", dbUnavailable, staffVerifyOtp);
  app.get("/api/auth/staff/me", dbUnavailable, requireStaff, staffMe);
  app.patch(
    "/api/auth/staff/preferences",
    dbUnavailable,
    requireStaff,
    async (req: AuthedRequest, res: Response) => {
      try {
        const parsed = parseUpdatePreferences(req.body);
        if (parsed.ok === false) {
          return res.status(400).json({ error: parsed.error });
        }
        const db = getPool();
        const sets: string[] = [];
        const params: Array<number> = [];
        if (typeof parsed.showFormHelpers === "boolean") {
          sets.push("show_form_helpers = ?");
          params.push(parsed.showFormHelpers ? 1 : 0);
        }
        if (typeof parsed.showProcessGuidance === "boolean") {
          sets.push("show_process_guidance = ?");
          params.push(parsed.showProcessGuidance ? 1 : 0);
        }
        params.push(req.auth!.id);
        await db.query<ResultSetHeader>(
          `UPDATE staff_users
           SET ${sets.join(", ")}
           WHERE id = ? AND deleted_at IS NULL`,
          params,
        );
        const [rows] = await db.query<RowDataPacket[]>(
          `SELECT id, public_uuid, email, first_name, last_name, role, status,
                  phone, avatar_url, preferred_language, preferred_theme,
                  show_form_helpers, show_process_guidance, last_login_at
           FROM staff_users
           WHERE id = ? AND deleted_at IS NULL
           LIMIT 1`,
          [req.auth!.id],
        );
        if (rows.length === 0) {
          return res.status(401).json({ error: "Unauthorized" });
        }
        const response: UpdatePreferencesResponse = {
          user: mapUserRow(rows[0]),
        };
        return res.json(response);
      } catch (err) {
        apiLogger.error("staff preferences update failed", err);
        return res.status(500).json({ error: "Internal server error" });
      }
    },
  );
  app.post("/api/auth/staff/logout", dbUnavailable, authLogout);

  app.post("/api/auth/client/request-otp", dbUnavailable, clientRequestOtp);
  app.post("/api/auth/client/verify-otp", dbUnavailable, clientVerifyOtp);
  app.get("/api/auth/client/me", dbUnavailable, requireLawFirm, clientMe);
  app.patch(
    "/api/auth/client/preferences",
    dbUnavailable,
    requireLawFirm,
    async (req: AuthedRequest, res: Response) => {
      try {
        const parsed = parseUpdatePreferences(req.body);
        if (parsed.ok === false) {
          return res.status(400).json({ error: parsed.error });
        }
        const db = getPool();
        const sets: string[] = [];
        const params: Array<number> = [];
        if (typeof parsed.showFormHelpers === "boolean") {
          sets.push("show_form_helpers = ?");
          params.push(parsed.showFormHelpers ? 1 : 0);
        }
        if (typeof parsed.showProcessGuidance === "boolean") {
          sets.push("show_process_guidance = ?");
          params.push(parsed.showProcessGuidance ? 1 : 0);
        }
        params.push(req.auth!.id);
        await db.query<ResultSetHeader>(
          `UPDATE law_firm_users
           SET ${sets.join(", ")}
           WHERE id = ? AND deleted_at IS NULL`,
          params,
        );
        const [rows] = await db.query<RowDataPacket[]>(
          `SELECT id, public_uuid, email, first_name, last_name, status,
                  phone, avatar_url, preferred_language, preferred_theme,
                  show_form_helpers, show_process_guidance, last_login_at
           FROM law_firm_users
           WHERE id = ? AND deleted_at IS NULL
           LIMIT 1`,
          [req.auth!.id],
        );
        if (rows.length === 0) {
          return res.status(401).json({ error: "Unauthorized" });
        }
        const response: UpdatePreferencesResponse = {
          user: await enrichLawFirmAuthUser(mapLawFirmUserRow(rows[0])),
        };
        return res.json(response);
      } catch (err) {
        apiLogger.error("client preferences update failed", err);
        return res.status(500).json({ error: "Internal server error" });
      }
    },
  );
  app.post("/api/auth/client/logout", dbUnavailable, authLogout);

  // Unified login OTP (staff → law_firm fallthrough, one rate-limit bucket)
  app.post("/api/auth/request-otp", dbUnavailable, unifiedRequestOtp);
  app.post("/api/auth/verify-otp", dbUnavailable, staffVerifyOtp);
  app.get("/api/auth/me", dbUnavailable, requireStaff, staffMe);
  app.post("/api/auth/logout", dbUnavailable, authLogout);

  // ---- Settings (admin) ----

  app.get(
    "/api/settings/case-number",
    dbUnavailable,
    requireAdmin,
    async (_req: AuthedRequest, res: Response) => {
      try {
        const format = await getSetting(
          "case_number_format",
          "DEL-{YYYY}-{SEQ:4}",
        );
        const nextSeq = Number(await getSetting("case_number_next_seq", "1"));
        const payload: CaseNumberSettings = {
          format,
          nextSeq,
          preview: renderCaseNumber(format, nextSeq),
        };
        return res.json(payload);
      } catch (err) {
        apiLogger.error("settings/case-number get failed", err);
        return res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  app.put(
    "/api/settings/case-number",
    dbUnavailable,
    requireAdmin,
    async (req: AuthedRequest, res: Response) => {
      try {
        const format = String(req.body?.format || "").trim();
        if (!isValidCaseNumberFormat(format)) {
          return res.status(400).json({
            error:
              "Invalid format. Use tokens {YYYY} {YY} {MM} {SEQ:n} and include {SEQ}.",
          });
        }
        await setSetting("case_number_format", format);
        const nextSeq = Number(await getSetting("case_number_next_seq", "1"));
        const payload: CaseNumberSettings = {
          format,
          nextSeq,
          preview: renderCaseNumber(format, nextSeq),
        };
        return res.json(payload);
      } catch (err) {
        apiLogger.error("settings/case-number put failed", err);
        return res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  // ---- Cases (admin for now) ----

  app.get(
    "/api/cases",
    dbUnavailable,
    requireStaffOrLawFirm,
    async (req: AuthedRequest, res: Response) => {
      try {
        const { page, limit, offset } = parsePageLimit(
          req.query as Record<string, unknown>,
          { page: 1, limit: 20, maxLimit: 100 },
        );
        const q = String(req.query.q || "").trim();
        const status = String(req.query.status || "").trim();
        const priority = String(req.query.priority || "").trim();
        const sortCol = pickSortColumn(
          req.query.sortBy,
          {
            case_number: "case_number",
            title: "title",
            status: "status",
            priority: "priority",
            court_name: "court_name",
            property_city: "property_city",
            created_at: "created_at",
            updated_at: "updated_at",
          },
          "created_at",
        );
        const sortDir = parseSortDir(req.query.sortDir);

        const where: string[] = ["deleted_at IS NULL"];
        const params: unknown[] = [];
        if (req.auth!.actor === "law_firm") {
          const lawFirmId = await getLawFirmIdForUser(req.auth!.id);
          if (!lawFirmId) {
            return res.status(403).json({ error: "No law firm linked to user" });
          }
          where.push("law_firm_id = ?");
          params.push(lawFirmId);
        } else {
          const visibility = buildStaffCaseVisibilityFilterInline({
            role: req.auth!.role,
            userId: req.auth!.id,
            casesAlias: "cases",
          });
          if (visibility.sql) {
            where.push(visibility.sql);
            params.push(...visibility.params);
          }
        }
        if (q) {
          where.push(
            `(case_number LIKE ? OR title LIKE ? OR IFNULL(court_name,'') LIKE ? OR IFNULL(property_city,'') LIKE ?
              OR EXISTS (
                SELECT 1 FROM law_firms lf
                WHERE lf.id = cases.law_firm_id AND lf.name LIKE ?
              )
              OR EXISTS (
                SELECT 1 FROM case_assignments a
                JOIN staff_users u ON u.id = a.user_id
                WHERE a.case_id = cases.id
                  AND a.unassigned_at IS NULL
                  AND a.assignment_role = 'expert' AND a.is_primary = 1
                  AND CONCAT(IFNULL(u.first_name,''), ' ', IFNULL(u.last_name,'')) LIKE ?
              ))`,
          );
          const like = `%${q}%`;
          params.push(like, like, like, like, like, like);
        }
        if (status) {
          where.push("status = ?");
          params.push(status);
        }
        if (priority) {
          where.push("priority = ?");
          params.push(priority);
        }
        const whereSql = where.join(" AND ");

        const db = getPool();
        const [countRows] = await db.query<RowDataPacket[]>(
          `SELECT COUNT(*) AS total FROM cases WHERE ${whereSql}`,
          params,
        );
        const total = Number(countRows[0]?.total || 0);

        const [rows] = await db.query<RowDataPacket[]>(
          `SELECT id, public_uuid, case_number, title, status, priority,
                  court_name, property_city, property_state, law_firm_id,
                  assigned_expert_id, inspection_deadline_at, external_court_deadline_at, dictamen_due_at, involves_fatality,
                  street_view_validated_at, property_lat, property_lng,
                  created_at, updated_at
           FROM cases
           WHERE ${whereSql}
           ORDER BY ${sortCol} ${sortDir}
           LIMIT ? OFFSET ?`,
          [...params, limit, offset],
        );
        const response: CasesListResponse = {
          cases: await attachListadoToCases(rows.map(mapCaseSummary), rows),
          pagination: buildPagination(page, limit, total),
        };
        return res.json(response);
      } catch (err) {
        apiLogger.error("cases list failed", err);
        return res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  app.get(
    "/api/cases/pipeline",
    dbUnavailable,
    requireStaff,
    async (req: AuthedRequest, res: Response) => {
      try {
        const limit = Math.min(
          100,
          Math.max(
            1,
            Number(req.query.limit) || 20,
          ),
        );
        const column = String(req.query.column || "").trim();
        const offset = Math.max(0, Number(req.query.offset) || 0);
        const q = String(req.query.q || "").trim();
        const statusFilter = String(req.query.status || "").trim();
        const priority = String(req.query.priority || "").trim();

        const where: string[] = ["deleted_at IS NULL"];
        const params: unknown[] = [];
        const visibility = buildStaffCaseVisibilityFilterInline({
          role: req.auth!.role,
          userId: req.auth!.id,
          casesAlias: "cases",
        });
        if (visibility.sql) {
          where.push(visibility.sql);
          params.push(...visibility.params);
        }
        if (q) {
          where.push(
            `(case_number LIKE ? OR title LIKE ? OR IFNULL(court_name,'') LIKE ? OR IFNULL(property_city,'') LIKE ?
              OR EXISTS (
                SELECT 1 FROM law_firms lf
                WHERE lf.id = cases.law_firm_id AND lf.name LIKE ?
              )
              OR EXISTS (
                SELECT 1 FROM case_assignments a
                JOIN staff_users u ON u.id = a.user_id
                WHERE a.case_id = cases.id
                  AND a.unassigned_at IS NULL
                  AND a.assignment_role = 'expert' AND a.is_primary = 1
                  AND CONCAT(IFNULL(u.first_name,''), ' ', IFNULL(u.last_name,'')) LIKE ?
              ))`,
          );
          const like = `%${q}%`;
          params.push(like, like, like, like, like, like);
        }
        if (priority) {
          where.push("priority = ?");
          params.push(priority);
        }
        const baseWhereSql = where.join(" AND ");
        const baseParams = [...params];

        const db = getPool();

        async function loadColumn(
          colStatus: CaseStatus,
          colOffset: number,
        ): Promise<{
          items: CaseSummary[];
          total: number;
          offset: number;
          limit: number;
          has_more: boolean;
        }> {
          const colWhere = `${baseWhereSql} AND status = ?`;
          const colParams = [...baseParams, colStatus];
          const [countRows] = await db.query<RowDataPacket[]>(
            `SELECT COUNT(*) AS total FROM cases WHERE ${colWhere}`,
            colParams,
          );
          const total = Number(countRows[0]?.total || 0);
          const [rows] = await db.query<RowDataPacket[]>(
            `SELECT id, public_uuid, case_number, title, status, priority,
                    court_name, property_city, property_state, law_firm_id,
                    assigned_expert_id, inspection_deadline_at, external_court_deadline_at, dictamen_due_at, involves_fatality,
                    street_view_validated_at, property_lat, property_lng,
                    created_at, updated_at
             FROM cases
             WHERE ${colWhere}
             ORDER BY updated_at DESC
             LIMIT ? OFFSET ?`,
            [...colParams, limit, colOffset],
          );
          const summaries = await attachListadoToCases(
            rows.map(mapCaseSummary),
            rows,
          );
          return {
            items: summaries,
            total,
            offset: colOffset,
            limit,
            has_more: colOffset + summaries.length < total,
          };
        }

        if (column) {
          if (
            !(CASE_PIPELINE_STATUSES as readonly string[]).includes(column)
          ) {
            return res.status(400).json({ error: "Invalid column" });
          }
          const page = await loadColumn(column as CaseStatus, offset);
          const response: CasesPipelineColumnMoreResponse = {
            column,
            items: page.items,
            total: page.total,
            offset: page.offset,
            limit: page.limit,
            hasMore: page.has_more,
          };
          return res.json(response);
        }

        const visible = casePipelineVisibleStatusesInline(statusFilter);
        const columns: CasesPipelineResponse["columns"] = {};
        for (const colStatus of visible) {
          const page = await loadColumn(colStatus, 0);
          columns[colStatus] = {
            items: page.items,
            total: page.total,
            offset: page.offset,
            limit: page.limit,
            hasMore: page.has_more,
          };
        }
        const response: CasesPipelineResponse = { limit, columns };
        return res.json(response);
      } catch (err) {
        apiLogger.error("cases pipeline failed", err);
        return res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  app.post(
    "/api/cases",
    dbUnavailable,
    requireStaffOrLawFirm,
    async (req: AuthedRequest, res: Response) => {
      try {
        const isLawFirm = req.auth!.actor === "law_firm";
        if (!isLawFirm && !canCreateStaffCaseInline(req.auth?.role)) {
          return res.status(403).json({ error: "Forbidden" });
        }
        if (!(await assertLawFirmCanMutate(req.auth!, res))) return;
        let lawFirmIdForInsert: number | null = null;
        if (isLawFirm) {
          lawFirmIdForInsert = await getLawFirmIdForUser(req.auth!.id);
          if (!lawFirmIdForInsert) {
            return res
              .status(403)
              .json({ error: "No law firm linked to user" });
          }
        }
        const body = req.body as CreateCaseRequest;
        const title = String(body?.title || "").trim();
        if (!title) {
          return res.status(400).json({ error: "Title is required" });
        }
        const description = String(body.description || "");
        if (description.length > 500) {
          return res
            .status(400)
            .json({ error: "description exceeds 500 characters" });
        }

        const priority = (body.priority || "normal") as CasePriority;
        const allowedPriorities: CasePriority[] = [
          "low",
          "normal",
          "high",
          "urgent",
        ];
        if (!allowedPriorities.includes(priority)) {
          return res.status(400).json({ error: "Invalid priority" });
        }

        const coords = resolveOptionalLatLng(
          body.propertyLat,
          body.propertyLng,
        );
        if (coords.ok === false) {
          return res.status(400).json({ error: coords.error });
        }
        const externalDeadline = parseExternalCourtDeadlineAtInline(
          body.externalCourtDeadlineAt,
        );
        if (externalDeadline.ok === false) {
          return res.status(400).json({ error: externalDeadline.error });
        }

        const firmId =
          lawFirmIdForInsert ??
          (typeof body.lawFirmId === "number" ? body.lawFirmId : null);
        const firmDefaultCourt = await fetchLawFirmDefaultCourtName(firmId);
        const courtName = resolveCaseCourtNameInline({
          provided: body.courtName,
          firmDefaultCourtName: firmDefaultCourt,
        });

        const caseNumber = await allocateCaseNumber();
        const publicUuid = generatePublicUuid();
        const db = getPool();
        const [result] = await db.query<ResultSetHeader>(
          `INSERT INTO cases (
             public_uuid, case_number, title, description, law_firm_id,
             court_name, external_reference, priority, status,
             plaintiff_name, defendant_name, property_address, property_city,
             property_state, property_postal_code, property_country,
             property_lat, property_lng, involves_fatality,
             external_court_deadline_at,
             intake_received_at, created_by
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'intake', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)`,
          [
            publicUuid,
            caseNumber,
            title,
            description.trim() || null,
            firmId,
            courtName,
            body.externalReference?.trim() || null,
            priority,
            body.plaintiffName?.trim() || null,
            body.defendantName?.trim() || null,
            body.propertyAddress?.trim() || null,
            body.propertyCity?.trim() || null,
            body.propertyState?.trim() || null,
            body.propertyPostalCode?.trim() || null,
            body.propertyCountry?.trim() || "MX",
            coords.value?.lat ?? null,
            coords.value?.lng ?? null,
            body.involvesFatality ? 1 : 0,
            externalDeadline.value
              ? toMysqlDateTimeUtc(new Date(externalDeadline.value))
              : null,
            isLawFirm ? null : req.auth!.id,
          ],
        );

        await db.query<ResultSetHeader>(
          `INSERT INTO case_status_history (case_id, from_status, to_status, changed_by, reason)
           VALUES (?, NULL, 'intake', ?, ?)`,
          [
            result.insertId,
            isLawFirm ? null : req.auth!.id,
            isLawFirm ? "Submitted by law firm" : "Case created",
          ],
        );

        if (!isLawFirm) {
          await db.query<ResultSetHeader>(
            `INSERT INTO audit_logs
               (public_uuid, actor_type, actor_id, case_id, entity_type, entity_id, action, new_value_json, ip_address)
             VALUES (?, 'staff', ?, ?, 'case', ?, 'create', ?, ?)`,
            [
              generatePublicUuid(),
              req.auth!.id,
              result.insertId,
              String(result.insertId),
              JSON.stringify({ caseNumber, title }),
              req.ip || null,
            ],
          );
        } else {
          const [admins] = await db.query<RowDataPacket[]>(
            `SELECT id, email, first_name, preferred_language
             FROM staff_users
             WHERE role = 'admin' AND deleted_at IS NULL AND status = 'active'
             LIMIT 20`,
          );
          for (const admin of admins) {
            await createNotification({
              recipientActor: "staff",
              recipientId: admin.id as number,
              caseId: result.insertId,
              type: "general",
              title: `New case ${caseNumber}`,
              body: `Law firm submitted: ${title}`,
              emailTo: String(admin.email),
              caseNumber,
              caseUrl: `${EMAIL_APP_URL}/portal/cases/${publicUuid}`,
              email: buildNewCaseIntakeEmail({
                locale: normalizeLocale(admin.preferred_language as string),
                firstName: String(admin.first_name || "Admin"),
                caseNumber,
                caseTitle: title,
                caseUrl: `${EMAIL_APP_URL}/portal/cases/${publicUuid}`,
                appUrl: EMAIL_APP_URL,
              }),
            });
          }
        }

        const [rows] = await db.query<RowDataPacket[]>(
          `SELECT * FROM cases WHERE id = ? LIMIT 1`,
          [result.insertId],
        );
        const response: CaseResponse = { case: mapCaseDetail(rows[0]) };
        return res.status(201).json(response);
      } catch (err) {
        apiLogger.error("cases create failed", err);
        return res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  app.get(
    "/api/cases/:publicUuid",
    dbUnavailable,
    requireStaffOrLawFirm,
    async (req: AuthedRequest, res: Response) => {
      try {
        const db = getPool();
        const [rows] = await db.query<RowDataPacket[]>(
          `SELECT * FROM cases
           WHERE public_uuid = ? AND deleted_at IS NULL
           LIMIT 1`,
          [req.params.publicUuid],
        );
        if (rows.length === 0) {
          return res.status(404).json({ error: "Case not found" });
        }
        const caseRow = rows[0];
        if (req.auth!.actor === "law_firm") {
          if (!(await lawFirmOwnsCaseRow(req.auth!, caseRow))) {
            return res.status(404).json({ error: "Case not found" });
          }
          const caseId = caseRow.id as number;
          const [noteRows] = await db.query<RowDataPacket[]>(
            `SELECT id, body, visibility, author_id, created_at
             FROM case_notes
             WHERE case_id = ? AND deleted_at IS NULL
               AND visibility IN ('law_firm', 'all')
             ORDER BY created_at DESC
             LIMIT 50`,
            [caseId],
          );
          const [docRows] = await db.query<RowDataPacket[]>(
            `SELECT d.id, d.public_uuid, d.category, d.title, d.status, d.current_version,
                    d.approved_at, d.rejection_reason, d.correction_requested_at, d.created_at,
                    v.file_name, v.mime_type, v.storage_key, v.file_size_bytes,
                    v.ocr_status, v.ocr_text, v.ocr_processed_at
             FROM documents d
             LEFT JOIN document_versions v
               ON v.document_id = d.id AND v.version_number = d.current_version
             WHERE d.case_id = ? AND d.deleted_at IS NULL
             ORDER BY d.created_at DESC
             LIMIT 100`,
            [caseId],
          );
          const [reportRows] = await db.query<RowDataPacket[]>(
            `SELECT id, public_uuid, status, version_number, investigation_summary, conclusions,
                    submitted_at, approved_at, delivered_at, created_at
             FROM technical_reports
             WHERE case_id = ? AND status IN ('approved', 'delivered', 'external_review')
             ORDER BY created_at DESC
             LIMIT 20`,
            [caseId],
          );
          const clientDocs = await Promise.all(
            docRows.map(async (row) => {
              const document = mapCaseDocumentItem(row);
              return {
                ...document,
                storageKey: document.storageKey
                  ? await signBlobUrlForClient(document.storageKey)
                  : null,
              };
            }),
          );
          const [withListado] = await attachListadoToCases(
            [mapCaseSummary(caseRow)],
            [caseRow],
          );
          return res.json({
            case: {
              ...mapCaseDetail(caseRow),
              listado: withListado?.listado ?? null,
            },
            history: [],
            notes: noteRows.map((n) => ({
              id: n.id as number,
              body: n.body as string,
              visibility: n.visibility as CaseNoteItem["visibility"],
              authorId: (n.author_id as number | null) ?? null,
              createdAt: toIso(n.created_at) || new Date().toISOString(),
            })),
            documents: clientDocs,
            assignments: [],
            deadlines: [],
            questionnaires: [],
            inspections: [],
            measurements: [],
            evidence: [],
            evidenceChecklist: { required: [], present: [], missing: [] },
            reviewRequests: [],
            documentCompleteness: buildDocumentCompleteness(
              clientDocs
                .filter((d) => isActiveDocumentStatus(d.status))
                .map((d) => d.category),
              Boolean(caseRow.involves_fatality),
            ),
            auditLogs: [],
            trips: [],
            expenses: [],
            technicalReports: reportRows.map(mapTechnicalReport),
            invoices: [],
            allowedNextStatuses: [],
            hasUnpaidInvoices: false,
            processGate: { point: null, ok: true, missing: [] },
          });
        }
        if (!(await staffCanAccessCaseRow(req.auth!, caseRow))) {
          return res.status(404).json({ error: "Case not found" });
        }
        const caseId = caseRow.id as number;
        const status = caseRow.status as CaseStatus;

        const [historyRows] = await db.query<RowDataPacket[]>(
          `SELECT id, from_status, to_status, reason, changed_by, created_at
           FROM case_status_history
           WHERE case_id = ?
           ORDER BY created_at DESC, id DESC
           LIMIT 50`,
          [caseId],
        );
        const [noteRows] = await db.query<RowDataPacket[]>(
          `SELECT id, body, visibility, author_id, created_at
           FROM case_notes
           WHERE case_id = ? AND deleted_at IS NULL
           ORDER BY created_at DESC
           LIMIT 50`,
          [caseId],
        );
        const [docRows] = await db.query<RowDataPacket[]>(
          `SELECT d.id, d.public_uuid, d.category, d.title, d.status, d.current_version,
                  d.approved_at, d.rejection_reason, d.correction_requested_at, d.created_at,
                  v.file_name, v.mime_type, v.storage_key, v.file_size_bytes,
                  v.ocr_status, v.ocr_text, v.ocr_processed_at
           FROM documents d
           LEFT JOIN document_versions v
             ON v.document_id = d.id AND v.version_number = d.current_version
           WHERE d.case_id = ? AND d.deleted_at IS NULL
           ORDER BY d.created_at DESC
           LIMIT 100`,
          [caseId],
        );
        const [assignmentRows] = await db.query<RowDataPacket[]>(
          `SELECT a.id, a.user_id, a.assignment_role, a.is_primary, a.assigned_at, a.notes,
                  u.first_name, u.last_name, u.email
           FROM case_assignments a
           JOIN staff_users u ON u.id = a.user_id
           WHERE a.case_id = ? AND a.unassigned_at IS NULL
           ORDER BY a.assigned_at DESC`,
          [caseId],
        );
        const [deadlineRows] = await db.query<RowDataPacket[]>(
          `SELECT id, deadline_type, title, due_at, business_days, severity_level, completed_at
           FROM case_deadlines
           WHERE case_id = ?
           ORDER BY due_at ASC
           LIMIT 50`,
          [caseId],
        );
        const [questionnaireRows] = await db.query<RowDataPacket[]>(
          `SELECT id, public_uuid, status, content_json, chronology_json,
                  technical_observations, submitted_at, created_at
           FROM questionnaires
           WHERE case_id = ?
           ORDER BY created_at DESC
           LIMIT 20`,
          [caseId],
        );
        const [inspectionRows] = await db.query<RowDataPacket[]>(
          `SELECT id, public_uuid, status, scheduled_at, completed_at, notes, lead_expert_id
           FROM inspections
           WHERE case_id = ?
           ORDER BY created_at DESC
           LIMIT 20`,
          [caseId],
        );
        const [measurementRows] = await db.query<RowDataPacket[]>(
          `SELECT id, inspection_id, measurement_type, value_numeric, unit, pole_id, notes, recorded_at
           FROM measurements
           WHERE case_id = ?
           ORDER BY recorded_at DESC
           LIMIT 100`,
          [caseId],
        );
        const [evidenceRows] = await db.query<RowDataPacket[]>(
          `SELECT id, public_uuid, inspection_id, evidence_type, category, title, caption,
                  storage_key, mime_type, file_size_bytes, captured_at, lat, lng,
                  captured_by, created_at
           FROM evidence_items
           WHERE case_id = ? AND deleted_at IS NULL
           ORDER BY created_at DESC
           LIMIT 200`,
          [caseId],
        );
        const [tripRows] = await db.query<RowDataPacket[]>(
          `SELECT id, public_uuid, status, departure_at, return_at, origin_city, destination_city, notes
           FROM logistics_trips
           WHERE case_id = ?
           ORDER BY created_at DESC
           LIMIT 20`,
          [caseId],
        );
        const [expenseRows] = await db.query<RowDataPacket[]>(
          `SELECT id, trip_id, expense_type, vendor_name, amount, currency, expense_date, notes
           FROM logistics_expenses
           WHERE case_id = ?
           ORDER BY created_at DESC
           LIMIT 100`,
          [caseId],
        );
        const [invoiceStatusRows] = await db.query<RowDataPacket[]>(
          `SELECT id, public_uuid, case_id, invoice_number, invoice_type, status,
                  total_amount, currency, due_at
           FROM invoices WHERE case_id = ?
           ORDER BY created_at DESC`,
          [caseId],
        );
        const [reportRows] = await db.query<RowDataPacket[]>(
          `SELECT id, public_uuid, status, version_number, investigation_summary,
                  defendant_questionnaire_summary, plaintiff_questionnaire_summary,
                  photo_catalog_json, conclusions,
                  submitted_at, approved_at, delivered_at, created_at
           FROM technical_reports
           WHERE case_id = ?
           ORDER BY created_at DESC
           LIMIT 20`,
          [caseId],
        );
        const [reviewRows] = await db.query<RowDataPacket[]>(
          `SELECT id, case_id, entity_type, entity_id, review_stage, status,
                  requested_by, assigned_to, due_at, completed_at, notes, created_at
           FROM review_requests
           WHERE case_id = ?
           ORDER BY created_at DESC
           LIMIT 50`,
          [caseId],
        );
        const [auditRows] = await db.query<RowDataPacket[]>(
          `SELECT id, public_uuid, actor_type, actor_id, entity_type, entity_id,
                  action, comment, created_at
           FROM audit_logs
           WHERE case_id = ?
           ORDER BY created_at DESC
           LIMIT 50`,
          [caseId],
        );

        const history: CaseStatusHistoryItem[] = historyRows.map((h) => ({
          id: h.id as number,
          fromStatus: (h.from_status as string | null) ?? null,
          toStatus: h.to_status as string,
          reason: (h.reason as string | null) ?? null,
          changedBy: (h.changed_by as number | null) ?? null,
          createdAt: toIso(h.created_at) || new Date().toISOString(),
        }));
        const notes: CaseNoteItem[] = noteRows.map((n) => ({
          id: n.id as number,
          body: n.body as string,
          visibility: n.visibility as CaseNoteItem["visibility"],
          authorId: (n.author_id as number | null) ?? null,
          createdAt: toIso(n.created_at) || new Date().toISOString(),
        }));
        const documentsRaw: CaseDocumentItem[] =
          docRows.map(mapCaseDocumentItem);
        const documents: CaseDocumentItem[] = await Promise.all(
          documentsRaw.map(async (d) => ({
            ...d,
            storageKey: d.storageKey
              ? await signBlobUrlForClient(d.storageKey)
              : null,
          })),
        );
        const questionnaires: QuestionnaireItem[] = questionnaireRows.map(
          (q) => {
            const qStatus = q.status as QuestionnaireStatus;
            return {
            id: q.id as number,
            publicUuid: q.public_uuid as string,
              status: qStatus,
              contentJson:
                (q.content_json as Record<string, unknown> | null) ?? null,
            chronologyJson:
              (q.chronology_json as Record<string, unknown> | null) ?? null,
            technicalObservations:
              (q.technical_observations as string | null) ?? null,
            submittedAt: toIso(q.submitted_at),
            createdAt: toIso(q.created_at) || new Date().toISOString(),
              allowedNextStatuses: getAllowedQuestionnaireStatusesForDirectPatch(qStatus),
            };
          },
        );
        const inspections: InspectionItem[] = inspectionRows.map((i) => ({
          id: i.id as number,
          publicUuid: i.public_uuid as string,
          status: i.status as InspectionItem["status"],
          scheduledAt: toIso(i.scheduled_at),
          completedAt: toIso(i.completed_at),
          notes: (i.notes as string | null) ?? null,
          leadExpertId: (i.lead_expert_id as number | null) ?? null,
        }));
        const measurements: MeasurementItem[] = measurementRows.map((m) => ({
          id: m.id as number,
          inspectionId: (m.inspection_id as number | null) ?? null,
          measurementType:
            m.measurement_type as MeasurementItem["measurementType"],
          valueNumeric: Number(m.value_numeric) || 0,
          unit: m.unit as MeasurementItem["unit"],
          poleId: (m.pole_id as string | null) ?? null,
          notes: (m.notes as string | null) ?? null,
          recordedAt: toIso(m.recorded_at) || new Date().toISOString(),
        }));
        const evidenceRaw: EvidenceItem[] = evidenceRows.map(mapEvidenceItem);
        const evidence: EvidenceItem[] = await Promise.all(
          evidenceRaw.map(async (e) => ({
            ...e,
            storageKey: e.storageKey
              ? await signBlobUrlForClient(e.storageKey)
              : null,
          })),
        );
        const evidenceChecklist = getEvidenceChecklistStatus(
          mergeEvidenceCategories(
            evidence.map((e) => e.category),
            measurements.map((m) => m.measurementType),
          ).map((category) => ({
            category: category as EvidenceItem["category"],
          })),
        );
        const hasUnpaidInvoices = hasBlockingFinanceForCompletion(
          invoiceStatusRows.map((r) => ({
            status: String(r.status),
            invoiceType: String(r.invoice_type || ""),
          })),
        );
        const caseInvoices: InvoiceSummary[] = invoiceStatusRows.map((r) => ({
          id: r.id as number,
          publicUuid: r.public_uuid as string,
          caseId: r.case_id as number,
          invoiceNumber: r.invoice_number as string,
          invoiceType: r.invoice_type as string,
          status: r.status as string,
          totalAmount: Number(r.total_amount) || 0,
          currency: (r.currency as string) || "MXN",
          dueAt: toIso(r.due_at),
        }));
        const trips: LogisticsTripItem[] = tripRows.map((t) => ({
          id: t.id as number,
          publicUuid: t.public_uuid as string,
          status: t.status as LogisticsTripItem["status"],
          departureAt: toIso(t.departure_at),
          returnAt: toIso(t.return_at),
          originCity: (t.origin_city as string | null) ?? null,
          destinationCity: (t.destination_city as string | null) ?? null,
          notes: (t.notes as string | null) ?? null,
        }));
        const deadlines = deadlineRows.map(mapDeadline);
        const documentCompleteness = buildDocumentCompleteness(
          documentsRaw
            .filter((d) => isActiveDocumentStatus(d.status))
            .map((d) => d.category),
          Boolean(caseRow.involves_fatality),
        );

        await maybeNotifyDeadlineApproaching(caseRow, deadlines);

        const scoped = filterCaseDetailSectionsForRole(req.auth?.role, {
          notes,
          documents,
          assignments: assignmentRows.map(mapAssignment),
          deadlines,
          questionnaires,
          inspections,
          measurements,
          evidence,
          evidenceChecklist,
          reviewRequests: reviewRows.map(mapReviewRequest),
          documentCompleteness,
          auditLogs: auditRows.map(mapAuditLog),
          trips,
          expenses: expenseRows.map(mapExpense),
          technicalReports: reportRows.map(mapTechnicalReport),
          invoices: caseInvoices,
        });

        const lastWorkflowStatus =
          status === "on_hold" ? await loadHoldResumeStatus(caseId) : null;
        const gateInput = await loadProcessGateInput(caseRow);
        const invoiceFinanceInput = invoiceStatusRows.map((r) => ({
          status: String(r.status),
          invoiceType: String(r.invoice_type || ""),
        }));
        const listado = buildListadoProgress({
          status,
          inspectionDeadlineAt: toIso(caseRow.inspection_deadline_at),
          input: gateInput,
          invoices: invoiceFinanceInput,
          holdResumeStatus: lastWorkflowStatus,
        });
        const response: CaseDetailResponse = {
          case: { ...mapCaseDetail(caseRow), listado },
          history,
          ...scoped,
          allowedNextStatuses: getAllowedNextStatuses(status, {
            role: req.auth?.role,
            lastWorkflowStatus,
          }).filter((to) =>
            canApplyCaseStatusChange(req.auth?.role, status, to),
          ),
          hasUnpaidInvoices,
          processGate: buildProcessGateSnapshot(status, gateInput),
        };
        return res.json(response);
      } catch (err) {
        apiLogger.error("cases get failed", err);
        return res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  app.patch(
    "/api/cases/:publicUuid/location",
    dbUnavailable,
    requireStaff,
    async (req: AuthedRequest, res: Response) => {
      try {
        if (!canEditCaseLocation(req.auth?.role)) {
          return res.status(403).json({ error: "Insufficient permissions" });
        }
        const body = req.body as UpdateCaseLocationRequest;
        const caseRow = await findStaffAccessibleCase(req, 
          String(req.params.publicUuid),
        );
        if (!caseRow) return res.status(404).json({ error: "Case not found" });

        let nextLatLng: { lat: number; lng: number } | null;
        if (body.propertyLat === undefined && body.propertyLng === undefined) {
          nextLatLng =
            caseRow.property_lat != null && caseRow.property_lng != null
              ? {
                  lat: Number(caseRow.property_lat),
                  lng: Number(caseRow.property_lng),
                }
              : null;
        } else {
          const resolved = resolveOptionalLatLng(
            body.propertyLat,
            body.propertyLng,
          );
          if (resolved.ok === false) {
            return res.status(400).json({ error: resolved.error });
          }
          nextLatLng = resolved.value;
        }

        const db = getPool();
        await db.query<ResultSetHeader>(
          `UPDATE cases
           SET property_address = ?,
               property_city = ?,
               property_state = ?,
               property_postal_code = ?,
               property_country = ?,
               property_lat = ?,
               property_lng = ?,
               gps_validated_at = CASE
                 WHEN ? IS NULL THEN NULL
                 ELSE COALESCE(gps_validated_at, NOW())
               END
           WHERE id = ?`,
          [
            body.propertyAddress !== undefined
              ? body.propertyAddress?.trim() || null
              : caseRow.property_address,
            body.propertyCity !== undefined
              ? body.propertyCity?.trim() || null
              : caseRow.property_city,
            body.propertyState !== undefined
              ? body.propertyState?.trim() || null
              : caseRow.property_state,
            body.propertyPostalCode !== undefined
              ? body.propertyPostalCode?.trim() || null
              : caseRow.property_postal_code,
            body.propertyCountry !== undefined
              ? body.propertyCountry?.trim() || "MX"
              : caseRow.property_country || "MX",
            nextLatLng?.lat ?? null,
            nextLatLng?.lng ?? null,
            nextLatLng?.lat ?? null,
            caseRow.id,
          ],
        );

        await db.query<ResultSetHeader>(
          `INSERT INTO audit_logs
             (public_uuid, actor_type, actor_id, case_id, entity_type, entity_id, action,
              previous_value_json, new_value_json, ip_address)
           VALUES (?, 'staff', ?, ?, 'case', ?, 'location_update', ?, ?, ?)`,
          [
            generatePublicUuid(),
            req.auth!.id,
            caseRow.id,
            String(caseRow.id),
            JSON.stringify({
              propertyLat: caseRow.property_lat,
              propertyLng: caseRow.property_lng,
            }),
            JSON.stringify({
              propertyLat: nextLatLng?.lat ?? null,
              propertyLng: nextLatLng?.lng ?? null,
            }),
            req.ip || null,
          ],
        );

        const [updated] = await db.query<RowDataPacket[]>(
          `SELECT * FROM cases WHERE id = ? LIMIT 1`,
          [caseRow.id],
        );
        const response: CaseResponse = { case: mapCaseDetail(updated[0]) };
        return res.json(response);
      } catch (err) {
        apiLogger.error("cases location patch failed", err);
        return res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  app.patch(
    "/api/cases/:publicUuid",
    dbUnavailable,
    requireStaffOrLawFirm,
    async (req: AuthedRequest, res: Response) => {
      try {
        const parsed = parseUpdateCaseFlags(req.body as UpdateCaseFlagsRequest);
        if (parsed.ok === false) {
          return res.status(400).json({ error: parsed.error });
        }
        if (req.auth!.actor === "law_firm") {
          if (!(await assertLawFirmCanMutate(req.auth!, res))) return;
          if (typeof parsed.value.involvesFatality !== "boolean") {
            return res
              .status(400)
              .json({ error: "involvesFatality must be a boolean" });
          }
          const db = getPool();
          const [rows] = await db.query<RowDataPacket[]>(
            `SELECT * FROM cases
             WHERE public_uuid = ? AND deleted_at IS NULL
             LIMIT 1`,
            [req.params.publicUuid],
          );
          if (rows.length === 0) {
            return res.status(404).json({ error: "Case not found" });
          }
          if (!(await lawFirmOwnsCaseRow(req.auth!, rows[0]))) {
            return res.status(404).json({ error: "Case not found" });
          }
          await db.query<ResultSetHeader>(
            `UPDATE cases SET involves_fatality = ? WHERE id = ?`,
            [parsed.value.involvesFatality ? 1 : 0, rows[0].id],
          );
          const [updated] = await db.query<RowDataPacket[]>(
            `SELECT * FROM cases WHERE id = ? LIMIT 1`,
            [rows[0].id],
          );
          await notifyMissingDocumentsIfNeeded(updated[0]);
          const response: CaseResponse = { case: mapCaseDetail(updated[0]) };
          return res.json(response);
        }
        const wantsFatality = typeof parsed.value.involvesFatality === "boolean";
        const wantsModality = "protestaModality" in parsed.value;
        const wantsExternalDeadline = "externalCourtDeadlineAt" in parsed.value;
        const wantsDictamenDue = "dictamenDueAt" in parsed.value;
        const wantsTitle = "title" in parsed.value;
        const wantsDescription = "description" in parsed.value;
        const wantsLawFirm = "lawFirmId" in parsed.value;
        const intakePackEdit = wantsTitle || wantsDescription || wantsLawFirm;
        if (wantsFatality && !canChangeCaseStatus(req.auth?.role)) {
          return res.status(403).json({ error: "Insufficient permissions" });
        }
        if (
          wantsModality &&
          !(
            canChangeCaseStatus(req.auth?.role) ||
            req.auth?.role === "expert"
          )
        ) {
          return res.status(403).json({ error: "Insufficient permissions" });
        }
        if (
          intakePackEdit &&
          !canEditIntakePackInline(req.auth?.role)
        ) {
          return res.status(403).json({ error: "Insufficient permissions" });
        }
        if (
          wantsExternalDeadline &&
          !canSetExternalCourtDeadline(req.auth?.role) &&
          !(intakePackEdit && canEditIntakePackInline(req.auth?.role))
        ) {
          return res.status(403).json({ error: "Insufficient permissions" });
        }
        if (
          wantsDictamenDue &&
          !(
            canChangeCaseStatus(req.auth?.role) ||
            req.auth?.role === "expert" ||
            req.auth?.role === "logistics"
          )
        ) {
          return res.status(403).json({ error: "Insufficient permissions" });
        }
        const caseRow = await findStaffAccessibleCase(
          req,
          String(req.params.publicUuid),
        );
        if (!caseRow) return res.status(404).json({ error: "Case not found" });

        const db = getPool();
        if (wantsLawFirm && parsed.value.lawFirmId != null) {
          const [firms] = await db.query<RowDataPacket[]>(
            `SELECT id FROM law_firms WHERE id = ? LIMIT 1`,
            [parsed.value.lawFirmId],
          );
          if (!firms.length) {
            return res.status(400).json({ error: "Law firm not found" });
          }
        }
        const sets: string[] = [];
        const params: unknown[] = [];
        if (wantsFatality) {
          sets.push("involves_fatality = ?");
          params.push(parsed.value.involvesFatality ? 1 : 0);
        }
        if (wantsModality) {
          sets.push("protesta_modality = ?");
          params.push(parsed.value.protestaModality ?? null);
        }
        if (wantsExternalDeadline) {
          sets.push("external_court_deadline_at = ?");
          params.push(
            parsed.value.externalCourtDeadlineAt
              ? toMysqlDateTimeUtc(
                  new Date(parsed.value.externalCourtDeadlineAt),
                )
              : null,
          );
        }
        if (wantsDictamenDue) {
          sets.push("dictamen_due_at = ?");
          params.push(
            parsed.value.dictamenDueAt
              ? toMysqlDateTimeUtc(new Date(parsed.value.dictamenDueAt))
              : null,
          );
        }
        if (wantsTitle) {
          sets.push("title = ?");
          params.push(parsed.value.title);
        }
        if (wantsDescription) {
          sets.push("description = ?");
          params.push(parsed.value.description ?? null);
        }
        if (wantsLawFirm) {
          sets.push("law_firm_id = ?");
          params.push(parsed.value.lawFirmId ?? null);
        }
        if (sets.length === 0) {
          return res.status(400).json({ error: "Nothing to update" });
        }
        params.push(caseRow.id);
        await db.query<ResultSetHeader>(
          `UPDATE cases SET ${sets.join(", ")} WHERE id = ?`,
          params,
        );
        await db.query<ResultSetHeader>(
          `INSERT INTO audit_logs
             (public_uuid, actor_type, actor_id, case_id, entity_type, entity_id, action,
              previous_value_json, new_value_json, ip_address)
           VALUES (?, 'staff', ?, ?, 'case', ?, 'flags_update', ?, ?, ?)`,
          [
            generatePublicUuid(),
            req.auth!.id,
            caseRow.id,
            String(caseRow.id),
            JSON.stringify({
              involvesFatality: Boolean(caseRow.involves_fatality),
              protestaModality: caseRow.protesta_modality ?? null,
              externalCourtDeadlineAt: toIso(
                caseRow.external_court_deadline_at,
              ),
            }),
            JSON.stringify({
              ...(wantsFatality
                ? { involvesFatality: parsed.value.involvesFatality }
                : {}),
              ...(wantsModality
                ? { protestaModality: parsed.value.protestaModality ?? null }
                : {}),
              ...(wantsExternalDeadline
                ? {
                    externalCourtDeadlineAt:
                      parsed.value.externalCourtDeadlineAt ?? null,
                  }
                : {}),
            }),
            req.ip || null,
          ],
        );
        const [updated] = await db.query<RowDataPacket[]>(
          `SELECT * FROM cases WHERE id = ? LIMIT 1`,
          [caseRow.id],
        );
        await notifyMissingDocumentsIfNeeded(updated[0]);
        const response: CaseResponse = { case: mapCaseDetail(updated[0]) };
        return res.json(response);
      } catch (err) {
        apiLogger.error("cases flags patch failed", err);
        return res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  app.post(
    "/api/geo/geocode",
    dbUnavailable,
    requireStaff,
    async (req: AuthedRequest, res: Response) => {
      try {
        const body = req.body as GeocodeRequest;
        const normalized = normalizeGeocodeQuery(body?.query);
        if (normalized.ok === false) {
          return res.status(400).json({ error: normalized.error });
        }
        const query = normalized.query;
        const asCoords = parseGpsText(query);
        if (asCoords.ok === true) {
          const response: GeocodeResponse = {
            lat: asCoords.lat,
            lng: asCoords.lng,
            displayName: `${asCoords.lat}, ${asCoords.lng}`,
          };
          return res.json(response);
        }

        const url = new URL("https://nominatim.openstreetmap.org/search");
        url.searchParams.set("q", query);
        url.searchParams.set("format", "json");
        url.searchParams.set("limit", "1");
        const fetched = await fetch(url.toString(), {
          headers: {
            Accept: "application/json",
            "User-Agent":
              "DELACHE/1.0 (case operations; https://delache.local)",
          },
        });
        if (!fetched.ok) {
          return res.status(502).json({ error: "Geocoding provider failed" });
        }
        const data = (await fetched.json()) as Array<{
          lat?: string;
          lon?: string;
          display_name?: string;
        }>;
        if (!Array.isArray(data) || data.length === 0) {
          return res.status(404).json({ error: "No results for query" });
        }
        const hit = data[0];
        const resolved = resolveOptionalLatLng(
          Number(hit.lat),
          Number(hit.lon),
        );
        if (resolved.ok === false || !resolved.value) {
          return res.status(502).json({ error: "Invalid geocode result" });
        }
        const response: GeocodeResponse = {
          lat: resolved.value.lat,
          lng: resolved.value.lng,
          displayName: String(hit.display_name || query),
        };
        return res.json(response);
      } catch (err) {
        apiLogger.error("geocode failed", err);
        return res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  app.patch(
    "/api/cases/:publicUuid/status",
    dbUnavailable,
    requireStaff,
    async (req: AuthedRequest, res: Response) => {
      try {
        const body = req.body as UpdateCaseStatusRequest;
        const toStatus = body?.status as CaseStatus;
        if (!toStatus) {
          return res.status(400).json({ error: "status is required" });
        }

        const db = getPool();
        const [rows] = await db.query<RowDataPacket[]>(
          `SELECT * FROM cases WHERE public_uuid = ? AND deleted_at IS NULL LIMIT 1`,
          [req.params.publicUuid],
        );
        if (rows.length === 0) {
          return res.status(404).json({ error: "Case not found" });
        }

        const fromStatus = rows[0].status as CaseStatus;
        if (!canApplyCaseStatusChange(req.auth?.role, fromStatus, toStatus)) {
          return res.status(403).json({ error: "Insufficient permissions" });
        }
        const lastWorkflowStatus =
          fromStatus === "on_hold"
            ? await loadHoldResumeStatus(rows[0].id as number)
            : null;
        const check = canTransition(fromStatus, toStatus, {
          role: req.auth?.role,
          lastWorkflowStatus,
        });
        if (check.ok === false) {
          return res.status(400).json({ error: check.reason });
        }

        const enforcePoint = processPointToEnforceOnTransition(
          fromStatus,
          toStatus,
        );
        if (enforcePoint) {
          const gateInput = await loadProcessGateInput(rows[0]);
          const gates = evaluateProcessGates(enforcePoint, gateInput);
          if (gates.ok === false) {
            return res.status(409).json({
              error: "Process gates not satisfied",
              missing: gates.missing,
            });
          }
        }

        const completedAt =
          toStatus === "completed" ? new Date() : rows[0].completed_at;
        const cancelledAt =
          toStatus === "cancelled" ? new Date() : rows[0].cancelled_at;

        await db.query<ResultSetHeader>(
          `UPDATE cases
           SET status = ?,
               completed_at = ?,
               cancelled_at = ?,
               cancel_reason = ?
           WHERE id = ?`,
          [
            toStatus,
            completedAt,
            cancelledAt,
            toStatus === "cancelled"
              ? body.reason?.trim() || "Cancelled"
              : rows[0].cancel_reason,
            rows[0].id,
          ],
        );

        const caseId = rows[0].id as number;
        const actorId = req.auth!.id;
        await completeTypedDeadlines(
          caseId,
          deadlineTypesToCompleteOnTransition(fromStatus, toStatus),
        );
        await maybeStartTenDayClock({ ...rows[0], status: toStatus }, actorId);
        if (
          fromStatus === "legal_review_questionnaire" &&
          toStatus === "questionnaire"
        ) {
          const qReopen = QUESTIONNAIRE_REOPEN_FROM_STATUSES.map(() => "?").join(
            ", ",
          );
          await db.query<ResultSetHeader>(
            `UPDATE questionnaires
             SET status = 'changes_requested'
             WHERE case_id = ?
               AND status IN (${qReopen})`,
            [caseId, ...QUESTIONNAIRE_REOPEN_FROM_STATUSES],
          );
        }
        if (
          fromStatus === "validation_delivery" &&
          toStatus === "technical_report"
        ) {
          await db.query<ResultSetHeader>(
            `UPDATE technical_reports
             SET status = 'changes_requested'
             WHERE case_id = ?
               AND status IN (
                 'approved_internal', 'external_review', 'approved'
               )`,
            [caseId],
          );
        }
        if (toStatus === "questionnaire") {
          await ensureTypedDeadline({
            caseId,
            deadlineType: "questionnaire",
            title: "Questionnaire, GPS and Street View (3 business days)",
            businessDays: 3,
            actorId,
          });
        }
        if (toStatus === "legal_review_questionnaire") {
          await ensureTypedDeadline({
            caseId,
            deadlineType: "legal_review",
            title: "Internal legal review of questionnaire (2 business days)",
            businessDays: 2,
            actorId,
          });
        }
        if (toStatus === "validation_delivery") {
          const clampRaw = rows[0].inspection_deadline_at;
          await ensureTypedDeadline({
            caseId,
            deadlineType: "external_legal_validation",
            title: "Law-firm validation (3 business days, inside 10-day clock)",
            businessDays: 3,
            actorId,
            clampTo: clampRaw ? new Date(clampRaw as string) : null,
          });
        }

        await db.query<ResultSetHeader>(
          `INSERT INTO case_status_history
             (case_id, from_status, to_status, changed_by, reason)
           VALUES (?, ?, ?, ?, ?)`,
          [
            rows[0].id,
            fromStatus,
            toStatus,
            req.auth!.id,
            body.reason?.trim() || null,
          ],
        );

        await db.query<ResultSetHeader>(
          `INSERT INTO audit_logs
             (public_uuid, actor_type, actor_id, case_id, entity_type, entity_id, action,
              previous_value_json, new_value_json, ip_address)
           VALUES (?, 'staff', ?, ?, 'case', ?, 'status_change', ?, ?, ?)`,
          [
            generatePublicUuid(),
            req.auth!.id,
            rows[0].id,
            String(rows[0].id),
            JSON.stringify({ status: fromStatus }),
            JSON.stringify({ status: toStatus }),
            req.ip || null,
          ],
        );

        if (rows[0].law_firm_id) {
          const contacts = await listLawFirmContacts(
            Number(rows[0].law_firm_id),
          );
          for (const contact of contacts) {
            await createNotification({
              recipientActor: "law_firm",
              recipientId: contact.id,
              caseId: rows[0].id as number,
              type:
                toStatus === "validation_delivery" ||
                toStatus === "court_acceptance"
                  ? "court_filing"
                  : "general",
              title: `${rows[0].case_number}: ${toStatus}`,
              body: `Status updated from ${fromStatus} to ${toStatus}.`,
              emailTo: contact.email,
              caseNumber: String(rows[0].case_number),
              caseUrl: `${EMAIL_APP_URL}/portal/cases/${rows[0].public_uuid}`,
              email: buildCaseStatusEmail({
                locale: contact.locale,
                firstName: contact.firstName,
                caseNumber: String(rows[0].case_number),
                caseTitle: String(rows[0].title || rows[0].case_number),
                fromStatus: String(fromStatus),
                toStatus: String(toStatus),
                caseUrl: `${EMAIL_APP_URL}/portal/cases/${rows[0].public_uuid}`,
                appUrl: EMAIL_APP_URL,
              }),
            });
          }
        }

        const caseAutomation = automationOnCaseCompletedOrRatified(toStatus);
        if (caseAutomation.length > 0) {
          await runAutomationActions(caseAutomation, {
            caseId: rows[0].id as number,
            lawFirmId:
              rows[0].law_firm_id != null ? Number(rows[0].law_firm_id) : null,
            actorId: req.auth!.id,
            caseNumber: String(rows[0].case_number),
            fallbackRecipientId: req.auth!.id,
          });
        }

        const [deadlineRows] = await db.query<RowDataPacket[]>(
          `SELECT id, deadline_type, title, due_at, business_days, severity_level, completed_at
           FROM case_deadlines
           WHERE case_id = ? AND completed_at IS NULL
           ORDER BY due_at ASC
           LIMIT 50`,
          [rows[0].id],
        );
        await maybeNotifyDeadlineApproaching(
          rows[0],
          deadlineRows.map(mapDeadline),
        );

        const [updated] = await db.query<RowDataPacket[]>(
          `SELECT * FROM cases WHERE id = ? LIMIT 1`,
          [rows[0].id],
        );
        await notifyMissingDocumentsIfNeeded(updated[0]);
        const response: CaseResponse = { case: mapCaseDetail(updated[0]) };
        return res.json(response);
      } catch (err) {
        apiLogger.error("cases status patch failed", err);
        return res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  app.post(
    "/api/cases/:publicUuid/notes",
    dbUnavailable,
    requireStaff,
    async (req: AuthedRequest, res: Response) => {
      try {
        if (!canViewCaseSection(req.auth?.role, "notes")) {
          return res.status(403).json({ error: "Insufficient permissions" });
        }
        const body = req.body as CreateCaseNoteRequest;
        const text = String(body?.body || "").trim();
        if (!text) {
          return res.status(400).json({ error: "Note body is required" });
        }
        const visibility = body.visibility || "internal";
        const db = getPool();
        const [rows] = await db.query<RowDataPacket[]>(
          `SELECT id FROM cases WHERE public_uuid = ? AND deleted_at IS NULL LIMIT 1`,
          [req.params.publicUuid],
        );
        if (rows.length === 0) {
          return res.status(404).json({ error: "Case not found" });
        }
        const [result] = await db.query<ResultSetHeader>(
          `INSERT INTO case_notes (case_id, author_id, visibility, body)
           VALUES (?, ?, ?, ?)`,
          [rows[0].id, req.auth!.id, visibility, text],
        );
        const note: CaseNoteItem = {
          id: result.insertId,
          body: text,
          visibility,
          authorId: req.auth!.id,
          createdAt: new Date().toISOString(),
        };
        return res.status(201).json({ note });
      } catch (err) {
        apiLogger.error("cases notes create failed", err);
        return res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  app.post(
    "/api/cases/:publicUuid/documents",
    dbUnavailable,
    requireStaffOrLawFirm,
    async (req: AuthedRequest, res: Response) => {
      try {
        if (!process.env.BLOB_READ_WRITE_TOKEN) {
          return res.status(503).json({
            error: "BLOB_READ_WRITE_TOKEN not configured",
          });
        }
        const isLawFirm = req.auth!.actor === "law_firm";
        if (!isLawFirm && !canMutateCaseSection(req.auth?.role, "documents")) {
          return res.status(403).json({ error: "Insufficient permissions" });
        }
        if (!(await assertLawFirmCanMutate(req.auth!, res))) return;
        const body = req.body as CreateCaseDocumentRequest;
        const title = String(body?.title || "").trim();
        const fileName = String(body?.fileName || "").trim();
        const base64 = String(body?.data || "");
        const categoryParsed = isLawFirm
          ? parseClientUploadCategory(body.category)
          : parseRequiredDocumentCategory(body.category);
        if (categoryParsed.ok === false) {
          return res.status(400).json({ error: categoryParsed.error });
        }
        const category = categoryParsed.value;
        if (!title || !fileName || !base64) {
          return res
            .status(400)
            .json({ error: "title, fileName and data are required" });
        }

        const db = getPool();
        const [rows] = await db.query<RowDataPacket[]>(
          `SELECT * FROM cases WHERE public_uuid = ? AND deleted_at IS NULL LIMIT 1`,
          [req.params.publicUuid],
        );
        if (rows.length === 0) {
          return res.status(404).json({ error: "Case not found" });
        }
        if (isLawFirm) {
          if (!(await lawFirmOwnsCaseRow(req.auth!, rows[0]))) {
            return res.status(404).json({ error: "Case not found" });
          }
          const lockCheck = await assertLawFirmCanUploadCategory({
            caseId: Number(rows[0].id),
            category,
          });
          if (lockCheck.ok === false) {
            return res.status(lockCheck.status).json({ error: lockCheck.error });
          }
        } else if (!(await staffCanAccessCaseRow(req.auth!, rows[0]))) {
          return res.status(404).json({ error: "Case not found" });
        }

        const buffer = Buffer.from(base64, "base64");
        if (buffer.length === 0 || buffer.length > DMS_MAX_FILE_BYTES) {
          return res.status(400).json({ error: "Invalid file size" });
        }
        if (shouldUseDirectBlobUpload(buffer.length)) {
          return res.status(413).json({
            error: "File too large for JSON upload; use direct blob upload",
          });
        }

        if (isLawFirm) {
          const caseRow = rows[0];
          const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
          const pathname = `client-cases/${caseRow.id}/${Date.now()}-${safeName}`;
          const blob = await putPrivateBlob(
            pathname,
            buffer,
            body.contentType || undefined,
          );
          const docUuid = generatePublicUuid();
          const [docResult] = await db.query<ResultSetHeader>(
            `INSERT INTO documents
               (public_uuid, case_id, category, title, current_version, status,
                uploaded_by, uploaded_by_law_firm_user_id)
             VALUES (?, ?, ?, ?, 1, 'uploaded', NULL, ?)`,
            [docUuid, caseRow.id, category, title, req.auth!.id],
          );
          await db.query<ResultSetHeader>(
            `INSERT INTO document_versions
               (document_id, version_number, storage_key, file_name, mime_type, file_size_bytes, uploaded_by)
             VALUES (?, 1, ?, ?, ?, ?, NULL)`,
            [
              docResult.insertId,
              blob.url,
              fileName,
              body.contentType || "application/octet-stream",
              buffer.length,
            ],
          );
          const staffRecipients = new Set<number>();
          const coordinator = await resolveCoordinatorOrAdmin(caseRow);
          if (coordinator != null) staffRecipients.add(coordinator);
          if (caseRow.assigned_expert_id != null) {
            staffRecipients.add(Number(caseRow.assigned_expert_id));
          }
          for (const recipientId of staffRecipients) {
            await createNotification({
              recipientActor: "staff",
              recipientId,
              caseId: Number(caseRow.id),
              type: "general",
              title: `Client document · ${caseRow.case_number}`,
              body: `Law firm uploaded "${title}" (${category}).`,
              caseNumber: String(caseRow.case_number),
              caseUrl: `${EMAIL_APP_URL}/portal/cases/${caseRow.public_uuid}`,
            });
          }
          await maybeStartTenDayClock(caseRow, coordinator);
          await notifyMissingDocumentsIfNeeded(caseRow);
          await maybeCompleteIntakeCorrectionDeadline(Number(caseRow.id));
          return res.status(201).json({
            document: {
              id: docResult.insertId,
              publicUuid: docUuid,
              category,
              title,
              status: "uploaded",
              currentVersion: 1,
              fileName,
              mimeType: body.contentType || null,
              storageKey: await signBlobUrlForClient(blob.url),
              fileSizeBytes: buffer.length,
              createdAt: new Date().toISOString(),
            } satisfies CaseDocumentItem,
          });
        }

        const document = await insertCaseDocumentUpload({
          caseId: rows[0].id as number,
          title,
          fileName,
          contentType: body.contentType || "application/octet-stream",
          buffer,
          category,
          uploadedByStaffId: req.auth!.id,
          blobPathPrefix: `cases/${rows[0].id}`,
        });

        await notifyMissingDocumentsIfNeeded(rows[0]);
        await maybeStartTenDayClock(rows[0], req.auth!.id);

        return res.status(201).json({ document });
      } catch (err) {
        apiLogger.error("cases documents create failed", err);
        return res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  app.post(
    "/api/cases/:publicUuid/documents/from-blob",
    dbUnavailable,
    requireStaffOrLawFirm,
    async (req: AuthedRequest, res: Response) => {
      try {
        if (!process.env.BLOB_READ_WRITE_TOKEN) {
          return res.status(503).json({
            error: "BLOB_READ_WRITE_TOKEN not configured",
          });
        }
        const isLawFirm = req.auth!.actor === "law_firm";
        if (!isLawFirm && !canMutateCaseSection(req.auth?.role, "documents")) {
          return res.status(403).json({ error: "Insufficient permissions" });
        }
        if (!(await assertLawFirmCanMutate(req.auth!, res))) return;
        const casePublicUuid = String(req.params.publicUuid);
        const db = getPool();
        const [caseRows] = await db.query<RowDataPacket[]>(
          `SELECT * FROM cases WHERE public_uuid = ? AND deleted_at IS NULL LIMIT 1`,
          [casePublicUuid],
        );
        if (caseRows.length === 0) {
          return res.status(404).json({ error: "Case not found" });
        }
        const caseRow = caseRows[0];
        if (isLawFirm) {
          if (!(await lawFirmOwnsCaseRow(req.auth!, caseRow))) {
            return res.status(404).json({ error: "Case not found" });
          }
        } else if (!(await staffCanAccessCaseRow(req.auth!, caseRow))) {
          return res.status(404).json({ error: "Case not found" });
        }
        const body = req.body as CreateCaseDocumentFromBlobRequest;
        const categoryParsed = isLawFirm
          ? parseClientUploadCategory(body.category)
          : parseRequiredDocumentCategory(body.category);
        if (categoryParsed.ok === false) {
          return res.status(400).json({ error: categoryParsed.error });
        }
        if (isLawFirm) {
          const lockCheck = await assertLawFirmCanUploadCategory({
            caseId: Number(caseRow.id),
            category: categoryParsed.value,
          });
          if (lockCheck.ok === false) {
            return res.status(lockCheck.status).json({ error: lockCheck.error });
          }
        }
        const validated = validateFromBlobDocument(body, {
          actor: isLawFirm ? "law_firm" : "staff",
          casePublicUuid,
          maxFileBytes: DMS_MAX_FILE_BYTES,
          isAllowedMime: isAllowedDmsMime,
          blobPathnameFromUrl,
          isPrivateBlobUrl,
        });
        if (validated.ok === false) {
          return res.status(400).json({ error: validated.error });
        }
        const inspected = await inspectPrivateBlob(
          validated.value.storageKey,
          validated.value.fileSizeBytes,
        );
        if (inspected.ok === false) {
          await safeDeleteBlobs([validated.value.storageKey]);
          return res.status(inspected.status).json({ error: inspected.error });
        }
        const document = await insertCaseDocumentFromExistingBlob({
          caseId: caseRow.id as number,
          title: validated.value.title,
          fileName: validated.value.fileName,
          contentType: validated.value.contentType,
          storageKey: validated.value.storageKey,
          fileSizeBytes: inspected.size,
          category: categoryParsed.value,
          uploadedByStaffId: isLawFirm ? null : req.auth!.id,
          uploadedByLawFirmUserId: isLawFirm ? req.auth!.id : null,
        });
        if (isLawFirm) {
          const staffRecipients = new Set<number>();
          const coordinator = await resolveCoordinatorOrAdmin(caseRow);
          if (coordinator != null) staffRecipients.add(coordinator);
          if (caseRow.assigned_expert_id != null) {
            staffRecipients.add(Number(caseRow.assigned_expert_id));
          }
          for (const recipientId of staffRecipients) {
            await createNotification({
              recipientActor: "staff",
              recipientId,
              caseId: Number(caseRow.id),
              type: "general",
              title: `Client document · ${caseRow.case_number}`,
              body: `Law firm uploaded "${document.title}" (${categoryParsed.value}).`,
              caseNumber: String(caseRow.case_number),
              caseUrl: `${EMAIL_APP_URL}/portal/cases/${caseRow.public_uuid}`,
            });
          }
          await maybeStartTenDayClock(caseRow, coordinator);
          await notifyMissingDocumentsIfNeeded(caseRow);
          await maybeCompleteIntakeCorrectionDeadline(Number(caseRow.id));
        } else {
          await notifyMissingDocumentsIfNeeded(caseRow);
          await maybeStartTenDayClock(caseRow, req.auth!.id);
        }
        return res.status(201).json({ document });
      } catch (err) {
        apiLogger.error("cases documents from-blob failed", err);
        return res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  app.patch(
    "/api/cases/:publicUuid/documents/:documentUuid",
    dbUnavailable,
    requireStaffOrLawFirm,
    async (req: AuthedRequest, res: Response) => {
      try {
        const isLawFirm = req.auth!.actor === "law_firm";
        if (!isLawFirm && !canMutateCaseSection(req.auth?.role, "documents")) {
          return res.status(403).json({ error: "Insufficient permissions" });
        }
        if (!(await assertLawFirmCanMutate(req.auth!, res))) return;
        const db = getPool();
        const [cases] = await db.query<RowDataPacket[]>(
          `SELECT * FROM cases WHERE public_uuid = ? AND deleted_at IS NULL LIMIT 1`,
          [req.params.publicUuid],
        );
        if (cases.length === 0) {
          return res.status(404).json({ error: "Case not found" });
        }
        if (isLawFirm) {
          if (!(await lawFirmOwnsCaseRow(req.auth!, cases[0]))) {
            return res.status(404).json({ error: "Case not found" });
          }
        } else if (!(await staffCanAccessCaseRow(req.auth!, cases[0]))) {
          return res.status(404).json({ error: "Case not found" });
        }
        const [docs] = await db.query<RowDataPacket[]>(
          `SELECT id, category, status FROM documents
           WHERE public_uuid = ? AND case_id = ? AND deleted_at IS NULL
           LIMIT 1`,
          [req.params.documentUuid, cases[0].id],
        );
        if (docs.length === 0) {
          return res.status(404).json({ error: "Document not found" });
        }
        if (isLawFirm) {
          if (!canLawFirmMutateDocument({ status: docs[0].status as string })) {
            return res.status(409).json({
              error: "Document is locked until admin requests correction",
            });
          }
        }
        const parsed = parseUpdateDocumentCategory(req.body, {
          clientPortal: isLawFirm,
          currentCategory: docs[0].category,
        });
        if (parsed.ok === false) {
          return res.status(400).json({ error: parsed.error });
        }
        await db.query<ResultSetHeader>(
          `UPDATE documents SET category = ? WHERE id = ?`,
          [parsed.value.category, docs[0].id],
        );
        const [updated] = await db.query<RowDataPacket[]>(
          `SELECT d.id, d.public_uuid, d.category, d.title, d.status, d.current_version,
                  d.approved_at, d.rejection_reason, d.correction_requested_at, d.created_at,
                  v.file_name, v.mime_type, v.storage_key, v.file_size_bytes,
                  v.ocr_status, v.ocr_text, v.ocr_processed_at
           FROM documents d
           LEFT JOIN document_versions v
             ON v.document_id = d.id AND v.version_number = d.current_version
           WHERE d.id = ?
           LIMIT 1`,
          [docs[0].id],
        );
        await notifyMissingDocumentsIfNeeded(cases[0]);
        if (!isLawFirm) {
          await maybeStartTenDayClock(cases[0], req.auth!.id);
        }
        const document = mapCaseDocumentItem(updated[0]);
        return res.json({
          document: isLawFirm
            ? {
                ...document,
                storageKey: document.storageKey
                  ? await signBlobUrlForClient(document.storageKey)
                  : null,
              }
            : document,
        });
      } catch (err) {
        apiLogger.error("cases document category patch failed", err);
        return res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  app.post(
    "/api/cases/:publicUuid/documents/bulk",
    dbUnavailable,
    requireStaff,
    async (req: AuthedRequest, res: Response) => {
      try {
        if (!canMutateCaseSection(req.auth?.role, "documents")) {
          return res.status(403).json({ error: "Insufficient permissions" });
        }
        if (!process.env.BLOB_READ_WRITE_TOKEN) {
          return res.status(503).json({
            error: "BLOB_READ_WRITE_TOKEN not configured",
          });
        }
        const body = req.body as BulkUploadDocumentsRequest;
        const validated = validateBulkDocuments(body?.files);
        if (validated.ok === false) {
          return res.status(400).json({ error: validated.error });
        }

        const db = getPool();
        const [rows] = await db.query<RowDataPacket[]>(
          `SELECT * FROM cases WHERE public_uuid = ? AND deleted_at IS NULL LIMIT 1`,
          [req.params.publicUuid],
        );
        if (rows.length === 0) {
          return res.status(404).json({ error: "Case not found" });
        }

        const prepared: Array<{
          title: string;
          fileName: string;
          contentType: string;
          buffer: Buffer;
          category: DocumentCategory;
        }> = [];
        for (const file of validated.files) {
          const buffer = Buffer.from(file.dataBase64, "base64");
          if (buffer.length === 0 || buffer.length > DMS_MAX_FILE_BYTES) {
            return res.status(400).json({
              error: `Invalid file size for ${file.fileName}`,
            });
          }
          if (shouldUseDirectBlobUpload(buffer.length)) {
            return res.status(413).json({
              error: "File too large for JSON upload; use direct blob upload",
            });
          }
          const catParsed = parseRequiredDocumentCategory(file.category);
          if (catParsed.ok === false) {
            return res.status(400).json({
              error: `${file.fileName}: ${catParsed.error}`,
            });
          }
          prepared.push({
            title: file.title,
            fileName: file.fileName,
            contentType: file.contentType,
            buffer,
            category: catParsed.value,
          });
        }

        // Blob uploads first (outside DB txn), then insert all rows atomically.
        const staged: Array<{
          title: string;
          fileName: string;
          mimeType: string;
          buffer: Buffer;
          category: DocumentCategory;
          storageKey: string;
          ocrStatus: OcrStatus;
          ocrText: string | null;
          ocrProcessedAt: Date | null;
        }> = [];
        for (const file of prepared) {
          const mimeType = file.contentType || "application/octet-stream";
          const ocr = await resolveUploadOcrFields(mimeType, file.buffer);
          const safeName = file.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
        const pathname = `cases/${rows[0].id}/${Date.now()}-${safeName}`;
          const blob = await putPrivateBlob(
            pathname,
            file.buffer,
            file.contentType || undefined,
          );
          staged.push({
            title: file.title,
            fileName: file.fileName,
            mimeType,
            buffer: file.buffer,
            category: file.category,
            storageKey: blob.url,
            ocrStatus: ocr.ocrStatus,
            ocrText: ocr.ocrText,
            ocrProcessedAt: ocr.ocrProcessedAt,
          });
        }

        const conn = await db.getConnection();
        const documents: CaseDocumentItem[] = [];
        try {
          await conn.beginTransaction();
          for (const file of staged) {
        const docUuid = generatePublicUuid();
            const [docResult] = await conn.query<ResultSetHeader>(
          `INSERT INTO documents
             (public_uuid, case_id, category, title, current_version, status, uploaded_by)
           VALUES (?, ?, ?, ?, 1, 'uploaded', ?)`,
              [docUuid, rows[0].id, file.category, file.title, req.auth!.id],
        );
            await conn.query<ResultSetHeader>(
          `INSERT INTO document_versions
                 (document_id, version_number, storage_key, file_name, mime_type, file_size_bytes,
                  uploaded_by, ocr_text, ocr_status, ocr_processed_at)
               VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            docResult.insertId,
                file.storageKey,
                file.fileName,
                file.mimeType,
                file.buffer.length,
            req.auth!.id,
                file.ocrText,
                file.ocrStatus,
                file.ocrProcessedAt
                  ? toMysqlDateTimeUtc(file.ocrProcessedAt)
                  : null,
          ],
        );
            documents.push({
          id: docResult.insertId,
          publicUuid: docUuid,
              category: file.category,
              title: file.title,
          status: "uploaded",
          currentVersion: 1,
              fileName: file.fileName,
              mimeType: file.mimeType,
              storageKey: await signBlobUrlForClient(file.storageKey),
              fileSizeBytes: file.buffer.length,
              ocrStatus: file.ocrStatus,
              ocrText: file.ocrText,
              ocrProcessedAt: file.ocrProcessedAt
                ? file.ocrProcessedAt.toISOString()
                : null,
          createdAt: new Date().toISOString(),
            });
          }
          await conn.commit();
        } catch (err) {
          await conn.rollback();
          await safeDeleteBlobs(staged.map((s) => s.storageKey));
          throw err;
        } finally {
          conn.release();
        }

        await notifyMissingDocumentsIfNeeded(rows[0]);
        await maybeStartTenDayClock(rows[0], req.auth!.id);

        const response: BulkUploadDocumentsResponse = { documents };
        return res.status(201).json(response);
      } catch (err) {
        apiLogger.error("cases documents bulk create failed", err);
        return res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  app.post(
    "/api/cases/:publicUuid/documents/:documentUuid/ocr",
    dbUnavailable,
    requireStaff,
    async (req: AuthedRequest, res: Response) => {
      try {
        if (!canMutateCaseSection(req.auth?.role, "documents")) {
          return res.status(403).json({ error: "Insufficient permissions" });
        }
        const body = (req.body || {}) as SaveDocumentOcrRequest;
        const clientOcrText =
          body.ocrText != null ? String(body.ocrText).trim() : "";

        const db = getPool();
        const [rows] = await db.query<RowDataPacket[]>(
          `SELECT d.id, d.public_uuid, d.category, d.title, d.status, d.current_version,
                  d.approved_at, d.rejection_reason, d.correction_requested_at, d.created_at,
                  v.id AS version_id, v.file_name, v.mime_type, v.storage_key,
                  v.file_size_bytes, v.ocr_status, v.ocr_text, v.ocr_processed_at
           FROM documents d
           JOIN cases c ON c.id = d.case_id
           LEFT JOIN document_versions v
             ON v.document_id = d.id AND v.version_number = d.current_version
           WHERE c.public_uuid = ? AND c.deleted_at IS NULL
             AND d.public_uuid = ? AND d.deleted_at IS NULL
           LIMIT 1`,
          [req.params.publicUuid, req.params.documentUuid],
        );
        if (rows.length === 0) {
          return res.status(404).json({ error: "Document not found" });
        }

        const row = rows[0];
        const versionId = row.version_id as number | null;
        if (!versionId) {
          return res.status(400).json({ error: "Document has no version" });
        }

        const mimeType = String(row.mime_type || "").toLowerCase();
        let ocrStatus: OcrStatus =
          (body.ocrStatus as OcrStatus | undefined) || "completed";
        let ocrText: string | null = null;
        let ocrProcessedAt = new Date();

        if (clientOcrText) {
          ocrText = truncateOcrText(clientOcrText);
          ocrStatus = body.ocrStatus || "completed";
        } else if (mimeType === "application/pdf") {
          const storageKey = String(row.storage_key || "").trim();
          if (!storageKey) {
            return res.status(400).json({
              error: "PDF storage URL unavailable for OCR",
            });
          }
          await db.query<ResultSetHeader>(
            `UPDATE document_versions SET ocr_status = 'processing' WHERE id = ?`,
            [versionId],
          );
          const buffer = await fetchBlobBytes(storageKey);
          if (!buffer) {
            await db.query<ResultSetHeader>(
              `UPDATE document_versions
                 SET ocr_status = 'failed', ocr_processed_at = ?
               WHERE id = ?`,
              [toMysqlDateTimeUtc(new Date()), versionId],
            );
            return res
              .status(502)
              .json({ error: "Failed to fetch PDF for OCR" });
          }
          const extracted = await extractPdfOcrText(buffer);
          if (!extracted) {
            await db.query<ResultSetHeader>(
              `UPDATE document_versions
                 SET ocr_status = 'failed', ocr_processed_at = ?
               WHERE id = ?`,
              [toMysqlDateTimeUtc(new Date()), versionId],
            );
            return res
              .status(422)
              .json({ error: "PDF text extraction failed" });
          }
          ocrText = extracted;
          ocrStatus = "completed";
        } else if (mimeType.startsWith("image/") || isOcrableMime(mimeType)) {
          return res.status(400).json({
            error:
              "Image OCR requires client-side extraction; POST { ocrText } from Tesseract",
          });
        } else {
          return res.status(400).json({
            error: "Document type is not OCR-eligible",
          });
        }

        await db.query<ResultSetHeader>(
          `UPDATE document_versions
             SET ocr_text = ?, ocr_status = ?, ocr_processed_at = ?
           WHERE id = ?`,
          [ocrText, ocrStatus, toMysqlDateTimeUtc(ocrProcessedAt), versionId],
        );

        const document = mapCaseDocumentItem({
          ...row,
          ocr_text: ocrText,
          ocr_status: ocrStatus,
          ocr_processed_at: ocrProcessedAt,
        });
        const response: RunDocumentOcrResponse = {
          document: {
            ...document,
            storageKey: document.storageKey
              ? await signBlobUrlForClient(document.storageKey)
              : null,
          },
        };
        return res.json(response);
      } catch (err) {
        apiLogger.error("cases document ocr failed", err);
        return res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  app.get(
    "/api/dashboard/stats",
    dbUnavailable,
    requireStaff,
    async (req: AuthedRequest, res: Response) => {
      try {
        const db = getPool();
        const visibility = buildStaffCaseVisibilityFilterInline({
          role: req.auth!.role,
          userId: req.auth!.id,
          casesAlias: "cases",
        });
        const visSql = visibility.sql
          ? ` AND ${visibility.sql}`
          : "";
        const [rows] = await db.query<RowDataPacket[]>(
          `SELECT status, priority, COUNT(*) AS cnt
           FROM cases
           WHERE deleted_at IS NULL${visSql}
           GROUP BY status, priority`,
          visibility.params,
        );
        const byStatus: Partial<Record<CaseStatus, number>> = {};
        let totalCases = 0;
        let urgentOpen = 0;
        let completed = 0;
        let onHold = 0;
        for (const row of rows) {
          const status = row.status as CaseStatus;
          const cnt = Number(row.cnt) || 0;
          byStatus[status] = (byStatus[status] || 0) + cnt;
          totalCases += cnt;
          if (status === "completed") completed += cnt;
          if (status === "on_hold") onHold += cnt;
          if (
            row.priority === "urgent" &&
            status !== "completed" &&
            status !== "cancelled"
          ) {
            urgentOpen += cnt;
          }
        }
        const visibilityC = buildStaffCaseVisibilityFilterInline({
          role: req.auth!.role,
          userId: req.auth!.id,
          casesAlias: "c",
        });
        const visC = visibilityC.sql ? ` AND ${visibilityC.sql}` : "";
        const visCParams = visibilityC.params;
        const reviewStageFilter = buildReviewStageFilterSql(req.auth?.role);
        const reviewStageSql = reviewStageFilter.sql;

        const [extra] = await db.query<RowDataPacket[]>(
          `SELECT
             (SELECT COUNT(*) FROM review_requests rr
                JOIN cases c ON c.id = rr.case_id
               WHERE rr.status = 'pending'
                 AND c.deleted_at IS NULL${visC}${reviewStageSql}) AS pending_reviews,
             (SELECT COUNT(*) FROM invoices i
                JOIN cases c ON c.id = i.case_id
               WHERE c.deleted_at IS NULL${visC}
                 AND (
                   i.status IN ('issued', 'partially_paid', 'overdue')
                   OR (i.status = 'draft' AND i.invoice_type IN ('advance', 'final'))
                 )) AS pending_invoices,
             (SELECT COUNT(*) FROM case_deadlines d
                JOIN cases c ON c.id = d.case_id
               WHERE c.deleted_at IS NULL${visC}
                 AND d.completed_at IS NULL
                 AND d.severity_level IN ('critical', 'overdue')) AS delayed_deadlines,
             (SELECT COUNT(*) FROM cases c
                WHERE c.deleted_at IS NULL${visC}
                  AND (
                    (
                      c.status IN ('intake', 'assignment')
                      AND (
                        SELECT COUNT(DISTINCT d.category)
                          FROM documents d
                         WHERE d.case_id = c.id AND d.deleted_at IS NULL
                           AND d.status NOT IN ('rejected', 'archived')
                           AND d.category IN (
                             'lawsuit', 'medical_record', 'cfe_report', 'preliminary_photo'
                           )
                      ) < 4
                    )
                    OR (
                      c.status IN ('additional_docs', 'legal_review_questionnaire')
                      AND (
                        (
                          SELECT COUNT(DISTINCT d.category)
                            FROM documents d
                           WHERE d.case_id = c.id AND d.deleted_at IS NULL
                             AND d.status NOT IN ('rejected', 'archived')
                             AND d.category IN (
                               'defendant_response', 'sketch',
                               'plaintiff_questionnaire'
                             )
                        ) < 3
                        OR (
                          c.involves_fatality = 1
                          AND NOT EXISTS (
                            SELECT 1 FROM documents d
                             WHERE d.case_id = c.id AND d.deleted_at IS NULL
                               AND d.status NOT IN ('rejected', 'archived')
                               AND d.category = 'death_certificate'
                          )
                        )
                      )
                    )
                    OR (
                      c.status IN (
                        'court_acceptance', 'validation_delivery'
                      )
                      AND (
                        SELECT COUNT(DISTINCT d.category)
                          FROM documents d
                         WHERE d.case_id = c.id AND d.deleted_at IS NULL
                           AND d.status NOT IN ('rejected', 'archived')
                           AND d.category IN (
                             'protesta', 'court_filing', 'ratification'
                           )
                      ) < 3
                    )
                  )
             ) AS missing_docs_cases`,
          [
            ...visCParams,
            ...reviewStageFilter.params,
            ...visCParams,
            ...visCParams,
            ...visCParams,
          ],
        );
        const response: DashboardStatsResponse = {
          totalCases,
          byStatus,
          urgentOpen,
          completed,
          onHold,
          pendingReviews: Number(extra[0]?.pending_reviews) || 0,
          pendingInvoices: Number(extra[0]?.pending_invoices) || 0,
          delayedDeadlines: Number(extra[0]?.delayed_deadlines) || 0,
          missingDocsCases: Number(extra[0]?.missing_docs_cases) || 0,
        };
        return res.json(response);
      } catch (err) {
        apiLogger.error("dashboard stats failed", err);
        return res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  app.get(
    "/api/reviews/pending",
    dbUnavailable,
    requireStaff,
    async (req: AuthedRequest, res: Response) => {
      try {
        if (!canViewCaseSection(req.auth?.role, "reviews")) {
          return res.status(403).json({ error: "Insufficient permissions" });
        }
        const stageFilter = buildReviewStageFilterSql(req.auth?.role);
        if (stageFilter.params.length === 0) {
          return res.status(403).json({ error: "Insufficient permissions" });
        }
        const limit = Math.min(
          100,
          Math.max(1, Number(req.query.limit) || 50),
        );
        const db = getPool();
        const visibility = buildStaffCaseVisibilityFilterInline({
          role: req.auth!.role,
          userId: req.auth!.id,
          casesAlias: "c",
        });
        const visSql = visibility.sql ? ` AND ${visibility.sql}` : "";
        const visParams = visibility.params;
        const [countRows] = await db.query<RowDataPacket[]>(
          `SELECT COUNT(*) AS total
           FROM review_requests rr
           JOIN cases c ON c.id = rr.case_id
           WHERE rr.status = 'pending'
             AND c.deleted_at IS NULL${visSql}${stageFilter.sql}`,
          [...visParams, ...stageFilter.params],
        );
        const total = Number(countRows[0]?.total || 0);
        const [rows] = await db.query<RowDataPacket[]>(
          `SELECT rr.*, c.public_uuid AS case_public_uuid, c.case_number, c.title AS case_title
           FROM review_requests rr
           JOIN cases c ON c.id = rr.case_id
           WHERE rr.status = 'pending'
             AND c.deleted_at IS NULL${visSql}${stageFilter.sql}
           ORDER BY rr.due_at IS NULL, rr.due_at ASC, rr.created_at ASC
           LIMIT ?`,
          [...visParams, ...stageFilter.params, limit],
        );
        const reviews = rows.map((row) => ({
          ...mapReviewRequest(row),
          casePublicUuid: String(row.case_public_uuid),
          caseNumber: String(row.case_number),
          caseTitle: String(row.case_title || row.case_number),
        }));
        const response: PendingReviewsResponse = { reviews, total };
        return res.json(response);
      } catch (err) {
        apiLogger.error("pending reviews list failed", err);
        return res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  app.get(
    "/api/documents",
    dbUnavailable,
    requireStaff,
    async (req: AuthedRequest, res: Response) => {
      try {
        const { page, limit, offset } = parsePageLimit(
          req.query as Record<string, unknown>,
          { page: 1, limit: 20, maxLimit: 100 },
        );
        const q = String(req.query.q || "").trim();
        const where: string[] = [
          "d.deleted_at IS NULL",
          "c.deleted_at IS NULL",
        ];
        const params: unknown[] = [];
        const visibility = buildStaffCaseVisibilityFilterInline({
          role: req.auth!.role,
          userId: req.auth!.id,
          casesAlias: "c",
        });
        if (visibility.sql) {
          where.push(visibility.sql);
          params.push(...visibility.params);
        }
        if (q) {
          where.push(
            `(d.title LIKE ? OR c.case_number LIKE ? OR v.ocr_text LIKE ?)`,
          );
          const like = `%${q}%`;
          params.push(like, like, like);
        }
        const whereSql = where.join(" AND ");
        const db = getPool();
        const [countRows] = await db.query<RowDataPacket[]>(
          `SELECT COUNT(*) AS total
           FROM documents d
           JOIN cases c ON c.id = d.case_id
           LEFT JOIN document_versions v
             ON v.document_id = d.id AND v.version_number = d.current_version
           WHERE ${whereSql}`,
          params,
        );
        const total = Number(countRows[0]?.total || 0);
        const [rows] = await db.query<RowDataPacket[]>(
          `SELECT d.id, d.public_uuid, d.category, d.title, d.status, d.created_at,
                  c.public_uuid AS case_public_uuid, c.case_number,
                  v.mime_type, v.storage_key, v.file_name, v.ocr_status,
                  LEFT(v.ocr_text, 280) AS ocr_text_preview
           FROM documents d
           JOIN cases c ON c.id = d.case_id
           LEFT JOIN document_versions v
             ON v.document_id = d.id AND v.version_number = d.current_version
           WHERE ${whereSql}
           ORDER BY d.created_at DESC
           LIMIT ? OFFSET ?`,
          [...params, limit, offset],
        );
        const documents: DocumentsIndexItem[] = await Promise.all(
          rows.map(async (r) => ({
            id: r.id as number,
            publicUuid: r.public_uuid as string,
            casePublicUuid: r.case_public_uuid as string,
            caseNumber: r.case_number as string,
            category: r.category as string,
            title: r.title as string,
            status: r.status as string,
            mimeType: (r.mime_type as string | null) ?? null,
            storageKey: r.storage_key
              ? await signBlobUrlForClient(String(r.storage_key))
              : null,
            fileName: (r.file_name as string | null) ?? null,
            ocrStatus: (r.ocr_status as OcrStatus | null) ?? null,
            ocrTextPreview: (r.ocr_text_preview as string | null) ?? null,
            createdAt: toIso(r.created_at) || new Date().toISOString(),
          })),
        );
        const response: DocumentsIndexResponse = {
          documents,
          pagination: buildPagination(page, limit, total),
        };
        return res.json(response);
      } catch (err) {
        apiLogger.error("documents index failed", err);
        return res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  app.get(
    "/api/search",
    dbUnavailable,
    requireStaff,
    async (req: AuthedRequest, res: Response) => {
      try {
        const q = String(req.query.q || "").trim();
        if (!q) {
          const empty: GlobalSearchResponse = { query: "", results: [] };
          return res.json(empty);
        }
        const like = `%${q}%`;
        const db = getPool();
        const results: GlobalSearchHit[] = [];
        const visibility = buildStaffCaseVisibilityFilterInline({
          role: req.auth!.role,
          userId: req.auth!.id,
          casesAlias: "cases",
        });
        const visSql = visibility.sql ? ` AND ${visibility.sql}` : "";
        const visibilityC = buildStaffCaseVisibilityFilterInline({
          role: req.auth!.role,
          userId: req.auth!.id,
          casesAlias: "c",
        });
        const visSqlC = visibilityC.sql ? ` AND ${visibilityC.sql}` : "";

        const [cases] = await db.query<RowDataPacket[]>(
          `SELECT id, public_uuid, case_number, title
           FROM cases
           WHERE deleted_at IS NULL
             AND (case_number LIKE ? OR title LIKE ? OR plaintiff_name LIKE ?)
             ${visSql}
           ORDER BY updated_at DESC
           LIMIT 10`,
          [like, like, like, ...visibility.params],
        );
        for (const r of cases) {
          results.push({
            kind: "case",
            id: r.id as number,
            publicUuid: r.public_uuid as string,
            title: String(r.case_number),
            subtitle: (r.title as string | null) ?? null,
            href: `/portal/cases/${r.public_uuid}`,
          });
        }

        const [docs] = await db.query<RowDataPacket[]>(
          `SELECT d.id, d.public_uuid, d.title, c.public_uuid AS case_public_uuid, c.case_number
           FROM documents d
           JOIN cases c ON c.id = d.case_id
           LEFT JOIN document_versions v
             ON v.document_id = d.id AND v.version_number = d.current_version
           WHERE d.deleted_at IS NULL AND c.deleted_at IS NULL
             AND (d.title LIKE ? OR c.case_number LIKE ? OR v.ocr_text LIKE ?)
             ${visSqlC}
           ORDER BY d.created_at DESC
           LIMIT 10`,
          [like, like, like, ...visibilityC.params],
        );
        for (const r of docs) {
          results.push({
            kind: "document",
            id: r.id as number,
            publicUuid: r.public_uuid as string,
            title: String(r.title),
            subtitle: String(r.case_number),
            href: `/portal/cases/${r.case_public_uuid}`,
          });
        }

        const [invoices] = await db.query<RowDataPacket[]>(
          `SELECT id, public_uuid, invoice_number, status, total_amount
           FROM invoices
           WHERE invoice_number LIKE ?
           ORDER BY created_at DESC
           LIMIT 10`,
          [like],
        );
        for (const r of invoices) {
          results.push({
            kind: "invoice",
            id: r.id as number,
            publicUuid: r.public_uuid as string,
            title: String(r.invoice_number),
            subtitle: `${r.status} · ${r.total_amount}`,
            href: `/portal/finance`,
          });
        }

        const [members] = await db.query<RowDataPacket[]>(
          `SELECT id, public_uuid, first_name, last_name, email, role
           FROM staff_users
           WHERE deleted_at IS NULL
             AND (email LIKE ? OR first_name LIKE ? OR last_name LIKE ?)
           ORDER BY last_name ASC
           LIMIT 10`,
          [like, like, like],
        );
        for (const r of members) {
          results.push({
            kind: "member",
            id: r.id as number,
            publicUuid: r.public_uuid as string,
            title: `${r.first_name || ""} ${r.last_name || ""}`.trim(),
            subtitle: `${r.role} · ${r.email}`,
            href: `/portal/team`,
          });
        }

        const response: GlobalSearchResponse = { query: q, results };
        return res.json(response);
      } catch (err) {
        apiLogger.error("global search failed", err);
        return res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  app.get(
    "/api/reports/kpis",
    dbUnavailable,
    requireStaff,
    async (req: AuthedRequest, res: Response) => {
      try {
        const db = getPool();
        const visibility = buildStaffCaseVisibilityFilterInline({
          role: req.auth!.role,
          userId: req.auth!.id,
          casesAlias: "cases",
        });
        const visSql = visibility.sql ? ` AND ${visibility.sql}` : "";
        const visibilityC = buildStaffCaseVisibilityFilterInline({
          role: req.auth!.role,
          userId: req.auth!.id,
          casesAlias: "c",
        });
        const visC = visibilityC.sql ? ` AND ${visibilityC.sql}` : "";
        const reviewStageFilter = buildReviewStageFilterSql(req.auth?.role);
        const reviewStageSql = reviewStageFilter.sql;

        const [statusRows] = await db.query<RowDataPacket[]>(
          `SELECT status, COUNT(*) AS cnt
           FROM cases WHERE deleted_at IS NULL${visSql}
           GROUP BY status`,
          visibility.params,
        );
        const casesByStatus: Record<string, number> = {};
        let completedCount = 0;
        for (const row of statusRows) {
          const status = String(row.status);
          const cnt = Number(row.cnt) || 0;
          casesByStatus[status] = cnt;
          if (status === "completed") completedCount = cnt;
        }

        const [expertRows] = canListAllStaffCasesInline(req.auth?.role)
          ? await db.query<RowDataPacket[]>(
              `SELECT u.id AS user_id,
                      CONCAT(u.first_name, ' ', u.last_name) AS name,
                      COUNT(*) AS cnt
               FROM cases c
               JOIN staff_users u ON u.id = c.assigned_expert_id
               WHERE c.deleted_at IS NULL AND c.assigned_expert_id IS NOT NULL
               GROUP BY u.id, u.first_name, u.last_name
               ORDER BY cnt DESC
               LIMIT 20`,
            )
          : [[] as RowDataPacket[]];

        const [agg] = await db.query<RowDataPacket[]>(
          `SELECT
             (SELECT COUNT(*) FROM case_deadlines d
                JOIN cases c ON c.id = d.case_id
               WHERE c.deleted_at IS NULL${visC}
                 AND d.completed_at IS NULL
                 AND d.severity_level IN ('critical', 'overdue')) AS delayed_count,
             (SELECT COUNT(*) FROM invoices i
                JOIN cases c ON c.id = i.case_id
               WHERE c.deleted_at IS NULL${visC}
                 AND (
                   i.status IN ('issued', 'partially_paid', 'overdue')
                   OR (i.status = 'draft' AND i.invoice_type IN ('advance', 'final'))
                 )) AS pending_invoices,
             (SELECT COUNT(*) FROM review_requests rr
                JOIN cases c ON c.id = rr.case_id
               WHERE rr.status = 'pending'
                 AND c.deleted_at IS NULL${visC}${reviewStageSql}) AS pending_reviews,
             (SELECT AVG(DATEDIFF(completed_at, COALESCE(intake_received_at, created_at)))
                FROM cases
               WHERE deleted_at IS NULL AND completed_at IS NOT NULL${visSql}) AS avg_days`,
          [
            ...visibilityC.params,
            ...visibilityC.params,
            ...visibilityC.params,
            ...reviewStageFilter.params,
            ...visibility.params,
          ],
        );

        const response: ReportsKpiResponse = {
          casesByStatus,
          casesByExpert: expertRows.map((r) => ({
            userId: Number(r.user_id),
            name: String(r.name || "").trim(),
            count: Number(r.cnt) || 0,
          })),
          completedCount,
          delayedCount: Number(agg[0]?.delayed_count) || 0,
          pendingInvoices: Number(agg[0]?.pending_invoices) || 0,
          pendingReviews: Number(agg[0]?.pending_reviews) || 0,
          averageCompletionDays:
            agg[0]?.avg_days != null ? Number(agg[0].avg_days) : null,
        };
        return res.json(response);
      } catch (err) {
        apiLogger.error("reports kpis failed", err);
        return res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  app.get(
    "/api/calendar/events",
    dbUnavailable,
    requireStaff,
    async (req: AuthedRequest, res: Response) => {
      try {
        const fromRaw = String(req.query.from || "").trim();
        const toRaw = String(req.query.to || "").trim();
        const fromDate = fromRaw ? new Date(fromRaw) : null;
        const toDate = toRaw ? new Date(toRaw) : null;
        const hasRange =
          fromDate &&
          toDate &&
          !Number.isNaN(fromDate.getTime()) &&
          !Number.isNaN(toDate.getTime());

        const db = getPool();
        const visibility = buildStaffCaseVisibilityFilterInline({
          role: req.auth!.role,
          userId: req.auth!.id,
          casesAlias: "c",
        });
        const caseAccessSql = visibility.sql
          ? `(e.case_id IS NULL OR (c.id IS NOT NULL AND c.deleted_at IS NULL AND ${visibility.sql}))`
          : `(e.case_id IS NULL OR (c.id IS NOT NULL AND c.deleted_at IS NULL))`;
        const [rows] = hasRange
          ? await db.query<RowDataPacket[]>(
              `SELECT e.id, e.public_uuid, e.case_id, e.case_deadline_id, e.event_type, e.title, e.starts_at, e.ends_at, e.location
               FROM calendar_events e
               LEFT JOIN cases c ON c.id = e.case_id
               WHERE e.starts_at >= ? AND e.starts_at <= ?
                 AND ${caseAccessSql}
               ORDER BY e.starts_at ASC
               LIMIT 500`,
              [fromDate!.toISOString(), toDate!.toISOString(), ...visibility.params],
            )
          : await db.query<RowDataPacket[]>(
              `SELECT e.id, e.public_uuid, e.case_id, e.case_deadline_id, e.event_type, e.title, e.starts_at, e.ends_at, e.location
               FROM calendar_events e
               LEFT JOIN cases c ON c.id = e.case_id
               WHERE e.starts_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 60 DAY)
                 AND e.starts_at <= DATE_ADD(UTC_TIMESTAMP(), INTERVAL 180 DAY)
                 AND ${caseAccessSql}
               ORDER BY e.starts_at ASC
               LIMIT 500`,
              visibility.params,
            );
        const events: CalendarEventItem[] = rows.map((r) => ({
          id: r.id as number,
          publicUuid: r.public_uuid as string,
          caseId: (r.case_id as number | null) ?? null,
          caseDeadlineId: (r.case_deadline_id as number | null) ?? null,
          eventType: r.event_type as string,
          title: r.title as string,
          startsAt: toIso(r.starts_at) || new Date().toISOString(),
          endsAt: toIso(r.ends_at),
          location: (r.location as string | null) ?? null,
        }));
        return res.json({ events });
      } catch (err) {
        apiLogger.error("calendar events failed", err);
        return res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  app.post(
    "/api/calendar/events",
    dbUnavailable,
    requireStaff,
    async (req: AuthedRequest, res: Response) => {
      try {
        if (!canManageCalendar(req.auth?.role)) {
          return res.status(403).json({ error: "Insufficient permissions" });
        }
        const body = req.body as CreateCalendarEventRequest;
        const title = String(body?.title || "").trim();
        if (!title || !body?.startsAt) {
          return res.status(400).json({ error: "title and startsAt required" });
        }
        const eventType = body.eventType || "other";
        const publicUuid = generatePublicUuid();
        const db = getPool();
        const [result] = await db.query<ResultSetHeader>(
          `INSERT INTO calendar_events
             (public_uuid, case_id, event_type, title, description, starts_at, ends_at, location, created_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            publicUuid,
            body.caseId ?? null,
            eventType,
            title,
            body.description?.trim() || null,
            new Date(body.startsAt),
            body.endsAt ? new Date(body.endsAt) : null,
            body.location?.trim() || null,
            req.auth!.id,
          ],
        );
        const event: CalendarEventItem = {
          id: result.insertId,
          publicUuid,
          caseId: body.caseId ?? null,
          eventType,
          title,
          startsAt: new Date(body.startsAt).toISOString(),
          endsAt: body.endsAt ? new Date(body.endsAt).toISOString() : null,
          location: body.location?.trim() || null,
        };
        return res.status(201).json({ event });
      } catch (err) {
        apiLogger.error("calendar create failed", err);
        return res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  app.get(
    "/api/finance/invoices",
    dbUnavailable,
    requireFinance,
    async (req: AuthedRequest, res: Response) => {
      try {
        const { page, limit, offset } = parsePageLimit(
          req.query as Record<string, unknown>,
          { page: 1, limit: 20, maxLimit: 100 },
        );
        const q = String(req.query.q || "").trim();
        const status = String(req.query.status || "").trim();
        const caseIdRaw = req.query.caseId;
        const sortCol = pickSortColumn(
          req.query.sortBy,
          {
            invoice_number: "invoice_number",
            invoice_type: "invoice_type",
            status: "status",
            total_amount: "total_amount",
            due_at: "due_at",
            created_at: "created_at",
          },
          "created_at",
        );
        const sortDir = parseSortDir(req.query.sortDir);
        const where: string[] = ["1=1"];
        const params: unknown[] = [];
        if (q) {
          where.push(
            `(invoice_number LIKE ? OR CAST(total_amount AS CHAR) LIKE ?)`,
          );
          const like = `%${q}%`;
          params.push(like, like);
        }
        if (status) {
          where.push("status = ?");
          params.push(status);
        }
        if (caseIdRaw != null && String(caseIdRaw).trim() !== "") {
          const caseId = Number(caseIdRaw);
          if (!Number.isInteger(caseId) || caseId <= 0) {
            return res.status(400).json({ error: "Invalid caseId" });
          }
          where.push("case_id = ?");
          params.push(caseId);
        }
        const whereSql = where.join(" AND ");
        const db = getPool();
        const [countRows] = await db.query<RowDataPacket[]>(
          `SELECT COUNT(*) AS total FROM invoices WHERE ${whereSql}`,
          params,
        );
        const total = Number(countRows[0]?.total || 0);
        const [rows] = await db.query<RowDataPacket[]>(
          `SELECT id, public_uuid, case_id, invoice_number, invoice_type, status,
                  total_amount, currency, due_at
           FROM invoices
           WHERE ${whereSql}
           ORDER BY ${sortCol} ${sortDir}
           LIMIT ? OFFSET ?`,
          [...params, limit, offset],
        );
        const invoices: InvoiceSummary[] = rows.map((r) => ({
          id: r.id as number,
          publicUuid: r.public_uuid as string,
          caseId: r.case_id as number,
          invoiceNumber: r.invoice_number as string,
          invoiceType: r.invoice_type as string,
          status: r.status as string,
          totalAmount: Number(r.total_amount) || 0,
          currency: (r.currency as string) || "MXN",
          dueAt: toIso(r.due_at),
        }));
        const response: InvoicesListResponse = {
          invoices,
          pagination: buildPagination(page, limit, total),
        };
        return res.json(response);
      } catch (err) {
        apiLogger.error("finance invoices failed", err);
        return res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  app.post(
    "/api/finance/invoices",
    dbUnavailable,
    requireFinance,
    async (req: AuthedRequest, res: Response) => {
      try {
        const body = req.body as CreateInvoiceRequest;
        const caseId = Number(body?.caseId);
        const totalAmount = Number(body?.totalAmount);
        const invoiceType = body?.invoiceType;
        const allowed = ["advance", "final", "expense", "other"] as const;
        if (
          !caseId ||
          !Number.isFinite(totalAmount) ||
          totalAmount < 0 ||
          !allowed.includes(invoiceType)
        ) {
          return res
            .status(400)
            .json({ error: "caseId, invoiceType and totalAmount required" });
        }
        const db = getPool();
        const [cases] = await db.query<RowDataPacket[]>(
          `SELECT id, law_firm_id FROM cases WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
          [caseId],
        );
        if (cases.length === 0) {
          return res.status(404).json({ error: "Case not found" });
        }
        const year = new Date().getUTCFullYear();
        const invoiceNumber = `INV-${year}-${Date.now().toString().slice(-8)}`;
        const publicUuid = generatePublicUuid();
        const issue = Boolean(body.issue);
        const [result] = await db.query<ResultSetHeader>(
          `INSERT INTO invoices
             (public_uuid, case_id, law_firm_id, invoice_number, invoice_type, status,
              subtotal, tax_amount, total_amount, currency, issued_at, due_at, notes, created_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?)`,
          [
            publicUuid,
            caseId,
            cases[0].law_firm_id ?? null,
            invoiceNumber,
            invoiceType,
            issue ? "issued" : "draft",
            totalAmount,
            totalAmount,
            body.currency?.trim() || "MXN",
            issue ? new Date() : null,
            body.dueAt ? new Date(body.dueAt) : null,
            body.notes?.trim() || null,
            req.auth!.id,
          ],
        );
        const invoice: InvoiceSummary = {
          id: result.insertId,
          publicUuid,
          caseId,
          invoiceNumber,
          invoiceType,
          status: issue ? "issued" : "draft",
          totalAmount,
          currency: body.currency?.trim() || "MXN",
          dueAt: body.dueAt ? new Date(body.dueAt).toISOString() : null,
        };
        return res.status(201).json({ invoice });
      } catch (err) {
        apiLogger.error("invoice create failed", err);
        return res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  app.post(
    "/api/finance/invoices/:publicUuid/payments",
    dbUnavailable,
    requireFinance,
    async (req: AuthedRequest, res: Response) => {
      try {
        const body = req.body as CreatePaymentRequest;
        const amount = Number(body?.amount);
        if (!Number.isFinite(amount) || amount <= 0) {
          return res.status(400).json({ error: "amount must be positive" });
        }
        const db = getPool();
        const [invoices] = await db.query<RowDataPacket[]>(
          `SELECT * FROM invoices WHERE public_uuid = ? LIMIT 1`,
          [req.params.publicUuid],
        );
        if (invoices.length === 0) {
          return res.status(404).json({ error: "Invoice not found" });
        }
        const inv = invoices[0];
        const paidAt = body.paidAt ? new Date(body.paidAt) : new Date();
        const publicUuid = generatePublicUuid();
        await db.query<ResultSetHeader>(
          `INSERT INTO payments
             (public_uuid, invoice_id, case_id, amount, currency, method, status,
              paid_at, reference, recorded_by, notes)
           VALUES (?, ?, ?, ?, ?, ?, 'completed', ?, ?, ?, ?)`,
          [
            publicUuid,
            inv.id,
            inv.case_id,
            amount,
            inv.currency || "MXN",
            body.method || "transfer",
            paidAt,
            body.reference?.trim() || null,
            req.auth!.id,
            body.notes?.trim() || null,
          ],
        );
        const [paidRows] = await db.query<RowDataPacket[]>(
          `SELECT COALESCE(SUM(amount), 0) AS paid
           FROM payments
           WHERE invoice_id = ? AND status = 'completed'`,
          [inv.id],
        );
        const paidTotal = Number(paidRows[0]?.paid) || 0;
        const total = Number(inv.total_amount) || 0;
        let status = inv.status as string;
        if (paidTotal >= total && total > 0) status = "paid";
        else if (paidTotal > 0) status = "partially_paid";
        await db.query<ResultSetHeader>(
          `UPDATE invoices
           SET status = ?, paid_at = ?
           WHERE id = ?`,
          [status, status === "paid" ? paidAt : inv.paid_at, inv.id],
        );
        const payCase =
          inv.case_id != null
            ? (
                await getPool().query<RowDataPacket[]>(
                  `SELECT * FROM cases WHERE id = ? LIMIT 1`,
                  [inv.case_id],
                )
              )[0][0]
            : null;
        const payRecipient = payCase
          ? ((await resolveCoordinatorOrAdmin(payCase)) ?? req.auth!.id)
          : req.auth!.id;
        await createNotification({
          recipientActor: "staff",
          recipientId: payRecipient,
          caseId: inv.case_id != null ? Number(inv.case_id) : null,
          type: "payment_received",
          title: `Payment received · ${inv.invoice_number}`,
          body: `Payment of ${amount} ${inv.currency || "MXN"} recorded.`,
          caseNumber: payCase ? String(payCase.case_number) : null,
          caseUrl: payCase
            ? `${EMAIL_APP_URL}/portal/cases/${payCase.public_uuid}`
            : `${EMAIL_APP_URL}/portal/finance`,
        });
        return res.status(201).json({
          payment: {
            publicUuid,
            amount,
            status: "completed",
            invoiceStatus: status,
          },
        });
      } catch (err) {
        apiLogger.error("payment create failed", err);
        return res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  app.get(
    "/api/team/members",
    dbUnavailable,
    requireAdmin,
    async (req: AuthedRequest, res: Response) => {
      try {
        const { page, limit, offset } = parsePageLimit(
          req.query as Record<string, unknown>,
          { page: 1, limit: 20, maxLimit: 100 },
        );
        const q = String(req.query.q || "").trim();
        const role = String(req.query.role || "").trim();
        const status = String(req.query.status || "").trim();
        const roster =
          String(req.query.roster || "staff").trim() === "firm"
            ? "firm"
            : "staff";
        const sortDir = parseSortDir(req.query.sortDir);
        const db = getPool();

        if (roster === "firm") {
          const sortCol = pickSortColumn(
            req.query.sortBy,
            {
              email: "u.email",
              first_name: "u.first_name",
              last_name: "u.last_name",
              status: "u.status",
              created_at: "u.created_at",
              last_login_at: "u.last_login_at",
            },
            "u.created_at",
          );
          const where: string[] = [
            "u.deleted_at IS NULL",
            "m.deleted_at IS NULL",
            "f.deleted_at IS NULL",
          ];
          const params: unknown[] = [];
          if (q) {
            where.push(
              `(u.email LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ? OR f.name LIKE ?)`,
            );
            const like = `%${q}%`;
            params.push(like, like, like, like);
          }
          if (status) {
            where.push("u.status = ?");
            params.push(status);
          }
          const whereSql = where.join(" AND ");
          const [countRows] = await db.query<RowDataPacket[]>(
            `SELECT COUNT(*) AS total
               FROM law_firm_users u
               JOIN law_firm_members m ON m.law_firm_user_id = u.id
               JOIN law_firms f ON f.id = m.law_firm_id
              WHERE ${whereSql}`,
            params,
          );
          const total = Number(countRows[0]?.total || 0);
          const [rows] = await db.query<RowDataPacket[]>(
            `SELECT u.id, u.public_uuid, u.email, u.first_name, u.last_name, u.status,
                    u.last_login_at, m.member_role, m.law_firm_id, f.name AS firm_name
               FROM law_firm_users u
               JOIN law_firm_members m ON m.law_firm_user_id = u.id
               JOIN law_firms f ON f.id = m.law_firm_id
              WHERE ${whereSql}
              ORDER BY ${sortCol} ${sortDir}
              LIMIT ? OFFSET ?`,
            [...params, limit, offset],
          );
          const members: TeamMemberItem[] = rows.map((r) => ({
            id: r.id as number,
            publicUuid: r.public_uuid as string,
            email: r.email as string,
            firstName: r.first_name as string,
            lastName: r.last_name as string,
            role: "law_firm_user",
            status: r.status as UserStatus,
            lastLoginAt: toIso(r.last_login_at),
            memberRole: (isLawFirmMemberRole(String(r.member_role))
              ? String(r.member_role)
              : "member") as TeamMemberItem["memberRole"],
            lawFirmId: Number(r.law_firm_id),
            lawFirmName: r.firm_name ? String(r.firm_name) : null,
          }));
          return res.json({
            members,
            pagination: buildPagination(page, limit, total),
          } satisfies TeamListResponse);
        }

        const sortCol = pickSortColumn(
          req.query.sortBy,
          {
            email: "email",
            first_name: "first_name",
            last_name: "last_name",
            role: "role",
            status: "status",
            created_at: "created_at",
            last_login_at: "last_login_at",
          },
          "created_at",
        );
        const where: string[] = ["deleted_at IS NULL"];
        const params: unknown[] = [];
        if (q) {
          where.push(`(email LIKE ? OR first_name LIKE ? OR last_name LIKE ?)`);
          const like = `%${q}%`;
          params.push(like, like, like);
        }
        if (role) {
          where.push("role = ?");
          params.push(role);
        }
        if (status) {
          where.push("status = ?");
          params.push(status);
        }
        const whereSql = where.join(" AND ");
        const [countRows] = await db.query<RowDataPacket[]>(
          `SELECT COUNT(*) AS total FROM staff_users WHERE ${whereSql}`,
          params,
        );
        const total = Number(countRows[0]?.total || 0);
        const [rows] = await db.query<RowDataPacket[]>(
          `SELECT id, public_uuid, email, first_name, last_name, role, status, last_login_at
           FROM staff_users
           WHERE ${whereSql}
           ORDER BY ${sortCol} ${sortDir}
           LIMIT ? OFFSET ?`,
          [...params, limit, offset],
        );
        const members: TeamMemberItem[] = rows.map((r) => ({
          id: r.id as number,
          publicUuid: r.public_uuid as string,
          email: r.email as string,
          firstName: r.first_name as string,
          lastName: r.last_name as string,
          role: r.role as UserRole,
          status: r.status as UserStatus,
          lastLoginAt: toIso(r.last_login_at),
        }));
        const response: TeamListResponse = {
          members,
          pagination: buildPagination(page, limit, total),
        };
        return res.json(response);
      } catch (err) {
        apiLogger.error("team members failed", err);
        return res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  app.post(
    "/api/team/members",
    dbUnavailable,
    requireAdmin,
    async (req: AuthedRequest, res: Response) => {
      try {
        const body = req.body as InviteTeamMemberRequest;
        const invite = validateTeamInvite({
          email: String(body?.email || ""),
          firstName: String(body?.firstName || ""),
          lastName: String(body?.lastName || ""),
          role: String(body?.role || ""),
          lawFirmId: body?.lawFirmId ?? null,
          createLawFirm: body?.createLawFirm ?? null,
          memberRole: body?.memberRole ?? null,
        });
        if (invite.ok === false) {
          return res.status(400).json({ error: invite.error });
        }
        const email = normalizeLookupEmail(invite.email);
        if (!isValidEmail(email)) {
          return res
            .status(400)
            .json({ error: "email, firstName, lastName and role required" });
        }
        const {
          firstName,
          lastName,
          role,
          lawFirmId,
          createLawFirm,
          memberRole,
          isPrimaryContact,
        } = invite;
        const inviteLocale = resolveInviteLocale(
          (body as InviteTeamMemberRequest).preferredLanguage,
        );
        const db = getPool();
        const publicUuid = generatePublicUuid();
        const actorRows = await lookupEmailActorRows(email);

        if (role === "law_firm_user") {
          const occupancy = resolveEmailInviteOccupancy({
            intendingActor: "law_firm",
            staff: actorRows.staff,
            lawFirm: actorRows.lawFirm,
          });
          if (occupancy.ok === false) {
            return res.status(409).json({ error: occupancy.error });
          }

          let resolvedFirmId = lawFirmId;
          let firmName: string | null = null;
          if (createLawFirm) {
            const firmUuid = generatePublicUuid();
            const [firmIns] = await db.query<ResultSetHeader>(
              `INSERT INTO law_firms
                 (public_uuid, name, email, city, state, default_court_name, status)
               VALUES (?, ?, ?, ?, ?, ?, 'active')`,
              [
                firmUuid,
                createLawFirm.name,
                createLawFirm.email || email,
                createLawFirm.city || null,
                createLawFirm.state || null,
                createLawFirm.defaultCourtName || null,
              ],
            );
            resolvedFirmId = firmIns.insertId;
            firmName = createLawFirm.name;
          } else if (resolvedFirmId) {
            const [firms] = await db.query<RowDataPacket[]>(
              `SELECT id, name FROM law_firms
               WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
              [resolvedFirmId],
            );
            if (!firms[0]) {
              return res.status(400).json({ error: "Law firm not found" });
            }
            firmName = firms[0].name ? String(firms[0].name) : null;
          }
          if (!resolvedFirmId) {
            return res.status(400).json({ error: "Law firm not found" });
          }

          let userId: number;
          let userPublicUuid = publicUuid;
          if (occupancy.action === "reactivate") {
            userId = occupancy.id;
            const [existing] = await db.query<RowDataPacket[]>(
              `SELECT public_uuid FROM law_firm_users WHERE id = ? LIMIT 1`,
              [userId],
            );
            userPublicUuid = String(existing[0]?.public_uuid || publicUuid);
            await db.query<ResultSetHeader>(
              `UPDATE law_firm_users
               SET deleted_at = NULL,
                   first_name = ?,
                   last_name = ?,
                   phone = ?,
                   status = 'invited',
                   preferred_language = ?,
                   updated_at = NOW()
               WHERE id = ?`,
              [
                firstName,
                lastName,
                body.phone?.trim() || null,
                inviteLocale,
                userId,
              ],
            );
            await db.query<ResultSetHeader>(
              `UPDATE law_firm_members SET deleted_at = NOW()
               WHERE law_firm_user_id = ?
                 AND law_firm_id <> ?
                 AND deleted_at IS NULL`,
              [userId, resolvedFirmId],
            );
            const [memRows] = await db.query<RowDataPacket[]>(
              `SELECT id FROM law_firm_members
               WHERE law_firm_user_id = ? AND law_firm_id = ?
               LIMIT 1`,
              [userId, resolvedFirmId],
            );
            if (memRows[0]) {
              await db.query<ResultSetHeader>(
                `UPDATE law_firm_members
                 SET deleted_at = NULL,
                     member_role = ?,
                     is_primary_contact = ?,
                     updated_at = NOW()
                 WHERE id = ?`,
                [
                  memberRole || "member",
                  isPrimaryContact ? 1 : 0,
                  memRows[0].id,
                ],
              );
            } else {
              await db.query<ResultSetHeader>(
                `INSERT INTO law_firm_members
                   (law_firm_id, law_firm_user_id, member_role, is_primary_contact)
                 VALUES (?, ?, ?, ?)`,
                [
                  resolvedFirmId,
                  userId,
                  memberRole || "member",
                  isPrimaryContact ? 1 : 0,
                ],
              );
            }
          } else {
            const [result] = await db.query<ResultSetHeader>(
              `INSERT INTO law_firm_users
                 (public_uuid, email, first_name, last_name, phone, status, preferred_language)
               VALUES (?, ?, ?, ?, ?, 'invited', ?)`,
              [
                publicUuid,
                email,
                firstName,
                lastName,
                body.phone?.trim() || null,
                inviteLocale,
              ],
            );
            userId = result.insertId;
            await db.query<ResultSetHeader>(
              `INSERT INTO law_firm_members
                 (law_firm_id, law_firm_user_id, member_role, is_primary_contact)
               VALUES (?, ?, ?, ?)`,
              [
                resolvedFirmId,
                userId,
                memberRole || "member",
                isPrimaryContact ? 1 : 0,
              ],
            );
          }

          await safeSendEmail(
            email,
            buildInviteClientEmail({
              locale: inviteLocale,
              firstName,
              firmName,
              appUrl: EMAIL_APP_URL,
            }),
            "invite-client",
          );

          return res.status(201).json({
            member: {
              id: userId,
              publicUuid: userPublicUuid,
              email,
              firstName,
              lastName,
              role: "law_firm_user",
              status: "invited" as UserStatus,
              lastLoginAt: null,
              memberRole: memberRole || "member",
              lawFirmId: resolvedFirmId,
              lawFirmName: firmName,
            },
          });
        }

        const occupancy = resolveEmailInviteOccupancy({
          intendingActor: "staff",
          staff: actorRows.staff,
          lawFirm: actorRows.lawFirm,
        });
        if (occupancy.ok === false) {
          return res.status(409).json({ error: occupancy.error });
        }

        let staffId: number;
        let staffPublicUuid = publicUuid;
        if (occupancy.action === "reactivate") {
          staffId = occupancy.id;
          const [existing] = await db.query<RowDataPacket[]>(
            `SELECT public_uuid FROM staff_users WHERE id = ? LIMIT 1`,
            [staffId],
          );
          staffPublicUuid = String(existing[0]?.public_uuid || publicUuid);
          await db.query<ResultSetHeader>(
            `UPDATE staff_users
             SET deleted_at = NULL,
                 first_name = ?,
                 last_name = ?,
                 phone = ?,
                 role = ?,
                 status = 'invited',
                 preferred_language = ?,
                 updated_at = NOW()
             WHERE id = ?`,
            [
              firstName,
              lastName,
              body.phone?.trim() || null,
              role,
              inviteLocale,
              staffId,
            ],
          );
        } else {
          const [result] = await db.query<ResultSetHeader>(
            `INSERT INTO staff_users
               (public_uuid, email, first_name, last_name, phone, role, status, preferred_language)
             VALUES (?, ?, ?, ?, ?, ?, 'invited', ?)`,
            [
              publicUuid,
              email,
              firstName,
              lastName,
              body.phone?.trim() || null,
              role,
              inviteLocale,
            ],
          );
          staffId = result.insertId;
        }

        await safeSendEmail(
          email,
          buildInviteStaffEmail({
            locale: inviteLocale,
            firstName,
            role: String(role),
            appUrl: EMAIL_APP_URL,
          }),
          "invite-staff",
        );

        const member: TeamMemberItem = {
          id: staffId,
          publicUuid: staffPublicUuid,
          email,
          firstName,
          lastName,
          role: role as UserRole,
          status: "invited",
          lastLoginAt: null,
        };
        return res.status(201).json({ member });
      } catch (err) {
        apiLogger.error("team invite failed", err);
        return res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  app.post(
    "/api/team/members/:publicUuid/resend-invite",
    dbUnavailable,
    requireAdmin,
    async (req: AuthedRequest, res: Response) => {
      try {
        const publicUuid = String(req.params.publicUuid || "");
        const db = getPool();
        const [staffRows] = await db.query<RowDataPacket[]>(
          `SELECT id, email, first_name, role, status, preferred_language
             FROM staff_users
            WHERE public_uuid = ? AND deleted_at IS NULL
            LIMIT 1`,
          [publicUuid],
        );
        if (staffRows.length > 0) {
          const row = staffRows[0];
          if (!canResendInvite(String(row.status))) {
            return res
              .status(400)
              .json({ error: "Invite can only be resent for invited members" });
          }
          const locale = resolveInviteLocale(
            row.preferred_language as string | null,
          );
          await safeSendEmail(
            String(row.email),
            buildInviteStaffEmail({
              locale,
              firstName: String(row.first_name),
              role: String(row.role),
              appUrl: EMAIL_APP_URL,
              resend: true,
            }),
            "resend-invite-staff",
          );
          return res.json({ ok: true });
        }

        const [clientRows] = await db.query<RowDataPacket[]>(
          `SELECT u.id, u.email, u.first_name, u.status, u.preferred_language, f.name AS firm_name
             FROM law_firm_users u
             LEFT JOIN law_firm_members m
               ON m.law_firm_user_id = u.id AND m.deleted_at IS NULL
             LEFT JOIN law_firms f ON f.id = m.law_firm_id
            WHERE u.public_uuid = ? AND u.deleted_at IS NULL
            LIMIT 1`,
          [publicUuid],
        );
        if (clientRows.length === 0) {
          return res.status(404).json({ error: "Member not found" });
        }
        const row = clientRows[0];
        if (!canResendInvite(String(row.status))) {
          return res
            .status(400)
            .json({ error: "Invite can only be resent for invited members" });
        }
        const locale = resolveInviteLocale(
          row.preferred_language as string | null,
        );
        await safeSendEmail(
          String(row.email),
          buildInviteClientEmail({
            locale,
            firstName: String(row.first_name),
            firmName: row.firm_name ? String(row.firm_name) : null,
            appUrl: EMAIL_APP_URL,
            resend: true,
          }),
          "resend-invite-client",
        );
        return res.json({ ok: true });
      } catch (err) {
        apiLogger.error("team resend invite failed", err);
        return res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  const mapTeamMemberRow = (r: RowDataPacket): TeamMemberItem => ({
    id: r.id as number,
    publicUuid: r.public_uuid as string,
    email: r.email as string,
    firstName: r.first_name as string,
    lastName: r.last_name as string,
    role: r.role as UserRole,
    status: r.status as UserStatus,
    lastLoginAt: toIso(r.last_login_at),
  });

  app.get(
    "/api/team/members/:publicUuid",
    dbUnavailable,
    requireAdmin,
    async (req: AuthedRequest, res: Response) => {
      try {
        const publicUuid = String(req.params.publicUuid || "");
        const db = getPool();
        const [rows] = await db.query<RowDataPacket[]>(
          `SELECT id, public_uuid, email, first_name, last_name, role, status, last_login_at
             FROM staff_users
            WHERE public_uuid = ? AND deleted_at IS NULL
            LIMIT 1`,
          [publicUuid],
        );
        if (rows.length === 0) {
          return res.status(404).json({ error: "Member not found" });
        }
        const member = mapTeamMemberRow(rows[0]);
        const [sessionRows] = await db.query<RowDataPacket[]>(
          `SELECT id, ip_address, user_agent, is_active, created_at, expires_at, revoked_at
             FROM staff_sessions
            WHERE staff_user_id = ?
            ORDER BY created_at DESC
            LIMIT 25`,
          [member.id],
        );
        const sessions: TeamMemberSessionItem[] = sessionRows.map((s) => ({
          id: s.id as number,
          ipAddress: (s.ip_address as string | null) ?? null,
          userAgent: (s.user_agent as string | null) ?? null,
          isActive: Boolean(s.is_active),
          createdAt: toIso(s.created_at) || new Date().toISOString(),
          expiresAt: toIso(s.expires_at) || new Date().toISOString(),
          revokedAt: toIso(s.revoked_at),
        }));
        const [auditRows] = await db.query<RowDataPacket[]>(
          `SELECT id, action, comment, previous_value_json, new_value_json, created_at
             FROM audit_logs
            WHERE entity_type = 'staff_user' AND entity_id = ?
            ORDER BY created_at DESC
            LIMIT 25`,
          [String(member.id)],
        );
        const audit: TeamMemberAuditItem[] = auditRows.map((a) => ({
          id: a.id as number,
          action: a.action as string,
          comment: (a.comment as string | null) ?? null,
          previousValueJson:
            a.previous_value_json != null
              ? typeof a.previous_value_json === "string"
                ? a.previous_value_json
                : JSON.stringify(a.previous_value_json)
              : null,
          newValueJson:
            a.new_value_json != null
              ? typeof a.new_value_json === "string"
                ? a.new_value_json
                : JSON.stringify(a.new_value_json)
              : null,
          createdAt: toIso(a.created_at) || new Date().toISOString(),
        }));
        const response: TeamMemberDetailResponse = {
          member,
          sessions,
          audit,
        };
        return res.json(response);
      } catch (err) {
        apiLogger.error("team member detail failed", err);
        return res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  app.patch(
    "/api/team/members/:publicUuid",
    dbUnavailable,
    requireAdmin,
    async (req: AuthedRequest, res: Response) => {
      try {
        const publicUuid = String(req.params.publicUuid || "");
        const body = req.body as UpdateTeamMemberRequest;
        const db = getPool();
        const [rows] = await db.query<RowDataPacket[]>(
          `SELECT id, public_uuid, email, first_name, last_name, phone, role, status, last_login_at
             FROM staff_users
            WHERE public_uuid = ? AND deleted_at IS NULL
            LIMIT 1`,
          [publicUuid],
        );
        if (rows.length === 0) {
          return res.status(404).json({ error: "Member not found" });
        }
        const current = rows[0];
        const memberId = current.id as number;
        const resolved = resolveTeamMemberUpdate(
          req.auth!.id,
          {
            id: memberId,
            firstName: current.first_name as string,
            lastName: current.last_name as string,
            role: current.role as UserRole,
            status: current.status as UserStatus,
            phone: (current.phone as string | null) ?? null,
          },
          body,
        );
        if (resolved.ok === false) {
          return res.status(400).json({ error: resolved.error });
        }

        const { next, revokeSessions } = resolved;
        const sets = [
          "first_name = ?",
          "last_name = ?",
          "role = ?",
          "status = ?",
        ];
        const params: unknown[] = [
          next.firstName,
          next.lastName,
          next.role,
          next.status,
        ];
        if (next.phoneChanged) {
          sets.push("phone = ?");
          params.push(next.phone ?? null);
        }
        params.push(memberId);

        await db.query<ResultSetHeader>(
          `UPDATE staff_users SET ${sets.join(", ")} WHERE id = ?`,
          params,
        );

        if (revokeSessions) {
          await db.query<ResultSetHeader>(
            `UPDATE staff_sessions
                SET is_active = 0, revoked_at = UTC_TIMESTAMP()
              WHERE staff_user_id = ? AND is_active = 1 AND revoked_at IS NULL`,
            [memberId],
          );
        }

        await db.query<ResultSetHeader>(
          `INSERT INTO audit_logs
             (public_uuid, actor_type, actor_id, entity_type, entity_id, action,
              previous_value_json, new_value_json, comment, ip_address)
           VALUES (?, 'staff', ?, 'staff_user', ?, 'update', ?, ?, ?, ?)`,
          [
            generatePublicUuid(),
            req.auth!.id,
            String(memberId),
            JSON.stringify({
              firstName: current.first_name,
              lastName: current.last_name,
              role: current.role,
              status: current.status,
            }),
            JSON.stringify({
              firstName: next.firstName,
              lastName: next.lastName,
              role: next.role,
              status: next.status,
            }),
            "Team member updated",
            req.ip || null,
          ],
        );

        const [updated] = await db.query<RowDataPacket[]>(
          `SELECT id, public_uuid, email, first_name, last_name, role, status, last_login_at
             FROM staff_users WHERE id = ? LIMIT 1`,
          [memberId],
        );
        return res.json({ member: mapTeamMemberRow(updated[0]) });
      } catch (err) {
        apiLogger.error("team member update failed", err);
        return res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  app.delete(
    "/api/team/members/:publicUuid",
    dbUnavailable,
    requireAdmin,
    async (req: AuthedRequest, res: Response) => {
      try {
        const publicUuid = String(req.params.publicUuid || "");
        const db = getPool();
        const [rows] = await db.query<RowDataPacket[]>(
          `SELECT id, email, first_name, last_name, role, status
             FROM staff_users
            WHERE public_uuid = ? AND deleted_at IS NULL
            LIMIT 1`,
          [publicUuid],
        );
        if (rows.length === 0) {
          return res.status(404).json({ error: "Member not found" });
        }
        const memberId = rows[0].id as number;
        if (!canRemoveMember(req.auth!.id, memberId)) {
          return res
            .status(400)
            .json({ error: "Cannot remove your own account" });
        }

        await db.query<ResultSetHeader>(
          `UPDATE staff_users
              SET deleted_at = UTC_TIMESTAMP(), status = 'inactive'
            WHERE id = ?`,
          [memberId],
        );
        await db.query<ResultSetHeader>(
          `UPDATE staff_sessions
              SET is_active = 0, revoked_at = UTC_TIMESTAMP()
            WHERE staff_user_id = ? AND is_active = 1 AND revoked_at IS NULL`,
          [memberId],
        );
        await db.query<ResultSetHeader>(
          `INSERT INTO audit_logs
             (public_uuid, actor_type, actor_id, entity_type, entity_id, action,
              previous_value_json, comment, ip_address)
           VALUES (?, 'staff', ?, 'staff_user', ?, 'delete', ?, ?, ?)`,
          [
            generatePublicUuid(),
            req.auth!.id,
            String(memberId),
            JSON.stringify({
              email: rows[0].email,
              firstName: rows[0].first_name,
              lastName: rows[0].last_name,
              role: rows[0].role,
              status: rows[0].status,
            }),
            "Team member soft-deleted",
            req.ip || null,
          ],
        );

        return res.json({ ok: true });
      } catch (err) {
        apiLogger.error("team member delete failed", err);
        return res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  // ---- Case assignments ----

  app.post(
    "/api/cases/:publicUuid/assignments",
    dbUnavailable,
    requireStaff,
    async (req: AuthedRequest, res: Response) => {
      try {
        if (!canManageCaseAssignments(req.auth?.role)) {
          return res.status(403).json({ error: "Insufficient permissions" });
        }
        const body = req.body as CreateAssignmentRequest;
        const userId = Number(body?.userId);
        const role = body?.assignmentRole as AssignmentRole;
        const allowedRoles: AssignmentRole[] = [
          "expert",
          "coordinator",
          "legal_reviewer",
          "logistics",
          "accountant",
          "qa",
          "technical_director",
          "observer",
        ];
        if (!userId || !allowedRoles.includes(role)) {
          return res
            .status(400)
            .json({ error: "userId and assignmentRole required" });
        }
        const caseRow = await findStaffAccessibleCase(req, 
          String(req.params.publicUuid),
        );
        if (!caseRow) return res.status(404).json({ error: "Case not found" });

        const db = getPool();
        const [users] = await db.query<RowDataPacket[]>(
          `SELECT id FROM staff_users WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
          [userId],
        );
        if (users.length === 0) {
          return res.status(404).json({ error: "User not found" });
        }

        const isPrimary = Boolean(body.isPrimary);
        if (shouldClearOtherPrimaryAssignments(role, isPrimary)) {
          await db.query<ResultSetHeader>(
            `UPDATE case_assignments
             SET is_primary = 0
             WHERE case_id = ? AND assignment_role = ? AND unassigned_at IS NULL`,
            [caseRow.id, role],
          );
        }
        const [existing] = await db.query<RowDataPacket[]>(
          `SELECT id FROM case_assignments
           WHERE case_id = ? AND user_id = ? AND assignment_role = ?
           LIMIT 1`,
          [caseRow.id, userId, role],
        );
        if (existing.length > 0) {
          await db.query<ResultSetHeader>(
            `UPDATE case_assignments
             SET unassigned_at = NULL, is_primary = ?, assigned_by = ?,
                 assigned_at = NOW(), notes = ?
             WHERE id = ?`,
            [
              isPrimary ? 1 : 0,
              req.auth!.id,
              body.notes?.trim() || null,
              existing[0].id,
            ],
          );
        } else {
          await db.query<ResultSetHeader>(
            `INSERT INTO case_assignments
               (case_id, user_id, assignment_role, is_primary, assigned_by, notes)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              caseRow.id,
              userId,
              role,
              isPrimary ? 1 : 0,
              req.auth!.id,
              body.notes?.trim() || null,
            ],
          );
        }

        if (isPrimary && role === "expert") {
          const prevExpertId =
            caseRow.assigned_expert_id != null
              ? Number(caseRow.assigned_expert_id)
              : null;
          if (prevExpertId != null && prevExpertId !== userId) {
            await clearExpertDeliveryDeadline({
              caseId: Number(caseRow.id),
              caseNumber: String(caseRow.case_number),
              casePublicUuid: String(caseRow.public_uuid),
              expertUserId: prevExpertId,
              notifyExpert: true,
            });
          }
          await db.query<ResultSetHeader>(
            `UPDATE cases SET assigned_expert_id = ? WHERE id = ?`,
            [userId, caseRow.id],
          );
        }
        if (isPrimary && role === "coordinator") {
          await db.query<ResultSetHeader>(
            `UPDATE cases SET assigned_coordinator_id = ? WHERE id = ?`,
            [userId, caseRow.id],
          );
        }

        let deliveryDueAt: Date | null = null;
        if (
          role === "expert" &&
          isPrimary &&
          body.deliveryDueAt != null &&
          String(body.deliveryDueAt).trim() !== ""
        ) {
          const parsed = parseExpertDeliveryDueDateInputInline(body.deliveryDueAt);
          if (parsed.ok === false) {
            return res.status(400).json({ error: parsed.error });
          }
          deliveryDueAt = parsed.dueAt;
          await upsertExpertDeliveryDeadline({
            caseId: Number(caseRow.id),
            caseNumber: String(caseRow.case_number),
            casePublicUuid: String(caseRow.public_uuid),
            dueAt: deliveryDueAt,
            actorId: req.auth!.id,
            expertUserId: userId,
            notifyExpert: false,
          });
        }

        const assignee = await getActorContact("staff", userId);
        const notifyLocale = assignee?.locale ?? "es";
        const notifyCopy = assignmentNotificationCopyInline({
          locale: notifyLocale,
          caseNumber: String(caseRow.case_number),
          role: String(role),
          deliveryDueAt,
        });
        await createNotification({
          recipientActor: "staff",
          recipientId: userId,
          caseId: caseRow.id as number,
          type: "new_assignment",
          title: notifyCopy.title,
          body: notifyCopy.body,
          caseNumber: String(caseRow.case_number),
          caseUrl: `${EMAIL_APP_URL}/portal/cases/${caseRow.public_uuid}`,
          email: assignee
            ? buildAssignmentEmail({
              locale: assignee.locale,
              firstName: assignee.firstName,
              caseNumber: String(caseRow.case_number),
              caseTitle: String(caseRow.title || caseRow.case_number),
                role: String(role),
                caseUrl: `${EMAIL_APP_URL}/portal/cases/${caseRow.public_uuid}`,
                appUrl: EMAIL_APP_URL,
                deliveryDueAt,
              })
            : null,
          emailTo: assignee?.email,
        });

        const [rows] = await db.query<RowDataPacket[]>(
          `SELECT a.id, a.user_id, a.assignment_role, a.is_primary, a.assigned_at, a.notes,
                  u.first_name, u.last_name, u.email
           FROM case_assignments a
           JOIN staff_users u ON u.id = a.user_id
           WHERE a.case_id = ? AND a.user_id = ? AND a.assignment_role = ?
             AND a.unassigned_at IS NULL
           LIMIT 1`,
          [caseRow.id, userId, role],
        );
        return res.status(201).json({ assignment: mapAssignment(rows[0]) });
      } catch (err) {
        apiLogger.error("assignment create failed", err);
        return res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  app.patch(
    "/api/cases/:publicUuid/expert-delivery-deadline",
    dbUnavailable,
    requireStaff,
    async (req: AuthedRequest, res: Response) => {
      try {
        if (!canManageCaseAssignments(req.auth?.role)) {
          return res.status(403).json({ error: "Insufficient permissions" });
        }
        const body = req.body as SetExpertDeliveryDeadlineRequest;
        const caseRow = await findStaffAccessibleCase(
          req,
          String(req.params.publicUuid),
        );
        if (!caseRow) return res.status(404).json({ error: "Case not found" });

        const rawDue = body?.deliveryDueAt;
        if (rawDue == null || String(rawDue).trim() === "") {
          await clearExpertDeliveryDeadline({
            caseId: Number(caseRow.id),
            caseNumber: String(caseRow.case_number),
            casePublicUuid: String(caseRow.public_uuid),
            expertUserId:
              caseRow.assigned_expert_id != null
                ? Number(caseRow.assigned_expert_id)
                : null,
            notifyExpert: true,
          });
          return res.json({ deadline: null });
        }

        const parsed = parseExpertDeliveryDueDateInputInline(rawDue);
        if (parsed.ok === false) {
          return res.status(400).json({ error: parsed.error });
        }

        const expertId =
          caseRow.assigned_expert_id != null
            ? Number(caseRow.assigned_expert_id)
            : null;
        if (expertId == null) {
          return res.status(409).json({
            error: "Assign a primary expert before setting a delivery date",
          });
        }

        const deadline = await upsertExpertDeliveryDeadline({
          caseId: Number(caseRow.id),
          caseNumber: String(caseRow.case_number),
          casePublicUuid: String(caseRow.public_uuid),
          dueAt: parsed.dueAt,
          actorId: req.auth!.id,
          expertUserId: expertId,
          notifyExpert: true,
        });

        const response: ExpertDeliveryDeadlineResponse = { deadline };
        return res.json(response);
      } catch (err) {
        apiLogger.error("expert delivery deadline failed", err);
        return res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  app.delete(
    "/api/cases/:publicUuid/assignments/:assignmentId",
    dbUnavailable,
    requireStaff,
    async (req: AuthedRequest, res: Response) => {
      try {
        if (!canManageCaseAssignments(req.auth?.role)) {
          return res.status(403).json({ error: "Insufficient permissions" });
        }
        const caseRow = await findStaffAccessibleCase(req, 
          String(req.params.publicUuid),
        );
        if (!caseRow) return res.status(404).json({ error: "Case not found" });
        const db = getPool();
        const [asgRows] = await db.query<RowDataPacket[]>(
          `SELECT id, user_id, assignment_role, is_primary FROM case_assignments
           WHERE id = ? AND case_id = ? AND unassigned_at IS NULL
           LIMIT 1`,
          [Number(req.params.assignmentId), caseRow.id],
        );
        if (asgRows.length === 0) {
          return res.status(404).json({ error: "Assignment not found" });
        }
        await db.query<ResultSetHeader>(
          `UPDATE case_assignments
           SET unassigned_at = NOW()
           WHERE id = ? AND case_id = ? AND unassigned_at IS NULL`,
          [asgRows[0].id, caseRow.id],
        );
        if (
          asgRows[0].assignment_role === "expert" &&
          Number(asgRows[0].is_primary) === 1
        ) {
          await db.query<ResultSetHeader>(
            `UPDATE cases SET assigned_expert_id = NULL
             WHERE id = ? AND assigned_expert_id = ?`,
            [caseRow.id, asgRows[0].user_id],
          );
          await clearExpertDeliveryDeadline({
            caseId: Number(caseRow.id),
            caseNumber: String(caseRow.case_number),
            casePublicUuid: String(caseRow.public_uuid),
            expertUserId: Number(asgRows[0].user_id),
            notifyExpert: true,
          });
        }
        if (
          asgRows[0].assignment_role === "coordinator" &&
          Number(asgRows[0].is_primary) === 1
        ) {
          await db.query<ResultSetHeader>(
            `UPDATE cases SET assigned_coordinator_id = NULL
             WHERE id = ? AND assigned_coordinator_id = ?`,
            [caseRow.id, asgRows[0].user_id],
          );
        }
        return res.json({ ok: true });
      } catch (err) {
        apiLogger.error("assignment delete failed", err);
        return res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  app.post(
    "/api/cases/:publicUuid/handoff/confirm",
    dbUnavailable,
    requireStaff,
    async (req: AuthedRequest, res: Response) => {
      try {
        if (
          req.auth?.role !== "admin"
        ) {
          return res.status(403).json({ error: "Insufficient permissions" });
        }
        const caseRow = await findStaffAccessibleCase(req, 
          String(req.params.publicUuid),
        );
        if (!caseRow) return res.status(404).json({ error: "Case not found" });
        const db = getPool();
        await db.query<ResultSetHeader>(
          `UPDATE cases
           SET documents_handoff_confirmed_at = COALESCE(documents_handoff_confirmed_at, NOW()),
               documents_handoff_confirmed_by = COALESCE(documents_handoff_confirmed_by, ?)
           WHERE id = ?`,
          [req.auth!.id, caseRow.id],
        );
        const [updated] = await db.query<RowDataPacket[]>(
          `SELECT public_uuid, documents_handoff_confirmed_at, updated_at
           FROM cases WHERE id = ? LIMIT 1`,
          [caseRow.id],
        );
        return res.json({
          case: {
            publicUuid: updated[0].public_uuid as string,
            documentsHandoffConfirmedAt: toIso(
              updated[0].documents_handoff_confirmed_at,
            ),
            updatedAt: toIso(updated[0].updated_at) || new Date().toISOString(),
          },
        });
      } catch (err) {
        apiLogger.error("handoff confirm failed", err);
        return res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  app.post(
    "/api/cases/:publicUuid/documents/:documentUuid/approve",
    dbUnavailable,
    requireStaff,
    async (req: AuthedRequest, res: Response) => {
      try {
        if (!canApproveIntakeDocument(req.auth?.role)) {
          return res.status(403).json({ error: "Insufficient permissions" });
        }
        const caseRow = await findStaffAccessibleCase(
          req,
          String(req.params.publicUuid),
        );
        if (!caseRow) return res.status(404).json({ error: "Case not found" });
        const db = getPool();
        const [docs] = await db.query<RowDataPacket[]>(
          `SELECT id, status, category FROM documents
           WHERE public_uuid = ? AND case_id = ? AND deleted_at IS NULL
           LIMIT 1`,
          [req.params.documentUuid, caseRow.id],
        );
        if (docs.length === 0) {
          return res.status(404).json({ error: "Document not found" });
        }
        if (!isIntakeDocumentCategory(String(docs[0].category))) {
          return res.status(400).json({
            error: "Only intake documents can be approved here",
          });
        }
        if (!documentIsApprovable(docs[0].status as string)) {
          return res.status(409).json({
            error: `Document cannot be approved from status ${docs[0].status}`,
          });
        }
        await db.query<ResultSetHeader>(
          `UPDATE documents
           SET status = 'approved',
               approved_by = ?,
               approved_at = NOW(),
               rejection_reason = NULL,
               correction_requested_at = NULL,
               correction_requested_by = NULL
           WHERE id = ?`,
          [req.auth!.id, docs[0].id],
        );
        const document = await fetchMappedCaseDocument(Number(docs[0].id));
        return res.json({ document });
      } catch (err) {
        apiLogger.error("document approve failed", err);
        return res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  app.post(
    "/api/cases/:publicUuid/documents/:documentUuid/reject",
    dbUnavailable,
    requireStaff,
    async (req: AuthedRequest, res: Response) => {
      try {
        if (!canRejectIntakeDocument(req.auth?.role)) {
          return res.status(403).json({ error: "Insufficient permissions" });
        }
        const parsed = parseDocumentRejectBody(req.body);
        if (parsed.ok === false) {
          return res.status(400).json({ error: parsed.error });
        }
        const caseRow = await findStaffAccessibleCase(
          req,
          String(req.params.publicUuid),
        );
        if (!caseRow) return res.status(404).json({ error: "Case not found" });
        const db = getPool();
        const [docs] = await db.query<RowDataPacket[]>(
          `SELECT id, status, category FROM documents
           WHERE public_uuid = ? AND case_id = ? AND deleted_at IS NULL
           LIMIT 1`,
          [req.params.documentUuid, caseRow.id],
        );
        if (docs.length === 0) {
          return res.status(404).json({ error: "Document not found" });
        }
        if (!documentIsRejectable(docs[0].status as string)) {
          return res.status(409).json({
            error: `Document cannot be rejected from status ${docs[0].status}`,
          });
        }
        const category = String(docs[0].category);
        if (!isIntakeDocumentCategory(category)) {
          return res.status(400).json({
            error: "Only intake documents can request correction here",
          });
        }
        const conn = await db.getConnection();
        try {
          await conn.beginTransaction();
          await conn.query<ResultSetHeader>(
            `UPDATE documents
             SET status = 'rejected',
                 approved_by = NULL,
                 approved_at = NULL,
                 rejection_reason = ?,
                 correction_requested_at = NOW(),
                 correction_requested_by = ?
             WHERE id = ?`,
            [parsed.reason, req.auth!.id, docs[0].id],
          );
          await clearExpedienteApproval(Number(caseRow.id), conn);
          const spec = intakeCorrectionDeadlineSpec();
          await ensureTypedDeadline({
            caseId: Number(caseRow.id),
            deadlineType: spec.deadlineType,
            title: spec.title,
            businessDays: spec.businessDays,
            actorId: req.auth!.id,
            conn,
          });
          await conn.commit();
        } catch (txnErr) {
          await conn.rollback();
          throw txnErr;
        } finally {
          conn.release();
        }
        await notifyLawFirmIntakeCorrection({
          caseRow,
          category,
          reason: parsed.reason,
        });
        const document = await fetchMappedCaseDocument(Number(docs[0].id));
        return res.json({ document });
      } catch (err) {
        apiLogger.error("document reject failed", err);
        return res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  app.post(
    "/api/cases/:publicUuid/expediente/approve",
    dbUnavailable,
    requireStaff,
    async (req: AuthedRequest, res: Response) => {
      try {
        const caseRow = await findStaffAccessibleCase(
          req,
          String(req.params.publicUuid),
        );
        if (!caseRow) return res.status(404).json({ error: "Case not found" });
        const docs = await loadCaseDocumentApprovalRows(Number(caseRow.id));
        const gate = canApproveExpedienteNow({
          role: req.auth?.role,
          docs,
          alreadyApproved: Boolean(caseRow.expediente_approved_at),
        });
        if (gate.ok === false) {
          const status =
            gate.code === "forbidden"
              ? 403
              : gate.code === "already_approved"
                ? 409
                : 400;
          return res.status(status).json({ error: gate.error, code: gate.code });
        }
        const db = getPool();
        await db.query<ResultSetHeader>(
          `UPDATE cases
           SET expediente_approved_at = COALESCE(expediente_approved_at, NOW()),
               expediente_approved_by = COALESCE(expediente_approved_by, ?)
           WHERE id = ?`,
          [req.auth!.id, caseRow.id],
        );
        const [updated] = await db.query<RowDataPacket[]>(
          `SELECT public_uuid, expediente_approved_at, updated_at
           FROM cases WHERE id = ? LIMIT 1`,
          [caseRow.id],
        );
        return res.json({
          case: {
            publicUuid: updated[0].public_uuid as string,
            expedienteApprovedAt: toIso(updated[0].expediente_approved_at),
            updatedAt: toIso(updated[0].updated_at) || new Date().toISOString(),
          },
        });
      } catch (err) {
        apiLogger.error("expediente approve failed", err);
        return res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  app.patch(
    "/api/cases/:publicUuid/ratification-scheduled",
    dbUnavailable,
    requireStaff,
    async (req: AuthedRequest, res: Response) => {
      try {
        if (!canMutateCaseSection(req.auth?.role, "documents")) {
          return res.status(403).json({ error: "Insufficient permissions" });
        }
        const body = req.body as { ratificationScheduledAt?: string | null };
        const caseRow = await findStaffAccessibleCase(req, 
          String(req.params.publicUuid),
        );
        if (!caseRow) return res.status(404).json({ error: "Case not found" });
        const raw = body?.ratificationScheduledAt;
        const scheduled =
          raw == null || String(raw).trim() === ""
            ? null
            : new Date(String(raw));
        if (scheduled && Number.isNaN(scheduled.getTime())) {
          return res.status(400).json({ error: "Invalid ratificationScheduledAt" });
        }
        const db = getPool();
        await db.query<ResultSetHeader>(
          `UPDATE cases SET ratification_scheduled_at = ? WHERE id = ?`,
          [scheduled, caseRow.id],
        );
        const [updated] = await db.query<RowDataPacket[]>(
          `SELECT public_uuid, ratification_scheduled_at, updated_at
           FROM cases WHERE id = ? LIMIT 1`,
          [caseRow.id],
        );
        return res.json({
          case: {
            publicUuid: updated[0].public_uuid as string,
            ratificationScheduledAt: toIso(updated[0].ratification_scheduled_at),
            updatedAt: toIso(updated[0].updated_at) || new Date().toISOString(),
          },
        });
      } catch (err) {
        apiLogger.error("ratification schedule failed", err);
        return res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  // ---- Questionnaires ----

  app.post(
    "/api/cases/:publicUuid/questionnaires",
    dbUnavailable,
    requireStaff,
    async (req: AuthedRequest, res: Response) => {
      try {
        if (!canMutateCaseSection(req.auth?.role, "questionnaire")) {
          return res.status(403).json({ error: "Insufficient permissions" });
        }
        const body = req.body as CreateQuestionnaireRequest;
        const caseRow = await findStaffAccessibleCase(req, 
          String(req.params.publicUuid),
        );
        if (!caseRow) return res.status(404).json({ error: "Case not found" });
        const submit = Boolean(body.submit);
        if (submit) {
          const dbForDocs = getPool();
          const [qDocRows] = await dbForDocs.query<RowDataPacket[]>(
            `SELECT d.id FROM documents d
             WHERE d.case_id = ?
               AND d.category = 'questionnaire'
               AND d.deleted_at IS NULL
               AND d.status NOT IN ('rejected', 'archived')
             LIMIT 1`,
            [caseRow.id],
          );
          const contentCheck = validateQuestionnaireSubmitContentInline(
            body.contentJson ?? null,
            { hasQuestionnairePdf: qDocRows.length > 0 },
          );
          if (contentCheck.ok === false) {
            return res.status(400).json({ error: contentCheck.error });
          }
        }
        const db = getPool();
        const [latestRows] = await db.query<RowDataPacket[]>(
          `SELECT * FROM questionnaires
           WHERE case_id = ?
           ORDER BY created_at DESC
           LIMIT 1`,
          [caseRow.id],
        );
        const latest = latestRows[0];
        const upsert = resolveQuestionnaireUpsert({
          currentStatus: latest ? String(latest.status) : null,
          submit,
        });
        if (upsert.ok === false) {
          return res.status(409).json({ error: upsert.error });
        }
        const canReuse = upsert.reuse;
        const nextStatus = upsert.nextStatus;
        const contentJson = body.contentJson
          ? JSON.stringify(body.contentJson)
          : null;
        const chronologyJson = body.chronologyJson
          ? JSON.stringify(body.chronologyJson)
          : null;
        const observations = body.technicalObservations?.trim() || null;

        let item: QuestionnaireItem;
        if (canReuse) {
          await db.query<ResultSetHeader>(
            `UPDATE questionnaires
             SET status = ?, content_json = ?, chronology_json = ?,
                 technical_observations = ?,
                 submitted_at = CASE WHEN ? = 1 THEN NOW() ELSE submitted_at END
             WHERE id = ?`,
            [
              nextStatus,
              contentJson,
              chronologyJson,
              observations,
              submit ? 1 : 0,
              latest.id,
            ],
          );
          item = {
            id: latest.id as number,
            publicUuid: String(latest.public_uuid),
            status: nextStatus as QuestionnaireItem["status"],
            contentJson: body.contentJson || null,
            chronologyJson: body.chronologyJson || null,
            technicalObservations: observations,
            submittedAt: submit
              ? new Date().toISOString()
              : toIso(latest.submitted_at),
            createdAt: toIso(latest.created_at) || new Date().toISOString(),
          };
        } else {
          const publicUuid = generatePublicUuid();
        const [result] = await db.query<ResultSetHeader>(
          `INSERT INTO questionnaires
             (public_uuid, case_id, status, content_json, chronology_json,
              technical_observations, prepared_by, submitted_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            publicUuid,
            caseRow.id,
              nextStatus,
              contentJson,
              chronologyJson,
              observations,
            req.auth!.id,
            submit ? new Date() : null,
          ],
        );
          item = {
          id: result.insertId,
          publicUuid,
            status: nextStatus as QuestionnaireItem["status"],
          contentJson: body.contentJson || null,
          chronologyJson: body.chronologyJson || null,
            technicalObservations: observations,
          submittedAt: submit ? new Date().toISOString() : null,
          createdAt: new Date().toISOString(),
        };
        }

        const contentRec = (body.contentJson || null) as Record<
          string,
          unknown
        > | null;
        const svWrite = questionnaireStreetViewWrite(contentRec);
        if (svWrite === "set") {
          await db.query<ResultSetHeader>(
            `UPDATE cases
             SET street_view_validated_at = COALESCE(street_view_validated_at, NOW())
             WHERE id = ?`,
            [caseRow.id],
          );
        } else if (svWrite === "clear") {
          await db.query<ResultSetHeader>(
            `UPDATE cases SET street_view_validated_at = NULL WHERE id = ?`,
            [caseRow.id],
          );
        }
        const gpsWrite = questionnaireGpsWrite(contentRec);
        if (gpsWrite.action === "set") {
          await db.query<ResultSetHeader>(
            `UPDATE cases
             SET property_lat = ?, property_lng = ?
             WHERE id = ?`,
            [gpsWrite.lat, gpsWrite.lng, caseRow.id],
          );
        } else if (gpsWrite.action === "clear") {
          await db.query<ResultSetHeader>(
            `UPDATE cases
             SET property_lat = NULL, property_lng = NULL
             WHERE id = ?`,
            [caseRow.id],
          );
        }
        if (submit && nextStatus === "grammar_qa") {
          await openReviewRequest({
            caseId: caseRow.id as number,
            entityType: "questionnaire",
            entityId: item.id,
            stage: "grammar_qa",
            requestedBy: req.auth!.id,
          });
          await createNotification({
            recipientActor: "staff",
            recipientId: req.auth!.id,
            caseId: caseRow.id as number,
            type: "qa_requested",
            title: `Questionnaire QA · ${caseRow.case_number}`,
            body: "Questionnaire submitted for grammar and data QA (P3).",
            caseNumber: String(caseRow.case_number),
            caseUrl: `${EMAIL_APP_URL}/portal/cases/${caseRow.public_uuid}`,
          });
        }
        return res.status(canReuse ? 200 : 201).json({ questionnaire: item });
      } catch (err) {
        apiLogger.error("questionnaire create failed", err);
        return res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  app.patch(
    "/api/cases/:publicUuid/questionnaires/:questionnaireUuid/status",
    dbUnavailable,
    requireStaff,
    async (req: AuthedRequest, res: Response) => {
      try {
        const body = req.body as UpdateQuestionnaireStatusRequest;
        const toStatus = body?.status as QuestionnaireStatus;
        if (!toStatus) {
          return res.status(400).json({ error: "status is required" });
        }
        const caseRow = await findStaffAccessibleCase(req, 
          String(req.params.publicUuid),
        );
        if (!caseRow) return res.status(404).json({ error: "Case not found" });
        const db = getPool();
        const [rows] = await db.query<RowDataPacket[]>(
          `SELECT * FROM questionnaires
           WHERE public_uuid = ? AND case_id = ?
           LIMIT 1`,
          [req.params.questionnaireUuid, caseRow.id],
        );
        if (rows.length === 0) {
          return res.status(404).json({ error: "Questionnaire not found" });
        }
        const fromStatus = rows[0].status as QuestionnaireStatus;
        const check = canDirectPatchQuestionnaireStatus(fromStatus, toStatus);
        if (check.ok === false) {
          return res.status(400).json({ error: check.reason });
        }
        if (
          ["approved", "changes_requested", "rejected"].includes(toStatus) &&
          !canDecideQuestionnaireReview(req.auth?.role)
        ) {
          return res.status(403).json({
            error: "Insufficient permissions to decide questionnaire review",
          });
        }
        if (
          !canMutateCaseSection(req.auth?.role, "questionnaire") &&
          !canDecideQuestionnaireReview(req.auth?.role)
        ) {
          return res.status(403).json({ error: "Insufficient permissions" });
        }

        if (toStatus === "grammar_qa") {
          const [qDocRows] = await db.query<RowDataPacket[]>(
            `SELECT d.id FROM documents d
             WHERE d.case_id = ?
               AND d.category = 'questionnaire'
               AND d.deleted_at IS NULL
               AND d.status NOT IN ('rejected', 'archived')
             LIMIT 1`,
            [caseRow.id],
          );
          let contentJson: unknown = rows[0].content_json;
          if (typeof contentJson === "string") {
            try {
              contentJson = JSON.parse(contentJson);
            } catch {
              contentJson = null;
            }
          }
          const contentCheck = validateQuestionnaireSubmitContentInline(
            contentJson,
            { hasQuestionnairePdf: qDocRows.length > 0 },
          );
          if (contentCheck.ok === false) {
            return res.status(400).json({ error: contentCheck.error });
          }
        }

        const fromCaseStatus = caseRow.status as CaseStatus;
        let looped: CaseStatus | null = null;
        const conn = await db.getConnection();
        try {
          await conn.beginTransaction();
          await conn.query<ResultSetHeader>(
            `UPDATE questionnaires
             SET status = ?,
                 submitted_at = COALESCE(submitted_at, ?),
                 reviewed_by = ?,
                 reviewed_at = ?
             WHERE id = ?`,
            [
              toStatus,
              toStatus === "grammar_qa"
                ? new Date()
                : null,
              [
                "legal_review",
                "grammar_qa",
                "approved",
                "changes_requested",
                "rejected",
              ].includes(toStatus)
                ? req.auth!.id
                : rows[0].reviewed_by,
              ["approved", "changes_requested", "rejected"].includes(toStatus)
                ? new Date()
                : rows[0].reviewed_at,
              rows[0].id,
            ],
          );

          if (
            toStatus === "approved" ||
            toStatus === "changes_requested" ||
            toStatus === "rejected"
          ) {
            await completePendingReviewsForEntity({
              entityType: "questionnaire",
              entityId: rows[0].id as number,
              outcome: toStatus,
              notes: body.notes?.trim() || null,
              stage: "internal_legal",
              conn,
            });
          }

          looped = await applyArtifactRejectLoop({
            caseRow,
            artifact: "questionnaire",
            outcome: toStatus,
            actorId: req.auth!.id,
            reason: body.notes?.trim() || null,
            conn,
            auditActorType: "staff",
            auditActorId: req.auth!.id,
          });
          await conn.commit();
        } catch (err) {
          await conn.rollback();
          throw err;
        } finally {
          conn.release();
        }

        if (shouldOpenGrammarQaReview(toStatus)) {
          await openReviewRequest({
            caseId: caseRow.id as number,
            entityType: "questionnaire",
            entityId: rows[0].id as number,
            stage: "grammar_qa",
            requestedBy: req.auth!.id,
            notes: body.notes?.trim() || null,
          });
        }

        if (shouldOpenInternalLegalReview(toStatus)) {
          await openReviewRequest({
            caseId: caseRow.id as number,
            entityType: "questionnaire",
            entityId: rows[0].id as number,
            stage: "internal_legal",
            requestedBy: req.auth!.id,
            notes: body.notes?.trim() || null,
          });
          await runAutomationActions(automationOnQuestionnaireQaApproved(), {
            caseId: caseRow.id as number,
            lawFirmId:
              caseRow.law_firm_id != null ? Number(caseRow.law_firm_id) : null,
            actorId: req.auth!.id,
            caseNumber: String(caseRow.case_number),
            fallbackRecipientId: req.auth!.id,
          });
        }

        if (toStatus === "approved") {
          /* Legal approval (P4) — advance already released at QA (P3). */
        }

        if (looped) {
          await afterArtifactRejectLoop({
            caseRow,
            fromStatus: fromCaseStatus,
            toStatus: looped,
            actorId: req.auth!.id,
            auditActorType: "staff",
          });
        }

        const [updated] = await db.query<RowDataPacket[]>(
          `SELECT * FROM questionnaires WHERE id = ? LIMIT 1`,
          [rows[0].id],
        );
        const qStatus = updated[0].status as QuestionnaireStatus;
        const item: QuestionnaireItem = {
          id: updated[0].id as number,
          publicUuid: updated[0].public_uuid as string,
          status: qStatus,
          contentJson:
            (updated[0].content_json as Record<string, unknown> | null) ?? null,
          chronologyJson:
            (updated[0].chronology_json as Record<string, unknown> | null) ??
            null,
          technicalObservations:
            (updated[0].technical_observations as string | null) ?? null,
          submittedAt: toIso(updated[0].submitted_at),
          createdAt: toIso(updated[0].created_at) || new Date().toISOString(),
          allowedNextStatuses: getAllowedQuestionnaireStatusesForDirectPatch(qStatus),
        };
        return res.json({ questionnaire: item });
      } catch (err) {
        apiLogger.error("questionnaire status failed", err);
        return res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  app.post(
    "/api/cases/:publicUuid/reviews/:reviewId/complete",
    dbUnavailable,
    requireStaff,
    async (req: AuthedRequest, res: Response) => {
      try {
        const body = req.body as CompleteReviewRequest;
        const caseRow = await findStaffAccessibleCase(req, 
          String(req.params.publicUuid),
        );
        if (!caseRow) return res.status(404).json({ error: "Case not found" });
        const reviewId = Number(req.params.reviewId);
        if (!reviewId) {
          return res.status(400).json({ error: "Invalid review id" });
        }
        const db = getPool();
        const [rows] = await db.query<RowDataPacket[]>(
          `SELECT * FROM review_requests
           WHERE id = ? AND case_id = ?
           LIMIT 1`,
          [reviewId, caseRow.id],
        );
        if (rows.length === 0) {
          return res.status(404).json({ error: "Review request not found" });
        }
        const stage = rows[0].review_stage as ReviewStage;
        if (!canCompleteReviewStage(req.auth?.role, stage)) {
          return res.status(403).json({
            error: "Insufficient permissions for this review stage",
          });
        }
        const resolved = resolveReviewCompletion(
          String(rows[0].status),
          body?.outcome,
        );
        if (resolved.ok === false) {
          return res.status(400).json({ error: resolved.error });
        }

        const entityType = rows[0].entity_type as ReviewEntityType;
        const entityId = rows[0].entity_id as number;
        let reportAutomationStatus: TechnicalReportStatus | null = null;

        if (entityType === "technical_report") {
          const nextReport = reportStatusFromReview(stage, resolved.nextStatus);
          if (nextReport) {
            const [reportRows] = await db.query<RowDataPacket[]>(
              `SELECT status FROM technical_reports
               WHERE id = ? AND case_id = ? LIMIT 1`,
              [entityId, caseRow.id],
            );
            if (reportRows.length === 0) {
              return res.status(400).json({
                error: "Linked technical report not found",
              });
            }
            const fromStatus = reportRows[0].status as TechnicalReportStatus;
            const toStatus = nextReport as TechnicalReportStatus;
            const check = canTransitionReport(fromStatus, toStatus);
            if (check.ok === false) {
              return res.status(400).json({ error: check.reason });
            }
            reportAutomationStatus = toStatus;
          }
        }

        const fromCaseStatus = caseRow.status as CaseStatus;
        let looped: CaseStatus | null = null;
        const conn = await db.getConnection();
        try {
          await conn.beginTransaction();
          const [reviewUpdate] = await conn.query<ResultSetHeader>(
            `UPDATE review_requests
             SET status = ?, completed_at = NOW(), notes = COALESCE(?, notes),
                 assigned_to = COALESCE(assigned_to, ?)
             WHERE id = ? AND status = 'pending'`,
            [
              resolved.nextStatus,
              body.notes?.trim() || null,
              req.auth!.id,
              reviewId,
            ],
          );
          if (reviewUpdate.affectedRows === 0) {
            await conn.rollback();
            return res.status(409).json({
              error: "Review is no longer pending",
            });
          }

          if (entityType === "questionnaire") {
            const nextQ = questionnaireStatusFromReviewStage(
              stage,
              resolved.nextStatus,
            );
            if (!nextQ) {
              await conn.rollback();
              return res.status(400).json({
                error: "Invalid questionnaire review transition",
              });
            }
            await conn.query<ResultSetHeader>(
              `UPDATE questionnaires
               SET status = ?, reviewed_by = ?, reviewed_at = NOW()
               WHERE id = ? AND case_id = ?`,
              [nextQ, req.auth!.id, entityId, caseRow.id],
            );
            looped = await applyArtifactRejectLoop({
              caseRow,
              artifact: "questionnaire",
              outcome: resolved.nextStatus,
              actorId: req.auth!.id,
              reason: body.notes?.trim() || null,
              conn,
              auditActorType: "staff",
              auditActorId: req.auth!.id,
            });
          }

          if (entityType === "technical_report" && reportAutomationStatus) {
            await conn.query<ResultSetHeader>(
              `UPDATE technical_reports
               SET status = ?,
                   approved_at = ?
               WHERE id = ?`,
              [
                reportAutomationStatus,
                reportAutomationStatus === "approved" ||
                reportAutomationStatus === "approved_internal"
                  ? new Date()
                  : null,
                entityId,
              ],
            );
            looped = await applyArtifactRejectLoop({
              caseRow,
              artifact: "technical_report",
              outcome: resolved.nextStatus,
              actorId: req.auth!.id,
              reason: body.notes?.trim() || null,
              conn,
              auditActorType: "staff",
              auditActorId: req.auth!.id,
            });
          }

          await conn.commit();
        } catch (err) {
          await conn.rollback();
          throw err;
        } finally {
          conn.release();
        }

        if (entityType === "questionnaire") {
          if (stage === "grammar_qa" && resolved.nextStatus === "approved") {
            await openReviewRequest({
              caseId: caseRow.id as number,
              entityType: "questionnaire",
              entityId,
              stage: "internal_legal",
              requestedBy: req.auth!.id,
              notes: body.notes?.trim() || null,
            });
            await runAutomationActions(automationOnQuestionnaireQaApproved(), {
              caseId: caseRow.id as number,
              lawFirmId:
                caseRow.law_firm_id != null
                  ? Number(caseRow.law_firm_id)
                  : null,
              actorId: req.auth!.id,
              caseNumber: String(caseRow.case_number),
              fallbackRecipientId: req.auth!.id,
            });
          }
        }

        if (looped) {
          await afterArtifactRejectLoop({
            caseRow,
            fromStatus: fromCaseStatus,
            toStatus: looped,
            actorId: req.auth!.id,
            auditActorType: "staff",
          });
        }

        if (entityType === "technical_report" && reportAutomationStatus) {
          const toStatus = reportAutomationStatus;
          const enterStage = reviewStageForReportStatus(toStatus);
          if (enterStage) {
            await openReviewRequest({
              caseId: caseRow.id as number,
              entityType: "technical_report",
              entityId,
              stage: enterStage,
              requestedBy: req.auth!.id,
            });
          }
          if (toStatus === "external_review") {
            await runAutomationActions(
              automationOnReportEnterExternalReview(),
              {
                caseId: caseRow.id as number,
                lawFirmId:
                  caseRow.law_firm_id != null
                    ? Number(caseRow.law_firm_id)
                    : null,
                actorId: req.auth!.id,
                caseNumber: String(caseRow.case_number),
                entityType: "technical_report",
                entityId,
              },
            );
          }
          if (toStatus === "approved") {
            await runAutomationActions(automationOnReportApproved(), {
              caseId: caseRow.id as number,
              lawFirmId:
                caseRow.law_firm_id != null
                  ? Number(caseRow.law_firm_id)
                  : null,
              actorId: req.auth!.id,
              caseNumber: String(caseRow.case_number),
              fallbackRecipientId: req.auth!.id,
            });
          }
        }

        await createNotification({
          recipientActor: "staff",
          recipientId: (rows[0].requested_by as number) || req.auth!.id,
          caseId: caseRow.id as number,
          type: reviewCompleteNotificationTypeInline(String(rows[0].review_stage)),
          title: `Review ${resolved.nextStatus} · ${caseRow.case_number}`,
          body: body.notes?.trim() || `Review marked ${resolved.nextStatus}.`,
          caseNumber: String(caseRow.case_number),
          caseUrl: `${EMAIL_APP_URL}/portal/cases/${caseRow.public_uuid}`,
        });

        const [updated] = await db.query<RowDataPacket[]>(
          `SELECT * FROM review_requests WHERE id = ? LIMIT 1`,
          [reviewId],
        );
        return res.json({ review: mapReviewRequest(updated[0]) });
      } catch (err) {
        apiLogger.error("review complete failed", err);
        return res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  // ---- Inspections & measurements ----

  app.post(
    "/api/cases/:publicUuid/inspections",
    dbUnavailable,
    requireStaff,
    async (req: AuthedRequest, res: Response) => {
      try {
        if (!canMutateCaseSection(req.auth?.role, "inspections")) {
          return res.status(403).json({ error: "Insufficient permissions" });
        }
        const body = req.body as CreateInspectionRequest;
        const caseRow = await findStaffAccessibleCase(req, 
          String(req.params.publicUuid),
        );
        if (!caseRow) return res.status(404).json({ error: "Case not found" });
        const publicUuid = generatePublicUuid();
        const scheduledAt = body.scheduledAt
          ? new Date(body.scheduledAt)
          : null;
        const db = getPool();
        const [result] = await db.query<ResultSetHeader>(
          `INSERT INTO inspections
             (public_uuid, case_id, scheduled_at, status, lead_expert_id, notes)
           VALUES (?, ?, ?, 'scheduled', ?, ?)`,
          [
            publicUuid,
            caseRow.id,
            scheduledAt,
            body.leadExpertId ?? caseRow.assigned_expert_id ?? null,
            body.notes?.trim() || null,
          ],
        );
        if (scheduledAt) {
          await db.query<ResultSetHeader>(
            `INSERT INTO calendar_events
               (public_uuid, case_id, event_type, title, starts_at, created_by)
             VALUES (?, ?, 'inspection', ?, ?, ?)`,
            [
              generatePublicUuid(),
              caseRow.id,
              `Inspection · ${caseRow.case_number}`,
              scheduledAt,
              req.auth!.id,
            ],
          );
        }
        const item: InspectionItem = {
          id: result.insertId,
          publicUuid,
          status: "scheduled",
          scheduledAt: scheduledAt?.toISOString() || null,
          completedAt: null,
          notes: body.notes?.trim() || null,
          leadExpertId:
            body.leadExpertId ??
            (caseRow.assigned_expert_id as number | null) ??
            null,
        };
        if (scheduledAt) {
          const inspRecipient =
            (await resolveCoordinatorOrAdmin(caseRow)) ?? req.auth!.id;
          await createNotification({
            recipientActor: "staff",
            recipientId: inspRecipient,
            caseId: caseRow.id as number,
            type: "inspection_scheduled",
            title: `Inspection scheduled · ${caseRow.case_number}`,
            body: `Inspection scheduled for ${scheduledAt.toISOString()}.`,
            caseNumber: String(caseRow.case_number),
            caseUrl: `${EMAIL_APP_URL}/portal/cases/${caseRow.public_uuid}`,
          });
        }
        return res.status(201).json({ inspection: item });
      } catch (err) {
        apiLogger.error("inspection create failed", err);
        return res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  app.patch(
    "/api/cases/:publicUuid/inspections/:inspectionUuid/status",
    dbUnavailable,
    requireStaff,
    async (req: AuthedRequest, res: Response) => {
      try {
        const toStatus = (req.body as { status?: InspectionStatus })?.status;
        const caseRow = await findStaffAccessibleCase(req, 
          String(req.params.publicUuid),
        );
        if (!caseRow) return res.status(404).json({ error: "Case not found" });
        if (!canMutateCaseSection(req.auth?.role, "inspections")) {
          return res.status(403).json({ error: "Insufficient permissions" });
        }
        const db = getPool();
        const [rows] = await db.query<RowDataPacket[]>(
          `SELECT * FROM inspections
           WHERE public_uuid = ? AND case_id = ?
           LIMIT 1`,
          [req.params.inspectionUuid, caseRow.id],
        );
        if (rows.length === 0) {
          return res.status(404).json({ error: "Inspection not found" });
        }
        const transition = canTransitionInspection(
          String(rows[0].status),
          toStatus,
        );
        if (transition.ok === false) {
          return res.status(400).json({ error: transition.error });
        }
        const nextStatus = toStatus as InspectionStatus;
        if (nextStatus === "completed") {
          const parallelOpts = await softParallelOptsForCaseRow(caseRow);
          if (
            !softParallelAllowed(
              String(caseRow.status),
              "mark_inspection_complete",
              parallelOpts,
            )
          ) {
            return res.status(400).json({
              error: "soft_parallel_blocked",
              message: softParallelBlockMessage("mark_inspection_complete"),
            });
          }
        }
        await db.query<ResultSetHeader>(
          `UPDATE inspections
           SET status = ?,
               started_at = ?,
               completed_at = ?
           WHERE id = ?`,
          [
            nextStatus,
            nextStatus === "in_progress"
              ? rows[0].started_at || new Date()
              : rows[0].started_at,
            nextStatus === "completed" ? new Date() : rows[0].completed_at,
            rows[0].id,
          ],
        );
        if (nextStatus === "completed") {
          await runAutomationActions(automationOnInspectionCompleted(), {
            caseId: caseRow.id as number,
            lawFirmId:
              caseRow.law_firm_id != null ? Number(caseRow.law_firm_id) : null,
            actorId: req.auth!.id,
            caseNumber: String(caseRow.case_number),
            fallbackRecipientId: req.auth!.id,
          });
        }
        const [updated] = await db.query<RowDataPacket[]>(
          `SELECT * FROM inspections WHERE id = ? LIMIT 1`,
          [rows[0].id],
        );
        const item: InspectionItem = {
          id: updated[0].id as number,
          publicUuid: updated[0].public_uuid as string,
          status: updated[0].status as InspectionStatus,
          scheduledAt: toIso(updated[0].scheduled_at),
          completedAt: toIso(updated[0].completed_at),
          notes: (updated[0].notes as string | null) ?? null,
          leadExpertId: (updated[0].lead_expert_id as number | null) ?? null,
        };
        return res.json({ inspection: item });
      } catch (err) {
        apiLogger.error("inspection status failed", err);
        return res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  app.post(
    "/api/cases/:publicUuid/measurements",
    dbUnavailable,
    requireStaff,
    async (req: AuthedRequest, res: Response) => {
      try {
        if (!canMutateCaseSection(req.auth?.role, "inspections")) {
          return res.status(403).json({ error: "Insufficient permissions" });
        }
        const body = req.body as CreateMeasurementRequest;
        const types = [
          "horizontal_distance",
          "vertical_distance",
          "pole_distance",
          "other",
        ] as const;
        if (
          body?.valueNumeric == null ||
          !types.includes(body.measurementType)
        ) {
          return res
            .status(400)
            .json({ error: "measurementType and valueNumeric required" });
        }
        const caseRow = await findStaffAccessibleCase(req, 
          String(req.params.publicUuid),
        );
        if (!caseRow) return res.status(404).json({ error: "Case not found" });
        const unit = body.unit || "m";
        const db = getPool();
        const [result] = await db.query<ResultSetHeader>(
          `INSERT INTO measurements
             (case_id, inspection_id, measurement_type, value_numeric, unit, pole_id, notes, recorded_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            caseRow.id,
            body.inspectionId ?? null,
            body.measurementType,
            body.valueNumeric,
            unit,
            body.poleId?.trim() || null,
            body.notes?.trim() || null,
            req.auth!.id,
          ],
        );
        const item: MeasurementItem = {
          id: result.insertId,
          inspectionId: body.inspectionId ?? null,
          measurementType: body.measurementType,
          valueNumeric: Number(body.valueNumeric),
          unit,
          poleId: body.poleId?.trim() || null,
          notes: body.notes?.trim() || null,
          recordedAt: new Date().toISOString(),
        };
        return res.status(201).json({ measurement: item });
      } catch (err) {
        apiLogger.error("measurement create failed", err);
        return res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  app.post(
    "/api/cases/:publicUuid/evidence",
    dbUnavailable,
    requireStaff,
    async (req: AuthedRequest, res: Response) => {
      try {
        if (!canMutateCaseSection(req.auth?.role, "evidence")) {
          return res.status(403).json({ error: "Insufficient permissions" });
        }
        const caseRow = await findStaffAccessibleCase(
          req,
          String(req.params.publicUuid),
        );
        if (!caseRow) return res.status(404).json({ error: "Case not found" });
        {
          const parallelOpts = await softParallelOptsForCaseRow(caseRow);
          if (
            !softParallelAllowed(
              String(caseRow.status),
              "upload_field_evidence",
              parallelOpts,
            )
          ) {
            return res.status(400).json({
              error: "soft_parallel_blocked",
              message: softParallelBlockMessage("upload_field_evidence"),
            });
          }
        }
        const body = req.body as CreateEvidenceRequest;
        const validated = validateCreateEvidence(body);
        if (validated.ok === false) {
          return res.status(400).json({ error: validated.error });
        }
        const value = validated.value;

        const db = getPool();
        if (value.inspectionId != null) {
          const [inspRows] = await db.query<RowDataPacket[]>(
            `SELECT id FROM inspections
             WHERE id = ? AND case_id = ?
             LIMIT 1`,
            [value.inspectionId, caseRow.id],
          );
          if (inspRows.length === 0) {
            return res
              .status(400)
              .json({ error: "inspectionId does not belong to this case" });
          }
        }

        let storageKey: string | null = null;
        let mimeType: string | null = value.contentType;
        let fileSizeBytes: number | null = null;

        if (value.dataBase64 && value.fileName) {
          if (!process.env.BLOB_READ_WRITE_TOKEN) {
            return res.status(503).json({
              error: "BLOB_READ_WRITE_TOKEN not configured",
            });
          }
          const buffer = Buffer.from(value.dataBase64, "base64");
          const sizeCheck = validateCreateEvidence({
            ...body,
            fileSizeBytes: buffer.length,
          });
          if (sizeCheck.ok === false) {
            return res.status(400).json({ error: sizeCheck.error });
          }
          if (buffer.length === 0 || buffer.length > EVIDENCE_MAX_FILE_BYTES) {
            return res.status(400).json({ error: "Invalid file size" });
          }
          const safeName = value.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
          const pathname = `cases/${caseRow.id}/evidence/${Date.now()}-${safeName}`;
          const blob = await putPrivateBlob(
            pathname,
            buffer,
            value.contentType || undefined,
          );
          storageKey = blob.url;
          mimeType = value.contentType || "application/octet-stream";
          fileSizeBytes = buffer.length;
        }

        const publicUuid = generatePublicUuid();
        const [result] = await db.query<ResultSetHeader>(
          `INSERT INTO evidence_items
             (public_uuid, case_id, inspection_id, evidence_type, category, title, caption,
              storage_key, mime_type, file_size_bytes, captured_at, lat, lng, captured_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            publicUuid,
            caseRow.id,
            value.inspectionId,
            value.evidenceType,
            value.category,
            value.title,
            value.caption,
            storageKey,
            mimeType,
            fileSizeBytes,
            value.capturedAt,
            value.lat,
            value.lng,
            req.auth!.id,
          ],
        );

        const item: EvidenceItem = {
          id: result.insertId,
          publicUuid,
          inspectionId: value.inspectionId,
          evidenceType: value.evidenceType,
          category: value.category,
          title: value.title,
          caption: value.caption,
          storageKey: storageKey
            ? await signBlobUrlForClient(storageKey)
            : null,
          mimeType,
          fileSizeBytes,
          capturedAt: value.capturedAt ? value.capturedAt.toISOString() : null,
          lat: value.lat,
          lng: value.lng,
          capturedBy: req.auth!.id,
          createdAt: new Date().toISOString(),
        };
        const evidenceChecklist = await loadEvidenceChecklistForCase(
          caseRow.id as number,
        );
        const response: CreateEvidenceResponse = {
          evidence: item,
          evidenceChecklist,
        };
        return res.status(201).json(response);
      } catch (err) {
        apiLogger.error("evidence create failed", err);
        return res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  app.delete(
    "/api/cases/:publicUuid/evidence/:evidenceUuid",
    dbUnavailable,
    requireStaff,
    async (req: AuthedRequest, res: Response) => {
      try {
        if (!canMutateCaseSection(req.auth?.role, "evidence")) {
          return res.status(403).json({ error: "Insufficient permissions" });
        }
        const caseRow = await findStaffAccessibleCase(req, 
          String(req.params.publicUuid),
        );
        if (!caseRow) return res.status(404).json({ error: "Case not found" });
        const evidenceUuid = String(req.params.evidenceUuid || "").trim();
        if (!evidenceUuid) {
          return res.status(400).json({ error: "evidenceUuid required" });
        }
        const db = getPool();
        const [result] = await db.query<ResultSetHeader>(
          `UPDATE evidence_items
           SET deleted_at = NOW()
           WHERE public_uuid = ? AND case_id = ? AND deleted_at IS NULL`,
          [evidenceUuid, caseRow.id],
        );
        if (result.affectedRows === 0) {
          return res.status(404).json({ error: "Evidence not found" });
        }
        const evidenceChecklist = await loadEvidenceChecklistForCase(
          caseRow.id as number,
        );
        const response: DeleteEvidenceResponse = {
          ok: true,
          evidenceChecklist,
        };
        return res.json(response);
      } catch (err) {
        apiLogger.error("evidence delete failed", err);
        return res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  // ---- Logistics ----

  app.post(
    "/api/cases/:publicUuid/trips",
    dbUnavailable,
    requireStaff,
    async (req: AuthedRequest, res: Response) => {
      try {
        if (!canMutateCaseSection(req.auth?.role, "logistics")) {
          return res.status(403).json({ error: "Insufficient permissions" });
        }
        const body = req.body as CreateLogisticsTripRequest;
        const caseRow = await findStaffAccessibleCase(req, 
          String(req.params.publicUuid),
        );
        if (!caseRow) return res.status(404).json({ error: "Case not found" });
        {
          const parallelOpts = await softParallelOptsForCaseRow(caseRow);
          if (
            !softParallelAllowed(
              String(caseRow.status),
              "draft_logistics_trip",
              parallelOpts,
            )
          ) {
            return res.status(400).json({
              error: "soft_parallel_blocked",
              message: softParallelBlockMessage("draft_logistics_trip"),
            });
          }
        }
        const publicUuid = generatePublicUuid();
        const status = body.status || "planned";
        const db = getPool();
        const [result] = await db.query<ResultSetHeader>(
          `INSERT INTO logistics_trips
             (public_uuid, case_id, status, departure_at, return_at,
              origin_city, destination_city, notes, created_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            publicUuid,
            caseRow.id,
            status,
            body.departureAt ? new Date(body.departureAt) : null,
            body.returnAt ? new Date(body.returnAt) : null,
            body.originCity?.trim() || null,
            body.destinationCity?.trim() || null,
            body.notes?.trim() || null,
            req.auth!.id,
          ],
        );
        if (body.departureAt) {
          await db.query<ResultSetHeader>(
            `INSERT INTO calendar_events
               (public_uuid, case_id, event_type, title, starts_at, ends_at, location, created_by)
             VALUES (?, ?, 'travel', ?, ?, ?, ?, ?)`,
            [
              generatePublicUuid(),
              caseRow.id,
              `Travel · ${caseRow.case_number}`,
              new Date(body.departureAt),
              body.returnAt ? new Date(body.returnAt) : null,
              body.destinationCity?.trim() || null,
              req.auth!.id,
            ],
          );
        }
        const item: LogisticsTripItem = {
          id: result.insertId,
          publicUuid,
          status,
          departureAt: body.departureAt
            ? new Date(body.departureAt).toISOString()
            : null,
          returnAt: body.returnAt
            ? new Date(body.returnAt).toISOString()
            : null,
          originCity: body.originCity?.trim() || null,
          destinationCity: body.destinationCity?.trim() || null,
          notes: body.notes?.trim() || null,
        };
        if (status === "booked" || body.departureAt) {
          const tripRecipient =
            (await resolveCoordinatorOrAdmin(caseRow)) ?? req.auth!.id;
          await createNotification({
            recipientActor: "staff",
            recipientId: tripRecipient,
            caseId: caseRow.id as number,
            type: "travel_confirmed",
            title: `Travel confirmed · ${caseRow.case_number}`,
            body: body.destinationCity
              ? `Trip toward ${body.destinationCity.trim()} recorded.`
              : "Logistics trip recorded.",
            caseNumber: String(caseRow.case_number),
            caseUrl: `${EMAIL_APP_URL}/portal/cases/${caseRow.public_uuid}`,
          });
        }
        return res.status(201).json({ trip: item });
      } catch (err) {
        apiLogger.error("trip create failed", err);
        return res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  // ---- Expenses, technical reports, notifications, law firms, client portal ----

  app.post(
    "/api/cases/:publicUuid/expenses",
    dbUnavailable,
    requireStaff,
    async (req: AuthedRequest, res: Response) => {
      try {
        if (!canMutateCaseSection(req.auth?.role, "logistics")) {
          return res.status(403).json({ error: "Insufficient permissions" });
        }
        const body = req.body as CreateLogisticsExpenseRequest;
        const tripId = Number(body?.tripId);
        const amount = Number(body?.amount);
        const types: ExpenseType[] = [
          "flight",
          "hotel",
          "rental_car",
          "fuel",
          "meals",
          "other",
        ];
        if (
          !tripId ||
          !Number.isFinite(amount) ||
          !types.includes(body.expenseType)
        ) {
          return res
            .status(400)
            .json({ error: "tripId, expenseType and amount required" });
        }
        const caseRow = await findStaffAccessibleCase(req, 
          String(req.params.publicUuid),
        );
        if (!caseRow) return res.status(404).json({ error: "Case not found" });
        const db = getPool();
        const [trips] = await db.query<RowDataPacket[]>(
          `SELECT id FROM logistics_trips WHERE id = ? AND case_id = ? LIMIT 1`,
          [tripId, caseRow.id],
        );
        if (trips.length === 0) {
          return res.status(404).json({ error: "Trip not found" });
        }
        const [result] = await db.query<ResultSetHeader>(
          `INSERT INTO logistics_expenses
             (trip_id, case_id, expense_type, vendor_name, amount, currency, expense_date, notes, created_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            tripId,
            caseRow.id,
            body.expenseType,
            body.vendorName?.trim() || null,
            amount,
            body.currency?.trim() || "MXN",
            body.expenseDate || null,
            body.notes?.trim() || null,
            req.auth!.id,
          ],
        );
        const expense: LogisticsExpenseItem = {
          id: result.insertId,
          tripId,
          expenseType: body.expenseType,
          vendorName: body.vendorName?.trim() || null,
          amount,
          currency: body.currency?.trim() || "MXN",
          expenseDate: body.expenseDate || null,
          notes: body.notes?.trim() || null,
        };
        return res.status(201).json({ expense });
      } catch (err) {
        apiLogger.error("expense create failed", err);
        return res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  app.post(
    "/api/cases/:publicUuid/technical-reports",
    dbUnavailable,
    requireStaff,
    async (req: AuthedRequest, res: Response) => {
      try {
        if (!canMutateCaseSection(req.auth?.role, "reports")) {
          return res.status(403).json({ error: "Insufficient permissions" });
        }
        const body = req.body as CreateTechnicalReportRequest;
        const caseRow = await findStaffAccessibleCase(req, 
          String(req.params.publicUuid),
        );
        if (!caseRow) return res.status(404).json({ error: "Case not found" });
        const submit = Boolean(body.submit);
        if (submit) {
          const [reportDocRows] = await getPool().query<RowDataPacket[]>(
            `SELECT d.id FROM documents d
             WHERE d.case_id = ?
               AND d.category = 'technical_report'
               AND d.deleted_at IS NULL
               AND d.status NOT IN ('rejected', 'archived')
             LIMIT 1`,
            [caseRow.id],
          );
          if (reportDocRows.length === 0) {
            return res.status(400).json({
              error: "Technical report PDF required",
            });
          }
        }
        const publicUuid = generatePublicUuid();
        const status: TechnicalReportStatus = submit ? "grammar_qa" : "draft";
        const photoCatalogJson = body.photoCatalogJson
          ? JSON.stringify(body.photoCatalogJson)
          : null;
        const db = getPool();
        const [result] = await db.query<ResultSetHeader>(
          `INSERT INTO technical_reports
             (public_uuid, case_id, status, version_number, investigation_summary,
              defendant_questionnaire_summary, plaintiff_questionnaire_summary,
              photo_catalog_json, conclusions, authored_by, submitted_at)
           VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?)`,
          [
            publicUuid,
            caseRow.id,
            status,
            body.investigationSummary?.trim() || null,
            body.defendantQuestionnaireSummary?.trim() || null,
            body.plaintiffQuestionnaireSummary?.trim() || null,
            photoCatalogJson,
            body.conclusions?.trim() || null,
            req.auth!.id,
            submit ? new Date() : null,
          ],
        );
        if (submit) {
          await openReviewRequest({
            caseId: caseRow.id as number,
            entityType: "technical_report",
            entityId: result.insertId,
            stage: "grammar_qa",
            requestedBy: req.auth!.id,
          });
          await createNotification({
            recipientActor: "staff",
            recipientId: req.auth!.id,
            caseId: caseRow.id as number,
            type: "qa_requested",
            title: `Report QA · ${caseRow.case_number}`,
            body: "Technical report submitted for grammar QA.",
            caseNumber: String(caseRow.case_number),
            caseUrl: `${EMAIL_APP_URL}/portal/cases/${caseRow.public_uuid}`,
          });
        }
        return res.status(201).json({
          report: mapTechnicalReport({
            id: result.insertId,
            public_uuid: publicUuid,
            status,
            version_number: 1,
            investigation_summary: body.investigationSummary?.trim() || null,
            defendant_questionnaire_summary:
              body.defendantQuestionnaireSummary?.trim() || null,
            plaintiff_questionnaire_summary:
              body.plaintiffQuestionnaireSummary?.trim() || null,
            photo_catalog_json: body.photoCatalogJson ?? null,
            conclusions: body.conclusions?.trim() || null,
            submitted_at: submit ? new Date() : null,
            approved_at: null,
            delivered_at: null,
            created_at: new Date(),
          } as RowDataPacket),
        });
      } catch (err) {
        apiLogger.error("technical report create failed", err);
        return res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  app.patch(
    "/api/cases/:publicUuid/technical-reports/:reportUuid/status",
    dbUnavailable,
    requireStaff,
    async (req: AuthedRequest, res: Response) => {
      try {
        const body = req.body as UpdateTechnicalReportStatusRequest;
        const toStatus = body?.status as TechnicalReportStatus;
        if (!toStatus) {
          return res.status(400).json({ error: "status is required" });
        }
        const caseRow = await findStaffAccessibleCase(req, 
          String(req.params.publicUuid),
        );
        if (!caseRow) return res.status(404).json({ error: "Case not found" });
        const db = getPool();
        const [rows] = await db.query<RowDataPacket[]>(
          `SELECT * FROM technical_reports
           WHERE public_uuid = ? AND case_id = ?
           LIMIT 1`,
          [req.params.reportUuid, caseRow.id],
        );
        if (rows.length === 0) {
          return res.status(404).json({ error: "Report not found" });
        }
        const fromStatus = rows[0].status as TechnicalReportStatus;
        if (
          fromStatus === "external_review" &&
          !canStaffApproveExternalReview(req.auth?.role)
        ) {
          return res.status(403).json({
            error:
              "External review outcomes must be submitted by the law firm (admin override only)",
          });
        }
        if (!canMutateCaseSection(req.auth?.role, "reports")) {
          return res.status(403).json({ error: "Insufficient permissions" });
        }
        const check = canTransitionReport(fromStatus, toStatus);
        if (check.ok === false) {
          return res.status(400).json({ error: check.reason });
        }

        if (toStatus === "grammar_qa") {
          const [reportDocRows] = await db.query<RowDataPacket[]>(
            `SELECT d.id FROM documents d
             WHERE d.case_id = ?
               AND d.category = 'technical_report'
               AND d.deleted_at IS NULL
               AND d.status NOT IN ('rejected', 'archived')
             LIMIT 1`,
            [caseRow.id],
          );
          if (reportDocRows.length === 0) {
            return res.status(400).json({
              error: "Technical report PDF required",
            });
          }
        }

        const fromCaseStatus = caseRow.status as CaseStatus;
        let looped: CaseStatus | null = null;
        const conn = await db.getConnection();
        try {
          await conn.beginTransaction();
          await conn.query<ResultSetHeader>(
          `UPDATE technical_reports
           SET status = ?,
               approved_at = ?,
               delivered_at = ?,
               submitted_at = COALESCE(submitted_at, ?)
           WHERE id = ?`,
          [
            toStatus,
            toStatus === "approved" || toStatus === "approved_internal"
              ? new Date()
              : rows[0].approved_at,
            toStatus === "delivered" ? new Date() : rows[0].delivered_at,
            toStatus === "grammar_qa" ? new Date() : null,
            rows[0].id,
          ],
        );

          const leavingStage = reviewStageForReportStatus(fromStatus);
          if (leavingStage) {
            const outcome: ReviewOutcome =
              toStatus === "changes_requested"
                ? "changes_requested"
                : toStatus === "rejected"
                  ? "rejected"
                  : "approved";
            await completePendingReviewsForEntity({
              entityType: "technical_report",
              entityId: rows[0].id as number,
              outcome,
              stage: leavingStage,
              conn,
            });
          }

          looped = await applyArtifactRejectLoop({
            caseRow,
            artifact: "technical_report",
            outcome: toStatus,
            actorId: req.auth!.id,
            conn,
            auditActorType: "staff",
            auditActorId: req.auth!.id,
          });
          await conn.commit();
        } catch (err) {
          await conn.rollback();
          throw err;
        } finally {
          conn.release();
        }

        const enterStage = reviewStageForReportStatus(toStatus);
        if (enterStage) {
          await openReviewRequest({
            caseId: caseRow.id as number,
            entityType: "technical_report",
            entityId: rows[0].id as number,
            stage: enterStage,
            requestedBy: req.auth!.id,
          });
        }

        if (toStatus === "external_review") {
          await runAutomationActions(automationOnReportEnterExternalReview(), {
            caseId: caseRow.id as number,
            lawFirmId:
              caseRow.law_firm_id != null ? Number(caseRow.law_firm_id) : null,
            actorId: req.auth!.id,
            caseNumber: String(caseRow.case_number),
            entityType: "technical_report",
            entityId: rows[0].id as number,
          });
        }

        if (toStatus === "approved") {
          await runAutomationActions(automationOnReportApproved(), {
            caseId: caseRow.id as number,
            lawFirmId:
              caseRow.law_firm_id != null ? Number(caseRow.law_firm_id) : null,
            actorId: req.auth!.id,
            caseNumber: String(caseRow.case_number),
            fallbackRecipientId: req.auth!.id,
          });
        }

        if (looped) {
          await afterArtifactRejectLoop({
            caseRow,
            fromStatus: fromCaseStatus,
            toStatus: looped,
            actorId: req.auth!.id,
            auditActorType: "staff",
          });
        }

        if (toStatus === "approved" || toStatus === "delivered") {
          await createNotification({
            recipientActor: "staff",
            recipientId: req.auth!.id,
            caseId: caseRow.id as number,
            type: "report_approved",
            title: `Report ${toStatus} · ${caseRow.case_number}`,
            body: `Technical report moved to ${toStatus}.`,
            caseNumber: String(caseRow.case_number),
            caseUrl: `${EMAIL_APP_URL}/portal/cases/${caseRow.public_uuid}`,
          });
        }

        if (toStatus === "delivered" && caseRow.law_firm_id) {
          const contacts = await listLawFirmContacts(
            Number(caseRow.law_firm_id),
          );
          for (const contact of contacts) {
            await createNotification({
              recipientActor: "law_firm",
              recipientId: contact.id,
              caseId: caseRow.id as number,
              type: "report_approved",
              title: `Report delivered · ${caseRow.case_number}`,
              body: "A technical report is available in your portal.",
              emailTo: contact.email,
              caseNumber: String(caseRow.case_number),
              caseUrl: `${EMAIL_APP_URL}/portal/cases/${caseRow.public_uuid}`,
              email: buildReportDeliveredEmail({
                locale: contact.locale,
                firstName: contact.firstName,
                caseNumber: String(caseRow.case_number),
                caseTitle: String(caseRow.title || caseRow.case_number),
                caseUrl: `${EMAIL_APP_URL}/portal/cases/${caseRow.public_uuid}`,
                appUrl: EMAIL_APP_URL,
              }),
            });
          }
        }

        const [updated] = await db.query<RowDataPacket[]>(
          `SELECT * FROM technical_reports WHERE id = ? LIMIT 1`,
          [rows[0].id],
        );
        return res.json({ report: mapTechnicalReport(updated[0]) });
      } catch (err) {
        apiLogger.error("technical report status failed", err);
        return res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  app.post(
    "/api/cases/:publicUuid/technical-reports/:reportUuid/review",
    dbUnavailable,
    requireLawFirm,
    async (req: AuthedRequest, res: Response) => {
      try {
        if (!(await assertLawFirmCanMutate(req.auth!, res))) return;
        const lawFirmId = await getLawFirmIdForUser(req.auth!.id);
        if (!lawFirmId) {
          return res.status(403).json({ error: "No law firm linked to user" });
        }
        const body = req.body as ClientReviewReportRequest;
        const caseRow = await findCaseByPublicUuid(
          String(req.params.publicUuid),
        );
        if (!caseRow || Number(caseRow.law_firm_id) !== lawFirmId) {
          return res.status(404).json({ error: "Case not found" });
        }
        const db = getPool();
        const [rows] = await db.query<RowDataPacket[]>(
          `SELECT * FROM technical_reports
           WHERE public_uuid = ? AND case_id = ?
           LIMIT 1`,
          [req.params.reportUuid, caseRow.id],
        );
        if (rows.length === 0) {
          return res.status(404).json({ error: "Report not found" });
        }
        if (rows[0].status !== "external_review") {
          return res
            .status(400)
            .json({ error: "Report is not in external_review" });
        }
        const resolved = resolveReviewCompletion("pending", body?.outcome);
        if (resolved.ok === false) {
          return res.status(400).json({ error: resolved.error });
        }
        const nextStatus = reportStatusFromReview(
          "external_law_firm",
          resolved.nextStatus,
        ) as TechnicalReportStatus | null;
        if (!nextStatus) {
          return res.status(400).json({ error: "Invalid review outcome" });
        }
        const check = canTransitionReport("external_review", nextStatus);
        if (check.ok === false) {
          return res.status(400).json({ error: check.reason });
        }

        const fromStatus = caseRow.status as CaseStatus;
        let looped: CaseStatus | null = null;
        const conn = await db.getConnection();
        try {
          await conn.beginTransaction();
          const [reportUpdate] = await conn.query<ResultSetHeader>(
            `UPDATE technical_reports
             SET status = ?,
                 approved_at = ?
             WHERE id = ? AND status = 'external_review'`,
            [
              nextStatus,
              nextStatus === "approved" ? new Date() : rows[0].approved_at,
              rows[0].id,
            ],
          );
          if (reportUpdate.affectedRows === 0) {
            await conn.rollback();
            return res.status(409).json({
              error: "Report is no longer in external_review",
            });
          }
          await completePendingReviewsForEntity({
            entityType: "technical_report",
            entityId: rows[0].id as number,
            outcome: resolved.nextStatus,
            notes: body.notes?.trim() || null,
            stage: "external_law_firm",
            conn,
          });
          looped = await applyArtifactRejectLoop({
            caseRow,
            artifact: "technical_report",
            outcome: resolved.nextStatus,
            actorId: null,
            reason: body.notes?.trim() || null,
            conn,
            auditActorType: "law_firm",
            auditActorId: req.auth!.id,
          });
          await conn.commit();
        } catch (err) {
          await conn.rollback();
          throw err;
        } finally {
          conn.release();
        }
        if (looped) {
          await afterArtifactRejectLoop({
            caseRow,
            fromStatus,
            toStatus: looped,
            actorId: null,
            auditActorType: "law_firm",
          });
        }

        if (nextStatus === "approved") {
          const staffActor =
            caseRow.assigned_coordinator_id != null
              ? Number(caseRow.assigned_coordinator_id)
              : ((await findStaffIdsByRoles(["admin"]))[0] ?? null);
          if (staffActor != null) {
            await runAutomationActions(automationOnReportApproved(), {
              caseId: caseRow.id as number,
              lawFirmId,
              actorId: staffActor,
              caseNumber: String(caseRow.case_number),
              fallbackRecipientId: staffActor,
            });
          }
        }

        const staffRecipients = await findStaffIdsByRoles(["admin", "legal"]);
        const notifyIds =
          staffRecipients.length > 0
            ? staffRecipients
            : caseRow.assigned_coordinator_id != null
              ? [Number(caseRow.assigned_coordinator_id)]
              : [];
        for (const recipientId of notifyIds) {
          await createNotification({
            recipientActor: "staff",
            recipientId,
            caseId: caseRow.id as number,
            type: "report_approved",
            title: `Client review · ${caseRow.case_number}`,
            body: `Law firm marked report as ${resolved.nextStatus}.`,
            caseNumber: String(caseRow.case_number),
            caseUrl: `${EMAIL_APP_URL}/portal/cases/${caseRow.public_uuid}`,
          });
        }

        const [updated] = await db.query<RowDataPacket[]>(
          `SELECT * FROM technical_reports WHERE id = ? LIMIT 1`,
          [rows[0].id],
        );
        return res.json({ report: mapTechnicalReport(updated[0]) });
      } catch (err) {
        apiLogger.error("law firm report review failed", err);
        return res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  app.get(
    "/api/notifications",
    dbUnavailable,
    requireAuth,
    async (req: AuthedRequest, res: Response) => {
      try {
        const db = getPool();
        const [rows] = await db.query<RowDataPacket[]>(
          `SELECT id, public_uuid, case_id, notification_type, title, body, read_at, created_at
           FROM notifications
           WHERE recipient_actor = ? AND recipient_id = ?
           ORDER BY created_at DESC
           LIMIT 100`,
          [req.auth!.actor, req.auth!.id],
        );
        const notifications: NotificationItem[] = rows.map((n) => ({
          id: n.id as number,
          publicUuid: n.public_uuid as string,
          caseId: (n.case_id as number | null) ?? null,
          notificationType: n.notification_type as NotificationType,
          title: n.title as string,
          body: n.body as string,
          readAt: toIso(n.read_at),
          createdAt: toIso(n.created_at) || new Date().toISOString(),
        }));
        return res.json({
          notifications,
          unreadCount: notifications.filter((n) => !n.readAt).length,
        });
      } catch (err) {
        apiLogger.error("notifications list failed", err);
        return res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  app.post(
    "/api/notifications/:publicUuid/read",
    dbUnavailable,
    requireAuth,
    async (req: AuthedRequest, res: Response) => {
      try {
        const db = getPool();
        await db.query<ResultSetHeader>(
          `UPDATE notifications SET read_at = COALESCE(read_at, NOW())
           WHERE public_uuid = ? AND recipient_actor = ? AND recipient_id = ?`,
          [req.params.publicUuid, req.auth!.actor, req.auth!.id],
        );
        return res.json({ ok: true });
      } catch (err) {
        apiLogger.error("notification read failed", err);
        return res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  app.post(
    "/api/notifications/read-all",
    dbUnavailable,
    requireAuth,
    async (req: AuthedRequest, res: Response) => {
      try {
        const db = getPool();
        await db.query<ResultSetHeader>(
          `UPDATE notifications SET read_at = NOW()
           WHERE recipient_actor = ? AND recipient_id = ? AND read_at IS NULL`,
          [req.auth!.actor, req.auth!.id],
        );
        return res.json({ ok: true });
      } catch (err) {
        apiLogger.error("notifications read-all failed", err);
        return res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  app.get(
    "/api/law-firms",
    dbUnavailable,
    requireAdmin,
    async (_req: AuthedRequest, res: Response) => {
      try {
        const db = getPool();
        const [rows] = await db.query<RowDataPacket[]>(
          `SELECT id, public_uuid, name, email, status, city, state, default_court_name
           FROM law_firms
           WHERE deleted_at IS NULL
           ORDER BY name ASC
           LIMIT 200`,
        );
        const lawFirms: LawFirmSummary[] = rows.map((r) => ({
          id: r.id as number,
          publicUuid: r.public_uuid as string,
          name: r.name as string,
          email: (r.email as string | null) ?? null,
          status: r.status as "active" | "inactive",
          city: (r.city as string | null) ?? null,
          state: (r.state as string | null) ?? null,
          defaultCourtName: (r.default_court_name as string | null) ?? null,
        }));
        return res.json({ lawFirms });
      } catch (err) {
        apiLogger.error("law firms list failed", err);
        return res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  app.post(
    "/api/law-firms",
    dbUnavailable,
    requireAdmin,
    async (req: AuthedRequest, res: Response) => {
      try {
        const body = req.body as CreateLawFirmRequest;
        const validated = validateCreateLawFirmWithOwner({
          name: String(body?.name || ""),
          ownerEmail: String(body?.ownerEmail || ""),
          ownerFirstName: String(body?.ownerFirstName || ""),
          ownerLastName: String(body?.ownerLastName || ""),
        });
        if (validated.ok === false) {
          return res.status(400).json({ error: validated.error });
        }
        const ownerEmail = normalizeLookupEmail(validated.ownerEmail);
        if (!isValidEmail(ownerEmail)) {
          return res.status(400).json({ error: "Invalid owner email" });
        }
        const actorRows = await lookupEmailActorRows(ownerEmail);
        const occupancy = resolveEmailInviteOccupancy({
          intendingActor: "law_firm",
          staff: actorRows.staff,
          lawFirm: actorRows.lawFirm,
        });
        if (occupancy.ok === false) {
          return res.status(409).json({ error: occupancy.error });
        }

        const publicUuid = generatePublicUuid();
        const ownerUuid = generatePublicUuid();
        const db = getPool();
        const defaultCourtName = body.defaultCourtName?.trim() || null;
        const firmEmail = body.email?.trim() || ownerEmail;
        const inviteLocale = resolveInviteLocale(body.preferredLanguage);
        const [result] = await db.query<ResultSetHeader>(
          `INSERT INTO law_firms
             (public_uuid, name, legal_name, email, phone, city, state, default_court_name, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
          [
            publicUuid,
            validated.name,
            body.legalName?.trim() || null,
            firmEmail,
            body.phone?.trim() || null,
            body.city?.trim() || null,
            body.state?.trim() || null,
            defaultCourtName,
          ],
        );
        let ownerId: number;
        if (occupancy.action === "reactivate") {
          ownerId = occupancy.id;
          await db.query<ResultSetHeader>(
            `UPDATE law_firm_users
             SET deleted_at = NULL,
                 first_name = ?,
                 last_name = ?,
                 phone = ?,
                 status = 'invited',
                 preferred_language = ?,
                 updated_at = NOW()
             WHERE id = ?`,
            [
              validated.ownerFirstName,
              validated.ownerLastName,
              body.ownerPhone?.trim() || null,
              inviteLocale,
              ownerId,
            ],
          );
          await db.query<ResultSetHeader>(
            `UPDATE law_firm_members SET deleted_at = NOW()
             WHERE law_firm_user_id = ? AND deleted_at IS NULL`,
            [ownerId],
          );
        } else {
          const [ownerIns] = await db.query<ResultSetHeader>(
            `INSERT INTO law_firm_users
               (public_uuid, email, first_name, last_name, phone, status, preferred_language)
             VALUES (?, ?, ?, ?, ?, 'invited', ?)`,
            [
              ownerUuid,
              ownerEmail,
              validated.ownerFirstName,
              validated.ownerLastName,
              body.ownerPhone?.trim() || null,
              inviteLocale,
            ],
          );
          ownerId = ownerIns.insertId;
        }
        await db.query<ResultSetHeader>(
          `INSERT INTO law_firm_members
             (law_firm_id, law_firm_user_id, member_role, is_primary_contact)
           VALUES (?, ?, 'owner', 1)`,
          [result.insertId, ownerId],
        );

        await safeSendEmail(
          ownerEmail,
          buildInviteClientEmail({
            locale: inviteLocale,
            firstName: validated.ownerFirstName,
            firmName: validated.name,
            appUrl: EMAIL_APP_URL,
          }),
          "invite-client",
        );

        const lawFirm: LawFirmSummary = {
          id: result.insertId,
          publicUuid,
          name: validated.name,
          email: firmEmail,
          status: "active",
          city: body.city?.trim() || null,
          state: body.state?.trim() || null,
          defaultCourtName,
        };
        return res.status(201).json({ lawFirm });
      } catch (err) {
        apiLogger.error("law firm create failed", err);
        return res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  app.get(
    "/api/firm/members",
    dbUnavailable,
    requireLawFirm,
    async (req: AuthedRequest, res: Response) => {
      try {
        const membership = await getLawFirmMembershipForUser(req.auth!.id);
        if (!membership) {
          return res
            .status(403)
            .json({ error: "No despacho membership found" });
        }
        const db = getPool();
        const [firmRows] = await db.query<RowDataPacket[]>(
          `SELECT name FROM law_firms WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
          [membership.lawFirmId],
        );
        const [rows] = await db.query<RowDataPacket[]>(
          `SELECT u.id, u.public_uuid, u.email, u.first_name, u.last_name, u.status,
                  u.last_login_at, m.member_role, m.is_primary_contact
             FROM law_firm_members m
             JOIN law_firm_users u ON u.id = m.law_firm_user_id
            WHERE m.law_firm_id = ?
              AND m.deleted_at IS NULL
              AND u.deleted_at IS NULL
            ORDER BY m.is_primary_contact DESC, u.first_name ASC, u.last_name ASC`,
          [membership.lawFirmId],
        );
        const members: FirmMemberItem[] = rows.map((r) => ({
          id: r.id as number,
          publicUuid: r.public_uuid as string,
          email: r.email as string,
          firstName: r.first_name as string,
          lastName: r.last_name as string,
          memberRole: (isLawFirmMemberRole(String(r.member_role))
            ? String(r.member_role)
            : "member") as FirmMemberItem["memberRole"],
          isPrimaryContact: Boolean(r.is_primary_contact),
          status: r.status as UserStatus,
          lastLoginAt: toIso(r.last_login_at),
        }));
        const response: FirmMembersResponse = {
          members,
          canManage: canManageFirmMembers(membership.memberRole),
          lawFirmId: membership.lawFirmId,
          lawFirmName: firmRows[0]?.name ? String(firmRows[0].name) : null,
        };
        return res.json(response);
      } catch (err) {
        apiLogger.error("firm members list failed", err);
        return res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  app.post(
    "/api/firm/members",
    dbUnavailable,
    requireLawFirm,
    async (req: AuthedRequest, res: Response) => {
      try {
        const membership = await getLawFirmMembershipForUser(req.auth!.id);
        if (!membership || !canManageFirmMembers(membership.memberRole)) {
          return res
            .status(403)
            .json({ error: "Despacho admin access required" });
        }
        const body = req.body as InviteFirmMemberRequest;
        const email = normalizeLookupEmail(String(body?.email || ""));
        const firstName = String(body?.firstName || "").trim();
        const lastName = String(body?.lastName || "").trim();
        if (!email || !firstName || !lastName || !isValidEmail(email)) {
          return res
            .status(400)
            .json({ error: "email, firstName and lastName required" });
        }
        const rawRole = String(body?.memberRole || "member").trim();
        if (!isLawFirmMemberRole(rawRole) || rawRole === "owner") {
          return res.status(400).json({
            error: "memberRole must be admin, member, or viewer",
          });
        }
        const actorRows = await lookupEmailActorRows(email);
        const occupancy = resolveEmailInviteOccupancy({
          intendingActor: "law_firm",
          staff: actorRows.staff,
          lawFirm: actorRows.lawFirm,
        });
        if (occupancy.ok === false) {
          return res.status(409).json({ error: occupancy.error });
        }

        const db = getPool();
        const [firmRows] = await db.query<RowDataPacket[]>(
          `SELECT name FROM law_firms WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
          [membership.lawFirmId],
        );
        const publicUuid = generatePublicUuid();
        const inviteLocale = resolveInviteLocale(body.preferredLanguage);
        let userId: number;
        let userPublicUuid = publicUuid;
        if (occupancy.action === "reactivate") {
          userId = occupancy.id;
          const [existing] = await db.query<RowDataPacket[]>(
            `SELECT public_uuid FROM law_firm_users WHERE id = ? LIMIT 1`,
            [userId],
          );
          userPublicUuid = String(existing[0]?.public_uuid || publicUuid);
          await db.query<ResultSetHeader>(
            `UPDATE law_firm_users
             SET deleted_at = NULL,
                 first_name = ?,
                 last_name = ?,
                 phone = ?,
                 status = 'invited',
                 preferred_language = ?,
                 updated_at = NOW()
             WHERE id = ?`,
            [
              firstName,
              lastName,
              body.phone?.trim() || null,
              inviteLocale,
              userId,
            ],
          );
          await db.query<ResultSetHeader>(
            `UPDATE law_firm_members SET deleted_at = NOW()
             WHERE law_firm_user_id = ?
               AND law_firm_id <> ?
               AND deleted_at IS NULL`,
            [userId, membership.lawFirmId],
          );
          const [memRows] = await db.query<RowDataPacket[]>(
            `SELECT id FROM law_firm_members
             WHERE law_firm_user_id = ? AND law_firm_id = ?
             LIMIT 1`,
            [userId, membership.lawFirmId],
          );
          if (memRows[0]) {
            await db.query<ResultSetHeader>(
              `UPDATE law_firm_members
               SET deleted_at = NULL, member_role = ?, is_primary_contact = 0, updated_at = NOW()
               WHERE id = ?`,
              [rawRole, memRows[0].id],
            );
          } else {
            await db.query<ResultSetHeader>(
              `INSERT INTO law_firm_members
                 (law_firm_id, law_firm_user_id, member_role, is_primary_contact)
               VALUES (?, ?, ?, 0)`,
              [membership.lawFirmId, userId, rawRole],
            );
          }
        } else {
          const [result] = await db.query<ResultSetHeader>(
            `INSERT INTO law_firm_users
               (public_uuid, email, first_name, last_name, phone, status, preferred_language)
             VALUES (?, ?, ?, ?, ?, 'invited', ?)`,
            [
              publicUuid,
              email,
              firstName,
              lastName,
              body.phone?.trim() || null,
              inviteLocale,
            ],
          );
          userId = result.insertId;
          await db.query<ResultSetHeader>(
            `INSERT INTO law_firm_members
               (law_firm_id, law_firm_user_id, member_role, is_primary_contact)
             VALUES (?, ?, ?, 0)`,
            [membership.lawFirmId, userId, rawRole],
          );
        }

        const firmName = firmRows[0]?.name ? String(firmRows[0].name) : null;
        await safeSendEmail(
          email,
          buildInviteClientEmail({
            locale: inviteLocale,
            firstName,
            firmName,
            appUrl: EMAIL_APP_URL,
          }),
          "invite-client",
        );

        const member: FirmMemberItem = {
          id: userId,
          publicUuid: userPublicUuid,
          email,
          firstName,
          lastName,
          memberRole: rawRole,
          isPrimaryContact: false,
          status: "invited",
          lastLoginAt: null,
        };
        return res.status(201).json({ member });
      } catch (err) {
        apiLogger.error("firm member invite failed", err);
        return res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  // Law-firm case APIs share /api/cases* (requireStaffOrLawFirm).
  // Auth identity remains under /api/auth/client/*.

  // ---- Uploads (Vercel Blob) ----

  app.post(
    "/api/blob/client-upload",
    dbUnavailable,
    requireAuth,
    async (req: AuthedRequest, res: Response) => {
      try {
        if (!process.env.BLOB_READ_WRITE_TOKEN) {
          return res.status(503).json({
            error: "BLOB_READ_WRITE_TOKEN not configured",
          });
        }
        const jsonResponse = await handleUpload({
          body: req.body as HandleUploadBody,
          request: req,
          token: process.env.BLOB_READ_WRITE_TOKEN,
          onBeforeGenerateToken: async (pathname, clientPayload) => {
            const parsed = parseDirectUploadClientPayload(clientPayload);
            if (parsed.ok === false) {
              throw new Error(parsed.error);
            }
            const actor = req.auth!.actor;
            if (parsed.value.actor !== actor) {
              throw new Error("Upload actor does not match session");
            }
            if (
              actor === "staff" &&
              !canMutateCaseSection(req.auth?.role, "documents")
            ) {
              throw new Error("Insufficient permissions");
            }
            if (
              !isAllowedDirectUploadPathname(
                pathname,
                actor,
                parsed.value.casePublicUuid,
              )
            ) {
              throw new Error("Blob pathname does not belong to this case");
            }
            if (actor === "staff") {
              const caseRow = await findCaseByPublicUuid(
                parsed.value.casePublicUuid,
              );
              if (!caseRow) throw new Error("Case not found");
            } else {
              const lawFirmId = await getLawFirmIdForUser(req.auth!.id);
              if (!lawFirmId) throw new Error("No law firm linked to user");
              const db = getPool();
              const [rows] = await db.query<RowDataPacket[]>(
                `SELECT id FROM cases
                 WHERE public_uuid = ? AND law_firm_id = ? AND deleted_at IS NULL
                 LIMIT 1`,
                [parsed.value.casePublicUuid, lawFirmId],
              );
              if (rows.length === 0) throw new Error("Case not found");
            }
            return {
              allowedContentTypes: [...DMS_CLIENT_UPLOAD_CONTENT_TYPES],
              maximumSizeInBytes: DMS_MAX_FILE_BYTES,
              addRandomSuffix: true,
              tokenPayload: JSON.stringify({
                casePublicUuid: parsed.value.casePublicUuid,
                actor,
              }),
            };
          },
        });
        return res.json(jsonResponse);
      } catch (err) {
        apiLogger.warn("blob client-upload failed", err);
        const message =
          err instanceof Error ? err.message : "Upload token failed";
        return res.status(400).json({ error: message });
      }
    },
  );

  app.post(
    "/api/uploads",
    dbUnavailable,
    requireStaff,
    async (req: AuthedRequest, res: Response) => {
      try {
        if (!canUploadBlobs(req.auth?.role)) {
          return res.status(403).json({ error: "Insufficient permissions" });
        }
        if (!process.env.BLOB_READ_WRITE_TOKEN) {
          return res.status(503).json({
            error: "BLOB_READ_WRITE_TOKEN not configured",
          });
        }

        const fileName = String(req.body?.fileName || "").trim();
        const contentType = String(req.body?.contentType || "").trim();
        const base64 = String(req.body?.data || "");
        if (!fileName || !base64) {
          return res
            .status(400)
            .json({ error: "fileName and data (base64) are required" });
        }

        const buffer = Buffer.from(base64, "base64");
        if (buffer.length === 0) {
          return res.status(400).json({ error: "Empty file data" });
        }
        if (buffer.length > 15 * 1024 * 1024) {
          return res.status(400).json({ error: "File exceeds 15MB limit" });
        }

        const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
        const pathname = `uploads/${req.auth!.id}/${Date.now()}-${safeName}`;
        const blob = await putPrivateBlob(
          pathname,
          buffer,
          contentType || undefined,
        );

        const response: UploadBlobResponse = {
          url: await signBlobUrlForClient(blob.url),
          pathname: blob.pathname,
          contentType: contentType || null,
          size: buffer.length,
        };
        return res.status(201).json(response);
      } catch (err) {
        apiLogger.error("upload failed", err);
        return res.status(500).json({ error: "Upload failed" });
      }
    },
  );

  return app;
}

const app = createServer();

export { createServer, createSession };
export default app;
