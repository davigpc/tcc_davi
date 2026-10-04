import { sleep } from './exec.js';

export interface RequestOptions {
  method?: string;
  token?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

export interface HttpResult {
  status: number;
  body: unknown;
  elapsedMs: number;
}

export async function httpRequest(url: string, opts: RequestOptions = {}): Promise<HttpResult> {
  const headers: Record<string, string> = { ...(opts.headers ?? {}) };
  if (opts.token) headers['Authorization'] = `Bearer ${opts.token}`;
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';

  const start = Date.now();
  const res = await fetch(url, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  let body: unknown = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    /* keep raw text */
  }
  return { status: res.status, body, elapsedMs: Date.now() - start };
}

export async function waitForHttp(
  url: string,
  { timeoutMs = 180000, intervalMs = 1000 }: { timeoutMs?: number; intervalMs?: number } = {},
): Promise<number> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.ok) return Date.now();
    } catch {
      /* not up yet */
    }
    await sleep(intervalMs);
  }
  throw new Error(`service not ready at ${url} within ${timeoutMs}ms`);
}

export async function login(baseUrl: string, email: string, password: string): Promise<string> {
  const res = await httpRequest(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    body: { email, password },
  });
  if (res.status !== 200 && res.status !== 201) {
    throw new Error(`login failed (${res.status}): ${JSON.stringify(res.body)}`);
  }
  const data = res.body as { data?: { accessToken?: string } };
  const token = data?.data?.accessToken;
  if (!token) throw new Error(`login response has no accessToken: ${JSON.stringify(res.body)}`);
  return token;
}
