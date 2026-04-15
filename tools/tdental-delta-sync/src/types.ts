// Shared types used across modules.

export type WindowStrategy = 'single' | 'paired' | 'two-pass' | 'all' | 'detail-follow';

export interface PaginationSpec {
  style: 'offset' | 'none';
  param_limit?: string;
  param_offset?: string;
  default_size?: number;
}

export interface DeltaFilterSpec {
  supported: boolean;
  param?: string;
  companion_param?: string;
  format?: string;
}

export interface EndpointEntry {
  list_url: string;
  method: 'GET';
  pagination: PaginationSpec;
  delta_filter: DeltaFilterSpec;
  id_field: string;
  required_query_params?: string[];
  useful_query_params?: string[];
  fat_detail_url?: string;
  windowStrategy: WindowStrategy;
  notes?: string;
}

export interface EndpointMapFile {
  _meta: {
    base_url: string;
    common_pagination?: unknown;
    reviewed_by_user?: boolean;
    [k: string]: unknown;
  };
  [tableName: string]: EndpointEntry | unknown;
}

export interface AuthResult {
  bearerToken: string;
  baseUrl: string;
  tokenExpiry: Date;
  sessionId?: string;
  deviceId?: string;
}

export interface MappingError {
  table: string;
  reason: string;
  row: unknown;
}

export type PgRow = Record<string, unknown>;

export interface MappedRows {
  pgRows: PgRow[];
  errors: MappingError[];
}

export interface UpsertResult {
  inserted: number;
  updated: number;
  skipped: number;
}

export interface TableCheckpoint {
  table: string;
  completedAt: string;
  fetched: number;
  inserted: number;
  updated: number;
  errored: number;
  elapsedMs: number;
}

export interface RunState {
  runId: string;
  since: string;
  startedAt: string;
  tables: Record<string, TableCheckpoint>;
}

export interface SyncConfig {
  tdental: {
    baseUrl: string;
    tenant: string;
    user: string;
    pass: string;
  };
  pg: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
    schema: string;
  };
  sync: {
    since: string;
    throttleMs: number;
    pageSize: number;
    maxRetries: number;
    appointmentsFutureDays: number;
  };
  cli: {
    dryRun: boolean;
    only: string[] | null;
    resume: boolean;
    debug: boolean;
  };
  projectRoot: string;
}
