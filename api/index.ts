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
  type ResultSetHeader,
  type RowDataPacket,
} from "mysql2/promise";
import { Resend } from "resend";
import { put } from "@vercel/blob";
import type {
  AssignmentRole,
  AuthActor,
  AuthMeResponse,
  AuthUser,
  CalendarEventItem,
  CaseAssignmentItem,
  CaseDeadlineItem,
  CaseDetail,
  CaseDetailResponse,
  CaseDocumentItem,
  CaseNoteItem,
  CaseNumberSettings,
  CasePriority,
  CaseResponse,
  CasesListResponse,
  CaseStatus,
  CaseStatusHistoryItem,
  CaseSummary,
  CreateAssignmentRequest,
  CreateCalendarEventRequest,
  CreateCaseDocumentRequest,
  CreateCaseNoteRequest,
  CreateCaseRequest,
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
  DemoResponse,
  AppVersionResponse,
  DocumentCategory,
  ExpenseType,
  InspectionItem,
  InviteTeamMemberRequest,
  InvoiceSummary,
  InvoicesListResponse,
  LawFirmSummary,
  LogisticsExpenseItem,
  LogisticsTripItem,
  MeasurementItem,
  NotificationItem,
  NotificationType,
  QuestionnaireItem,
  RequestOtpResponse,
  TeamListResponse,
  TeamMemberItem,
  TechnicalReportItem,
  TechnicalReportStatus,
  UpdateCaseStatusRequest,
  UpdateTechnicalReportStatusRequest,
  UploadBlobResponse,
  UserRole,
  UserStatus,
  VerifyOtpResponse,
} from "../shared/api";
import {
  addBusinessDays,
  computeDeadlineSeverity,
} from "../shared/businessDays";
import { canManageAdmin, canManageFinance } from "../shared/rbac";
import {
  canTransitionReport,
  getAllowedReportStatuses,
} from "../shared/reportWorkflow";
import {
  DEFAULT_LOCALE,
  localeFromAcceptLanguage,
  normalizeLocale,
  type AppLocale,
} from "../shared/i18n";
import {
  generateOtpCode,
  generatePublicUuid,
  isValidEmail,
  normalizeLookupEmail,
  otpExpiresAt,
  sessionExpiresAt,
  sha256,
  toMysqlDateTimeUtc,
} from "../shared/authUtils";
import {
  canTransition,
  getAllowedNextStatuses,
} from "../shared/caseWorkflow";
import {
  isValidCaseNumberFormat,
  renderCaseNumber,
} from "../shared/caseNumber";
import {
  buildPagination,
  parsePageLimit,
  parseSortDir,
  pickSortColumn,
} from "../shared/listQuery";
import { apiLogger } from "../lib/logger";
import {
  buildAssignmentEmail,
  buildCaseStatusEmail,
  buildInviteClientEmail,
  buildInviteStaffEmail,
  buildNewCaseIntakeEmail,
  buildOtpEmail,
  buildReportDeliveredEmail,
  type EmailPayload,
} from "../lib/emails";

// ============================================================================
// CONFIG
// ============================================================================

const JWT_SECRET = process.env.JWT_SECRET || "";
const OTP_TTL_MIN = Number(process.env.OTP_TTL_MINUTES || 10);
const SESSION_TTL_DAYS = Number(process.env.SESSION_TTL_DAYS || 30);
const APP_URL = (
  process.env.VITE_PUBLIC_APP_URL || "http://localhost:8080"
).replace(/\/$/, "");
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
    assignedExpertId: (row.assigned_expert_id as number | null) ?? null,
    inspectionDeadlineAt: toIso(row.inspection_deadline_at),
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
    preferredTheme: (row.preferred_theme as AuthUser["preferredTheme"]) || "system",
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
    preferredTheme: (row.preferred_theme as AuthUser["preferredTheme"]) || "system",
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
       AND consumed_at IS NULL AND expires_at > NOW()
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
     WHERE id = ? AND code_hash = ? AND consumed_at IS NULL AND expires_at > NOW()
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
     WHERE token_hash = ? AND is_active = 1 AND expires_at > NOW()
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
     SET is_active = 0, revoked_at = NOW()
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
    if (!predicate(payload)) {
      return res
        .status(403)
        .json({ error: forbiddenMessage || "Forbidden" });
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

async function getLawFirmIdForUser(
  lawFirmUserId: number,
): Promise<number | null> {
  const db = getPool();
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT law_firm_id FROM law_firm_members
     WHERE law_firm_user_id = ? AND deleted_at IS NULL
     LIMIT 1`,
    [lawFirmUserId],
  );
  return rows[0]?.law_firm_id != null ? Number(rows[0].law_firm_id) : null;
}

async function createNotification(opts: {
  recipientActor: AuthActor;
  recipientId: number;
  caseId?: number | null;
  type?: NotificationType;
  title: string;
  body: string;
}): Promise<void> {
  const db = getPool();
  await db.query<ResultSetHeader>(
    `INSERT INTO notifications
       (public_uuid, recipient_actor, recipient_id, case_id, channel, notification_type, title, body)
     VALUES (?, ?, ?, ?, 'in_app', ?, ?, ?)`,
    [
      generatePublicUuid(),
      opts.recipientActor,
      opts.recipientId,
      opts.caseId ?? null,
      opts.type || "general",
      opts.title,
      opts.body,
    ],
  );
}

function mapTechnicalReport(row: RowDataPacket): TechnicalReportItem {
  const status = row.status as TechnicalReportStatus;
  return {
    id: row.id as number,
    publicUuid: row.public_uuid as string,
    status,
    versionNumber: Number(row.version_number) || 1,
    investigationSummary: (row.investigation_summary as string | null) ?? null,
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
    ? ((row.severity_level as DeadlineSeverity) || "safe")
    : computeDeadlineSeverity(new Date(dueAt));
  return {
    id: row.id as number,
    deadlineType: row.deadline_type as CaseDeadlineItem["deadlineType"],
    title: row.title as string,
    dueAt,
    businessDays:
      row.business_days != null ? Number(row.business_days) : null,
    severityLevel: severity,
    completedAt,
  };
}

async function ensureCourtAcceptanceDeadline(
  caseId: number,
  actorId: number,
): Promise<Date> {
  const db = getPool();
  const due = addBusinessDays(new Date(), 10);
  await db.query<ResultSetHeader>(
    `UPDATE cases
     SET court_acceptance_at = COALESCE(court_acceptance_at, NOW()),
         inspection_deadline_at = ?
     WHERE id = ?`,
    [due, caseId],
  );
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
}): Promise<void> {
  if (!resendClient) {
    apiLogger.info("[email:dev-fallback]", {
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
    });
    return;
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
}

async function safeSendEmail(
  to: string,
  payload: EmailPayload,
  context: string,
): Promise<void> {
  try {
    await sendEmail({ to, ...payload });
  } catch (err) {
    apiLogger.error(`email failed (${context})`, err);
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
export function createServer() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true }));

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

      const db = getPool();
      const [rows] = await db.query<RowDataPacket[]>(
        `SELECT id, email, first_name, preferred_language, status, role, deleted_at
         FROM staff_users
         WHERE LOWER(TRIM(email)) = ?
         LIMIT 1`,
        [email],
      );

      const generic: RequestOtpResponse = {
        ok: true,
        message: "If an account exists, a verification code was sent.",
      };

      if (rows.length === 0 || rows[0].deleted_at) {
        return res.json(generic);
      }

      const user = rows[0];
      if (user.status !== "active" && user.status !== "invited") {
        return res.json(generic);
      }

      const allowed = await getLoginAllowedRoles();
      if (!allowed.has(String(user.role))) {
        return res.json(generic);
      }

      const locale = resolveRequestLocale(
        req,
        user.preferred_language as string,
        req.body?.locale,
      );
      const code = await createOtp(
        "staff",
        user.id as number,
        "login",
        req.ip,
        req.headers["user-agent"] as string | undefined,
      );

      try {
        const emailContent = buildOtpEmail({
          locale,
          firstName: (user.first_name as string) || "Usuario",
          code,
          portal: "staff",
          minutes: OTP_TTL_MIN,
          appUrl: APP_URL,
        });
        await sendEmail({
          to: user.email as string,
          ...emailContent,
        });
      } catch (err) {
        apiLogger.error("OTP email failed", err);
        return res.status(502).json({
          error: "Could not send verification email. Please try again.",
        });
      }

      return res.json(generic);
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
                last_login_at, deleted_at
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
        return res.status(403).json({ error: "Login not allowed for this role" });
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
                phone, avatar_url, preferred_language, preferred_theme, last_login_at
         FROM staff_users
         WHERE id = ? AND deleted_at IS NULL
         LIMIT 1`,
        [req.auth!.id],
      );
      if (rows.length === 0 || rows[0].status !== "active") {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const allowed = await getLoginAllowedRoles();
      if (!allowed.has(String(rows[0].role))) {
        return res.status(403).json({ error: "Login not allowed for this role" });
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

      const db = getPool();
      const [rows] = await db.query<RowDataPacket[]>(
        `SELECT id, email, first_name, preferred_language, status, deleted_at
         FROM law_firm_users
         WHERE LOWER(TRIM(email)) = ?
         LIMIT 1`,
        [email],
      );

      const generic: RequestOtpResponse = {
        ok: true,
        message: "If an account exists, a verification code was sent.",
      };

      if (rows.length === 0 || rows[0].deleted_at) {
        return res.json(generic);
      }

      const user = rows[0];
      if (user.status !== "active" && user.status !== "invited") {
        return res.json(generic);
      }

      const locale = resolveRequestLocale(
        req,
        user.preferred_language as string,
        req.body?.locale,
      );
      const code = await createOtp(
        "law_firm",
        user.id as number,
        "login",
        req.ip,
        req.headers["user-agent"] as string | undefined,
      );

      try {
        const emailContent = buildOtpEmail({
          locale,
          firstName: (user.first_name as string) || "Usuario",
          code,
          portal: "law_firm",
          minutes: OTP_TTL_MIN,
          appUrl: APP_URL,
        });
        await sendEmail({
          to: user.email as string,
          ...emailContent,
        });
      } catch (err) {
        apiLogger.error("client OTP email failed", err);
        return res.status(502).json({
          error: "Could not send verification email. Please try again.",
        });
      }

      return res.json(generic);
    } catch (err) {
      apiLogger.error("client request-otp failed", err);
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
                last_login_at, deleted_at
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

      const user = mapLawFirmUserRow(row);
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
                phone, avatar_url, preferred_language, preferred_theme, last_login_at
         FROM law_firm_users
         WHERE id = ? AND deleted_at IS NULL
         LIMIT 1`,
        [req.auth!.id],
      );
      if (rows.length === 0 || rows[0].status !== "active") {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const response: AuthMeResponse = { user: mapLawFirmUserRow(rows[0]) };
      return res.json(response);
    } catch (err) {
      apiLogger.error("client auth/me failed", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  };

  app.post("/api/auth/staff/request-otp", dbUnavailable, staffRequestOtp);
  app.post("/api/auth/staff/verify-otp", dbUnavailable, staffVerifyOtp);
  app.get("/api/auth/staff/me", dbUnavailable, requireStaff, staffMe);
  app.post("/api/auth/staff/logout", dbUnavailable, authLogout);

  app.post("/api/auth/client/request-otp", dbUnavailable, clientRequestOtp);
  app.post("/api/auth/client/verify-otp", dbUnavailable, clientVerifyOtp);
  app.get("/api/auth/client/me", dbUnavailable, requireLawFirm, clientMe);
  app.post("/api/auth/client/logout", dbUnavailable, authLogout);

  // Legacy aliases → staff auth
  app.post("/api/auth/request-otp", dbUnavailable, staffRequestOtp);
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
    requireStaff,
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
        if (q) {
          where.push(
            `(case_number LIKE ? OR title LIKE ? OR IFNULL(court_name,'') LIKE ? OR IFNULL(property_city,'') LIKE ?)`,
          );
          const like = `%${q}%`;
          params.push(like, like, like, like);
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
                  assigned_expert_id, inspection_deadline_at, created_at, updated_at
           FROM cases
           WHERE ${whereSql}
           ORDER BY ${sortCol} ${sortDir}
           LIMIT ? OFFSET ?`,
          [...params, limit, offset],
        );
        const response: CasesListResponse = {
          cases: rows.map(mapCaseSummary),
          pagination: buildPagination(page, limit, total),
        };
        return res.json(response);
      } catch (err) {
        apiLogger.error("cases list failed", err);
        return res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  app.post(
    "/api/cases",
    dbUnavailable,
    requireStaff,
    async (req: AuthedRequest, res: Response) => {
      try {
        const body = req.body as CreateCaseRequest;
        const title = String(body?.title || "").trim();
        if (!title) {
          return res.status(400).json({ error: "Title is required" });
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

        const caseNumber = await allocateCaseNumber();
        const publicUuid = generatePublicUuid();
        const db = getPool();
        const [result] = await db.query<ResultSetHeader>(
          `INSERT INTO cases (
             public_uuid, case_number, title, description, law_firm_id,
             court_name, external_reference, priority, status,
             plaintiff_name, defendant_name, property_address, property_city,
             property_state, property_postal_code, property_country,
             intake_received_at, created_by
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'intake', ?, ?, ?, ?, ?, ?, ?, NOW(), ?)`,
          [
            publicUuid,
            caseNumber,
            title,
            body.description?.trim() || null,
            body.lawFirmId ?? null,
            body.courtName?.trim() || null,
            body.externalReference?.trim() || null,
            priority,
            body.plaintiffName?.trim() || null,
            body.defendantName?.trim() || null,
            body.propertyAddress?.trim() || null,
            body.propertyCity?.trim() || null,
            body.propertyState?.trim() || null,
            body.propertyPostalCode?.trim() || null,
            body.propertyCountry?.trim() || "MX",
            req.auth!.id,
          ],
        );

        await db.query<ResultSetHeader>(
          `INSERT INTO case_status_history (case_id, from_status, to_status, changed_by, reason)
           VALUES (?, NULL, 'intake', ?, 'Case created')`,
          [result.insertId, req.auth!.id],
        );

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
    requireStaff,
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
                  d.created_at, v.file_name, v.mime_type, v.storage_key, v.file_size_bytes
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
        const [reportRows] = await db.query<RowDataPacket[]>(
          `SELECT id, public_uuid, status, version_number, investigation_summary, conclusions,
                  submitted_at, approved_at, delivered_at, created_at
           FROM technical_reports
           WHERE case_id = ?
           ORDER BY created_at DESC
           LIMIT 20`,
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
        const documents: CaseDocumentItem[] = docRows.map((d) => ({
          id: d.id as number,
          publicUuid: d.public_uuid as string,
          category: d.category as DocumentCategory,
          title: d.title as string,
          status: d.status as string,
          currentVersion: Number(d.current_version) || 1,
          fileName: (d.file_name as string | null) ?? null,
          mimeType: (d.mime_type as string | null) ?? null,
          storageKey: (d.storage_key as string | null) ?? null,
          fileSizeBytes:
            d.file_size_bytes != null ? Number(d.file_size_bytes) : null,
          createdAt: toIso(d.created_at) || new Date().toISOString(),
        }));
        const questionnaires: QuestionnaireItem[] = questionnaireRows.map(
          (q) => ({
            id: q.id as number,
            publicUuid: q.public_uuid as string,
            status: q.status as QuestionnaireItem["status"],
            contentJson: (q.content_json as Record<string, unknown> | null) ?? null,
            chronologyJson:
              (q.chronology_json as Record<string, unknown> | null) ?? null,
            technicalObservations:
              (q.technical_observations as string | null) ?? null,
            submittedAt: toIso(q.submitted_at),
            createdAt: toIso(q.created_at) || new Date().toISOString(),
          }),
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
          measurementType: m.measurement_type as MeasurementItem["measurementType"],
          valueNumeric: Number(m.value_numeric) || 0,
          unit: m.unit as MeasurementItem["unit"],
          poleId: (m.pole_id as string | null) ?? null,
          notes: (m.notes as string | null) ?? null,
          recordedAt: toIso(m.recorded_at) || new Date().toISOString(),
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

        const response: CaseDetailResponse = {
          case: mapCaseDetail(caseRow),
          history,
          notes,
          documents,
          assignments: assignmentRows.map(mapAssignment),
          deadlines: deadlineRows.map(mapDeadline),
          questionnaires,
          inspections,
          measurements,
          trips,
          expenses: expenseRows.map(mapExpense),
          technicalReports: reportRows.map(mapTechnicalReport),
          allowedNextStatuses: getAllowedNextStatuses(status),
        };
        return res.json(response);
      } catch (err) {
        apiLogger.error("cases get failed", err);
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
        const check = canTransition(fromStatus, toStatus);
        if (check.ok === false) {
          return res.status(400).json({ error: check.reason });
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

        if (toStatus === "court_acceptance") {
          await ensureCourtAcceptanceDeadline(rows[0].id as number, req.auth!.id);
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
              type: "general",
              title: `${rows[0].case_number}: ${toStatus}`,
              body: `Status updated from ${fromStatus} to ${toStatus}.`,
            });
            await safeSendEmail(
              contact.email,
              buildCaseStatusEmail({
                locale: contact.locale,
                firstName: contact.firstName,
                caseNumber: String(rows[0].case_number),
                caseTitle: String(rows[0].title || rows[0].case_number),
                fromStatus: String(fromStatus),
                toStatus: String(toStatus),
                caseUrl: `${APP_URL}/client/cases/${rows[0].public_uuid}`,
                appUrl: APP_URL,
              }),
              "case-status",
            );
          }
        }

        const [updated] = await db.query<RowDataPacket[]>(
          `SELECT * FROM cases WHERE id = ? LIMIT 1`,
          [rows[0].id],
        );
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
    requireStaff,
    async (req: AuthedRequest, res: Response) => {
      try {
        if (!process.env.BLOB_READ_WRITE_TOKEN) {
          return res.status(503).json({
            error: "BLOB_READ_WRITE_TOKEN not configured",
          });
        }
        const body = req.body as CreateCaseDocumentRequest;
        const title = String(body?.title || "").trim();
        const fileName = String(body?.fileName || "").trim();
        const base64 = String(body?.data || "");
        const category = (body.category || "other") as DocumentCategory;
        if (!title || !fileName || !base64) {
          return res
            .status(400)
            .json({ error: "title, fileName and data are required" });
        }

        const db = getPool();
        const [rows] = await db.query<RowDataPacket[]>(
          `SELECT id FROM cases WHERE public_uuid = ? AND deleted_at IS NULL LIMIT 1`,
          [req.params.publicUuid],
        );
        if (rows.length === 0) {
          return res.status(404).json({ error: "Case not found" });
        }

        const buffer = Buffer.from(base64, "base64");
        if (buffer.length === 0 || buffer.length > 15 * 1024 * 1024) {
          return res.status(400).json({ error: "Invalid file size" });
        }

        const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
        const pathname = `cases/${rows[0].id}/${Date.now()}-${safeName}`;
        const blob = await put(pathname, buffer, {
          access: "public",
          contentType: body.contentType || undefined,
          token: process.env.BLOB_READ_WRITE_TOKEN,
        });

        const docUuid = generatePublicUuid();
        const [docResult] = await db.query<ResultSetHeader>(
          `INSERT INTO documents
             (public_uuid, case_id, category, title, current_version, status, uploaded_by)
           VALUES (?, ?, ?, ?, 1, 'uploaded', ?)`,
          [docUuid, rows[0].id, category, title, req.auth!.id],
        );
        await db.query<ResultSetHeader>(
          `INSERT INTO document_versions
             (document_id, version_number, storage_key, file_name, mime_type, file_size_bytes, uploaded_by)
           VALUES (?, 1, ?, ?, ?, ?, ?)`,
          [
            docResult.insertId,
            blob.url,
            fileName,
            body.contentType || "application/octet-stream",
            buffer.length,
            req.auth!.id,
          ],
        );

        const document: CaseDocumentItem = {
          id: docResult.insertId,
          publicUuid: docUuid,
          category,
          title,
          status: "uploaded",
          currentVersion: 1,
          fileName,
          mimeType: body.contentType || null,
          storageKey: blob.url,
          fileSizeBytes: buffer.length,
          createdAt: new Date().toISOString(),
        };
        return res.status(201).json({ document });
      } catch (err) {
        apiLogger.error("cases documents create failed", err);
        return res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  app.get(
    "/api/dashboard/stats",
    dbUnavailable,
    requireStaff,
    async (_req: AuthedRequest, res: Response) => {
      try {
        const db = getPool();
        const [rows] = await db.query<RowDataPacket[]>(
          `SELECT status, priority, COUNT(*) AS cnt
           FROM cases
           WHERE deleted_at IS NULL
           GROUP BY status, priority`,
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
        const response: DashboardStatsResponse = {
          totalCases,
          byStatus,
          urgentOpen,
          completed,
          onHold,
        };
        return res.json(response);
      } catch (err) {
        apiLogger.error("dashboard stats failed", err);
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
        const [rows] = hasRange
          ? await db.query<RowDataPacket[]>(
              `SELECT id, public_uuid, case_id, event_type, title, starts_at, ends_at, location
               FROM calendar_events
               WHERE starts_at >= ? AND starts_at <= ?
               ORDER BY starts_at ASC
               LIMIT 500`,
              [fromDate!.toISOString(), toDate!.toISOString()],
            )
          : await db.query<RowDataPacket[]>(
              `SELECT id, public_uuid, case_id, event_type, title, starts_at, ends_at, location
               FROM calendar_events
               WHERE starts_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 60 DAY)
                 AND starts_at <= DATE_ADD(UTC_TIMESTAMP(), INTERVAL 180 DAY)
               ORDER BY starts_at ASC
               LIMIT 500`,
            );
        const events: CalendarEventItem[] = rows.map((r) => ({
          id: r.id as number,
          publicUuid: r.public_uuid as string,
          caseId: (r.case_id as number | null) ?? null,
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
          where.push(`(invoice_number LIKE ? OR CAST(total_amount AS CHAR) LIKE ?)`);
          const like = `%${q}%`;
          params.push(like, like);
        }
        if (status) {
          where.push("status = ?");
          params.push(status);
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
        const sortDir = parseSortDir(req.query.sortDir);
        const where: string[] = ["deleted_at IS NULL"];
        const params: unknown[] = [];
        if (q) {
          where.push(
            `(email LIKE ? OR first_name LIKE ? OR last_name LIKE ?)`,
          );
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
        const db = getPool();
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
        const email = normalizeLookupEmail(String(body?.email || ""));
        const firstName = String(body?.firstName || "").trim();
        const lastName = String(body?.lastName || "").trim();
        const role = body?.role as UserRole | "law_firm_user";
        const staffRoles: UserRole[] = [
          "admin",
          "case_coordinator",
          "expert",
          "legal",
          "logistics",
          "accountant",
        ];
        const validRole =
          role === "law_firm_user" || staffRoles.includes(role as UserRole);
        if (!isValidEmail(email) || !firstName || !lastName || !validRole) {
          return res
            .status(400)
            .json({ error: "email, firstName, lastName and role required" });
        }
        const db = getPool();
        const publicUuid = generatePublicUuid();

        if (role === "law_firm_user") {
          if (!body.lawFirmId) {
            return res
              .status(400)
              .json({ error: "lawFirmId required for law firm users" });
          }
          const [existing] = await db.query<RowDataPacket[]>(
            `SELECT id FROM law_firm_users WHERE email = ? LIMIT 1`,
            [email],
          );
          if (existing.length > 0) {
            return res.status(409).json({ error: "Email already registered" });
          }
          const [result] = await db.query<ResultSetHeader>(
            `INSERT INTO law_firm_users
               (public_uuid, email, first_name, last_name, phone, status, preferred_language)
             VALUES (?, ?, ?, ?, ?, 'invited', 'es')`,
            [
              publicUuid,
              email,
              firstName,
              lastName,
              body.phone?.trim() || null,
            ],
          );
          await db.query<ResultSetHeader>(
            `INSERT INTO law_firm_members (law_firm_id, law_firm_user_id, member_role)
             VALUES (?, ?, 'member')`,
            [body.lawFirmId, result.insertId],
          );

          let firmName: string | null = null;
          const [firms] = await db.query<RowDataPacket[]>(
            `SELECT name FROM law_firms WHERE id = ? LIMIT 1`,
            [body.lawFirmId],
          );
          firmName = firms[0]?.name ? String(firms[0].name) : null;

          await safeSendEmail(
            email,
            buildInviteClientEmail({
              locale: "es",
              firstName,
              firmName,
              appUrl: APP_URL,
            }),
            "invite-client",
          );

          return res.status(201).json({
            member: {
              id: result.insertId,
              publicUuid,
              email,
              firstName,
              lastName,
              role: "law_firm_user",
              status: "invited" as UserStatus,
              lastLoginAt: null,
            },
          });
        }

        const [existing] = await db.query<RowDataPacket[]>(
          `SELECT id FROM staff_users WHERE email = ? LIMIT 1`,
          [email],
        );
        if (existing.length > 0) {
          return res.status(409).json({ error: "Email already registered" });
        }
        const [result] = await db.query<ResultSetHeader>(
          `INSERT INTO staff_users
             (public_uuid, email, first_name, last_name, phone, role, status, preferred_language)
           VALUES (?, ?, ?, ?, ?, ?, 'invited', 'es')`,
          [
            publicUuid,
            email,
            firstName,
            lastName,
            body.phone?.trim() || null,
            role,
          ],
        );

        await safeSendEmail(
          email,
          buildInviteStaffEmail({
            locale: "es",
            firstName,
            roleLabel: String(role),
            appUrl: APP_URL,
          }),
          "invite-staff",
        );

        const member: TeamMemberItem = {
          id: result.insertId,
          publicUuid,
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

  // ---- Case assignments ----

  app.post(
    "/api/cases/:publicUuid/assignments",
    dbUnavailable,
    requireStaff,
    async (req: AuthedRequest, res: Response) => {
      try {
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
          return res.status(400).json({ error: "userId and assignmentRole required" });
        }
        const caseRow = await findCaseByPublicUuid(String(req.params.publicUuid));
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
            [isPrimary ? 1 : 0, req.auth!.id, body.notes?.trim() || null, existing[0].id],
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

        await createNotification({
          recipientActor: "staff",
          recipientId: userId,
          caseId: caseRow.id as number,
          type: "new_assignment",
          title: `Assigned to ${caseRow.case_number}`,
          body: `You were assigned as ${role} on case ${caseRow.case_number}.`,
        });

        const assignee = await getActorContact("staff", userId);
        if (assignee) {
          await safeSendEmail(
            assignee.email,
            buildAssignmentEmail({
              locale: assignee.locale,
              firstName: assignee.firstName,
              caseNumber: String(caseRow.case_number),
              caseTitle: String(caseRow.title || caseRow.case_number),
              roleLabel: String(role),
              caseUrl: `${APP_URL}/portal/cases/${caseRow.public_uuid}`,
              appUrl: APP_URL,
            }),
            "assignment",
          );
        }

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

  app.delete(
    "/api/cases/:publicUuid/assignments/:assignmentId",
    dbUnavailable,
    requireStaff,
    async (req: AuthedRequest, res: Response) => {
      try {
        const caseRow = await findCaseByPublicUuid(String(req.params.publicUuid));
        if (!caseRow) return res.status(404).json({ error: "Case not found" });
        const db = getPool();
        const [result] = await db.query<ResultSetHeader>(
          `UPDATE case_assignments
           SET unassigned_at = NOW()
           WHERE id = ? AND case_id = ? AND unassigned_at IS NULL`,
          [Number(req.params.assignmentId), caseRow.id],
        );
        if (result.affectedRows === 0) {
          return res.status(404).json({ error: "Assignment not found" });
        }
        return res.json({ ok: true });
      } catch (err) {
        apiLogger.error("assignment delete failed", err);
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
        const body = req.body as CreateQuestionnaireRequest;
        const caseRow = await findCaseByPublicUuid(String(req.params.publicUuid));
        if (!caseRow) return res.status(404).json({ error: "Case not found" });
        const submit = Boolean(body.submit);
        const publicUuid = generatePublicUuid();
        const db = getPool();
        const [result] = await db.query<ResultSetHeader>(
          `INSERT INTO questionnaires
             (public_uuid, case_id, status, content_json, chronology_json,
              technical_observations, prepared_by, submitted_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            publicUuid,
            caseRow.id,
            submit ? "submitted" : "draft",
            body.contentJson ? JSON.stringify(body.contentJson) : null,
            body.chronologyJson ? JSON.stringify(body.chronologyJson) : null,
            body.technicalObservations?.trim() || null,
            req.auth!.id,
            submit ? new Date() : null,
          ],
        );
        const item: QuestionnaireItem = {
          id: result.insertId,
          publicUuid,
          status: submit ? "submitted" : "draft",
          contentJson: body.contentJson || null,
          chronologyJson: body.chronologyJson || null,
          technicalObservations: body.technicalObservations?.trim() || null,
          submittedAt: submit ? new Date().toISOString() : null,
          createdAt: new Date().toISOString(),
        };
        return res.status(201).json({ questionnaire: item });
      } catch (err) {
        apiLogger.error("questionnaire create failed", err);
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
        const body = req.body as CreateInspectionRequest;
        const caseRow = await findCaseByPublicUuid(String(req.params.publicUuid));
        if (!caseRow) return res.status(404).json({ error: "Case not found" });
        const publicUuid = generatePublicUuid();
        const scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
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
        return res.status(201).json({ inspection: item });
      } catch (err) {
        apiLogger.error("inspection create failed", err);
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
        const caseRow = await findCaseByPublicUuid(String(req.params.publicUuid));
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

  // ---- Logistics ----

  app.post(
    "/api/cases/:publicUuid/trips",
    dbUnavailable,
    requireStaff,
    async (req: AuthedRequest, res: Response) => {
      try {
        const body = req.body as CreateLogisticsTripRequest;
        const caseRow = await findCaseByPublicUuid(String(req.params.publicUuid));
        if (!caseRow) return res.status(404).json({ error: "Case not found" });
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
          returnAt: body.returnAt ? new Date(body.returnAt).toISOString() : null,
          originCity: body.originCity?.trim() || null,
          destinationCity: body.destinationCity?.trim() || null,
          notes: body.notes?.trim() || null,
        };
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
        if (!tripId || !Number.isFinite(amount) || !types.includes(body.expenseType)) {
          return res
            .status(400)
            .json({ error: "tripId, expenseType and amount required" });
        }
        const caseRow = await findCaseByPublicUuid(String(req.params.publicUuid));
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
        const body = req.body as CreateTechnicalReportRequest;
        const caseRow = await findCaseByPublicUuid(String(req.params.publicUuid));
        if (!caseRow) return res.status(404).json({ error: "Case not found" });
        const submit = Boolean(body.submit);
        const publicUuid = generatePublicUuid();
        const status: TechnicalReportStatus = submit ? "grammar_qa" : "draft";
        const db = getPool();
        const [result] = await db.query<ResultSetHeader>(
          `INSERT INTO technical_reports
             (public_uuid, case_id, status, version_number, investigation_summary,
              conclusions, authored_by, submitted_at)
           VALUES (?, ?, ?, 1, ?, ?, ?, ?)`,
          [
            publicUuid,
            caseRow.id,
            status,
            body.investigationSummary?.trim() || null,
            body.conclusions?.trim() || null,
            req.auth!.id,
            submit ? new Date() : null,
          ],
        );
        if (submit) {
          await createNotification({
            recipientActor: "staff",
            recipientId: req.auth!.id,
            caseId: caseRow.id as number,
            type: "qa_requested",
            title: `Report QA · ${caseRow.case_number}`,
            body: "Technical report submitted for grammar QA.",
          });
        }
        return res.status(201).json({
          report: mapTechnicalReport({
            id: result.insertId,
            public_uuid: publicUuid,
            status,
            version_number: 1,
            investigation_summary: body.investigationSummary?.trim() || null,
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
        const caseRow = await findCaseByPublicUuid(String(req.params.publicUuid));
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
        const check = canTransitionReport(fromStatus, toStatus);
        if (check.ok === false) {
          return res.status(400).json({ error: check.reason });
        }
        await db.query<ResultSetHeader>(
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
        if (toStatus === "approved" || toStatus === "delivered") {
          await createNotification({
            recipientActor: "staff",
            recipientId: req.auth!.id,
            caseId: caseRow.id as number,
            type: "report_approved",
            title: `Report ${toStatus} · ${caseRow.case_number}`,
            body: `Technical report moved to ${toStatus}.`,
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
            });
            await safeSendEmail(
              contact.email,
              buildReportDeliveredEmail({
                locale: contact.locale,
                firstName: contact.firstName,
                caseNumber: String(caseRow.case_number),
                caseTitle: String(caseRow.title || caseRow.case_number),
                caseUrl: `${APP_URL}/client/cases/${caseRow.public_uuid}`,
                appUrl: APP_URL,
              }),
              "report-delivered",
            );
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
          `SELECT id, public_uuid, name, email, status, city, state
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
        const name = String(body?.name || "").trim();
        if (!name) return res.status(400).json({ error: "name is required" });
        const publicUuid = generatePublicUuid();
        const db = getPool();
        const [result] = await db.query<ResultSetHeader>(
          `INSERT INTO law_firms
             (public_uuid, name, legal_name, email, phone, city, state, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`,
          [
            publicUuid,
            name,
            body.legalName?.trim() || null,
            body.email?.trim() || null,
            body.phone?.trim() || null,
            body.city?.trim() || null,
            body.state?.trim() || null,
          ],
        );
        const lawFirm: LawFirmSummary = {
          id: result.insertId,
          publicUuid,
          name,
          email: body.email?.trim() || null,
          status: "active",
          city: body.city?.trim() || null,
          state: body.state?.trim() || null,
        };
        return res.status(201).json({ lawFirm });
      } catch (err) {
        apiLogger.error("law firm create failed", err);
        return res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  // Client (law firm) portal
  app.get(
    "/api/client/cases",
    dbUnavailable,
    requireLawFirm,
    async (req: AuthedRequest, res: Response) => {
      try {
        const lawFirmId = await getLawFirmIdForUser(req.auth!.id);
        if (!lawFirmId) {
          return res.status(403).json({ error: "No law firm linked to user" });
        }
        const db = getPool();
        const [rows] = await db.query<RowDataPacket[]>(
          `SELECT id, public_uuid, case_number, title, status, priority,
                  court_name, property_city, property_state, law_firm_id,
                  assigned_expert_id, inspection_deadline_at, created_at, updated_at
           FROM cases
           WHERE law_firm_id = ? AND deleted_at IS NULL
           ORDER BY created_at DESC
           LIMIT 200`,
          [lawFirmId],
        );
        return res.json({ cases: rows.map(mapCaseSummary) });
      } catch (err) {
        apiLogger.error("client cases list failed", err);
        return res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  app.post(
    "/api/client/cases",
    dbUnavailable,
    requireLawFirm,
    async (req: AuthedRequest, res: Response) => {
      try {
        const lawFirmId = await getLawFirmIdForUser(req.auth!.id);
        if (!lawFirmId) {
          return res.status(403).json({ error: "No law firm linked to user" });
        }
        const body = req.body as CreateCaseRequest;
        const title = String(body?.title || "").trim();
        if (!title) {
          return res.status(400).json({ error: "Title is required" });
        }
        const caseNumber = await allocateCaseNumber();
        const publicUuid = generatePublicUuid();
        const db = getPool();
        const [result] = await db.query<ResultSetHeader>(
          `INSERT INTO cases (
             public_uuid, case_number, title, description, law_firm_id,
             court_name, external_reference, priority, status,
             plaintiff_name, defendant_name, property_address, property_city,
             property_state, property_postal_code, property_country,
             intake_received_at, created_by
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'intake', ?, ?, ?, ?, ?, ?, ?, NOW(), ?)`,
          [
            publicUuid,
            caseNumber,
            title,
            body.description?.trim() || null,
            lawFirmId,
            body.courtName?.trim() || null,
            body.externalReference?.trim() || null,
            body.priority || "normal",
            body.plaintiffName?.trim() || null,
            body.defendantName?.trim() || null,
            body.propertyAddress?.trim() || null,
            body.propertyCity?.trim() || null,
            body.propertyState?.trim() || null,
            body.propertyPostalCode?.trim() || null,
            body.propertyCountry?.trim() || "MX",
            null,
          ],
        );
        await db.query<ResultSetHeader>(
          `INSERT INTO case_status_history (case_id, from_status, to_status, changed_by, reason)
           VALUES (?, NULL, 'intake', NULL, 'Submitted by law firm')`,
          [result.insertId],
        );
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
          });
          await safeSendEmail(
            String(admin.email),
            buildNewCaseIntakeEmail({
              locale: normalizeLocale(admin.preferred_language as string),
              firstName: String(admin.first_name || "Admin"),
              caseNumber,
              caseTitle: title,
              caseUrl: `${APP_URL}/portal/cases/${publicUuid}`,
              appUrl: APP_URL,
            }),
            "new-case-intake",
          );
        }
        const [rows] = await db.query<RowDataPacket[]>(
          `SELECT * FROM cases WHERE id = ? LIMIT 1`,
          [result.insertId],
        );
        return res.status(201).json({ case: mapCaseDetail(rows[0]) });
      } catch (err) {
        apiLogger.error("client case create failed", err);
        return res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  app.get(
    "/api/client/cases/:publicUuid",
    dbUnavailable,
    requireLawFirm,
    async (req: AuthedRequest, res: Response) => {
      try {
        const lawFirmId = await getLawFirmIdForUser(req.auth!.id);
        if (!lawFirmId) {
          return res.status(403).json({ error: "No law firm linked to user" });
        }
        const db = getPool();
        const [rows] = await db.query<RowDataPacket[]>(
          `SELECT * FROM cases
           WHERE public_uuid = ? AND law_firm_id = ? AND deleted_at IS NULL
           LIMIT 1`,
          [req.params.publicUuid, lawFirmId],
        );
        if (rows.length === 0) {
          return res.status(404).json({ error: "Case not found" });
        }
        const caseId = rows[0].id as number;
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
                  d.created_at, v.file_name, v.mime_type, v.storage_key, v.file_size_bytes
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
        return res.json({
          case: mapCaseDetail(rows[0]),
          notes: noteRows.map((n) => ({
            id: n.id as number,
            body: n.body as string,
            visibility: n.visibility as CaseNoteItem["visibility"],
            authorId: (n.author_id as number | null) ?? null,
            createdAt: toIso(n.created_at) || new Date().toISOString(),
          })),
          documents: docRows.map((d) => ({
            id: d.id as number,
            publicUuid: d.public_uuid as string,
            category: d.category as DocumentCategory,
            title: d.title as string,
            status: d.status as string,
            currentVersion: Number(d.current_version) || 1,
            fileName: (d.file_name as string | null) ?? null,
            mimeType: (d.mime_type as string | null) ?? null,
            storageKey: (d.storage_key as string | null) ?? null,
            fileSizeBytes:
              d.file_size_bytes != null ? Number(d.file_size_bytes) : null,
            createdAt: toIso(d.created_at) || new Date().toISOString(),
          })),
          technicalReports: reportRows.map(mapTechnicalReport),
        });
      } catch (err) {
        apiLogger.error("client case get failed", err);
        return res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  app.post(
    "/api/client/cases/:publicUuid/documents",
    dbUnavailable,
    requireLawFirm,
    async (req: AuthedRequest, res: Response) => {
      try {
        if (!process.env.BLOB_READ_WRITE_TOKEN) {
          return res.status(503).json({
            error: "BLOB_READ_WRITE_TOKEN not configured",
          });
        }
        const lawFirmId = await getLawFirmIdForUser(req.auth!.id);
        if (!lawFirmId) {
          return res.status(403).json({ error: "No law firm linked to user" });
        }
        const body = req.body as CreateCaseDocumentRequest;
        const title = String(body?.title || "").trim();
        const fileName = String(body?.fileName || "").trim();
        const base64 = String(body?.data || "");
        const category = (body.category || "other") as DocumentCategory;
        if (!title || !fileName || !base64) {
          return res
            .status(400)
            .json({ error: "title, fileName and data are required" });
        }
        const db = getPool();
        const [rows] = await db.query<RowDataPacket[]>(
          `SELECT id FROM cases
           WHERE public_uuid = ? AND law_firm_id = ? AND deleted_at IS NULL
           LIMIT 1`,
          [req.params.publicUuid, lawFirmId],
        );
        if (rows.length === 0) {
          return res.status(404).json({ error: "Case not found" });
        }
        const buffer = Buffer.from(base64, "base64");
        if (buffer.length === 0 || buffer.length > 15 * 1024 * 1024) {
          return res.status(400).json({ error: "Invalid file size" });
        }
        const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
        const pathname = `client-cases/${rows[0].id}/${Date.now()}-${safeName}`;
        const blob = await put(pathname, buffer, {
          access: "public",
          contentType: body.contentType || undefined,
          token: process.env.BLOB_READ_WRITE_TOKEN,
        });
        const docUuid = generatePublicUuid();
        const [docResult] = await db.query<ResultSetHeader>(
          `INSERT INTO documents
             (public_uuid, case_id, category, title, current_version, status,
              uploaded_by, uploaded_by_law_firm_user_id)
           VALUES (?, ?, ?, ?, 1, 'uploaded', NULL, ?)`,
          [docUuid, rows[0].id, category, title, req.auth!.id],
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
            storageKey: blob.url,
            fileSizeBytes: buffer.length,
            createdAt: new Date().toISOString(),
          } satisfies CaseDocumentItem,
        });
      } catch (err) {
        apiLogger.error("client document upload failed", err);
        return res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  // ---- Uploads (Vercel Blob) ----

  app.post(
    "/api/uploads",
    dbUnavailable,
    requireStaff,
    async (req: AuthedRequest, res: Response) => {
      try {
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
        const blob = await put(pathname, buffer, {
          access: "public",
          contentType: contentType || undefined,
          token: process.env.BLOB_READ_WRITE_TOKEN,
        });

        const response: UploadBlobResponse = {
          url: blob.url,
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

export default app;
