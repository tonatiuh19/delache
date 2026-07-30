import { createHash, randomBytes } from "node:crypto";

/** Normalize email for DB lookups (trim + lowercase) */
export function normalizeLookupEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /.+@.+\..+/.test(email);
}

export function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

/** 6-digit numeric OTP */
export function generateOtpCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function generatePublicUuid(): string {
  // UUID v4-ish without pulling uuid dep
  const bytes = randomBytes(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function otpExpiresAt(ttlMinutes: number): Date {
  return new Date(Date.now() + ttlMinutes * 60 * 1000);
}

export function sessionExpiresAt(ttlDays: number): Date {
  return new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);
}

/** MySQL DATETIME in UTC (TiDB/Cloud sessions use UTC NOW()). */
export function toMysqlDateTimeUtc(date: Date): string {
  return date.toISOString().slice(0, 19).replace("T", " ");
}
