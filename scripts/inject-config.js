/**
 * Replaces placeholder tokens in dist/config.js with actual values from environment variables.
 * Run after `tsc`: SUPABASE_URL=xxx SUPABASE_ANON_KEY=yyy node scripts/inject-config.js
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const configPath = path.join(__dirname, '..', 'dist', 'config.js');

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('❌ SUPABASE_URL and SUPABASE_ANON_KEY must be set');
  process.exit(1);
}

let content = fs.readFileSync(configPath, 'utf-8');
content = content.replaceAll('__INJECT_SUPABASE_URL__', url);
content = content.replaceAll('__INJECT_SUPABASE_ANON_KEY__', key);
fs.writeFileSync(configPath, content, 'utf-8');

console.log('✅ Config injected into dist/config.js');
