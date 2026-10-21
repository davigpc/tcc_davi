import fs from 'node:fs';
import path from 'node:path';
import { fromRepo } from '../lib/paths.js';
import { readJson, writeJson, writeText, ensureDir, mean } from '../lib/util.js';
import type { Summary } from './gerar.js';

const METRICAS_DIR = fromRepo('2_codigo_pratico', 'metricas');
const COMPARATIVOS_DIR = path.join(METRICAS_DIR, 'comparativos');
const MONOGRAFIA_TABELAS_DIR = fromRepo('1_texto_tcc', 'monografia', 'tabelas');

const APP_LABEL: Record<string, string> = {
  'inventory-api': 'Inventário',
  auction: 'Leilões',
  ecommerce: 'E-commerce',
};

const METODOLOGIA_LABEL: Record<string, string> = {
  'capacidade-negocio': 'Capacidade de Negócio',
  subdominio: 'Subdomínio (DDD)',
  transacoes: 'Transações',
};

type Categoria = 'Agilidade' | 'Custo' | 'Desempenho' | 'Manutenibilidade';

interface Row {
  label: string;
  categoria: Categoria;
  valores: (s: Summary) => number[];
  fmtValor: (v: number[]) => string;
  deltas: (first: Summary, last: Summary) => number[];
  fmtDelta: (d: number[]) => string;
}

const fmtNum = (n: number, maxDigits = 2): string => {
  const rounded = Math.round(n * 10 ** maxDigits) / 10 ** maxDigits;
  const [int, dec] = rounded.toString().split('.');
  const intSep = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return dec ? `${intSep},${dec}` : intSep;
};

const texEsc = (s: string): string =>
  s.replace(/\\/g, '\\textbackslash{}').replace(/([%&_#])/g, '\\$1');

const deltaPct = (a: number, b: number): number => (a === 0 ? 0 : ((b - a) / a) * 100);

const fmtSigned = (n: number, digits: number, unit: string): string =>
  n < 0 ? `$-$ ${fmtNum(Math.abs(n), digits)} ${unit}` : `+${fmtNum(n, digits)} ${unit}`;

const fmtDelta = (d: number): string => fmtSigned(d, 0, '\\%');

const fmtDeltaPp = (d: number): string => fmtSigned(d, 2, 'p.p.');

const fmtDeltaPair = (d: number[]): string => d.map(fmtDelta).join(' / ');

const cpuIdle = (s: Summary): number => s.custo.idle.reduce((a, c) => a + c.cpuAvgPerc, 0);
const cpuLoad = (s: Summary): number => s.custo.load.reduce((a, c) => a + c.cpuAvgPerc, 0);
const ramIdle = (s: Summary): number => s.custo.idle.reduce((a, c) => a + c.memAvgMB, 0);
const ramLoad = (s: Summary): number => s.custo.load.reduce((a, c) => a + c.memAvgMB, 0);
const imgTotal = (s: Summary): number =>
  Object.entries(s.custo.imagensMB)
    .filter(([nome]) => !/postgres/i.test(nome))
    .reduce((a, [, mb]) => a + mb, 0);
const rotas = (s: Summary): Summary['desempenho']['leitura'] => [
  ...s.desempenho.leitura,
  ...s.desempenho.escrita,
];
const vazaoMedia = (s: Summary): number => mean(rotas(s).map((r) => r.rpsMean));
const latMedia = (s: Summary): number => mean(rotas(s).map((r) => r.p50Mean));

const ROWS: Row[] = [
  {
    label: 'Tempo de construção (ms)',
    categoria: 'Agilidade',
    valores: (s) => [s.buildTime.meanMs],
    fmtValor: (v) => fmtNum(v[0], 0),
    deltas: (a, b) => [deltaPct(a.buildTime.meanMs, b.buildTime.meanMs)],
    fmtDelta: (d) => fmtDelta(d[0]),
  },
  {
    label: 'Tempo de inicialização (ms)',
    categoria: 'Agilidade',
    valores: (s) => [s.startupTime.meanMs],
    fmtValor: (v) => fmtNum(v[0], 0),
    deltas: (a, b) => [deltaPct(a.startupTime.meanMs, b.startupTime.meanMs)],
    fmtDelta: (d) => fmtDelta(d[0]),
  },
  {
    label: 'CPU total (repouso / carga, %)',
    categoria: 'Custo',
    valores: (s) => [cpuIdle(s), cpuLoad(s)],
    fmtValor: (v) => `${fmtNum(v[0])} / ${fmtNum(v[1])}`,
    deltas: (a, b) => [cpuIdle(b) - cpuIdle(a), deltaPct(cpuLoad(a), cpuLoad(b))],
    fmtDelta: (d) => `${fmtDeltaPp(d[0])} / ${fmtDelta(d[1])}`,
  },
  {
    label: 'RAM total (repouso / carga, MB)',
    categoria: 'Custo',
    valores: (s) => [ramIdle(s), ramLoad(s)],
    fmtValor: (v) => `${fmtNum(v[0])} / ${fmtNum(v[1])}`,
    deltas: (a, b) => [deltaPct(ramIdle(a), ramIdle(b)), deltaPct(ramLoad(a), ramLoad(b))],
    fmtDelta: fmtDeltaPair,
  },
  {
    label: 'Imagens da aplicação (MB)',
    categoria: 'Custo',
    valores: (s) => [imgTotal(s)],
    fmtValor: (v) => fmtNum(v[0], 1),
    deltas: (a, b) => [deltaPct(imgTotal(a), imgTotal(b))],
    fmtDelta: (d) => fmtDelta(d[0]),
  },
  {
    label: 'Componentes / contêineres',
    categoria: 'Custo',
    valores: (s) => [s.manutenibilidade.servicos, s.manutenibilidade.containers],
    fmtValor: (v) => `${fmtNum(v[0], 0)} / ${fmtNum(v[1], 0)}`,
    deltas: (a, b) => [b.manutenibilidade.containers - a.manutenibilidade.containers],
    fmtDelta: (d) => (d[0] < 0 ? `$-$ ${fmtNum(Math.abs(d[0]), 0)}` : `+${fmtNum(d[0], 0)}`),
  },
  {
    label: 'Vazão (média das rotas, req/s)',
    categoria: 'Desempenho',
    valores: (s) => [vazaoMedia(s)],
    fmtValor: (v) => fmtNum(v[0], 1),
    deltas: (a, b) => [deltaPct(vazaoMedia(a), vazaoMedia(b))],
    fmtDelta: (d) => fmtDelta(d[0]),
  },
  {
    label: 'Latência p50 (média das rotas, ms)',
    categoria: 'Desempenho',
    valores: (s) => [latMedia(s)],
    fmtValor: (v) => fmtNum(v[0], 1),
    deltas: (a, b) => [deltaPct(latMedia(a), latMedia(b))],
    fmtDelta: (d) => fmtDelta(d[0]),
  },
  {
    label: 'Linhas de Código',
    categoria: 'Manutenibilidade',
    valores: (s) => [s.manutenibilidade.locTotal],
    fmtValor: (v) => fmtNum(v[0], 0),
    deltas: (a, b) => [deltaPct(a.manutenibilidade.locTotal, b.manutenibilidade.locTotal)],
    fmtDelta: (d) => fmtDelta(d[0]),
  },
  {
    label: 'Chamadas entre fronteiras',
    categoria: 'Manutenibilidade',
    valores: (s) => [s.manutenibilidade.crossDomainEdges, s.manutenibilidade.totalEdges],
    fmtValor: (v) => `${fmtNum(v[0], 0)} de ${fmtNum(v[1], 0)}`,
    deltas: (a, b) => [
      deltaPct(a.manutenibilidade.crossDomainEdges, b.manutenibilidade.crossDomainEdges),
    ],
    fmtDelta: (d) => fmtDelta(d[0]),
  },
];

const CATEGORIAS: Categoria[] = ['Agilidade', 'Custo', 'Desempenho', 'Manutenibilidade'];

interface SnapshotData {
  nome: string;
  summary: Summary;
}

const snapshotOrder = (nome: string): number => {
  const m = nome.match(/snapshot-(\d+)/);
  if (m) return Number(m[1]);
  return 1000;
};

const snapshotLabel = (nome: string): string => {
  const m = nome.match(/snapshot-(\d+)/);
  if (m) return `S${m[1]}`;
  if (/final/.test(nome)) return 'Final';
  return nome;
};

interface BaselineRef {
  metodologia: string;
  snapshot: string;
}

interface CanonicalBaseline {
  summary: Summary;
  ref: BaselineRef;
  label: string;
}

const BASELINES_PATH = fromRepo(
  '2_codigo_pratico',
  'harness',
  'analise',
  'baselines.json',
);

const snapshotsJsonPath = (app: string, metodologia: string): string =>
  path.join(COMPARATIVOS_DIR, `${app}__${metodologia}__snapshots.json`);

function listSnapshots(app: string, metodologia: string): SnapshotData[] {
  const base = path.join(METRICAS_DIR, app, metodologia);
  if (fs.existsSync(base)) {
    const fromDisk = fs
      .readdirSync(base, { withFileTypes: true })
      .filter((d) => d.isDirectory() && d.name.startsWith('snapshot'))
      .map((d) => ({
        nome: d.name,
        summaryPath: path.join(base, d.name, 'processed', 'summary.json'),
      }))
      .filter((d) => fs.existsSync(d.summaryPath))
      .sort((a, b) => snapshotOrder(a.nome) - snapshotOrder(b.nome))
      .map((d) => ({ nome: d.nome, summary: readJson<Summary>(d.summaryPath) }));
    if (fromDisk.length) return fromDisk;
  }

  const jsonPath = snapshotsJsonPath(app, metodologia);
  if (!fs.existsSync(jsonPath)) return [];
  const data = readJson<{ snapshots: SnapshotData[] }>(jsonPath);
  return (data.snapshots ?? [])
    .map((s) => ({ nome: s.nome, summary: s.summary }))
    .sort((a, b) => snapshotOrder(a.nome) - snapshotOrder(b.nome));
}

function loadBaselines(): Record<string, BaselineRef> {
  if (!fs.existsSync(BASELINES_PATH)) return {};
  return readJson<Record<string, BaselineRef>>(BASELINES_PATH);
}

function resolveCanonicalBaseline(
  app: string,
  baselines: Record<string, BaselineRef>,
): CanonicalBaseline | null {
  const ref = baselines[app];
  if (!ref) return null;
  const found = listSnapshots(app, ref.metodologia).find((s) => s.nome === ref.snapshot);
  if (!found) {
    console.warn(`[warn] baseline canônico não encontrado para ${app}: ${ref.metodologia}/${ref.snapshot}`);
    return null;
  }
  const metLabel = METODOLOGIA_LABEL[ref.metodologia] ?? ref.metodologia;
  return {
    summary: found.summary,
    ref,
    label: `${metLabel} / ${snapshotLabel(ref.snapshot)}`,
  };
}

function discoverAppMetodologias(): Array<{ app: string; metodologia: string }> {
  const pairs = new Map<string, { app: string; metodologia: string }>();
  const add = (app: string, metodologia: string): void => {
    pairs.set(`${app}__${metodologia}`, { app, metodologia });
  };

  for (const app of fs.readdirSync(METRICAS_DIR, { withFileTypes: true })) {
    if (!app.isDirectory() || app.name === 'comparativos') continue;
    const appDir = path.join(METRICAS_DIR, app.name);
    for (const met of fs.readdirSync(appDir, { withFileTypes: true })) {
      if (met.isDirectory()) add(app.name, met.name);
    }
  }

  for (const file of fs.readdirSync(COMPARATIVOS_DIR)) {
    const m = file.match(/^(.+)__(.+)__snapshots\.json$/);
    if (m) add(m[1], m[2]);
  }

  return [...pairs.values()].sort((a, b) =>
    a.app === b.app
      ? a.metodologia.localeCompare(b.metodologia)
      : a.app.localeCompare(b.app),
  );
}

function texSnapshotsTable(
  app: string,
  metodologia: string,
  snaps: SnapshotData[],
  baseline: CanonicalBaseline | null,
): string {
  const replaceFirst = baseline !== null && snaps[0]?.nome === 'snapshot-0';
  const prependBaseline = baseline !== null && !replaceFirst;
  const cols = snaps.length + (prependBaseline ? 1 : 0);
  const heads = [
    ...(prependBaseline ? [`\\textbf{${snapshotLabel('snapshot-0')}}`] : []),
    ...snaps.map((s) => `\\textbf{${snapshotLabel(s.nome)}}`),
  ];
  const head = heads.join(' & ');
  const summaries = [
    ...(prependBaseline && baseline ? [baseline.summary] : []),
    ...snaps.map((s, i) =>
      i === 0 && replaceFirst && baseline ? baseline.summary : s.summary,
    ),
  ];
  const rows: string[] = [];
  for (const cat of CATEGORIAS) {
    const catRows = ROWS.filter((r) => r.categoria === cat);
    if (!catRows.length) continue;
    rows.push(`    \\multicolumn{${cols + 1}}{l}{\\textit{${texEsc(cat)}}} \\\\`);
    for (const r of catRows) {
      const cells = summaries.map((s) => r.fmtValor(r.valores(s))).join(' & ');
      rows.push(`    ${texEsc(r.label)} & ${cells} \\\\`);
    }
  }
  const appLabel = APP_LABEL[app] ?? app;
  const metLabel = METODOLOGIA_LABEL[metodologia] ?? metodologia;
  const baselineNote = baseline
    ? ` S0 = baseline canônico (${texEsc(baseline.label)}); demais snapshots medidos nesta trilha.`
    : '';
  return `% Gerado automaticamente por harness/analise/comparar.ts
\\begin{table}[htb]
  \\centering
  \\caption{${texEsc(appLabel)} — métricas por snapshot (${texEsc(metLabel)}).}
  \\label{tab:comp_${app}_${metodologia}_snapshots}
  \\resizebox{\\textwidth}{!}{%
  \\begin{tabular}{l${'r'.repeat(cols)}}
    \\hline
    \\textbf{Métrica} & ${head} \\\\
    \\hline
${rows.join('\n')}
    \\hline
  \\end{tabular}}
  \\legend{Fonte: medição automatizada do experimento (média de três execuções).${baselineNote}}
\\end{table}
`;
}

interface AppDelta {
  app: string;
  deltas: number[][];
  baselineLabel: string | null;
}

interface VariacaoMetodologia {
  metodologia: string;
  apps: AppDelta[];
}

function collectAppDeltas(
  app: string,
  metodologia: string,
  baseline: CanonicalBaseline | null,
): number[][] | null {
  const snaps = listSnapshots(app, metodologia);
  if (snaps.length < 2) return null;
  const first = baseline?.summary ?? snaps[0].summary;
  const last = snaps[snaps.length - 1].summary;
  return ROWS.map((r) => r.deltas(first, last));
}

function texVariacoesTable(v: VariacaoMetodologia): string {
  const appNames = v.apps.map((a) => a.app);
  const withMean = appNames.length > 1;
  const ncols = appNames.length + (withMean ? 1 : 0);
  const header = appNames.map((a) => `\\textbf{${texEsc(APP_LABEL[a] ?? a)}}`).join(' & ');
  const rows: string[] = [];
  for (const cat of CATEGORIAS) {
    const catRows = ROWS.filter((r) => r.categoria === cat);
    if (!catRows.length) continue;
    rows.push(`    \\multicolumn{${ncols + 1}}{l}{\\textit{${texEsc(cat)}}} \\\\`);
    for (let i = 0; i < ROWS.length; i++) {
      const r = ROWS[i];
      if (r.categoria !== cat) continue;
      const cells = v.apps.map((a) => r.fmtDelta(a.deltas[i])).join(' & ');
      const len = v.apps[0].deltas[i].length;
      const medVec = Array.from({ length: len }, (_, j) =>
        mean(v.apps.map((a) => a.deltas[i][j])),
      );
      rows.push(`    ${texEsc(r.label)} & ${cells}${withMean ? ` & ${r.fmtDelta(medVec)}` : ''} \\\\`);
    }
  }
  const metLabel = METODOLOGIA_LABEL[v.metodologia] ?? v.metodologia;
  const baselineLabels = [
    ...new Set(v.apps.map((a) => a.baselineLabel).filter((x): x is string => x !== null)),
  ];
  const canonical = baselineLabels.length === 1 && v.apps.every((a) => a.baselineLabel !== null);
  const baselinePhrase = canonical ? 'S0 canônico' : 'S0';
  const baselineNote = canonical
    ? ` S0 canônico: ${texEsc(baselineLabels[0])}.`
    : '';
  const cpuNote = ' A variação de CPU em repouso é expressa em pontos percentuais (p.p.); as demais, em variação relativa.';
  return `% Gerado automaticamente por harness/analise/comparar.ts
\\begin{table}[htb]
  \\centering
  \\caption{Variação acumulada por aplicação — ${texEsc(metLabel)} (${baselinePhrase} $\\rightarrow$ último snapshot).}
  \\label{tab:comp_${v.metodologia}_variacoes}
  \\begin{tabular}{l${'r'.repeat(ncols)}}
    \\hline
    \\textbf{Métrica} & ${header}${withMean ? ' & \\textbf{Média}' : ''} \\\\
    \\hline
${rows.join('\n')}
    \\hline
  \\end{tabular}
  \\legend{Fonte: elaborado pelo autor (2026) a partir da medição automatizada.${baselineNote}${cpuNote}}
\\end{table}
`;
}

function texMetodologiasTable(metodologias: VariacaoMetodologia[]): string {
  const nomes = metodologias.map((m) => m.metodologia);
  if (metodologias.length < 2) {
    return `% Gerado automaticamente por harness/analise/comparar.ts
% Tabela de comparação entre metodologias: pendente (necessário >= 2 metodologias com >= 2 snapshots).
`;
  }
  const rows: string[] = [];
  for (const cat of CATEGORIAS) {
    const catRows = ROWS.map((r, i) => ({ r, i })).filter((x) => x.r.categoria === cat);
    if (!catRows.length) continue;
    rows.push(`    \\multicolumn{${nomes.length + 1}}{l}{\\textit{${texEsc(cat)}}} \\\\`);
    for (const { r, i } of catRows) {
      const cells = metodologias.map((m) => {
        const deltas = m.apps.map((a) => a.deltas[i]).filter((d): d is number[] => Array.isArray(d));
        if (!deltas.length) return '--';
        const len = deltas[0].length;
        const med = Array.from({ length: len }, (_, j) => mean(deltas.map((d) => d[j])));
        return r.fmtDelta(med);
      });
      rows.push(`    ${texEsc(r.label)} & ${cells.join(' & ')} \\\\`);
    }
  }
  const header = nomes.map((n) => `\\textbf{${texEsc(METODOLOGIA_LABEL[n] ?? n)}}`).join(' & ');
  const baselineLabels = [
    ...new Set(
      metodologias
        .flatMap((m) => m.apps.map((a) => a.baselineLabel))
        .filter((x): x is string => x !== null),
    ),
  ];
  const baselineNote =
    baselineLabels.length === 1 ? ` S0 canônico: ${texEsc(baselineLabels[0])}.` : '';
  const cpuNote =
    ' A variação de CPU em repouso é expressa em pontos percentuais (p.p.); as demais, em variação relativa.';
  return `% Gerado automaticamente por harness/analise/comparar.ts
\\begin{table}[htb]
  \\centering
  \\caption{Variação acumulada por metodologia (S0 canônico $\\rightarrow$ último snapshot).}
  \\label{tab:comp_metodologias}
  \\resizebox{\\textwidth}{!}{%
  \\begin{tabular}{l${'r'.repeat(nomes.length)}}
    \\hline
    \\textbf{Métrica} & ${header} \\\\
    \\hline
${rows.join('\n')}
    \\hline
  \\end{tabular}}
  \\legend{Fonte: elaborado pelo autor (2026) a partir da medição automatizada.${baselineNote}${cpuNote}}
\\end{table}
`;
}

function writeBoth(nomeArquivo: string, conteudo: string): void {
  writeText(path.join(COMPARATIVOS_DIR, nomeArquivo), conteudo);
  writeText(path.join(MONOGRAFIA_TABELAS_DIR, nomeArquivo), conteudo);
}

function main(): void {
  ensureDir(COMPARATIVOS_DIR);
  ensureDir(MONOGRAFIA_TABELAS_DIR);

  const baselines = loadBaselines();
  const appsDeltasByMet = new Map<string, AppDelta[]>();

  for (const { app, metodologia } of discoverAppMetodologias()) {
    const snaps = listSnapshots(app, metodologia);
    if (!snaps.length) continue;
    const baseline = resolveCanonicalBaseline(app, baselines);
    const snapFile = `${app}__${metodologia}__snapshots.tex`;
    writeBoth(snapFile, texSnapshotsTable(app, metodologia, snaps, baseline));
    writeJson(path.join(COMPARATIVOS_DIR, `${app}__${metodologia}__snapshots.json`), {
      app,
      metodologia,
      s0Canonico: baseline
        ? {
            label: baseline.label,
            metodologia: baseline.ref.metodologia,
            snapshot: baseline.ref.snapshot,
            summary: baseline.summary,
          }
        : null,
      snapshots: snaps.map((s) => ({ nome: s.nome, summary: s.summary })),
    });
    console.log(`[ok] ${snapFile}`);

    const deltas = collectAppDeltas(app, metodologia, baseline);
    if (!deltas) continue;
    const list = appsDeltasByMet.get(metodologia) ?? [];
    list.push({ app, deltas, baselineLabel: baseline?.label ?? null });
    list.sort((a, b) => a.app.localeCompare(b.app));
    appsDeltasByMet.set(metodologia, list);
  }

  const variacoes: VariacaoMetodologia[] = [];
  for (const metodologia of [...appsDeltasByMet.keys()].sort()) {
    const v: VariacaoMetodologia = {
      metodologia,
      apps: appsDeltasByMet.get(metodologia) ?? [],
    };
    variacoes.push(v);
    const file = `${metodologia}__variacoes.tex`;
    writeBoth(file, texVariacoesTable(v));
    console.log(`[ok] ${file}`);
  }

  writeBoth('_metodologias.tex', texMetodologiasTable(variacoes));
  console.log('[ok] _metodologias.tex');
}

main();
