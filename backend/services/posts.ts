import { DbClient, authorHashPerThread } from "../db/mod.ts";

export type NewPostInput = {
  threadId: number;
  content: string;
  authorName?: string;
  tripcode?: string;
  replyTo?: number;
  deleteKey?: string;
  ip: string;
};

export async function listPosts(db: DbClient, threadId: number, limit = 100, cursor?: string) {
  // Validate and sanitize limit parameter
  const sanitizedLimit = Math.max(1, Math.min(parseInt(String(limit), 10) || 100, 1000));
  
  const afterId = cursor ? Number(cursor) : undefined;
  const res = await db.queryObject<any>(
    `SELECT id, content, author_name, author_hash, created_at, reply_to
     FROM posts
     WHERE thread_id=$1 AND is_deleted=false ${afterId ? "AND id > $2" : ""}
     ORDER BY id ASC
     LIMIT $${afterId ? "3" : "2"}`,
    afterId ? [threadId, afterId, sanitizedLimit] : [threadId, sanitizedLimit],
  );
  return res.rows.map((r) => ({
    id: typeof r.id === "bigint" ? Number(r.id) : r.id,
    content: r.content,
    author_name: r.author_name,
    author_hash: r.author_hash,
    created_at: typeof r.created_at === "string" ? r.created_at : new Date(r.created_at).toISOString(),
    reply_to: r.reply_to == null ? null : (typeof r.reply_to === "bigint" ? Number(r.reply_to) : r.reply_to),
  }));
}

export async function createPost(db: DbClient, input: NewPostInput) {
  const author = input.authorName && input.authorName.trim() !== "" ? input.authorName.trim() : "名無しさん";
  const authorHash = await authorHashPerThread(input.threadId, input.ip);
  const delHash = input.deleteKey ? await sha256Hex(input.deleteKey) : null;
  const ipHash = await sha256Hex(input.ip);
  const res = await db.queryObject<{ id: number }>(
    `INSERT INTO posts(thread_id, content, author_name, author_hash, tripcode, reply_to, ip_hash, delete_key_hash)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
    [input.threadId, input.content, author, authorHash, input.tripcode ?? null, input.replyTo ?? null, ipHash, delHash],
  );
  const raw = (res.rows[0] as any)?.id;
  return typeof raw === "bigint" ? Number(raw) : Number(raw);
}

export async function deleteOwnPost(db: DbClient, postId: number, deleteKey: string, requesterIp: string) {
  const ipHash = await sha256Hex(requesterIp);
  const delHash = await sha256Hex(deleteKey);
  return await db.transaction(async (tx) => {
    const found = await tx.queryObject<any>(
      `SELECT * FROM posts WHERE id=$1 AND delete_key_hash=$2 AND ip_hash=$3 AND is_deleted=false`,
      [postId, delHash, ipHash],
    );
    const post = found.rows[0];
    if (!post) return false;
    await tx.queryObject(
      `INSERT INTO deleted_posts(id, thread_id, author_name, author_hash, tripcode, content, reply_to, ip_hash, delete_key_hash, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [post.id, post.thread_id, post.author_name, post.author_hash, post.tripcode, post.content, post.reply_to, post.ip_hash, post.delete_key_hash, post.created_at],
    );
    await tx.queryObject(`DELETE FROM posts WHERE id=$1`, [postId]);
    return true;
  });
}

async function sha256Hex(s: string): Promise<string> {
  const data = new TextEncoder().encode(s);
  const buf = await crypto.subtle.digest("SHA-256", data);
  const bytes = Array.from(new Uint8Array(buf));
  return bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
}
