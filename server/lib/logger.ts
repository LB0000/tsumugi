type LogLevel = 'info' | 'warn' | 'error';

interface LogMeta {
  requestId?: string;
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  requestId?: string;
  [key: string]: unknown;
}

function buildEntry(level: LogLevel, message: string, meta?: LogMeta): LogEntry {
  const { requestId, ...rest } = meta ?? {};
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(requestId !== undefined && { requestId }),
    ...rest,
  };
  return entry;
}

function info(message: string, meta?: LogMeta): void {
  console.log(JSON.stringify(buildEntry('info', message, meta)));
}

function warn(message: string, meta?: LogMeta): void {
  console.warn(JSON.stringify(buildEntry('warn', message, meta)));
}

function error(message: string, meta?: LogMeta): void {
  console.error(JSON.stringify(buildEntry('error', message, meta)));
}

export const logger = { info, warn, error };
