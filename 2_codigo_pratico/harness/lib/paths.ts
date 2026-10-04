import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

export const HARNESS_DIR = path.resolve(here, '..');
export const PRATICO_DIR = path.resolve(HARNESS_DIR, '..');
export const REPO_ROOT = path.resolve(PRATICO_DIR, '..');

export const rel = (...p: string[]): string => path.relative(HARNESS_DIR, path.resolve(...p));
export const fromRepo = (...p: string[]): string => path.resolve(REPO_ROOT, ...p);
