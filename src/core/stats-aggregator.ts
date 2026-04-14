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

export function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h${m}m`;
}
