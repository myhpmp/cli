/**
 * Local queue for exp_history records that failed to INSERT.
 * Flushed on next successful sync.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const DATA_DIR = path.join(os.homedir(), '.myhpmp');
const QUEUE_PATH = path.join(DATA_DIR, 'pending-exp.json');

export interface PendingExpEntry {
  amount: number;
  reason: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export async function loadQueue(): Promise<PendingExpEntry[]> {
  try {
    const raw = await fs.readFile(QUEUE_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

const MAX_QUEUE_SIZE = 1000;

async function writeQueueAtomic(queue: PendingExpEntry[]): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmpPath = `${QUEUE_PATH}.tmp`;
  await fs.writeFile(tmpPath, JSON.stringify(queue), 'utf-8');
  await fs.rename(tmpPath, QUEUE_PATH);
}

export async function enqueue(entry: PendingExpEntry): Promise<void> {
  const queue = await loadQueue();
  if (queue.length >= MAX_QUEUE_SIZE) {
    queue.shift();
    if (process.env.DEBUG?.includes('myhpmp')) {
      console.error(`[myhpmp] Pending EXP queue full (${MAX_QUEUE_SIZE}). Oldest entry dropped.`);
    }
  }
  queue.push(entry);
  await writeQueueAtomic(queue);
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
  await writeQueueAtomic(queue);
}
