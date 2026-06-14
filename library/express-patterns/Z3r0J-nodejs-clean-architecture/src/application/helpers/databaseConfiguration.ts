type SupportedDbType = "mysql" | "mariadb" | "postgres" | "mssql" | "oracle" | "better-sqlite3";

const SUPPORTED_DB_TYPES: readonly SupportedDbType[] = [
  "mysql",
  "mariadb",
  "postgres",
  "mssql",
  "oracle",
  "better-sqlite3",
] as const;

const parseDbType = (raw: string | undefined): SupportedDbType => {
  if (raw && (SUPPORTED_DB_TYPES as readonly string[]).includes(raw)) {
    return raw as SupportedDbType;
  }
  return "mysql";
};

const parsePort = (raw: string | undefined, fallback: number): number => {
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const DB_CONFIG = {
  type: parseDbType(process.env.DB_TYPE),
  host: process.env.DB_HOST ?? "localhost",
  port: parsePort(process.env.DB_PORT, 3306),
  username: process.env.DB_USERNAME ?? "root",
  password: process.env.DB_PASSWORD ?? "",
  database: process.env.DB_NAME ?? "test",
};
