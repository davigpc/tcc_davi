import os from 'node:os';
import { createRequire } from 'node:module';
import { run } from './exec.js';
import { fromRepo, HARNESS_DIR } from './paths.js';

const require = createRequire(import.meta.url);

export interface Manifest {
  app: string;
  metodologia: string;
  snapshot: string;
  tag: string | null;
  timestampUtc: string;
  scriptVersion: string;
  parentCommit: string;
  submoduleSha: string;
  host: {
    os: string;
    release: string;
    arch: string;
    cpu: string;
    logicalProcessors: number;
    totalMemGB: number;
  };
  toolchain: {
    node: string;
    docker: string;
    dockerCompose: string;
  };
  load: unknown;
  repetitions: unknown;
  operador: string;
}

async function firstLine(cmd: string, args: string[], cwd?: string): Promise<string> {
  const r = await run(cmd, args, { cwd });
  return r.code === 0 ? r.stdout.trim().split(/\r?\n/)[0] : 'unknown';
}

export async function gatherManifest(params: {
  app: string;
  metodologia: string;
  snapshot: string;
  tag?: string | null;
  composeDir: string;
  composeFile: string;
  codeDir?: string;
  load: unknown;
  repetitions: unknown;
}): Promise<Manifest> {
  const cpus = os.cpus();
  const pkg = require(`${HARNESS_DIR}/package.json`) as { version: string };

  return {
    app: params.app,
    metodologia: params.metodologia,
    snapshot: params.snapshot,
    tag: params.tag ?? null,
    timestampUtc: new Date().toISOString(),
    scriptVersion: pkg.version,
    parentCommit: await firstLine('git', ['rev-parse', 'HEAD'], fromRepo('.')),
    submoduleSha: await firstLine(
      'git',
      ['rev-parse', 'HEAD'],
      fromRepo(params.codeDir ?? params.composeDir),
    ),
    host: {
      os: `${os.type()} ${os.release()}`,
      release: os.release(),
      arch: os.arch(),
      cpu: cpus[0]?.model?.trim() ?? 'unknown',
      logicalProcessors: os.cpus().length,
      totalMemGB: Math.round((os.totalmem() / 1024 ** 3) * 100) / 100,
    },
    toolchain: {
      node: process.version,
      docker: await firstLine('docker', ['version', '--format', '{{.Server.Version}}']),
      dockerCompose: await firstLine('docker', ['compose', 'version', '--short']),
    },
    load: params.load,
    repetitions: params.repetitions,
    operador: process.env.USERNAME ?? process.env.USER ?? 'unknown',
  };
}
