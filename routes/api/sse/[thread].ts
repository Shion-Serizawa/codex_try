// GET /api/sse/:thread  -> SSE stream for new posts in the thread
import { Handlers, PageProps } from "fresh/server.ts";
import { getChannel, sseHeaders, toSSE } from "../../../backend/realtime/sse.ts";

export const handler: Handlers = {
  async GET(_req, ctx) {
    const { thread } = ctx.params as { thread: string };
    const ch = getChannel(`thread:${thread}`);
    let cleanup: (() => void) | undefined;
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const encoder = new TextEncoder();
        cleanup = ch.subscribe((evt) => controller.enqueue(encoder.encode(toSSE(evt))));
        // Send an initial comment to open the stream
        controller.enqueue(new TextEncoder().encode(":ok\n\n"));
      },
      cancel() {
        try { cleanup?.(); } finally { cleanup = undefined; }
      }
    });
    return new Response(stream, { headers: sseHeaders() });
  }
};
