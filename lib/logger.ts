type LogLevel = "debug" | "info" | "warn" | "error";

const PREFIX = "[DELACHE:api]";

function formatArgs(level: LogLevel, args: unknown[]): unknown[] {
  const stamp = new Date().toISOString();
  return [`${PREFIX} ${stamp} ${level.toUpperCase()}:`, ...args];
}

/** Server-side logger (api / Node). Do not import client/utils/logger here. */
export const apiLogger = {
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
