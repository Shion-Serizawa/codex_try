import { DbClient } from "../db/mod.ts";

export async function listBoards(db: DbClient) {
  const res = await db.queryObject<{ id: number; slug: string; name: string; description: string | null }>(
    `SELECT id, slug, name, description FROM boards ORDER BY id ASC`
  );
  return res.rows;
}

export async function createBoard(db: DbClient, slug: string, name: string, description?: string) {
  await db.queryObject(
    `INSERT INTO boards(slug, name, description) VALUES ($1, $2, $3) ON CONFLICT (slug) DO NOTHING`,
    [slug, name, description ?? null],
  );
}

export async function getBoardBySlug(db: DbClient, slug: string) {
  const res = await db.queryObject<{ id: number; slug: string; name: string; description: string | null }>(
    `SELECT id, slug, name, description FROM boards WHERE slug=$1`, [slug]
  );
  return res.rows[0] ?? null;
}

