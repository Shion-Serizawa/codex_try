// GET /api/threads?board=slug&cursor=...
import { Handlers } from "fresh/server.ts";
import { createDbClient } from "../../backend/db/mod.ts";
import { getBoardBySlug } from "../../backend/services/boards.ts";
import { listThreads } from "../../backend/services/threads.ts";
import { json, error } from "../../backend/http/json.ts";

export const handler: Handlers = {
  async GET(req) {
    const url = new URL(req.url);
    const slug = url.searchParams.get("board");
    const cursor = url.searchParams.get("cursor") ?? undefined;
    if (!slug) return error(400, "missing_board");
    const db = await createDbClient();
    const board = await getBoardBySlug(db, slug);
    if (!board) return error(404, "board_not_found");
    const items = await listThreads(db, board.id, 50, cursor ?? undefined);
    const nextCursor = items.length > 0 ? String(new Date(items[items.length - 1].updated_at).getTime()) : null;
    return json({ items, nextCursor });
  },
};
