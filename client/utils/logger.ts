type LogLevel = "debug" | "info" | "warn" | "error";

const PREFIX = "[DELACHE]";

function formatArgs(level: LogLevel, args: unknown[]): unknown[] {
  const stamp = new Date().toISOString();
  return [`${PREFIX} ${stamp} ${level.toUpperCase()}:`, ...args];
}

export const logger = {
  debug: (...args: unknown[]) => {
    if (import.meta.env.DEV) {
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
