import { fromFileUrl, join } from "https://deno.land/std@0.224.0/path/mod.ts";
import { parse, load } from "https://deno.land/std@0.224.0/dotenv/mod.ts";

export async function loadLocalEnv() {
  if (Deno.env.get("DENO_DEPLOYMENT_ID")) return; // skip on Deploy
  const root = fromFileUrl(new URL("../", import.meta.url));
  for (const name of [".env.local", ".env"]) {
    const p = join(root, name);
    try {
      const text = await Deno.readTextFile(p);
      const vars = parse(text);
      for (const [k, v] of Object.entries(vars)) {
        if (Deno.env.get(k) === undefined) Deno.env.set(k, v);
      }
    } catch (_) {
      // file not found or unreadable; ignore
    }
  }
  // Fallback: use std dotenv loader from CWD in case the above didn't populate
  if (!Deno.env.get("DATABASE_URL") && !Deno.env.get("NEON_DATABASE_URL")) {
    try {
      await load({ export: true });
    } catch (_) {}
  }
}
