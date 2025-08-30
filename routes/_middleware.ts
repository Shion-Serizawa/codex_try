import { MiddlewareHandlerContext } from "fresh/server.ts";

const postCooldownMs = Number(Deno.env.get("RATELIMIT_POST_MS") ?? 10_000);
const threadCooldownMs = Number(Deno.env.get("RATELIMIT_THREAD_MS") ?? 60_000);
const lastAction = new Map<string, { postAt: number; threadAt: number }>();

function clientIp(req: Request) {
  const h = req.headers;
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    h.get("cf-connecting-ip") ||
    "127.0.0.1"
  );
}

export async function handler(req: Request, ctx: MiddlewareHandlerContext) {
  if (req.method === "POST") {
    const url = new URL(req.url);
    const ip = clientIp(req);
    const now = Date.now();
    const rec = lastAction.get(ip) ?? { postAt: 0, threadAt: 0 };
    if (url.pathname.startsWith("/api/thread")) {
      if (now - rec.threadAt < threadCooldownMs) return new Response("Too Many Requests", { status: 429 });
      rec.threadAt = now;
    } else if (url.pathname.startsWith("/api/post")) {
      if (now - rec.postAt < postCooldownMs) return new Response("Too Many Requests", { status: 429 });
      rec.postAt = now;
    }
    lastAction.set(ip, rec);
  }
  return await ctx.next();
}

