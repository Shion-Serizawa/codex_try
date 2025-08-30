const defaultHeaders = {
  "Content-Type": "application/json",
};

function bigintReplacer(_key: string, value: unknown) {
  return typeof value === "bigint" ? value.toString() : value;
}

export function json(data: unknown, init: ResponseInit = {}) {
  const body = JSON.stringify(data, bigintReplacer);
  const headers = new Headers(defaultHeaders);
  if (init.headers) new Headers(init.headers).forEach((v, k) => headers.set(k, v));
  return new Response(body, { ...init, headers });
}

export function error(status: number, message: string, extra?: Record<string, unknown>) {
  return json({ error: message, ...(extra ?? {}) }, { status });
}

