/**
 * Structured logger for TGClinic
 * Replaces console.log/debug/warn with module-tagged logging for pinpoint debugging.
 * @crossref:used-in[all modules]
 *
 * Usage:
 *   import { logger } from '@/lib/logger';
 *   logger.info('CustomerForm', 'Form submitted', { customerId: '123' });
 *   logger.error('PaymentForm', 'Payment failed', error);
 */

type LogLevel = 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  module: string;
  message: string;
  data?: unknown;
}

const LOG_LEVEL_COLORS: Record<LogLevel, string> = {
  info: '\x1b[34m',
  warn: '\x1b[33m',
  error: '\x1b[31m',
};

const RESET = '\x1b[0m';

function formatEntry(entry: LogEntry): string {
  const color = LOG_LEVEL_COLORS[entry.level];
  const levelLabel = entry.level.toUpperCase().padEnd(5);
  const dataStr = entry.data
    ? typeof entry.data === 'object'
      ? JSON.stringify(entry.data, null, 2)
      : String(entry.data)
    : '';

  return `${color}[${levelLabel}]${RESET} ${entry.module}: ${entry.message}${dataStr ? `\n${dataStr}` : ''}`;
}

function log(level: LogLevel, module: string, message: string, data?: unknown) {
  // Skip info in production unless explicitly enabled
  if (import.meta.env.PROD && level === 'info' && !import.meta.env.VITE_ENABLE_DEBUG_LOG) {
    return;
  }

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    module,
    message,
    data,
  };

  if (level === 'error') {
    console.error(formatEntry(entry));
  } else if (level === 'warn') {
    console.warn(formatEntry(entry));
  } else {
    console.log(formatEntry(entry));
  }

  // In production, also send to error tracking service (future)
  if (import.meta.env.PROD && level === 'error') {
    // TODO: Integrate with Sentry or similar
  }
}

export const logger = {
  info: (module: string, message: string, data?: unknown) => log('info', module, message, data),
  warn: (module: string, message: string, data?: unknown) => log('warn', module, message, data),
  error: (module: string, message: string, error?: unknown) => log('error', module, message, error),
};
