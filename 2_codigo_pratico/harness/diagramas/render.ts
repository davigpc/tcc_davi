import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const PLANTUML_VERSION = '1.2026.8';
const PLANTUML_JAR = `plantuml-${PLANTUML_VERSION}.jar`;
const PLANTUML_URL =
  `https://github.com/plantuml/plantuml/releases/download/v${PLANTUML_VERSION}/${PLANTUML_JAR}`;
const FORMATS = ['svg', 'png'];

const here = path.dirname(fileURLToPath(import.meta.url));
const harnessDir = path.resolve(here, '..');
const repoDir = path.resolve(harnessDir, '..');
const toolsDir = path.join(harnessDir, 'tools');
const jarPath = path.join(toolsDir, PLANTUML_JAR);
const diagramDir = path.join(repoDir, 'docs', 'diagramas');

async function ensureJar(): Promise<void> {
  if (fs.existsSync(jarPath)) return;
  fs.mkdirSync(toolsDir, { recursive: true });
  console.log(`Baixando PlantUML ${PLANTUML_VERSION}...`);
  const res = await fetch(PLANTUML_URL);
  if (!res.ok) throw new Error(`Falha ao baixar PlantUML: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(jarPath, buf);
  console.log(`  -> ${jarPath} (${(buf.length / 1024 / 1024).toFixed(1)} MB)`);
}

function listSources(): string[] {
  if (!fs.existsSync(diagramDir)) return [];
  return fs
    .readdirSync(diagramDir)
    .filter((f) => f.endsWith('.puml'))
    .map((f) => path.join(diagramDir, f));
}

function render(jar: string, source: string, format: string): void {
  execFileSync('java', ['-jar', jar, `-t${format}`, source], { stdio: 'inherit' });
}

async function main(): Promise<void> {
  await ensureJar();
  const sources = listSources();
  if (sources.length === 0) {
    console.log(`Nenhum .puml encontrado em ${diagramDir}`);
    return;
  }
  for (const source of sources) {
    for (const format of FORMATS) {
      console.log(`Render: ${path.basename(source)} -> ${format}`);
      render(jarPath, source, format);
    }
  }
  console.log(`\n${sources.length} diagrama(s) renderizado(s) em ${diagramDir}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
