import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

export interface ClaudeUsageData {
  fiveHour: {
    utilization: number; // 0~1
    resetsAt: string;    // ISO 8601
  };
  sevenDay: {
    utilization: number;
    resetsAt: string;
  };
}

interface CredentialsFile {
  claudeAiOauth?: {
    accessToken?: string;
  };
}

interface UsageApiResponse {
  five_hour?: {
    utilization?: number;
    resets_at?: string;
  };
  seven_day?: {
    utilization?: number;
    resets_at?: string;
  };
}

interface CachedUsage {
  data: ClaudeUsageData;
  fetchedAt: number;
}

const CREDENTIALS_PATH = path.join(os.homedir(), '.claude', '.credentials.json');
const CACHE_PATH = path.join(os.homedir(), '.claude', 'usage_cache.json');
const CACHE_TTL_MS = 60_000; // 60 seconds
const API_URL = 'https://api.anthropic.com/api/oauth/usage';

async function readOAuthToken(): Promise<string | null> {
  try {
    const raw = await fs.readFile(CREDENTIALS_PATH, 'utf-8');
    const creds: CredentialsFile = JSON.parse(raw);
    return creds.claudeAiOauth?.accessToken ?? null;
  } catch {
    return null;
  }
}

async function readCache(): Promise<ClaudeUsageData | null> {
  try {
    const raw = await fs.readFile(CACHE_PATH, 'utf-8');
    const cached: CachedUsage = JSON.parse(raw);
    if (typeof cached.fetchedAt !== 'number' || !Number.isFinite(cached.fetchedAt)) return null;
    if (Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      return cached.data;
    }
    return null;
  } catch {
    return null;
  }
}

async function writeCache(data: ClaudeUsageData): Promise<void> {
  const cached: CachedUsage = { data, fetchedAt: Date.now() };
  await fs.writeFile(CACHE_PATH, JSON.stringify(cached, null, 2), 'utf-8');
}

export async function fetchClaudeUsage(): Promise<ClaudeUsageData | null> {
  // Try cache first
  const cached = await readCache();
  if (cached) return cached;

  const token = await readOAuthToken();
  if (!token) return null;

  try {
    const res = await fetch(API_URL, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'anthropic-beta': 'oauth-2025-04-20',
        'Content-Type': 'application/json',
        'User-Agent': 'myhpmp/1.0',
      },
    });

    if (!res.ok) return null;

    const body: UsageApiResponse = await res.json() as UsageApiResponse;
    const data: ClaudeUsageData = {
      fiveHour: {
        utilization: body.five_hour?.utilization ?? 0,
        resetsAt: body.five_hour?.resets_at ?? new Date().toISOString(),
      },
      sevenDay: {
        utilization: body.seven_day?.utilization ?? 0,
        resetsAt: body.seven_day?.resets_at ?? new Date().toISOString(),
      },
    };

    await writeCache(data);
    return data;
  } catch {
    return null;
  }
}

export function utilizationToPercent(utilization: number): number {
  // utilization is already a percentage (0-100), we want remaining %
  return Math.max(0, Math.round(100 - utilization));
}

export function resetsAtToMinutes(resetsAt: string): number {
  const diff = new Date(resetsAt).getTime() - Date.now();
  return Math.max(0, Math.round(diff / 60_000));
}
