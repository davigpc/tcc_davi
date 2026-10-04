import path from 'node:path';
import { HARNESS_DIR, fromRepo } from '../lib/paths.js';
import { ensureDir, readJson, writeJson } from '../lib/util.js';
import { httpRequest, login } from '../lib/http.js';
import { gatherManifest } from '../lib/manifest.js';
import * as C from './collectors.js';
import { generate } from '../analise/gerar.js';

interface Args {
  app?: string;
  metodologia?: string;
  snapshot?: string;
  tag?: string;
  'skip-build'?: string;
  'build-reps'?: string;
  'load-reps'?: string;
  'startup-reps'?: string;
}

function parseArgs(argv: string[]): Args {
  const args: Args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const val = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'true';
      (args as Record<string, string>)[key] = val;
    }
  }
  return args;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const { app, metodologia, snapshot } = args;
  if (!app || !metodologia || !snapshot) {
    throw new Error('uso: tsx coleta/run-snapshot.ts --app <app> --metodologia <m> --snapshot <s> [--tag <t>]');
  }

  const cfg = readJson<C.AppConfig>(path.join(HARNESS_DIR, 'apps', `${app}.json`));
  if (args['build-reps']) cfg.buildReps = Number(args['build-reps']);
  if (args['load-reps']) cfg.load.reps = Number(args['load-reps']);
  if (args['startup-reps']) cfg.startupReps = Number(args['startup-reps']);

  const outBase = fromRepo('2_codigo_pratico', 'metricas', app, metodologia, snapshot);
  const rawDir = path.join(outBase, 'raw');
  const paridadeDir = path.join(outBase, 'paridade');
  ensureDir(rawDir);
  ensureDir(paridadeDir);

  console.log(`\n=== snapshot: ${app} / ${metodologia} / ${snapshot} ===`);
  console.log(`saida: ${outBase}\n`);

  let token = '';
  let ids: Record<string, string> = {};

  const discoverIds = async (t: string): Promise<Record<string, string>> => {
    const w = await httpRequest(`${cfg.baseUrl}/api/warehouses`, { token: t });
    const p = await httpRequest(`${cfg.baseUrl}/api/products`, { token: t });
    return C.resolveIdsFromApi(w.body, p.body);
  };
  const readCtx = async (): Promise<C.LoadContext> => ({ token, ids });
  const writeCtx = async (): Promise<C.LoadContext> => {
    await C.seedDatabase(cfg);
    const t = await login(cfg.baseUrl, cfg.credentials.email, cfg.credentials.password);
    return { token: t, ids: await discoverIds(t) };
  };

  if (args['skip-build'] !== 'true') {
    console.log('[1/11] build time (--no-cache x' + cfg.buildReps + ')');
    writeJson(path.join(rawDir, 'build-time.json'), await C.collectBuildTime(cfg));
  } else {
    console.log('[1/11] build time — pulado');
  }

  console.log('[2/11] startup time');
  writeJson(path.join(rawDir, 'startup-time.json'), await C.collectStartupTime(cfg));

  console.log('[3/11] seed deterministico');
  await C.seedDatabase(cfg);

  console.log('[4/11] login + descoberta de ids + paridade');
  token = await login(cfg.baseUrl, cfg.credentials.email, cfg.credentials.password);
  ids = await discoverIds(token);
  writeJson(path.join(paridadeDir, 'golden.json'), await C.captureParity(cfg, ids, token));

  console.log('[5/11] docker stats (repouso)');
  writeJson(path.join(rawDir, 'docker-stats-idle.json'), await C.sampleDockerStats(cfg.statsIdleSec));

  console.log('[6/11] autocannon (rotas de leitura)');
  const readLoads = [];
  for (const route of cfg.routes.read) {
    console.log(`      - ${route.name}`);
    const summary = await C.runLoad(cfg, route, readCtx);
    readLoads.push(summary);
    writeJson(path.join(rawDir, `autocannon-${route.name}.json`), summary);
  }

  console.log('[7/11] docker stats (sob carga)');
  const [statsLoad] = await Promise.all([
    C.sampleDockerStats(cfg.statsLoadSec),
    C.runLoadWindow(cfg, cfg.routes.read[0], ids, token, cfg.statsLoadSec + 2),
  ]);
  writeJson(path.join(rawDir, 'docker-stats-load.json'), statsLoad);

  console.log('[8/11] autocannon (rota de escrita, com reset)');
  const writeLoads = [];
  for (const route of cfg.routes.write) {
    const summary = await C.runLoad(cfg, route, writeCtx);
    writeLoads.push(summary);
    writeJson(path.join(rawDir, `autocannon-${route.name}.json`), summary);
  }

  console.log('[9/11] tamanho de imagens + componentes');
  writeJson(path.join(rawDir, 'image-size.json'), await C.collectImageSize(cfg));
  writeJson(path.join(rawDir, 'components.json'), await C.collectComponents(cfg));

  console.log('[10/11] LOC (sloc) + cross-domain (madge)');
  writeJson(path.join(rawDir, 'loc.json'), C.collectLoc(cfg));
  writeJson(path.join(rawDir, 'cross-domain-calls.json'), await C.collectCrossDomain(cfg));

  console.log('[11/11] manifest');
  const manifest = await gatherManifest({
    app,
    metodologia,
    snapshot,
    tag: args.tag ?? null,
    composeDir: cfg.composeDir,
    composeFile: cfg.composeFile,
    load: cfg.load,
    repetitions: { build: cfg.buildReps, startup: cfg.startupReps, load: cfg.load.reps },
  });
  writeJson(path.join(outBase, 'manifest.json'), manifest);

  console.log('\n--- analise (derivacao) ---');
  generate(outBase);
  console.log('\n✅ snapshot concluido\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
