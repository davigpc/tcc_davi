// Geracao de graficos SVG sem dependencias externas.

export const PALETTE = ['#4472c4', '#ed7d31', '#a5a5a5', '#ffc000', '#5b9bd5', '#70ad47'];

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const fmt = (n: number): string => {
  if (!Number.isFinite(n)) return '0';
  if (Math.abs(n) >= 1000) return String(Math.round(n));
  return String(Math.round(n * 10) / 10);
};

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const pow = 10 ** Math.floor(Math.log10(v));
  const norm = v / pow;
  const step = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return step * pow;
}

export interface Series {
  name: string;
  values: number[];
  errors?: { min: number[]; max: number[] };
}

interface BaseOptions {
  title: string;
  width?: number;
  height?: number;
  valueUnit?: string;
}

function legend(series: Series[], x: number, y: number): string {
  if (series.length <= 1) return '';
  let out = '';
  series.forEach((s, j) => {
    const lx = x + j * 130;
    out += `<rect x="${lx}" y="${y - 9}" width="12" height="12" fill="${PALETTE[j % PALETTE.length]}"/>`;
    out += `<text x="${lx + 17}" y="${y + 1}" font-size="12">${esc(s.name)}</text>`;
  });
  return out;
}

export interface BarOptions extends BaseOptions {
  categories: string[];
  series: Series[];
  horizontal?: boolean;
}

export function barChart(opts: BarOptions): string {
  const { title, categories, series } = opts;
  const W = opts.width ?? (opts.horizontal ? 760 : 720);
  const H = opts.height ?? (opts.horizontal ? Math.max(280, 60 + categories.length * 34) : 400);
  const unit = opts.valueUnit ?? '';
  const all = series.flatMap((s) => s.values);
  const maxV = niceMax(Math.max(1, ...all));
  const m = { top: 60, right: 30, bottom: 70, left: 70 };
  const plotW = W - m.left - m.right;
  const plotH = H - m.top - m.bottom;

  let out = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="sans-serif" fill="#222">`;
  out += `<text x="${W / 2}" y="24" font-size="15" font-weight="bold" text-anchor="middle">${esc(title)}</text>`;
  out += legend(series, m.left, 46);

  const ticks = 5;
  for (let t = 0; t <= ticks; t++) {
    const val = (maxV * t) / ticks;
    if (opts.horizontal) {
      const x = m.left + (plotW * t) / ticks;
      out += `<line x1="${x}" y1="${m.top}" x2="${x}" y2="${m.top + plotH}" stroke="#e0e0e0"/>`;
      out += `<text x="${x}" y="${m.top + plotH + 18}" font-size="11" text-anchor="middle">${fmt(val)}</text>`;
    } else {
      const y = m.top + plotH - (plotH * t) / ticks;
      out += `<line x1="${m.left}" y1="${y}" x2="${m.left + plotW}" y2="${y}" stroke="#e0e0e0"/>`;
      out += `<text x="${m.left - 8}" y="${y + 4}" font-size="11" text-anchor="end">${fmt(val)}</text>`;
    }
  }

  const nCat = categories.length;
  const groupSize = (opts.horizontal ? plotH : plotW) / nCat;
  const nSeries = series.length;
  const barW = (groupSize * 0.8) / nSeries;

  categories.forEach((cat, i) => {
    const base = (opts.horizontal ? m.top : m.left) + groupSize * i + groupSize * 0.1;
    if (!opts.horizontal) {
      out += `<text x="${m.left + groupSize * i + groupSize / 2}" y="${m.top + plotH + 18}" font-size="11" text-anchor="middle">${esc(cat)}</text>`;
    } else {
      out += `<text x="${m.left - 10}" y="${m.top + groupSize * i + groupSize / 2 + 4}" font-size="11" text-anchor="end">${esc(cat)}</text>`;
    }
    series.forEach((s, j) => {
      const v = s.values[i] ?? 0;
      const color = PALETTE[j % PALETTE.length];
      if (!opts.horizontal) {
        const h = (plotH * v) / maxV;
        const x = base + barW * j;
        const y = m.top + plotH - h;
        out += `<rect x="${fmt(x)}" y="${fmt(y)}" width="${fmt(barW * 0.95)}" height="${fmt(h)}" fill="${color}"><title>${esc(cat)} — ${esc(s.name)}: ${fmt(v)}${unit}</title></rect>`;
        if (s.errors) {
          const yTop = m.top + plotH - (plotH * (s.errors.max[i] ?? v)) / maxV;
          const yBot = m.top + plotH - (plotH * (s.errors.min[i] ?? v)) / maxV;
          const cx = x + barW * 0.475;
          out += `<line x1="${fmt(cx)}" y1="${fmt(yTop)}" x2="${fmt(cx)}" y2="${fmt(yBot)}" stroke="#333"/><line x1="${fmt(cx - 4)}" y1="${fmt(yTop)}" x2="${fmt(cx + 4)}" y2="${fmt(yTop)}" stroke="#333"/><line x1="${fmt(cx - 4)}" y1="${fmt(yBot)}" x2="${fmt(cx + 4)}" y2="${fmt(yBot)}" stroke="#333"/>`;
        }
      } else {
        const w = (plotW * v) / maxV;
        const y = base + barW * j;
        out += `<rect x="${m.left}" y="${fmt(y)}" width="${fmt(w)}" height="${fmt(barW * 0.95)}" fill="${color}"><title>${esc(cat)} — ${esc(s.name)}: ${fmt(v)}${unit}</title></rect>`;
      }
    });
  });

  out += `<line x1="${m.left}" y1="${m.top}" x2="${m.left}" y2="${m.top + plotH}" stroke="#333"/>`;
  out += `<line x1="${m.left}" y1="${m.top + plotH}" x2="${m.left + plotW}" y2="${m.top + plotH}" stroke="#333"/>`;
  out += `<text x="${m.left + plotW / 2}" y="${H - 14}" font-size="12" text-anchor="middle">${esc(opts.horizontal ? title.split('—')[0].trim() : '')}${unit ? ` (${unit})` : ''}</text>`;
  out += '</svg>';
  return out;
}

export interface LineOptions extends BaseOptions {
  categories: string[];
  series: Series[];
}

export function lineChart(opts: LineOptions): string {
  const { title, categories, series } = opts;
  const W = opts.width ?? 720;
  const H = opts.height ?? 400;
  const unit = opts.valueUnit ?? '';
  const maxV = niceMax(Math.max(1, ...series.flatMap((s) => s.values)));
  const m = { top: 60, right: 30, bottom: 60, left: 70 };
  const plotW = W - m.left - m.right;
  const plotH = H - m.top - m.bottom;

  const xAt = (i: number): number =>
    categories.length > 1 ? m.left + (plotW * i) / (categories.length - 1) : m.left + plotW / 2;
  const yAt = (v: number): number => m.top + plotH - (plotH * v) / maxV;

  let out = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="sans-serif" fill="#222">`;
  out += `<text x="${W / 2}" y="24" font-size="15" font-weight="bold" text-anchor="middle">${esc(title)}</text>`;
  out += legend(series, m.left, 46);

  for (let t = 0; t <= 5; t++) {
    const val = (maxV * t) / 5;
    const y = yAt(val);
    out += `<line x1="${m.left}" y1="${y}" x2="${m.left + plotW}" y2="${y}" stroke="#e0e0e0"/>`;
    out += `<text x="${m.left - 8}" y="${y + 4}" font-size="11" text-anchor="end">${fmt(val)}</text>`;
  }
  categories.forEach((cat, i) => {
    out += `<text x="${xAt(i)}" y="${m.top + plotH + 18}" font-size="11" text-anchor="middle">${esc(cat)}</text>`;
  });

  series.forEach((s, j) => {
    const color = PALETTE[j % PALETTE.length];
    const pts = s.values.map((v, i) => `${xAt(i)},${yAt(v)}`).join(' ');
    out += `<polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2"/>`;
    s.values.forEach((v, i) => {
      out += `<circle cx="${xAt(i)}" cy="${yAt(v)}" r="3.5" fill="${color}"><title>${esc(categories[i])}: ${fmt(v)}${unit}</title></circle>`;
    });
  });

  out += `<line x1="${m.left}" y1="${m.top}" x2="${m.left}" y2="${m.top + plotH}" stroke="#333"/>`;
  out += `<line x1="${m.left}" y1="${m.top + plotH}" x2="${m.left + plotW}" y2="${m.top + plotH}" stroke="#333"/>`;
  out += `<text x="${W - m.right}" y="${m.top - 6}" font-size="11" text-anchor="end">${esc(unit)}</text>`;
  out += '</svg>';
  return out;
}

export interface ScatterPoint {
  x: number;
  y: number;
  label: string;
}

export interface ScatterOptions extends BaseOptions {
  points: ScatterPoint[];
  xLabel: string;
  yLabel: string;
}

export function scatterChart(opts: ScatterOptions): string {
  const W = opts.width ?? 640;
  const H = opts.height ?? 400;
  const m = { top: 60, right: 30, bottom: 60, left: 70 };
  const plotW = W - m.left - m.right;
  const plotH = H - m.top - m.bottom;
  const maxX = niceMax(Math.max(1, ...opts.points.map((p) => p.x)));
  const maxY = niceMax(Math.max(1, ...opts.points.map((p) => p.y)));

  let out = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="sans-serif" fill="#222">`;
  out += `<text x="${W / 2}" y="24" font-size="15" font-weight="bold" text-anchor="middle">${esc(opts.title)}</text>`;
  for (let t = 0; t <= 5; t++) {
    const y = m.top + plotH - (plotH * t) / 5;
    out += `<line x1="${m.left}" y1="${y}" x2="${m.left + plotW}" y2="${y}" stroke="#e0e0e0"/>`;
    out += `<text x="${m.left - 8}" y="${y + 4}" font-size="11" text-anchor="end">${fmt((maxY * t) / 5)}</text>`;
    const x = m.left + (plotW * t) / 5;
    out += `<text x="${x}" y="${m.top + plotH + 18}" font-size="11" text-anchor="middle">${fmt((maxX * t) / 5)}</text>`;
  }
  for (const p of opts.points) {
    const cx = m.left + (plotW * p.x) / maxX;
    const cy = m.top + plotH - (plotH * p.y) / maxY;
    out += `<circle cx="${fmt(cx)}" cy="${fmt(cy)}" r="5" fill="${PALETTE[0]}"><title>${esc(p.label)}: (${fmt(p.x)}, ${fmt(p.y)})</title></circle>`;
    out += `<text x="${fmt(cx + 8)}" y="${fmt(cy - 6)}" font-size="11">${esc(p.label)}</text>`;
  }
  out += `<line x1="${m.left}" y1="${m.top}" x2="${m.left}" y2="${m.top + plotH}" stroke="#333"/>`;
  out += `<line x1="${m.left}" y1="${m.top + plotH}" x2="${m.left + plotW}" y2="${m.top + plotH}" stroke="#333"/>`;
  out += `<text x="${m.left + plotW / 2}" y="${H - 14}" font-size="12" text-anchor="middle">${esc(opts.xLabel)}</text>`;
  out += `<text x="16" y="${m.top + plotH / 2}" font-size="12" text-anchor="middle" transform="rotate(-90 16 ${m.top + plotH / 2})">${esc(opts.yLabel)}</text>`;
  out += '</svg>';
  return out;
}

export interface HeatmapOptions extends BaseOptions {
  rows: string[];
  cols: string[];
  values: number[][];
}

export function heatmap(opts: HeatmapOptions): string {
  const { rows, cols, values } = opts;
  const cell = 34;
  const W = 130 + cols.length * cell + 30;
  const H = 60 + rows.length * cell + 30;
  const maxV = Math.max(1, ...values.flat());
  let out = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="sans-serif" fill="#222">`;
  out += `<text x="${W / 2}" y="24" font-size="15" font-weight="bold" text-anchor="middle">${esc(opts.title)}</text>`;
  cols.forEach((c, j) => {
    out += `<text x="${130 + j * cell + cell / 2}" y="52" font-size="10" text-anchor="middle" transform="rotate(-40 ${130 + j * cell + cell / 2} 52)">${esc(c)}</text>`;
  });
  rows.forEach((r, i) => {
    out += `<text x="122" y="${60 + i * cell + cell / 2 + 4}" font-size="10" text-anchor="end">${esc(r)}</text>`;
    cols.forEach((c, j) => {
      const v = values[i][j];
      const alpha = v === 0 ? 0 : 0.15 + 0.85 * (v / maxV);
      out += `<rect x="${130 + j * cell}" y="${60 + i * cell}" width="${cell}" height="${cell}" fill="${PALETTE[0]}" fill-opacity="${alpha.toFixed(3)}" stroke="#fff"/>`;
      if (v > 0)
        out += `<text x="${130 + j * cell + cell / 2}" y="${60 + i * cell + cell / 2 + 4}" font-size="11" text-anchor="middle">${v}</text>`;
    });
  });
  out += `<text x="${130}" y="${H - 8}" font-size="11">Linha: origem — Coluna: destino (nº de chamadas)</text>`;
  out += '</svg>';
  return out;
}
