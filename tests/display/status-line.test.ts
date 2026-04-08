import { describe, it, expect } from 'vitest';
import { renderStatusLine } from '../../src/display/status-line.js';

describe('renderStatusLine', () => {
  const baseData = {
    titleEmoji: '⚔️',
    titleName: '견습 전사',
    level: 9,
    stars: 3,
    hpPercent: 89,
    resetMinutes: 210,
    mpPercent: 80,
    ctxPercent: 6,
    streakDays: 2,
    projectName: 'my-project',
  };

  it('renders Korean status line', () => {
    const line = renderStatusLine(baseData, 'ko');
    expect(line).toContain('⚔️ 견습 전사 Lv.9 ★★★');
    expect(line).toContain('❤️ 89%');
    expect(line).toContain('⏱️3h30m');
    expect(line).toContain('💙 80%');
    expect(line).toContain('🧠 6%');
    expect(line).toContain('🔥2일');
    expect(line).toContain('📂 my-project');
  });

  it('renders English status line', () => {
    const data = { ...baseData, titleName: 'Apprentice Warrior' };
    const line = renderStatusLine(data, 'en');
    expect(line).toContain('⚔️ Apprentice Warrior Lv.9 ★★★');
    expect(line).toContain('🔥2d');
  });
});
