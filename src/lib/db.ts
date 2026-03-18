import "server-only";

import { Pool, type QueryResult, type QueryResultRow } from "pg";

const globalForDb = globalThis as typeof globalThis & {
  __aiStyleWriterPool?: Pool;
};

function getPool() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("缺少 DATABASE_URL 环境变量，请检查 .env.local 配置。");
  }

  const pool =
    globalForDb.__aiStyleWriterPool ??
    new Pool({
      connectionString,
    });

  if (process.env.NODE_ENV !== "production") {
    globalForDb.__aiStyleWriterPool = pool;
  }

  return pool;
}

const db = {
  query<Row extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]): Promise<QueryResult<Row>> {
    return getPool().query<Row>(text, params);
  },
};

export default db;
