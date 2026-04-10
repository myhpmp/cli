import path from 'node:path';
import { formatTime } from '../core/stats-aggregator.js';
import type { StatusLineSegment } from '../auth/auth-manager.js';
import { DEFAULT_STATUSLINE_ORDER } from '../auth/auth-manager.js';

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
  weeklyResetDays: number;
  ctxPercent: number;
  streakDays: number;
  projectName: string;
  gitBranch: string | null;
}

export function renderStatusLine(
  data: StatusLineData,
  locale: string,
  order?: StatusLineSegment[],
): string {
  const starsStr = '★'.repeat(data.stars);
  const time = formatTime(data.resetMinutes);
  const dayUnit = locale === 'ko' ? '일' : 'd';

  const segments: Record<StatusLineSegment, string> = {
    title: `${data.titleEmoji} ${data.titleName} Lv.${data.level} ${starsStr}`,
    hp: data.resetMinutes > 0
      ? `❤️ ${data.hpPercent}% ⏱️${time}`
      : `❤️ ${data.hpPercent}%`,
    mp: data.weeklyResetDays > 0
      ? `💙 ${data.mpPercent}% ⏱️${data.weeklyResetDays}${dayUnit}`
      : `💙 ${data.mpPercent}%`,
    ctx: `🧠 ${data.ctxPercent}%`,
    streak: `🔥${data.streakDays}${dayUnit}`,
    project: data.gitBranch
      ? `📂 \x1b[1;96m${data.projectName}\x1b[0m (\x1b[1;93m${data.gitBranch}\x1b[0m)`
      : `📂 \x1b[1;96m${data.projectName}\x1b[0m`,
  };

  const keys = order ?? DEFAULT_STATUSLINE_ORDER;
  const validKeys = keys.filter(key => key in segments);

  // project goes on its own line (top)
  const projectIdx = validKeys.indexOf('project');
  if (projectIdx !== -1) {
    const rest = validKeys.filter(k => k !== 'project');
    const projectLine = segments.project;
    const mainLine = rest.map(key => segments[key]).join(' | ');
    return `${projectLine}\n${mainLine}`;
  }

  return validKeys.map(key => segments[key]).join(' | ');
}
