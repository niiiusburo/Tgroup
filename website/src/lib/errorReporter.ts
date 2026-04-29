/**
 * ErrorReporter — sends errors from frontend to backend telemetry for AutoDebugger
 * @crossref:used-in[ErrorBoundary, logger, api/core, main.tsx]
 *
 * This is the client-side half of the AutoDebugger pipeline.
 * It captures all errors (React, API, global) and ships them to the backend,
 * where they're deduplicated and made available to the auto-fixer agent.
 */

const TELEMETRY_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3002/api').replace(/\/?api\/?$/, '') + '/api/telemetry';

interface ErrorReport {
  error_type: 'React' | 'API' | 'Network' | 'Global' | 'UnhandledRejection' | 'Console';
  message: string;
  stack: string;
  component_stack?: string;
  route: string;
  source_file?: string;
  source_line?: number;
  api_endpoint?: string;
  api_method?: string;
  api_status?: number;
  api_body?: unknown;
  metadata?: Record<string, unknown>;
}

// Extracts file:line:col from first meaningful stack frame
function extractSourceLocation(stack: string): { source_file?: string; source_line?: number } {
  if (!stack) return {};
  // Chrome/V8 format: "at functionName (https://host/assets/file.ts:123:45)"
  // Firefox format: "functionName@https://host/assets/file.ts:123:45"
  const lines = stack.split('\n');
  for (const line of lines) {
    // Skip node_modules, chunk files, and framework internals
    if (line.includes('node_modules') || line.includes('chunk-') || line.includes('react-dom')) continue;

    // Match different formats
    const chromeMatch = line.match(/\((.+?):(\d+):(\d+)\)/);
    const firefoxMatch = line.match(/@(.+?):(\d+):(\d+)/);
    const match = chromeMatch || firefoxMatch;

    if (match) {
      const filePath = match[1];
      return {
        source_file: filePath.split('/').slice(-3).join('/'), // Last 3 path segments
        source_line: parseInt(match[2]),
      };
    }
  }
  return {};
}

function getRoute(): string {
  try {
    return window.location.pathname + window.location.search;
  } catch {
    return '/';
  }
}

function getUserId(): string | null {
  try {
    const token = localStorage.getItem('tgclinic_token');
    if (!token) return null;
    // JWT payload is the middle part
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    return decoded.userId || decoded.partnerId || decoded.id || null;
  } catch {
    return null;
  }
}

function getLocationId(): string | null {
  try {
    const raw = localStorage.getItem('tgclinic_location');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.id || null;
  } catch {
    return null;
  }
}

const FLUSH_INTERVAL = 2000; // Batch errors every 2s to avoid flooding

// Send error reports in batches to avoid flooding the backend
async function sendBatch(errors: ErrorReport[]) {
  for (const err of errors) {
    try {
      await fetch(TELEMETRY_URL + '/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(err),
        keepalive: true,
      });
    } catch {
      // OK to fail silently
    }
  }
}

let sendQueue: ErrorReport[] = [];
let sendTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleSend(report: ErrorReport) {
  sendQueue.push(report);

  if (sendTimer) return;

  sendTimer = setTimeout(() => {
    const batch = sendQueue;
    sendQueue = [];
    sendTimer = null;
    sendBatch(batch);
  }, FLUSH_INTERVAL);
}

/**
 * Main entry point: report an error to the backend
 */
export function reportError(report: ErrorReport) {
  // Only send in production (to avoid noise in dev)
  // In dev, just log locally
  if (import.meta.env.DEV) {
    console.debug('[ErrorReporter]', report.error_type, report.message);
    return;
  }

  // Enrich with route and source location
  if (!report.route) report.route = getRoute();
  if (!report.source_file) {
    const loc = extractSourceLocation(report.stack);
    report.source_file = loc.source_file;
    report.source_line = loc.source_line;
  }
  if (!report.metadata) report.metadata = {};

  report.metadata = {
    ...report.metadata,
    user_id: getUserId(),
    location_id: getLocationId(),
    user_agent: navigator.userAgent,
    url: window.location.href,
  };

  scheduleSend(report);
}

/**
 * Report an API error
 */
export function reportApiError(endpoint: string, method: string, status: number, message: string, body?: unknown) {
  reportError({
    error_type: 'API',
    message: `API ${method} ${endpoint} failed (${status}): ${message}`,
    stack: new Error().stack || '',
    route: getRoute(),
    api_endpoint: endpoint,
    api_method: method,
    api_status: status,
    api_body: body,
  });
}

/**
 * Report a React component error
 */
export function reportReactError(error: Error, componentStack: string, moduleName?: string) {
  reportError({
    error_type: 'React',
    message: error.message,
    stack: error.stack || '',
    component_stack: componentStack,
    route: getRoute(),
    metadata: { moduleName },
  });
}

/**
 * Install global error handlers (call once in main.tsx)
 */
export function installGlobalErrorHandlers() {
  // window.onerror — catches uncaught errors outside React
  window.addEventListener('error', (event: ErrorEvent) => {
    reportError({
      error_type: 'Global',
      message: event.message || 'Unknown error',
      stack: event.error?.stack || '',
      route: getRoute(),
      source_file: event.filename?.split('/').slice(-3).join('/'),
      source_line: event.lineno,
    });
  });

  // unhandledrejection — catches rejected promises
  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    let message = 'Unhandled Promise Rejection';
    let stack = '';

    if (event.reason instanceof Error) {
      message = event.reason.message;
      stack = event.reason.stack || '';
    } else if (typeof event.reason === 'string') {
      message = event.reason;
    } else if (event.reason) {
      try { message = JSON.stringify(event.reason); } catch { message = String(event.reason); }
    }

    reportError({
      error_type: 'UnhandledRejection',
      message,
      stack,
      route: getRoute(),
    });
  });
}
