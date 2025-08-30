import { DbClient } from "../db/mod.ts";

export async function listThreads(db: DbClient, boardId: number, limit = 50, cursor?: string) {
  const after = cursor ? new Date(Number(cursor)) : null;
  const res = await db.queryObject<any>(
    `SELECT id, title, updated_at, is_locked, is_sticky
     FROM threads
     WHERE board_id=$1
     ${after ? "AND updated_at < $2" : ""}
     ORDER BY is_sticky DESC, updated_at DESC
     LIMIT ${limit}`,
    after ? [boardId, after.toISOString()] : [boardId],
  );
  return res.rows.map((r) => ({
    id: typeof r.id === "bigint" ? Number(r.id) : r.id,
    title: r.title,
    updated_at: typeof r.updated_at === "string" ? r.updated_at : new Date(r.updated_at).toISOString(),
    is_locked: r.is_locked,
    is_sticky: r.is_sticky,
  }));
}

export async function createThread(db: DbClient, boardId: number, title: string) {
  const res = await db.queryObject<{ id: number }>(
    `INSERT INTO threads(board_id, title) VALUES ($1, $2) RETURNING id`,
    [boardId, title],
  );
  const raw = (res.rows[0] as any)?.id;
  return typeof raw === "bigint" ? Number(raw) : Number(raw);
}

export async function getThread(db: DbClient, id: number) {
  const res = await db.queryObject<any>(
    `SELECT t.id, t.board_id, t.title, t.is_locked, b.slug as board_slug
     FROM threads t
     JOIN boards b ON b.id = t.board_id
     WHERE t.id = $1`,
    [id],
  );
  const r = res.rows[0];
  return r ? {
    id: typeof r.id === "bigint" ? Number(r.id) : r.id,
    board_id: typeof r.board_id === "bigint" ? Number(r.board_id) : r.board_id,
    title: r.title,
    is_locked: r.is_locked,
    board_slug: r.board_slug,
  } : null;
}

export async function lockThread(db: DbClient, id: number, locked: boolean) {
  await db.queryObject(`UPDATE threads SET is_locked=$2 WHERE id=$1`, [id, locked]);
}
