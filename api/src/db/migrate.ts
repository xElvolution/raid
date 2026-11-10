import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Db } from './index.js';

export const schemaSql = (): string => readFileSync(fileURLToPath(new URL('./schema.sql', import.meta.url)), 'utf8');

export async function migrate(db: Db): Promise<void> {
  for (const stmt of schemaSql().split(/;\s*\n/).map((s) => s.trim()).filter(Boolean)) {
    await db.query(stmt);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { pgDatabase } = await import('./index.js');
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL required');
  const d = pgDatabase(url);
  await migrate(d.primary);
  await d.close();
  console.log('migrated');
}
