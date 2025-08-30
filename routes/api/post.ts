// POST /api/post { threadId, content, authorName?, tripcode?, replyTo?, deleteKey? }
import { Handlers } from "fresh/server.ts";
import { createDbClient } from "../../backend/db/mod.ts";
import { createPost } from "../../backend/services/posts.ts";
import { getChannel } from "../../backend/realtime/sse.ts";
import { json, error } from "../../backend/http/json.ts";

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
    const { threadId, content, authorName, tripcode, replyTo, deleteKey } = body ?? {};
    if (!threadId || !content || typeof content !== "string") {
      return error(400, "invalid_input");
    }
    if (content.length > 4000) return error(400, "content_too_long");
    const db = await createDbClient();
    const id = await createPost(db, {
      threadId: Number(threadId),
      content,
      authorName,
      tripcode,
      replyTo: replyTo ? Number(replyTo) : undefined,
      deleteKey,
      ip: clientIp(req),
    });
    // Notify thread channel
    getChannel(`thread:${threadId}`).publish({ type: "post_created", id, threadId: Number(threadId) });
    return json({ id });
  },
};
