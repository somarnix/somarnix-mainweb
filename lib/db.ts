import mysql from "mysql2/promise";

const globalForDb = globalThis as unknown as {
  __gstech_db_pool?: mysql.Pool;
};

export const db =
  globalForDb.__gstech_db_pool ??
  mysql.createPool({
    host: process.env.DB_HOST ?? "127.0.0.1",
    port: Number(process.env.DB_PORT ?? "3306"),
    user: process.env.DB_USER ?? "root",
    password: process.env.DB_PASSWORD ?? "",
    database: process.env.DB_NAME ?? "gstechedukh",
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_POOL_LIMIT ?? "10"),
    maxIdle: Number(process.env.DB_POOL_MAX_IDLE ?? "10"),
    idleTimeout: Number(process.env.DB_POOL_IDLE_TIMEOUT_MS ?? "60000"),
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__gstech_db_pool = db;
}
