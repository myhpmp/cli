/**
 * Minimal error logger for debugging sync/auth issues.
 * Writes to ~/.myhpmp/myhpmp.log when DEBUG includes 'myhpmp'.
 * Keeps the last 500 lines.
 */
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const DATA_DIR = path.join(os.homedir(), '.myhpmp');
const LOG_PATH = path.join(DATA_DIR, 'myhpmp.log');
const MAX_LINES = 500;

function shouldLog(): boolean {
  return Boolean(process.env.DEBUG?.includes('myhpmp'));
}

export async function logError(context: string, error: unknown): Promise<void> {
  if (!shouldLog()) return;

  const message = error instanceof Error ? error.message : String(error);
  const entry = `${new Date().toISOString()} [${context}] ${message}\n`;

  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    // Simple append; truncate occasionally to keep file small
    await fs.appendFile(LOG_PATH, entry, 'utf-8');

    // Occasional truncate (1% chance per write)
    if (Math.random() < 0.01) {
      const raw = await fs.readFile(LOG_PATH, 'utf-8');
      const lines = raw.split('\n');
      if (lines.length > MAX_LINES) {
        await fs.writeFile(LOG_PATH, lines.slice(-MAX_LINES).join('\n'), 'utf-8');
      }
    }
  } catch {
    // Logging errors are non-fatal
  }
}
