/**
 * Supabase configuration.
 * Values are injected at build time via scripts/inject-config.
 * Fallback: environment variables or ~/.myhpmp/config.json
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const CONFIG_PATH = path.join(os.homedir(), '.myhpmp', 'config.json');

// __INJECT_SUPABASE_URL__ and __INJECT_SUPABASE_ANON_KEY__ are replaced at build time
const INJECTED_URL = '__INJECT_SUPABASE_URL__';
const INJECTED_KEY = '__INJECT_SUPABASE_ANON_KEY__';

function loadLocalConfig(): Record<string, string> {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function resolve(injected: string, envVar: string, configKey: string): string {
  // 1. Injected at build time (npm package)
  if (injected && !injected.startsWith('__INJECT_')) return injected;
  // 2. Environment variable
  if (process.env[envVar]) return process.env[envVar]!;
  // 3. Local config file
  const local = loadLocalConfig();
  return local[configKey] || '';
}

export const SUPABASE_URL = resolve(INJECTED_URL, 'SUPABASE_URL', 'supabaseUrl');
export const SUPABASE_ANON_KEY = resolve(INJECTED_KEY, 'SUPABASE_ANON_KEY', 'supabaseAnonKey');
