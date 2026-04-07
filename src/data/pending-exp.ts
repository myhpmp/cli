/**
 * Local queue for exp_history records that failed to INSERT.
 * Flushed on next successful sync.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const DATA_DIR = path.join(os.homedir(), '.claude-hp-mp');
const QUEUE_PATH = path.join(DATA_DIR, 'pending-exp.json');

export interface PendingExpEntry {
  amount: number;
  reason: string;
  timestamp: string;
}

export async function loadQueue(): Promise<PendingExpEntry[]> {
  try {
    const raw = await fs.readFile(QUEUE_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function enqueue(entry: PendingExpEntry): Promise<void> {
  const queue = await loadQueue();
  queue.push(entry);
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(QUEUE_PATH, JSON.stringify(queue), 'utf-8');
}

export async function saveQueue(queue: PendingExpEntry[]): Promise<void> {
  if (queue.length === 0) {
    try {
      await fs.unlink(QUEUE_PATH);
    } catch {
      // File doesn't exist, fine
    }
    return;
  }
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(QUEUE_PATH, JSON.stringify(queue), 'utf-8');
}
