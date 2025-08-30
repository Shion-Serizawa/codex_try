// POST /api/post/delete { id, deleteKey }
import { Handlers } from "fresh/server.ts";
import { createDbClient } from "../../../backend/db/mod.ts";
import { deleteOwnPost } from "../../../backend/services/posts.ts";
import { json, error } from "../../../backend/http/json.ts";

function clientIp(req: Request) {
  const h = req.headers;
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    h.get("cf-connecting-ip") ||
    "127.0.0.1"
  );
}

export const handler: Handlers = {
  async POST(req) {
    const body = await req.json().catch(() => ({}));
    const { id, deleteKey } = body ?? {};
    if (!id || !deleteKey) return error(400, "invalid_input");
    const db = await createDbClient();
    const ok = await deleteOwnPost(db, Number(id), String(deleteKey), clientIp(req));
    return json({ ok });
  }
};
