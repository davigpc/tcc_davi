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

const fmtDelta = (d: number): string =>
  d < 0 ? `$-$ ${fmtNum(Math.abs(d), 0)} \\%` : `+${fmtNum(d, 0)} \\%`;

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
    deltas: (a, b) => [deltaPct(cpuIdle(a), cpuIdle(b)), deltaPct(cpuLoad(a), cpuLoad(b))],
    fmtDelta: fmtDeltaPair,
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

function listSnapshots(app: string, metodologia: string): SnapshotData[] {
  const base = path.join(METRICAS_DIR, app, metodologia);
  if (!fs.existsSync(base)) return [];
  return fs
    .readdirSync(base, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name.startsWith('snapshot'))
    .map((d) => ({ nome: d.name, summaryPath: path.join(base, d.name, 'processed', 'summary.json') }))
    .filter((d) => fs.existsSync(d.summaryPath))
    .sort((a, b) => snapshotOrder(a.nome) - snapshotOrder(b.nome))
    .map((d) => ({ nome: d.nome, summary: readJson<Summary>(d.summaryPath) }));
}

function texSnapshotsTable(
  app: string,
  metodologia: string,
  snaps: SnapshotData[],
): string {
  const cols = snaps.length;
  const head = snaps.map((s) => `\\textbf{${snapshotLabel(s.nome)}}`).join(' & ');
  const rows: string[] = [];
  for (const cat of CATEGORIAS) {
    const catRows = ROWS.filter((r) => r.categoria === cat);
    if (!catRows.length) continue;
    rows.push(`    \\multicolumn{${cols + 1}}{l}{\\textit{${texEsc(cat)}}} \\\\`);
    for (const r of catRows) {
      const cells = snaps.map((s) => r.fmtValor(r.valores(s.summary))).join(' & ');
      rows.push(`    ${texEsc(r.label)} & ${cells} \\\\`);
    }
  }
  const appLabel = APP_LABEL[app] ?? app;
  const metLabel = METODOLOGIA_LABEL[metodologia] ?? metodologia;
  return `% Gerado automaticamente por harness/analise/comparar.ts
\\begin{table}[htb]
  \\centering
  \\caption{${texEsc(appLabel)} — métricas por snapshot (${texEsc(metLabel)}).}
  \\label{tab:comp_${app}_${metodologia}_snapshots}
  \\begin{tabular}{l${'r'.repeat(cols)}}
    \\hline
    \\textbf{Métrica} & ${head} \\\\
    \\hline
${rows.join('\n')}
    \\hline
  \\end{tabular}
  \\legend{Fonte: medição automatizada do experimento (média de três execuções).}
\\end{table}
`;
}

interface VariacaoMetodologia {
  metodologia: string;
  apps: Array<{ app: string; deltas: number[][] }>;
}

function collectAppDeltas(app: string, metodologia: string): number[][] | null {
  const snaps = listSnapshots(app, metodologia);
  if (snaps.length < 2) return null;
  const first = snaps[0].summary;
  const last = snaps[snaps.length - 1].summary;
  return ROWS.map((r) => r.deltas(first, last));
}

function texVariacoesTable(v: VariacaoMetodologia): string {
  const appNames = v.apps.map((a) => a.app);
  const header = appNames.map((a) => `\\textbf{${texEsc(APP_LABEL[a] ?? a)}}`).join(' & ');
  const rows: string[] = [];
  for (const cat of CATEGORIAS) {
    const catRows = ROWS.filter((r) => r.categoria === cat);
    if (!catRows.length) continue;
    rows.push(`    \\multicolumn{${appNames.length + 2}}{l}{\\textit{${texEsc(cat)}}} \\\\`);
    for (let i = 0; i < ROWS.length; i++) {
      const r = ROWS[i];
      if (r.categoria !== cat) continue;
      const cells = v.apps.map((a) => r.fmtDelta(a.deltas[i])).join(' & ');
      const len = v.apps[0].deltas[i].length;
      const medVec = Array.from({ length: len }, (_, j) =>
        mean(v.apps.map((a) => a.deltas[i][j])),
      );
      rows.push(`    ${texEsc(r.label)} & ${cells} & ${r.fmtDelta(medVec)} \\\\`);
    }
  }
  const metLabel = METODOLOGIA_LABEL[v.metodologia] ?? v.metodologia;
  return `% Gerado automaticamente por harness/analise/comparar.ts
\\begin{table}[htb]
  \\centering
  \\caption{Variação acumulada por aplicação — ${texEsc(metLabel)} (S0 $\\rightarrow$ último snapshot).}
  \\label{tab:comp_${v.metodologia}_variacoes}
  \\begin{tabular}{l${'r'.repeat(appNames.length + 1)}}
    \\hline
    \\textbf{Métrica} & ${header} & \\textbf{Média} \\\\
    \\hline
${rows.join('\n')}
    \\hline
  \\end{tabular}
  \\legend{Fonte: elaborado pelo autor (2026) a partir da medição automatizada.}
\\end{table}
`;
}

function minMaxNormalize(values: number[]): number[] {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) return values.map(() => 0.5);
  return values.map((v) => (v - min) / (max - min));
}

function texMetodologiasTable(metodologias: VariacaoMetodologia[]): string {
  const nomes = metodologias.map((m) => m.metodologia);
  if (metodologias.length < 2) {
    return `% Gerado automaticamente por harness/analise/comparar.ts
% Tabela de comparação entre metodologias: pendente (necessário >= 2 metodologias com >= 2 snapshots).
`;
  }
  const rows: string[] = [];
  const overall: number[] = [];
  for (let i = 0; i < ROWS.length; i++) {
    const perMet = metodologias.map((m) => mean(m.apps.map((a) => mean(a.deltas[i]))));
    const norm = minMaxNormalize(perMet);
    overall.push(mean(norm));
    rows.push(`    ${texEsc(ROWS[i].label)} & ${norm.map((x) => fmtNum(x, 2)).join(' & ')} \\\\`);
  }
  const header = nomes.map((n) => `\\textbf{${texEsc(METODOLOGIA_LABEL[n] ?? n)}}`).join(' & ');
  return `% Gerado automaticamente por harness/analise/comparar.ts
\\begin{table}[htb]
  \\centering
  \\caption{Média normalizada da variação por metodologia (min--max por métrica).}
  \\label{tab:comp_metodologias}
  \\begin{tabular}{l${'r'.repeat(nomes.length)}}
    \\hline
    \\textbf{Métrica} & ${header} \\\\
    \\hline
${rows.join('\n')}
    \\hline
    \\textbf{Média geral} & ${overall.map((x) => `\\textbf{${fmtNum(x, 2)}}`).join(' & ')} \\\\
    \\hline
  \\end{tabular}
  \\legend{Fonte: elaborado pelo autor (2026). Valores normalizados (0--1) por métrica entre metodologias.}
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

  const apps = fs
    .readdirSync(METRICAS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== 'comparativos')
    .map((d) => d.name);

  const variacoes: VariacaoMetodologia[] = [];
  const metodologiasSet = new Set<string>();

  for (const app of apps) {
    const base = path.join(METRICAS_DIR, app);
    for (const met of fs.readdirSync(base, { withFileTypes: true }).filter((d) => d.isDirectory())) {
      const metodologia = met.name;
      const snaps = listSnapshots(app, metodologia);
      if (!snaps.length) continue;
      metodologiasSet.add(metodologia);
      const snapFile = `${app}__${metodologia}__snapshots.tex`;
      writeBoth(snapFile, texSnapshotsTable(app, metodologia, snaps));
      writeJson(path.join(COMPARATIVOS_DIR, `${app}__${metodologia}__snapshots.json`), {
        app,
        metodologia,
        snapshots: snaps.map((s) => ({ nome: s.nome, summary: s.summary })),
      });
      console.log(`[ok] ${snapFile}`);
    }
  }

  for (const metodologia of metodologiasSet) {
    const appsDeltas = apps
      .map((app) => ({ app, deltas: collectAppDeltas(app, metodologia) }))
      .filter((x): x is { app: string; deltas: number[][] } => x.deltas !== null);
    if (!appsDeltas.length) continue;
    const v: VariacaoMetodologia = { metodologia, apps: appsDeltas };
    variacoes.push(v);
    const file = `${metodologia}__variacoes.tex`;
    writeBoth(file, texVariacoesTable(v));
    console.log(`[ok] ${file}`);
  }

  writeBoth('_metodologias.tex', texMetodologiasTable(variacoes));
  console.log('[ok] _metodologias.tex');
}

main();
