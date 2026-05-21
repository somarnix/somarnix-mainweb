import mysql from "mysql2/promise";

import "@/lib/server-env";

const globalForDb = globalThis as unknown as {
  __somarnix_db_pool?: mysql.Pool;
};

const DEFAULT_DB_NAME = "somarnix";

function readEnvValue(...names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return undefined;
}

export const db =
  globalForDb.__somarnix_db_pool ??
  mysql.createPool({
    host: readEnvValue("DB_HOST", "MYSQL_HOST") ?? "127.0.0.1",
    port: Number(readEnvValue("DB_PORT", "MYSQL_PORT") ?? "3306"),
    user: readEnvValue("DB_USER", "MYSQL_USER") ?? "root",
    password: process.env.DB_PASSWORD ?? process.env.MYSQL_PASSWORD ?? "",
    database: readEnvValue("DB_NAME", "MYSQL_DATABASE") ?? DEFAULT_DB_NAME,
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_POOL_LIMIT ?? "10"),
    maxIdle: Number(process.env.DB_POOL_MAX_IDLE ?? "10"),
    idleTimeout: Number(process.env.DB_POOL_IDLE_TIMEOUT_MS ?? "60000"),
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__somarnix_db_pool = db;
}
