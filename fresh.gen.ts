// Fresh manifest (manually composed) to avoid fs-dependent generation on Deploy
import { type Manifest } from "fresh/server.ts";

// API routes
import * as r_api_thread from "./routes/api/thread.ts";
import * as r_api_threads from "./routes/api/threads.ts";
import * as r_api_post from "./routes/api/post.ts";
import * as r_api_posts from "./routes/api/posts.ts";
import * as r_api_post_delete from "./routes/api/post/delete.ts";
import * as r_api_sse_thread from "./routes/api/sse/[thread].ts";

// Pages
import * as r_index from "./routes/index.tsx";
import * as r_board from "./routes/b/[slug].tsx";
import * as r_thread from "./routes/t/[id].tsx";
import * as i_thread_client from "./islands/ThreadClient.tsx";

const manifest: Manifest = {
  routes: {
    "./routes/api/thread.ts": r_api_thread,
    "./routes/api/threads.ts": r_api_threads,
    "./routes/api/post.ts": r_api_post,
    "./routes/api/posts.ts": r_api_posts,
    "./routes/api/post/delete.ts": r_api_post_delete,
    "./routes/api/sse/[thread].ts": r_api_sse_thread,
    "./routes/index.tsx": r_index,
    "./routes/b/[slug].tsx": r_board,
    "./routes/t/[id].tsx": r_thread,
  },
  islands: {
    "./islands/ThreadClient.tsx": i_thread_client,
  },
  baseUrl: import.meta.url,
};

export default manifest;
