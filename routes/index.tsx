import { Handlers, PageProps } from "fresh/server.ts";
import { createDbClient } from "../backend/db/mod.ts";
import { listBoards } from "../backend/services/boards.ts";

type Data = { boards: { id: number; slug: string; name: string; description: string | null }[] };

export const handler: Handlers<Data> = {
  async GET(_req, _ctx) {
    const db = await createDbClient();
    const boards = await listBoards(db);
    return _ctx.render({ boards });
  }
};

export default function Home({ data }: PageProps<Data>) {
  const { boards } = data;
  return (
    <div>
      <h1 class="text-xl font-semibold mb-4">Boards</h1>
      {boards.length === 0 ? (
        <p class="text-gray-600">まだ板がありません。管理者が用意するまでお待ちください。</p>
      ) : (
        <ul class="space-y-2">
          {boards.map((b) => (
            <li class="flex items-center justify-between border p-2 rounded">
              <div>
                <a class="text-blue-600 underline" href={`/b/${b.slug}`}>{b.name}</a>
                <span class="text-gray-500 ml-2">/{b.slug}/</span>
                {b.description ? <span class="text-gray-500 ml-2">— {b.description}</span> : null}
              </div>
              <a href={`/b/${b.slug}`} class="text-sm text-blue-700">開く →</a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
