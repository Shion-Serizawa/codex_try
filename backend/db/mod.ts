// Postgres client factory supporting two drivers:
// - Local/dev: TCP driver (deno_postgres Pool)
// - Deploy: Neon serverless HTTP/WebSocket driver (@neondatabase/serverless)

import { Pool } from "postgres/mod.ts";
import { neon } from "@neondatabase/serverless";

export type QueryResult<T = unknown> = { rows: T[] };

export interface DbTx {
  queryObject<T = unknown>(sql: string, params?: unknown[]): Promise<QueryResult<T>>;
}

export interface DbClient extends DbTx {
  transaction<T>(fn: (tx: DbTx) => Promise<T>): Promise<T>;
  end?(): Promise<void> | void;
}

function env(name: string, fallback?: string): string {
  const v = Deno.env.get(name) ?? fallback;
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

const isDeploy = Boolean(Deno.env.get("DENO_DEPLOYMENT_ID"));

export async function createDbClient(): Promise<DbClient> {
  const neonUrl = Deno.env.get("NEON_DATABASE_URL");
  if (isDeploy && neonUrl) return createNeonClient(neonUrl);
  let url = Deno.env.get("DATABASE_URL") ?? neonUrl;
  if (!url && !isDeploy) {
    // Developer-friendly default for local compose
    url = "postgres://postgres:postgres@localhost:5432/bbs";
  }
  if (!url) throw new Error("Set DATABASE_URL (local) or NEON_DATABASE_URL (deploy)");
  // Prefer TCP driver locally for performance and LISTEN/NOTIFY support
  return createTcpClient(url);
}

function createNeonClient(url: string): DbClient {
  const neonQuery = neon(url);
  return {
    async queryObject<T = unknown>(sql: string, params?: unknown[]) {
      const rows = await neonQuery(sql as any, ...(params ?? [])) as T[];
      return { rows };
    },
    async transaction<T>(fn: (tx: DbTx) => Promise<T>): Promise<T> {
      return await neonQuery(async (client: any) => {
        const tx: DbTx = {
          async queryObject<T = unknown>(sql: string, params?: unknown[]) {
            const rows = await client(sql as any, ...(params ?? [])) as T[];
            return { rows };
          },
        };
        return await fn(tx);
      });
    },
  };
}

function createTcpClient(url: string): DbClient {
  const pool = new Pool(url, 3, true);
  const clientQuery = async <T>(conn: any, sql: string, params?: unknown[]) => {
    const res = await conn.queryObject<T>({ text: sql, args: params ?? [] });
    return { rows: res.rows } as QueryResult<T>;
  };
  return {
    async queryObject<T = unknown>(sql: string, params?: unknown[]) {
      const conn = await pool.connect();
      try {
        return await clientQuery<T>(conn, sql, params);
      } finally {
        conn.release();
      }
    },
    async transaction<T>(fn: (tx: DbTx) => Promise<T>) {
      const conn = await pool.connect();
      try {
        await conn.queryArray("BEGIN");
        const tx: DbTx = {
          queryObject: <U>(sql: string, params?: unknown[]) => clientQuery<U>(conn, sql, params),
        };
        const out = await fn(tx);
        await conn.queryArray("COMMIT");
        return out;
      } catch (e) {
        try { await conn.queryArray("ROLLBACK"); } catch (_) {}
        throw e;
      } finally {
        conn.release();
      }
    },
    async end() { await pool.end(); },
  };
}

async function shortId(input: string, len = 16): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", data);
  const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
  return b64.replaceAll("/", "_").replaceAll("+", "-").slice(0, len);
}

export async function authorHashPerThread(threadId: string | number, ip: string, when = new Date()): Promise<string> {
  const day = when.toISOString().slice(0, 10);
  const secret = env("APP_SECRET", "dev-secret");
  return await shortId(`${threadId}:${day}:${ip}:${secret}`);
}
