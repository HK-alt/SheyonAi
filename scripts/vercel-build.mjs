#!/usr/bin/env node
/**
 * Vercel build entrypoint — loads .env.production then runs Expo static export.
 * Expo only inlines EXPO_PUBLIC_* at bundle time; this ensures vars exist on CI.
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const envFile = resolve(root, '.env.production');

if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

process.env.NODE_ENV = process.env.NODE_ENV ?? 'production';

execSync('npx expo export -p web', {
  cwd: root,
  stdio: 'inherit',
  env: process.env,
});
