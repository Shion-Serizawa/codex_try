// Simple migration runner: up/down, tracks schema_migrations
// Usage: deno run -A scripts/migrate.ts up|down [steps]

import { fromFileUrl, join } from "https://deno.land/std@0.224.0/path/mod.ts";
import { createDbClient } from "../backend/db/mod.ts";
import { loadLocalEnv } from "../lib/env.ts";

// Resolve relative to this file to avoid cwd dependence (works in any runner)
const MIG_DIR = fromFileUrl(new URL("../db/migrations/", import.meta.url));

type Direction = "up" | "down";

async function listMigrationFiles(): Promise<string[]> {
  const entries: string[] = [];
  for await (const e of Deno.readDir(MIG_DIR)) {
    if (e.isFile && e.name.endsWith(".sql")) entries.push(e.name);
  }
  entries.sort();
  return entries;
}

async function up(steps?: number) {
  const files = await listMigrationFiles();
  const db = await createDbClient();
  await db.queryObject(`CREATE TABLE IF NOT EXISTS schema_migrations (id bigserial primary key, filename text unique not null, executed_at timestamptz not null default now())`);
  const applied = await db.queryObject<{ filename: string }>(`SELECT filename FROM schema_migrations ORDER BY id ASC`);
  const appliedSet = new Set(applied.rows.map((r) => r.filename));
  const pending = files.filter((f) => !appliedSet.has(f));
  const toApply = typeof steps === "number" ? pending.slice(0, steps) : pending;
  for (const f of toApply) {
    const sql = await Deno.readTextFile(join(MIG_DIR, f));
    console.log(`Applying ${f}...`);
    await db.transaction(async (tx) => {
      await tx.queryObject(sql);
      await tx.queryObject(`INSERT INTO schema_migrations(filename) VALUES ($1)`, [f]);
    });
  }
  await db.end?.();
}

async function down(steps = 1) {
  const files = await listMigrationFiles();
  const db = await createDbClient();
  const applied = await db.queryObject<{ filename: string; id: number }>(`SELECT id, filename FROM schema_migrations ORDER BY id DESC`);
  const toRevert = applied.rows.slice(0, steps);
  for (const m of toRevert) {
    // Try to locate a down migration as 0001_init.down.sql if present, otherwise skip
    const downName = m.filename.replace(/\.sql$/, ".down.sql");
    const path = join(MIG_DIR, downName);
    try {
      await Deno.stat(path);
    } catch (_) {
      console.warn(`No down migration for ${m.filename} -> ${downName}, skipping manual revert.`);
      continue;
    }
    const sql = await Deno.readTextFile(path);
    console.log(`Reverting ${m.filename} via ${downName}...`);
    await db.transaction(async (tx) => {
      await tx.queryObject(sql);
      await tx.queryObject(`DELETE FROM schema_migrations WHERE id = $1`, [m.id]);
    });
  }
  await db.end?.();
}

if (import.meta.main) {
  await loadLocalEnv();
  const dir = (Deno.args[0] as Direction) || "up";
  const steps = Deno.args[1] ? Number(Deno.args[1]) : undefined;
  if (dir === "up") await up(steps);
  else if (dir === "down") await down(steps ?? 1);
  else {
    console.error("Usage: migrate.ts up|down [steps]");
    Deno.exit(1);
  }
}
