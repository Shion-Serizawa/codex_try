import { Handlers, PageProps } from "fresh/server.ts";
import { createDbClient } from "../../backend/db/mod.ts";
import { getThread } from "../../backend/services/threads.ts";
import { listPosts } from "../../backend/services/posts.ts";
import ThreadClient from "../../islands/ThreadClient.tsx";

type Data = {
  thread: { id: number; title: string; board_slug: string };
  posts: { id: number; content: string; author_name: string | null; author_hash: string; created_at: string; reply_to: number | null }[];
};

export const handler: Handlers<Data> = {
  async GET(_req, ctx) {
    const db = await createDbClient();
    const id = Number(ctx.params.id);
    const thread = await getThread(db, id);
    if (!thread) return new Response("Thread not found", { status: 404 });
    const posts = await listPosts(db, id, 200);
    return ctx.render({ thread, posts });
  }
};

export default function ThreadPage({ data }: PageProps<Data>) {
  const { thread, posts } = data;
  return (
    <div>
      <nav class="text-sm text-gray-600 mb-2"><a href="/" class="text-blue-600 underline">Boards</a> / <a href={`/b/${thread.board_slug}`} class="text-blue-600 underline">/{thread.board_slug}/</a></nav>
      <h1 class="text-xl font-semibold">{thread.title}</h1>
      <ThreadClient threadId={thread.id} initial={posts} />
    </div>
  );
}
