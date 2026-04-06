export function calcTokenExp(tokens: number): number {
  return Math.floor(tokens / 1000);
}

export function calcSessionExp(): number {
  return 25;
}

export function calcStreakBonus(streakDays: number): number {
  return Math.min(streakDays, 30) * 5; // Cap at 30 days (max 150 EXP)
}

export function calcWeeklyBonus(weeklyUsagePercent: number): number {
  return weeklyUsagePercent >= 70 ? 100 : 0;
}
