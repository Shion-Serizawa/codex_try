// POST /api/thread { boardSlug, title }
import { Handlers } from "fresh/server.ts";
import { createDbClient } from "../../backend/db/mod.ts";
import { getBoardBySlug } from "../../backend/services/boards.ts";
import { createThread } from "../../backend/services/threads.ts";
import { getChannel } from "../../backend/realtime/sse.ts";
import { json, error } from "../../backend/http/json.ts";

export const handler: Handlers = {
  async POST(req) {
    const body = await req.json().catch(() => ({}));
    const { boardSlug, title } = body ?? {};
    if (!boardSlug || !title || typeof title !== "string") {
      return error(400, "invalid_input");
    }
    const db = await createDbClient();
    const board = await getBoardBySlug(db, boardSlug);
    if (!board) return error(404, "board_not_found");
    const id = await createThread(db, board.id, title.slice(0, 120));
    // Notify board channel
    getChannel(`board:${board.id}`).publish({ type: "thread_created", id, title, boardId: board.id });
    return json({ id });
  },
};
