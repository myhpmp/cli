import { describe, it, expect } from 'vitest';
import { renderDetailView } from '../../src/display/detail-view.js';

describe('renderDetailView', () => {
  const baseData = {
    titleEmoji: '⚔️',
    titleName: '견습 전사',
    level: 9,
    stars: 3,
    hpPercent: 89,
    hpUsed: 82341,
    hpTotal: 92500,
    resetMinutes: 210,
    mpPercent: 80,
    mpUsed: 1600000,
    mpTotal: 2000000,
    ctxPercent: 6,
    ctxUsed: 60000,
    ctxTotal: 1000000,
    expCurrent: 186,
    expNeeded: 300,
    nextLevel: 10,
    totalExp: 2886,
    totalSessions: 47,
    streakDays: 2,
  };

  it('renders detail view with progress bars', () => {
    const view = renderDetailView(baseData, 'ko');
    expect(view).toContain('⚔️ 견습 전사 Lv.9 ★★★');
    expect(view).toContain('❤️ HP');
    expect(view).toContain('💙 MP');
    expect(view).toContain('🧠 CTX');
    expect(view).toContain('⭐ EXP');
    expect(view).toContain('89%');
    expect(view).toContain('🔥');
  });

  it('contains progress bar characters', () => {
    const view = renderDetailView(baseData, 'ko');
    expect(view).toContain('█');
    expect(view).toContain('░');
  });
});
