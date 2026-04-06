import { formatTime } from '../core/stats-aggregator.js';

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
}

export function renderStatusLine(
  data: StatusLineData,
  i18n: { t(key: string): string },
): string {
  const starsStr = '★'.repeat(data.stars);
  const time = formatTime(data.resetMinutes);
  const dayUnit = i18n.t('unit.days');

  const hpPart = data.resetMinutes > 0
    ? `❤️ ${data.hpPercent}% ⏱️${time}`
    : `❤️ ${data.hpPercent}%`;

  return [
    `${data.titleEmoji} ${data.titleName} Lv.${data.level} ${starsStr}`,
    hpPart,
    `💙 ${data.mpPercent}%`,
    `🧠 ${data.ctxPercent}%`,
    `🔥${data.streakDays}${dayUnit}`,
  ].join(' | ');
}
