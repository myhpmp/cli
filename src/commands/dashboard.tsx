// src/commands/dashboard.tsx
import React, { useState, useEffect } from 'react';
import { render, Box, Text, useInput, useApp } from 'ink';
import { AuthManager } from '../auth/auth-manager.js';
import os from 'node:os';
import path from 'node:path';

const DATA_DIR = path.join(os.homedir(), '.myhpmp');

interface ExpRecord {
  date: string;
  tokens: number;
  exp: number;
}

interface ProviderData {
  name: string;
  records: ExpRecord[];
  totalTokens: number;
  totalExp: number;
}

async function fetchProviderData(): Promise<ProviderData[]> {
  const authManager = new AuthManager(DATA_DIR);
  if (!(await authManager.isAuthenticated())) {
    return [];
  }

  const config = await authManager.loadConfig();
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = await import('../config.js');
  const { SupabaseProvider } = await import('../data/providers/supabase.js');
  const provider = new SupabaseProvider(SUPABASE_URL, SUPABASE_ANON_KEY);

  try {
    await provider.setSession(config.accessToken, config.refreshToken);
  } catch {
    const refreshed = await provider.refreshSession(config.refreshToken);
    if (!refreshed) return [];
    await provider.setSession(refreshed.accessToken, refreshed.refreshToken);
    await authManager.saveConfig({
      ...config,
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken,
    });
  }

  const history = await provider.getExpHistory(config.userId);
  if (!history || history.length === 0) return [];

  // Group by provider and date
  const grouped = new Map<string, Map<string, { tokens: number; exp: number }>>();

  for (const entry of history) {
    if (entry.reason !== 'token_usage') continue;
    const provName = (entry.metadata as Record<string, unknown>)?.provider as string ?? 'claude';
    const date = entry.created_at?.slice(0, 10) ?? 'unknown';
    const tokens = Number((entry.metadata as Record<string, unknown>)?.tokens ?? 0);

    if (!grouped.has(provName)) grouped.set(provName, new Map());
    const dateMap = grouped.get(provName)!;
    const existing = dateMap.get(date) ?? { tokens: 0, exp: 0 };
    existing.tokens += tokens;
    existing.exp += entry.amount;
    dateMap.set(date, existing);
  }

  const result: ProviderData[] = [];
  for (const [name, dateMap] of grouped) {
    const records = Array.from(dateMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => b.date.localeCompare(a.date));

    result.push({
      name,
      records,
      totalTokens: records.reduce((sum, r) => sum + r.tokens, 0),
      totalExp: records.reduce((sum, r) => sum + r.exp, 0),
    });
  }

  return result.sort((a, b) => b.totalExp - a.totalExp);
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function Dashboard() {
  const { exit } = useApp();
  const [providers, setProviders] = useState<ProviderData[]>([]);
  const [tabIndex, setTabIndex] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProviderData().then(data => {
      setProviders(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useInput((input, key) => {
    if (input === 'q') exit();
    if (key.leftArrow) {
      setTabIndex(i => Math.max(0, i - 1));
      setScrollOffset(0);
    }
    if (key.rightArrow) {
      setTabIndex(i => Math.min(providers.length, i + 1));
      setScrollOffset(0);
    }
    if (key.upArrow) setScrollOffset(o => Math.max(0, o - 1));
    if (key.downArrow) setScrollOffset(o => o + 1);
  });

  if (loading) {
    return <Text>Loading...</Text>;
  }

  if (providers.length === 0) {
    return (
      <Box flexDirection="column">
        <Text>No usage data found.</Text>
        <Text dimColor>Run "myhpmp init" to enable cloud sync, then use your AI tools.</Text>
      </Box>
    );
  }

  const tabs = ['All', ...providers.map(p => p.name)];

  let currentRecords: ExpRecord[];
  if (tabIndex === 0) {
    const merged = new Map<string, { tokens: number; exp: number }>();
    for (const p of providers) {
      for (const r of p.records) {
        const existing = merged.get(r.date) ?? { tokens: 0, exp: 0 };
        existing.tokens += r.tokens;
        existing.exp += r.exp;
        merged.set(r.date, existing);
      }
    }
    currentRecords = Array.from(merged.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => b.date.localeCompare(a.date));
  } else {
    currentRecords = providers[tabIndex - 1]?.records ?? [];
  }

  const visibleRows = 15;
  const maxOffset = Math.max(0, currentRecords.length - visibleRows);
  const clampedOffset = Math.min(scrollOffset, maxOffset);
  const displayRecords = currentRecords.slice(clampedOffset, clampedOffset + visibleRows);

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold>📊 My HP/MP Dashboard</Text>
      </Box>

      <Box gap={2} marginBottom={1}>
        {tabs.map((tab, i) => (
          <Text key={tab} bold={i === tabIndex} inverse={i === tabIndex}>
            {` ${tab} `}
          </Text>
        ))}
      </Box>

      <Box>
        <Text bold>
          {`${'Date'.padEnd(14)}${'Tokens'.padStart(12)}${'EXP'.padStart(8)}`}
        </Text>
      </Box>
      <Text>{'─'.repeat(34)}</Text>

      {displayRecords.map(r => (
        <Box key={r.date}>
          <Text>
            {`${r.date.padEnd(14)}${formatNumber(r.tokens).padStart(12)}${String(r.exp).padStart(8)}`}
          </Text>
        </Box>
      ))}

      {currentRecords.length === 0 && (
        <Text dimColor>  No data for this provider</Text>
      )}

      <Box marginTop={1}>
        <Text dimColor>←→ tab  ↑↓ scroll  q quit</Text>
      </Box>
    </Box>
  );
}

async function main() {
  render(<Dashboard />);
}

main().catch(console.error);
