import { spawn } from 'node:child_process';

export interface RunResult {
  code: number;
  stdout: string;
  stderr: string;
  elapsedMs: number;
}

export interface RunOptions {
  cwd?: string;
  timeoutMs?: number;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function run(cmd: string, args: string[], opts: RunOptions = {}): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const child = spawn(cmd, args, { cwd: opts.cwd, shell: false, windowsHide: true });
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (d) => (stdout += d.toString()));
    child.stderr?.on('data', (d) => (stderr += d.toString()));

    let timer: NodeJS.Timeout | undefined;
    if (opts.timeoutMs) {
      timer = setTimeout(() => {
        child.kill();
        reject(new Error(`timeout after ${opts.timeoutMs}ms: ${cmd} ${args.join(' ')}`));
      }, opts.timeoutMs);
    }

    child.on('error', (err) => {
      if (timer) clearTimeout(timer);
      reject(err);
    });
    child.on('close', (code) => {
      if (timer) clearTimeout(timer);
      resolve({ code: code ?? -1, stdout, stderr, elapsedMs: Date.now() - start });
    });
  });
}

export async function runOk(cmd: string, args: string[], opts: RunOptions = {}): Promise<RunResult> {
  const res = await run(cmd, args, opts);
  if (res.code !== 0) {
    throw new Error(`${cmd} ${args.join(' ')} exited ${res.code}\n${res.stderr || res.stdout}`);
  }
  return res;
}

export const docker = (args: string[], opts: RunOptions = {}) => runOk('docker', args, opts);
