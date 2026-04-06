import { LocalStore } from '../data/local-store.js';
import { getLevelInfo, getTierForLevel, getStars } from '../core/level-system.js';
import { renderStatusLine } from '../display/status-line.js';
import { createI18n, detectLocale } from '../i18n/index.js';
import { AuthManager } from '../auth/auth-manager.js';
import { fetchClaudeUsage, utilizationToPercent, resetsAtToMinutes } from '../data/claude-usage.js';
import os from 'node:os';
import path from 'node:path';

const DATA_DIR = path.join(os.homedir(), '.claude-hp-mp');
const TITLE_KEYS = [1, 6, 11, 16, 21, 31, 41, 51];

export async function getStatusLine(): Promise<string> {
  const authManager = new AuthManager(DATA_DIR);
  const store = new LocalStore(DATA_DIR);
  const stats = await store.load();

  let locale: string;
  try {
    const config = await authManager.loadConfig();
    locale = config.locale ?? detectLocale();
  } catch {
    locale = detectLocale();
  }

  const i18n = createI18n(locale);
  const levelInfo = getLevelInfo(stats.totalExp);
  const tier = getTierForLevel(levelInfo.level);
  const titleKey = TITLE_KEYS[tier.tierIndex];
  const titleFull = i18n.t(`title.${titleKey}`);
  const titleEmoji = titleFull.split(' ')[0];
  const titleName = titleFull.split(' ').slice(1).join(' ');

  // Fetch real Claude usage data
  const usage = await fetchClaudeUsage();
  const hpPercent = usage ? utilizationToPercent(usage.fiveHour.utilization) : 100;
  const mpPercent = usage ? utilizationToPercent(usage.sevenDay.utilization) : 100;
  const resetMinutes = usage ? resetsAtToMinutes(usage.fiveHour.resetsAt) : 0;

  return renderStatusLine({
    titleEmoji,
    titleName,
    level: levelInfo.level,
    stars: getStars(levelInfo.level),
    hpPercent,
    resetMinutes,
    mpPercent,
    ctxPercent: 0,
    streakDays: stats.streakDays,
  }, i18n);
}

async function main() {
  const line = await getStatusLine();
  console.log(line);
}

main().catch(console.error);
