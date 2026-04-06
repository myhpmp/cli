export function computeHP(remainingTokens: number, totalTokens: number): number {
  if (totalTokens === 0) return 0;
  return Math.round((remainingTokens / totalTokens) * 100);
}

export function computeMP(remainingWeekly: number, totalWeekly: number): number {
  if (totalWeekly === 0) return 0;
  return Math.round((remainingWeekly / totalWeekly) * 100);
}

export function computeCTX(usedContext: number, maxContext: number): number {
  if (maxContext === 0) return 0;
  return Math.round((usedContext / maxContext) * 100);
}

export function computeStreak(currentStreak: number, lastActiveDate: string | null): number {
  if (!lastActiveDate) return 1;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [y, m, d] = lastActiveDate.split('-').map(Number);
  const lastActive = new Date(y, m - 1, d);
  const diffDays = Math.floor((today.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return currentStreak;
  if (diffDays === 1) return currentStreak + 1;
  return 1;
}

export function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h${m}m`;
}
