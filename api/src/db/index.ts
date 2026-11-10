import pg from 'pg';

export interface Db {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
}

/** Primary for writes, replica pool for reads (falls back to primary). */
export interface Database {
  primary: Db;
  replica: Db;
  close(): Promise<void>;
}

export function pgDatabase(primaryUrl: string, replicaUrl?: string): Database {
  const mk = (url: string) => new pg.Pool({ connectionString: url, max: 20, idleTimeoutMillis: 30_000 });
  const p = mk(primaryUrl);
  const r = replicaUrl ? mk(replicaUrl) : p;
  const wrap = (pool: pg.Pool): Db => ({ query: async (sql, params) => (await pool.query(sql, params)).rows }) ;
  return {
    primary: wrap(p),
    replica: wrap(r),
    close: async () => {
      await p.end();
      if (r !== p) await r.end();
    },
  };
}
