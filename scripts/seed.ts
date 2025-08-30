import { loadLocalEnv } from "../lib/env.ts";
import { createDbClient } from "../backend/db/mod.ts";
import { createBoard } from "../backend/services/boards.ts";

if (import.meta.main) {
  await loadLocalEnv();
  const db = await createDbClient();
  console.log("Seeding boards...");
  await createBoard(db, "tech", "技術", "技術系の話題");
  await createBoard(db, "news", "ニュース", "ニュース全般");
  await createBoard(db, "test", "テスト", "テスト用");
  console.log("Done.");
}

