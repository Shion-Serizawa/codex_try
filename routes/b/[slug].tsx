import { Handlers, PageProps } from "fresh/server.ts";
import { createDbClient } from "../../backend/db/mod.ts";
import { getBoardBySlug } from "../../backend/services/boards.ts";
import { listThreads, createThread } from "../../backend/services/threads.ts";

type Data = { board: { id: number; slug: string; name: string }; threads: { id: number; title: string; updated_at: string }[] };

export const handler: Handlers<Data> = {
  async GET(req, ctx) {
    const db = await createDbClient();
    const board = await getBoardBySlug(db, ctx.params.slug);
    if (!board) return new Response("Board not found", { status: 404 });
    const threads = await listThreads(db, board.id, 50);
    return ctx.render({ board, threads });
  },
  async POST(req, ctx) {
    const form = await req.formData();
    const title = String(form.get("title") || "").trim();
    if (!title) return new Response("Bad Request", { status: 400 });
    const db = await createDbClient();
    const board = await getBoardBySlug(db, ctx.params.slug);
    if (!board) return new Response("Board not found", { status: 404 });
    const id = await createThread(db, board.id, title.slice(0, 120));
    const to = new URL(`/t/${id}`, req.url).toString();
    return Response.redirect(to, 303);
  }
};

export default function BoardPage({ data }: PageProps<Data>) {
  const { board, threads } = data;
  return (
    <div>
      <h1 class="text-xl font-semibold">/{board.slug}/ — {board.name}</h1>
      <form method="post" class="mt-4 flex gap-2">
        <input class="border px-2 py-1 flex-1" name="title" placeholder="新規スレッドのタイトル" />
        <button class="bg-blue-600 text-white px-3">作成</button>
      </form>
      <ul class="mt-6 space-y-2">
        {threads.map((t) => (
          <li>
            <a class="text-blue-600 underline" href={`/t/${t.id}`}>{t.title}</a>
            <span class="text-gray-500 ml-2">更新: {new Date(t.updated_at).toLocaleString()}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
