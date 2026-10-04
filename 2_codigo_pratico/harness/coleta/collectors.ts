import fs from 'node:fs';
import path from 'node:path';
import autocannon from 'autocannon';
import madge from 'madge';
import sloc from 'sloc';
import { docker, run, runOk, sleep } from '../lib/exec.js';
import { fromRepo } from '../lib/paths.js';
import { httpRequest, waitForHttp } from '../lib/http.js';

export interface RouteDef {
  name: string;
  method: string;
  path: string;
  auth?: boolean;
  body?: Record<string, unknown>;
}

export interface AppConfig {
  app: string;
  metodologias: string[];
  composeDir: string;
  composeFile: string;
  composeProject: string;
  baseUrl: string;
  readinessPath: string;
  credentials: { email: string; password: string };
  seed: { service: string; command: string[] };
  containers: string[];
  images: string[];
  sourceDir: string;
  routes: { read: RouteDef[]; write: RouteDef[] };
  load: { connections: number; durationSec: number; pipelining: number; reps: number };
  buildReps: number;
  startupReps: number;
  statsIdleSec: number;
  statsLoadSec: number;
}

const compose = (cfg: AppConfig, args: string[], opts: { timeoutMs?: number } = {}) =>
  run('docker', ['compose', '-f', cfg.composeFile, ...args], {
    cwd: fromRepo(cfg.composeDir),
    timeoutMs: opts.timeoutMs,
  });

// ---------- 1. Build time ----------
export async function buildOnce(cfg: AppConfig): Promise<number> {
  const r = await compose(cfg, ['build', '--no-cache'], { timeoutMs: 1800000 });
  if (r.code !== 0) throw new Error(`build failed:\n${r.stderr || r.stdout}`);
  return r.elapsedMs;
}

export async function collectBuildTime(cfg: AppConfig): Promise<{ reps: number; runsMs: number[] }> {
  const runsMs: number[] = [];
  for (let i = 0; i < cfg.buildReps; i++) {
    runsMs.push(await buildOnce(cfg));
  }
  return { reps: cfg.buildReps, runsMs };
}

// ---------- 2. Startup time ----------
export async function composeDown(cfg: AppConfig): Promise<void> {
  await compose(cfg, ['down', '--remove-orphans'], { timeoutMs: 120000 });
}

export async function composeUp(cfg: AppConfig): Promise<void> {
  await compose(cfg, ['up', '-d'], { timeoutMs: 300000 });
}

export async function collectStartupTime(cfg: AppConfig): Promise<{ reps: number; runsMs: number[] }> {
  const runsMs: number[] = [];
  for (let i = 0; i < cfg.startupReps; i++) {
    await composeDown(cfg);
    const start = Date.now();
    await composeUp(cfg);
    await waitForHttp(`${cfg.baseUrl}${cfg.readinessPath}`, { timeoutMs: 180000 });
    runsMs.push(Date.now() - start);
    await sleep(1000);
  }
  return { reps: cfg.startupReps, runsMs };
}

// ---------- 3. Seed ----------
export async function seedDatabase(cfg: AppConfig): Promise<void> {
  const r = await compose(cfg, ['run', '--rm', cfg.seed.service, ...cfg.seed.command], {
    timeoutMs: 180000,
  });
  if (r.code !== 0) throw new Error(`seed failed:\n${r.stderr || r.stdout}`);
}

// ---------- 4. Docker stats ----------
export interface StatsSample {
  ts: string;
  Name: string;
  CPUPerc: string;
  MemUsage: string;
  MemPerc: string;
  NetIO: string;
  BlockIO: string;
  PIDs: string;
}

export async function sampleDockerStats(
  durationSec: number,
  intervalMs = 2000,
): Promise<StatsSample[]> {
  const samples: StatsSample[] = [];
  const end = Date.now() + durationSec * 1000;
  do {
    const r = await runOk('docker', ['stats', '--no-stream', '--format', '{{json .}}']);
    const ts = new Date().toISOString();
    for (const line of r.stdout.split(/\r?\n/)) {
      if (line.trim()) samples.push({ ts, ...(JSON.parse(line) as object) } as StatsSample);
    }
    if (Date.now() < end) await sleep(intervalMs);
  } while (Date.now() < end);
  return samples;
}

// ---------- 5. Image size ----------
export async function collectImageSize(
  cfg: AppConfig,
): Promise<Record<string, { bytes: number; mb: number }>> {
  const out: Record<string, { bytes: number; mb: number }> = {};
  for (const image of cfg.images) {
    const r = await run('docker', ['image', 'inspect', image, '--format', '{{.Size}}']);
    if (r.code === 0) {
      const bytes = Number(r.stdout.trim());
      out[image] = { bytes, mb: Math.round((bytes / 1024 ** 2) * 100) / 100 };
    } else {
      out[image] = { bytes: -1, mb: -1 };
    }
  }
  return out;
}

// ---------- 6. Autocannon ----------
export interface LoadSummary {
  route: string;
  method: string;
  runs: number;
  requestsPerSec: number[];
  throughputBytesPerSec: number[];
  latencyP50: number[];
  latencyP90: number[];
  latencyP99: number[];
  non2xx: number[];
  errors: number[];
  totalRequests: number[];
}

function resolveTemplate(tpl: string, ids: Record<string, string>): string {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => ids[k] ?? '');
}

function resolveBody(
  body: Record<string, unknown>,
  ids: Record<string, string>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(body).map(([k, v]) => [k, typeof v === 'string' ? resolveTemplate(v, ids) : v]),
  );
}

export interface LoadContext {
  token: string;
  ids: Record<string, string>;
}

export async function runLoad(
  cfg: AppConfig,
  route: RouteDef,
  getContext: () => Promise<LoadContext>,
): Promise<LoadSummary> {
  const summary: LoadSummary = {
    route: route.name,
    method: route.method,
    runs: cfg.load.reps,
    requestsPerSec: [],
    throughputBytesPerSec: [],
    latencyP50: [],
    latencyP90: [],
    latencyP99: [],
    non2xx: [],
    errors: [],
    totalRequests: [],
  };

  for (let i = 0; i < cfg.load.reps; i++) {
    const ctx = await getContext();
    const url = `${cfg.baseUrl}${resolveTemplate(route.path, ctx.ids)}`;
    const headers: Record<string, string> = {};
    if (route.auth) headers['Authorization'] = `Bearer ${ctx.token}`;
    const body = route.body
      ? JSON.stringify(resolveBody(route.body, ctx.ids))
      : undefined;
    if (body) headers['Content-Type'] = 'application/json';

    const result = await autocannon({
      url,
      method: route.method,
      headers,
      body,
      connections: cfg.load.connections,
      duration: cfg.load.durationSec,
      pipelining: cfg.load.pipelining,
    });
    summary.requestsPerSec.push(result.requests.average);
    summary.throughputBytesPerSec.push(result.throughput.average);
    summary.latencyP50.push(result.latency.p50);
    summary.latencyP90.push(result.latency.p90);
    summary.latencyP99.push(result.latency.p99);
    summary.non2xx.push(result.non2xx);
    summary.errors.push(result.errors);
    summary.totalRequests.push(result.requests.total);
  }
  return summary;
}

export async function runLoadWindow(
  cfg: AppConfig,
  route: RouteDef,
  ids: Record<string, string>,
  token: string,
  durationSec: number,
): Promise<unknown> {
  const url = `${cfg.baseUrl}${resolveTemplate(route.path, ids)}`;
  const headers: Record<string, string> = {};
  if (route.auth) headers['Authorization'] = `Bearer ${token}`;
  return autocannon({
    url,
    method: route.method,
    headers,
    connections: cfg.load.connections,
    duration: durationSec,
    pipelining: cfg.load.pipelining,
  });
}

// ---------- 7. LOC (sloc) ----------
export interface LocResult {
  tool: string;
  files: number;
  total: number;
  source: number;
  comment: number;
  byModule: Record<string, { files: number; total: number; source: number; comment: number }>;
}

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else acc.push(full);
  }
  return acc;
}

export function collectLoc(cfg: AppConfig): LocResult {
  const root = fromRepo(cfg.sourceDir);
  const files = walk(root).filter((f) => f.endsWith('.ts'));
  const result: LocResult = {
    tool: 'sloc@0.3.2',
    files: 0,
    total: 0,
    source: 0,
    comment: 0,
    byModule: {},
  };

  for (const file of files) {
    const module = path.relative(root, file).split(path.sep)[0] ?? '_root';
    const stats = sloc(fs.readFileSync(file, 'utf8'), 'ts') as Record<string, number>;
    const total = stats.total ?? 0;
    const source = stats.source ?? 0;
    const comment = stats.comment ?? 0;

    result.files += 1;
    result.total += total;
    result.source += source;
    result.comment += comment;

    const m = (result.byModule[module] ??= { files: 0, total: 0, source: 0, comment: 0 });
    m.files += 1;
    m.total += total;
    m.source += source;
    m.comment += comment;
  }
  return result;
}

// ---------- 8. Components ----------
export interface ComponentsResult {
  services: string[];
  serviceCount: number;
  runningContainers: string[];
  containerCount: number;
  imageCount: number;
}

export async function collectComponents(cfg: AppConfig): Promise<ComponentsResult> {
  const svc = await compose(cfg, ['config', '--services']);
  const services = svc.stdout.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  const ps = await runOk('docker', ['ps', '--format', '{{.Names}}']);
  const running = ps.stdout
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((n) => cfg.containers.includes(n));
  return {
    services,
    serviceCount: services.length,
    runningContainers: running,
    containerCount: running.length,
    imageCount: cfg.images.length,
  };
}

// ---------- 9. Cross-domain calls (madge) ----------
export interface CrossDomainResult {
  tool: string;
  modules: string[];
  edges: Array<{ from: string; to: string; count: number }>;
  crossDomainEdges: number;
  totalEdges: number;
  byModule: Record<string, number>;
}

export async function collectCrossDomain(cfg: AppConfig): Promise<CrossDomainResult> {
  const root = fromRepo(cfg.sourceDir);
  const res = await madge(root, {
    fileExtensions: ['ts'],
    tsConfig: fromRepo(cfg.composeDir, 'tsconfig.json'),
  });
  const obj = res.obj() as Record<string, string[]>;

  const moduleOf = (p: string): string => {
    const norm = p.replace(/\\/g, '/');
    const isAbs = /^[A-Za-z]:\//.test(norm) || norm.startsWith('/');
    const rel = isAbs ? path.relative(root, norm).replace(/\\/g, '/') : norm;
    const seg = rel.split('/');
    return seg.length > 1 ? seg[0] : '_root';
  };

  const edgeMap = new Map<string, number>();
  const modules = new Set<string>();
  const byModule: Record<string, number> = {};
  let totalEdges = 0;

  for (const [from, deps] of Object.entries(obj)) {
    const mFrom = moduleOf(from);
    modules.add(mFrom);
    for (const to of deps) {
      const mTo = moduleOf(to);
      modules.add(mTo);
      totalEdges += 1;
      if (mFrom !== mTo) {
        const key = `${mFrom}->${mTo}`;
        edgeMap.set(key, (edgeMap.get(key) ?? 0) + 1);
        byModule[mFrom] = (byModule[mFrom] ?? 0) + 1;
      }
    }
  }

  const edges = [...edgeMap.entries()]
    .map(([key, count]) => {
      const [from, to] = key.split('->');
      return { from, to, count };
    })
    .sort((a, b) => b.count - a.count);

  return {
    tool: 'madge@8',
    modules: [...modules].sort(),
    edges,
    crossDomainEdges: edges.reduce((s, e) => s + e.count, 0),
    totalEdges,
    byModule,
  };
}

// ---------- 10. Parity (golden responses) ----------
export async function captureParity(
  cfg: AppConfig,
  ids: Record<string, string>,
  token: string,
): Promise<Record<string, unknown>> {
  const out: Record<string, unknown> = {};
  for (const route of cfg.routes.read) {
    const url = `${cfg.baseUrl}${resolveTemplate(route.path, ids)}`;
    const res = await httpRequest(url, { token: route.auth ? token : undefined });
    out[route.name] = { route: route.path, status: res.status, body: res.body };
  }
  return out;
}

export function resolveIdsFromApi(
  warehouses: unknown,
  products: unknown,
): Record<string, string> {
  const wh = (warehouses as { data?: { data?: Array<{ id: string }> } })?.data?.data?.[0]?.id ?? '';
  const pr = (products as { data?: { data?: Array<{ id: string }> } })?.data?.data?.[0]?.id ?? '';
  return { warehouseId: wh, productId: pr };
}
