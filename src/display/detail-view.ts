import { formatTime } from '../core/stats-aggregator.js';

export interface DetailViewData {
  titleEmoji: string;
  titleName: string;
  level: number;
  stars: number;
  hpPercent: number;
  hpUsed: number;
  hpTotal: number;
  resetMinutes: number;
  mpPercent: number;
  mpUsed: number;
  mpTotal: number;
  ctxPercent: number;
  ctxUsed: number;
  ctxTotal: number;
  expCurrent: number;
  expNeeded: number;
  nextLevel: number;
  totalExp: number;
  totalSessions: number;
  streakDays: number;
  syncActive: boolean;
}

function progressBar(percent: number, width: number = 10): string {
  const clamped = Math.max(0, Math.min(100, percent));
  const filled = Math.round((clamped / 100) * width);
  const empty = width - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

export function renderDetailView(
  data: DetailViewData,
  locale: string,
): string {
  const ko = locale === 'ko';
  const starsStr = '★'.repeat(data.stars);
  const time = formatTime(data.resetMinutes);
  const dayUnit = ko ? '일' : 'd';
  const sessionsUnit = ko ? '회' : 'sessions';
  const sep = '━'.repeat(43);

  const header = `🎮 ${data.titleEmoji} ${data.titleName} Lv.${data.level} ${starsStr}`;
  const streakLabel = `🔥 ${ko ? '연속' : 'Streak'}: ${data.streakDays}${dayUnit}`;

  const lines = [
    `${header}                    ${streakLabel}`,
    sep,
    `❤️ HP  ${progressBar(data.hpPercent)}  ${String(data.hpPercent).padStart(3)}%  ⏱️ ${time}`,
    `💙 MP  ${progressBar(data.mpPercent)}  ${String(data.mpPercent).padStart(3)}%`,
    `🧠 CTX ${progressBar(data.ctxPercent)}  ${String(data.ctxPercent).padStart(3)}%  (${formatTokens(data.ctxUsed)} / ${formatTokens(data.ctxTotal)} context)`,
    `⭐ EXP ${progressBar(Math.round((data.expCurrent / data.expNeeded) * 100))}  ${String(Math.round((data.expCurrent / data.expNeeded) * 100)).padStart(3)}%  (${data.expCurrent} / ${data.expNeeded} → Lv.${data.nextLevel})`,
    sep,
    `📊 ${ko ? '총 누적 EXP' : 'Total EXP'}: ${data.totalExp.toLocaleString()}  |  ${ko ? '총 세션' : 'Total Sessions'}: ${data.totalSessions} ${sessionsUnit}`,
    data.syncActive
      ? `☁️ ${ko ? '동기화: 활성' : 'Sync: active'}`
      : `⚠️ ${ko ? '동기화: 꺼짐 ("myhpmp init"으로 활성화)' : 'Sync: offline (run "myhpmp init" to enable)'}`,
  ];

  return lines.join('\n');
}
