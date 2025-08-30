import { useEffect, useMemo, useRef, useState } from "preact/hooks";

type Post = {
  id: number;
  content: string;
  author_name: string | null;
  author_hash: string;
  created_at: string;
  reply_to: number | null;
};

type Props = {
  threadId: number;
  initial: Post[];
};

export default function ThreadClient({ threadId, initial }: Props) {
  const [posts, setPosts] = useState<Post[]>(initial);
  const [pending, setPending] = useState(false);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const delKeyRef = useRef<HTMLInputElement>(null);
  const idsRef = useRef<Set<number>>(new Set(initial.map((p) => Number(p.id))));
  const lastIdRef = useRef<number>(initial.length ? Number(initial[initial.length - 1].id) : 0);

  useEffect(() => {
    const es = new EventSource(`/api/sse/${threadId}`);
    es.onmessage = () => { void loadNew(); };
    return () => { es.close(); };
    // Only depend on threadId so we don't reopen on each post append
  }, [threadId]);

  async function loadNew() {
    const cursor = lastIdRef.current;
    const r = await fetch(`/api/posts?thread=${threadId}&cursor=${cursor}`);
    if (!r.ok) return;
    const { items } = await r.json();
    if (items?.length) {
      const filtered: Post[] = [];
      for (const it of items) {
        const id = Number(it.id);
        if (!idsRef.current.has(id)) {
          filtered.push({ ...it, id });
        }
      }
      if (filtered.length) {
        setPosts((prev) => {
          const merged = prev.concat(filtered);
          // update refs after merge
          for (const p of filtered) idsRef.current.add(Number(p.id));
          lastIdRef.current = Number(merged[merged.length - 1].id);
          return merged;
        });
      }
    }
  }

  async function onSubmit(e: Event) {
    e.preventDefault();
    if (pending) return;
    const content = contentRef.current?.value?.toString() ?? "";
    const authorName = nameRef.current?.value?.toString() || undefined;
    const deleteKey = delKeyRef.current?.value?.toString() || undefined;
    if (!content.trim()) return;
    setPending(true);
    try {
      const res = await fetch(`/api/post`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ threadId, content, authorName, deleteKey }),
      });
      if (res.ok) {
        if (contentRef.current) contentRef.current.value = "";
        // Do not call loadNew here; SSE will trigger it. Avoid duplicates.
      } else {
        const txt = await res.text();
        console.error("Post failed:", res.status, txt);
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      <form class="mt-4 space-y-2" onSubmit={onSubmit}>
        <div class="flex gap-2">
          <input ref={nameRef} class="border px-2 py-1" name="authorName" placeholder="名前 (任意)" />
          <input ref={delKeyRef} class="border px-2 py-1" name="deleteKey" placeholder="削除キー (任意)" />
        </div>
        <textarea ref={contentRef} class="border w-full h-28 p-2" name="content" placeholder="本文"></textarea>
        <button disabled={pending} class="bg-blue-600 text-white px-3 disabled:opacity-60">{pending ? "投稿中..." : "投稿"}</button>
      </form>

      <ol class="mt-6 space-y-3">
        {posts.map((p, i) => (
          <li class="border p-2 rounded" key={p.id} id={`p${p.id}`}>
            <div class="text-sm text-gray-600">#{i + 1} {p.author_name || "名無しさん"} ID:{p.author_hash} — {new Date(p.created_at).toLocaleString()}</div>
            <div class="whitespace-pre-wrap">{renderContent(p.content)}</div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function renderContent(text: string) {
  // Minimal safe formatting: escape by default, then link >>n anchors and simple URLs
  const parts: preact.JSX.Element[] = [];
  const lines = text.split(/\r?\n/);
  let key = 0;
  for (const line of lines) {
    const el = renderLine(line, key++);
    parts.push(el);
    parts.push(<br key={`br-${key++}`} />);
  }
  parts.pop(); // remove last <br>
  return <>{parts}</>;
}

function renderLine(line: string, key: number) {
  // Replace >>123 with anchor links, and auto-link http(s) URLs. Everything else stays as text.
  const tokens: preact.JSX.Element[] = [];
  let idx = 0;
  const re = /(>>\d+)|(https?:\/\/[^\s]+)/g;
  for (const m of line.matchAll(re)) {
    const s = m.index ?? 0;
    if (s > idx) tokens.push(<span key={`${key}-t-${idx}`}>{line.slice(idx, s)}</span>);
    const [full] = m;
    if (full.startsWith(">>")) {
      const n = full.slice(2);
      tokens.push(<a class="text-blue-600 underline" key={`${key}-a-${s}`} href={`#p${n}`}>{full}</a>);
    } else {
      tokens.push(<a class="text-blue-600 underline" key={`${key}-u-${s}`} href={full} target="_blank" rel="noopener noreferrer">{full}</a>);
    }
    idx = s + full.length;
  }
  if (idx < line.length) tokens.push(<span key={`${key}-t-end`}>{line.slice(idx)}</span>);
  return <span key={`l-${key}`}>{tokens}</span>;
}
