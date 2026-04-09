import path from 'node:path';
import { formatTime } from '../core/stats-aggregator.js';

export function formatProjectPath(cwd: string, homedir: string): string {
  const norm = (p: string) => p.replace(/\\/g, '/');
  const normalizedCwd = norm(cwd);
  const normalizedHome = norm(homedir);

  if (normalizedCwd === normalizedHome) return '~';

  if (normalizedCwd.startsWith(normalizedHome + '/')) {
    const relative = normalizedCwd.slice(normalizedHome.length + 1);
    const parts = relative.split('/');
    if (parts.length <= 2) return '~/' + parts.join('/');
    return '~/\u2026/' + parts.slice(-2).join('/');
  }

  return path.basename(cwd);
}

export interface StatusLineData {
  titleEmoji: string;
  titleName: string;
  level: number;
  stars: number;
  hpPercent: number;
  resetMinutes: number;
  mpPercent: number;
  ctxPercent: number;
  streakDays: number;
  projectName: string;
}

export function renderStatusLine(
  data: StatusLineData,
  locale: string,
): string {
  const starsStr = '★'.repeat(data.stars);
  const time = formatTime(data.resetMinutes);
  const dayUnit = locale === 'ko' ? '일' : 'd';

  const hpPart = data.resetMinutes > 0
    ? `❤️ ${data.hpPercent}% ⏱️${time}`
    : `❤️ ${data.hpPercent}%`;

  return [
    `${data.titleEmoji} ${data.titleName} Lv.${data.level} ${starsStr}`,
    hpPart,
    `💙 ${data.mpPercent}%`,
    `🧠 ${data.ctxPercent}%`,
    `🔥${data.streakDays}${dayUnit}`,
    `📂 ${data.projectName}`,
  ].join(' | ');
}
