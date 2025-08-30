// Minimal SSE broadcaster using in-process pub/sub per-thread.
// For cross-instance fanout in Deploy, replace with a shared pub/sub.

type Subscriber = (data: any) => void;

class Channel {
  private subs = new Set<Subscriber>();
  publish(data: any) { for (const cb of this.subs) cb(data); }
  subscribe(cb: Subscriber) { this.subs.add(cb); return () => this.subs.delete(cb); }
  size() { return this.subs.size; }
}

const channels = new Map<string, Channel>();

export function getChannel(name: string): Channel {
  let ch = channels.get(name);
  if (!ch) { ch = new Channel(); channels.set(name, ch); }
  return ch;
}

export function sseHeaders() {
  return new Headers({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
  });
}

export function toSSE(data: any) {
  const payload = typeof data === "string" ? data : JSON.stringify(data, (_k, v) => typeof v === "bigint" ? v.toString() : v);
  return `data: ${payload}\n\n`;
}
