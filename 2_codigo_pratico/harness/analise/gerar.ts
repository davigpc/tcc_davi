import path from 'node:path';
import fs from 'node:fs';
import { readJson, writeJson, writeText, ensureDir, median, mean, round } from '../lib/util.js';
import { barChart, scatterChart, heatmap } from './charts.js';

interface StatsSample {
  ts: string;
  Name: string;
  CPUPerc: string;
  MemUsage: string;
}

interface LoadStats {
  route: string;
  rpsMedian: number;
  rpsMin: number;
  rpsMax: number;
  p50Median: number;
  p50Min: number;
  p50Max: number;
  p90Median: number;
  p90Min: number;
  p90Max: number;
  p99Median: number;
  p99Min: number;
  p99Max: number;
  non2xxTotal: number;
}

interface CostStats {
  container: string;
  samples: number;
  cpuAvgPerc: number;
  cpuMinPerc: number;
  cpuMaxPerc: number;
  memAvgMB: number;
  memMinMB: number;
  memMaxMB: number;
}

const UNIT_TO_MIB: Record<string, number> = {
  B: 1 / 1024 ** 2,
  KIB: 1 / 1024,
  MIB: 1,
  GIB: 1024,
  KB: 1 / 1000,
  MB: 1,
  GB: 1000,
};

function parseMem(str: string): number {
  const first = str.split('/')[0].trim();
  const m = first.match(/([\d.]+)\s*([A-Za-z]+)/);
  if (!m) return 0;
  return Number(m[1]) * (UNIT_TO_MIB[m[2].toUpperCase()] ?? 1);
}

const parsePerc = (str: string): number => Number(str.replace('%', '')) || 0;

function aggregateStats(samples: StatsSample[], container: string): CostStats {
  const rows = samples.filter((s) => s.Name === container);
  const cpu = rows.map((r) => parsePerc(r.CPUPerc));
  const mem = rows.map((r) => parseMem(r.MemUsage));
  return {
    container,
    samples: rows.length,
    cpuAvgPerc: round(mean(cpu)),
    cpuMinPerc: round(Math.min(...cpu, Infinity)),
    cpuMaxPerc: round(Math.max(...cpu, 0)),
    memAvgMB: round(mean(mem)),
    memMinMB: round(Math.min(...mem, Infinity)),
    memMaxMB: round(Math.max(...mem, 0)),
  };
}

function loadStats(outBase: string, name: string): LoadStats {
  const s = readJson<{
    route: string;
    requestsPerSec: number[];
    latencyP50: number[];
    latencyP90: number[];
    latencyP99: number[];
    non2xx: number[];
  }>(path.join(outBase, 'raw', `autocannon-${name}.json`));
  return {
    route: s.route,
    rpsMedian: round(median(s.requestsPerSec)),
    rpsMin: round(Math.min(...s.requestsPerSec, Infinity)),
    rpsMax: round(Math.max(...s.requestsPerSec, 0)),
    p50Median: round(median(s.latencyP50)),
    p50Min: round(Math.min(...s.latencyP50, Infinity)),
    p50Max: round(Math.max(...s.latencyP50, 0)),
    p90Median: round(median(s.latencyP90)),
    p90Min: round(Math.min(...s.latencyP90, Infinity)),
    p90Max: round(Math.max(...s.latencyP90, 0)),
    p99Median: round(median(s.latencyP99)),
    p99Min: round(Math.min(...s.latencyP99, Infinity)),
    p99Max: round(Math.max(...s.latencyP99, 0)),
    non2xxTotal: s.non2xx.reduce((a, b) => a + b, 0),
  };
}

function texEsc(s: string): string {
  return s.replace(/\\/g, '\\textbackslash{}').replace(/([%&_#])/g, '\\$1');
}

export interface Summary {
  app: string;
  metodologia: string;
  snapshot: string;
  tag: string | null;
  timestampUtc: string;
  buildTime: { medianMs: number; runsMs: number[] };
  startupTime: { medianMs: number; runsMs: number[] };
  custo: { idle: CostStats[]; load: CostStats[]; imagensMB: Record<string, number> };
  desempenho: { leitura: LoadStats[]; escrita: LoadStats[] };
  manutenibilidade: {
    locTotal: number;
    locPorModulo: Record<string, number>;
    servicos: number;
    containers: number;
    crossDomainEdges: number;
    totalEdges: number;
    crossDomainPorModulo: Record<string, number>;
    crossDomainMatriz: Array<{ from: string; to: string; count: number }>;
  };
}

export function generate(outBase: string): Summary {
  const raw = (f: string): string => path.join(outBase, 'raw', f);
  const optional = <T>(f: string, fallback: T): T => (fs.existsSync(f) ? readJson<T>(f) : fallback);
  const manifest = readJson<Record<string, unknown>>(path.join(outBase, 'manifest.json'));

  const build = optional<{ reps: number; runsMs: number[] }>(raw('build-time.json'), { reps: 0, runsMs: [] });
  const startup = optional<{ reps: number; runsMs: number[] }>(raw('startup-time.json'), { reps: 0, runsMs: [] });
  const idle = readJson<StatsSample[]>(raw('docker-stats-idle.json'));
  const load = readJson<StatsSample[]>(raw('docker-stats-load.json'));
  const imgSize = readJson<Record<string, { mb: number }>>(raw('image-size.json'));
  const components = readJson<Record<string, unknown>>(raw('components.json'));
  const loc = readJson<{ total: number; byModule: Record<string, { total: number }> }>(raw('loc.json'));
  const cross = readJson<{
    crossDomainEdges: number;
    totalEdges: number;
    byModule: Record<string, number>;
    edges: Array<{ from: string; to: string; count: number }>;
  }>(raw('cross-domain-calls.json'));

  const rawNames = fs.readdirSync(path.join(outBase, 'raw')).filter((f) => f.startsWith('autocannon-'));
  const readNames = rawNames.filter((f) => !f.includes('movements-post')).map((f) => f.replace('autocannon-', '').replace('.json', ''));
  const writeNames = rawNames.filter((f) => f.includes('movements-post')).map((f) => f.replace('autocannon-', '').replace('.json', ''));
  const toStats = (names: string[]): LoadStats[] => names.map((n) => loadStats(outBase, n));

  const containers = Object.keys(idle.reduce<Record<string, true>>((a, s) => ((a[s.Name] = true), a), {}));

  const summary: Summary = {
    app: String(manifest.app),
    metodologia: String(manifest.metodologia),
    snapshot: String(manifest.snapshot),
    tag: (manifest.tag as string) ?? null,
    timestampUtc: String(manifest.timestampUtc),
    buildTime: { medianMs: median(build.runsMs), runsMs: build.runsMs },
    startupTime: { medianMs: median(startup.runsMs), runsMs: startup.runsMs },
    custo: {
      idle: containers.map((c) => aggregateStats(idle, c)),
      load: containers.map((c) => aggregateStats(load, c)),
      imagensMB: Object.fromEntries(Object.entries(imgSize).map(([k, v]) => [k, v.mb])),
    },
    desempenho: { leitura: toStats(readNames), escrita: toStats(writeNames) },
    manutenibilidade: {
      locTotal: loc.total,
      locPorModulo: Object.fromEntries(Object.entries(loc.byModule).map(([k, v]) => [k, v.total])),
      servicos: Number(components.serviceCount ?? 0),
      containers: Number(components.containerCount ?? 0),
      crossDomainEdges: cross.crossDomainEdges,
      totalEdges: cross.totalEdges,
      crossDomainPorModulo: cross.byModule,
      crossDomainMatriz: cross.edges,
    },
  };

  writeJson(path.join(outBase, 'processed', 'summary.json'), summary);
  writeText(path.join(outBase, 'tabelas', 'metricas.tex'), texTable(summary));
  writeFigures(outBase, summary);
  writeText(path.join(outBase, 'resumo.md'), markdown(summary));
  return summary;
}

function writeFigures(outBase: string, s: Summary): void {
  const fig = (name: string, svg: string): void =>
    writeText(path.join(outBase, 'figuras', name), svg);

  const routes = [...s.desempenho.leitura, ...s.desempenho.escrita];
  const labels = routes.map((r) => r.route);

  fig(
    'vazao-rotas.svg',
    barChart({
      title: `Vazao por rota — ${s.snapshot}`,
      categories: labels,
      series: [{ name: 'req/s', values: routes.map((r) => r.rpsMedian) }],
      horizontal: true,
      valueUnit: 'req/s',
    }),
  );

  fig(
    'latencia-rotas.svg',
    barChart({
      title: `Latencia por rota — ${s.snapshot}`,
      categories: labels,
      series: [
        { name: 'p50', values: routes.map((r) => r.p50Median), errors: { min: routes.map((r) => r.p50Min), max: routes.map((r) => r.p50Max) } },
        { name: 'p90', values: routes.map((r) => r.p90Median), errors: { min: routes.map((r) => r.p90Min), max: routes.map((r) => r.p90Max) } },
        { name: 'p99', values: routes.map((r) => r.p99Median), errors: { min: routes.map((r) => r.p99Min), max: routes.map((r) => r.p99Max) } },
      ],
      valueUnit: 'ms',
    }),
  );

  const byName = (arr: CostStats[]): Map<string, CostStats> => new Map(arr.map((c) => [c.container, c]));
  const idleMap = byName(s.custo.idle);
  const loadMap = byName(s.custo.load);
  const contLabels = s.custo.idle.map((c) => c.container);

  fig(
    'cpu-repouso-carga.svg',
    barChart({
      title: `CPU por container (repouso x carga) — ${s.snapshot}`,
      categories: contLabels,
      series: [
        { name: 'Repouso', values: contLabels.map((c) => idleMap.get(c)?.cpuAvgPerc ?? 0), errors: { min: contLabels.map((c) => idleMap.get(c)?.cpuMinPerc ?? 0), max: contLabels.map((c) => idleMap.get(c)?.cpuMaxPerc ?? 0) } },
        { name: 'Carga', values: contLabels.map((c) => loadMap.get(c)?.cpuAvgPerc ?? 0), errors: { min: contLabels.map((c) => loadMap.get(c)?.cpuMinPerc ?? 0), max: contLabels.map((c) => loadMap.get(c)?.cpuMaxPerc ?? 0) } },
      ],
      valueUnit: '%',
    }),
  );

  fig(
    'ram-repouso-carga.svg',
    barChart({
      title: `RAM por container (repouso x carga) — ${s.snapshot}`,
      categories: contLabels,
      series: [
        { name: 'Repouso', values: contLabels.map((c) => idleMap.get(c)?.memAvgMB ?? 0) },
        { name: 'Carga', values: contLabels.map((c) => loadMap.get(c)?.memAvgMB ?? 0) },
      ],
      valueUnit: 'MB',
    }),
  );

  const sortedDesc = (rec: Record<string, number>): Array<[string, number]> =>
    Object.entries(rec).sort((a, b) => b[1] - a[1]);

  const locEntries = sortedDesc(s.manutenibilidade.locPorModulo);
  fig(
    'loc-modulos.svg',
    barChart({
      title: `LOC por modulo — ${s.snapshot}`,
      categories: locEntries.map(([k]) => k),
      series: [{ name: 'linhas', values: locEntries.map(([, v]) => v) }],
      horizontal: true,
      valueUnit: 'linhas',
    }),
  );

  const xdEntries = sortedDesc(s.manutenibilidade.crossDomainPorModulo);
  fig(
    'cross-domain-modulos.svg',
    barChart({
      title: `Chamadas entre fronteiras por modulo — ${s.snapshot}`,
      categories: xdEntries.map(([k]) => k),
      series: [{ name: 'chamadas', values: xdEntries.map(([, v]) => v) }],
      horizontal: true,
      valueUnit: 'chamadas',
    }),
  );

  const imgEntries = Object.entries(s.custo.imagensMB);
  fig(
    'imagens.svg',
    barChart({
      title: `Tamanho das imagens — ${s.snapshot}`,
      categories: imgEntries.map(([k]) => k),
      series: [{ name: 'MB', values: imgEntries.map(([, v]) => v) }],
      horizontal: true,
      valueUnit: 'MB',
    }),
  );

  fig(
    'vazao-latencia-dispersao.svg',
    scatterChart({
      title: `Vazao x latencia — ${s.snapshot}`,
      points: routes.map((r) => ({ x: r.p50Median, y: r.rpsMedian, label: r.route })),
      xLabel: 'Latencia p50 (ms)',
      yLabel: 'Vazao (req/s)',
    }),
  );

  const modules = [...new Set(s.manutenibilidade.crossDomainMatriz.flatMap((e) => [e.from, e.to]))].sort();
  const idx = new Map(modules.map((m, i) => [m, i]));
  const matrix = modules.map(() => modules.map(() => 0));
  for (const e of s.manutenibilidade.crossDomainMatriz) {
    const i = idx.get(e.from);
    const j = idx.get(e.to);
    if (i !== undefined && j !== undefined) matrix[i][j] = e.count;
  }
  fig(
    'cross-domain-heatmap.svg',
    heatmap({
      title: `Matriz de chamadas entre fronteiras — ${s.snapshot}`,
      rows: modules,
      cols: modules,
      values: matrix,
    }),
  );
}

function texTable(s: Summary): string {
  const rows: string[] = [];
  const add = (dim: string, met: string, val: string): void => {
    rows.push(`    ${texEsc(dim)} & ${texEsc(met)} & ${texEsc(val)} \\\\`);
  };

  add('Agilidade', 'Tempo de build (mediana)', `${s.buildTime.medianMs} ms`);
  add('Agilidade', 'Tempo de inicializacao (mediana)', `${s.startupTime.medianMs} ms`);
  for (const c of s.custo.idle) {
    add('Custo', `CPU repouso ${c.container}`, `${c.cpuAvgPerc} %`);
    add('Custo', `RAM repouso ${c.container}`, `${c.memAvgMB} MB`);
  }
  for (const [img, mb] of Object.entries(s.custo.imagensMB)) add('Custo', `Imagem ${img}`, `${mb} MB`);
  for (const x of [...s.desempenho.leitura, ...s.desempenho.escrita]) {
    add('Desempenho', `Vazao ${x.route}`, `${x.rpsMedian} req/s`);
    add('Desempenho', `Latencia p50/p90/p99 ${x.route}`, `${x.p50Median} / ${x.p90Median} / ${x.p99Median} ms`);
  }
  add('Manutenibilidade', 'LOC total', `${s.manutenibilidade.locTotal}`);
  add('Manutenibilidade', 'Servicos/containers', `${s.manutenibilidade.servicos} / ${s.manutenibilidade.containers}`);
  add('Manutenibilidade', 'Chamadas entre fronteiras', `${s.manutenibilidade.crossDomainEdges} de ${s.manutenibilidade.totalEdges}`);

  return `% Gerado automaticamente por harness/analise/gerar.ts
% app: ${s.app} | metodologia: ${s.metodologia} | snapshot: ${s.snapshot}
\\begin{table}[htb]
  \\centering
  \\caption{Metricas (${texEsc(s.app)}, ${texEsc(s.metodologia)}, ${texEsc(s.snapshot)}).}
  \\label{tab:metricas-${texEsc(s.app)}-${texEsc(s.metodologia)}-${texEsc(s.snapshot)}}
  \\begin{tabular}{llr}
    \\hline
    \\textbf{Dimensao} & \\textbf{Metrica} & \\textbf{Valor} \\\\
    \\hline
${rows.join('\n')}
    \\hline
  \\end{tabular}
\\end{table}
`;
}

function markdown(s: Summary): string {
  const lines = [
    `# Resumo — ${s.app} / ${s.metodologia} / ${s.snapshot}`,
    '',
    `- Tag: ${s.tag ?? '(sem tag)'}`,
    `- Coletado em: ${s.timestampUtc}`,
    `- Build (mediana): ${s.buildTime.medianMs} ms`,
    `- Inicializacao (mediana): ${s.startupTime.medianMs} ms`,
    `- LOC total: ${s.manutenibilidade.locTotal}`,
    `- Chamadas entre fronteiras: ${s.manutenibilidade.crossDomainEdges} de ${s.manutenibilidade.totalEdges}`,
    `- Servicos/containers: ${s.manutenibilidade.servicos} / ${s.manutenibilidade.containers}`,
    '',
    '## Desempenho (mediana; min-max entre parenteses)',
    '| Rota | req/s | p50 | p90 | p99 | non2xx |',
    '|---|---|---|---|---|---|',
    ...[...s.desempenho.leitura, ...s.desempenho.escrita].map(
      (x) =>
        `| ${x.route} | ${x.rpsMedian} (${x.rpsMin}-${x.rpsMax}) | ${x.p50Median} | ${x.p90Median} | ${x.p99Median} | ${x.non2xxTotal} |`,
    ),
    '',
  ];
  return lines.join('\n');
}

if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('analise/gerar.ts')) {
  const target = process.argv[2];
  if (!target) {
    console.error('uso: tsx analise/gerar.ts <dir-do-snapshot>');
    process.exit(1);
  }
  ensureDir(target);
  console.log(JSON.stringify(generate(target), null, 2));
}
