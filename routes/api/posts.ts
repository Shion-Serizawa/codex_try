// GET /api/posts?thread=ID&cursor=...
import { Handlers } from "fresh/server.ts";
import { createDbClient } from "../../backend/db/mod.ts";
import { listPosts } from "../../backend/services/posts.ts";
import { json, error } from "../../backend/http/json.ts";

export const handler: Handlers = {
  async GET(req) {
    const url = new URL(req.url);
    const threadId = url.searchParams.get("thread");
    const cursor = url.searchParams.get("cursor") ?? undefined;
    if (!threadId) return error(400, "missing_thread");
    const db = await createDbClient();
    const items = await listPosts(db, Number(threadId), 200, cursor ?? undefined);
    const nextCursor = items.length > 0 ? String(items[items.length - 1].id) : null;
    return json({ items, nextCursor });
  }
};
