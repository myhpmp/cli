import { describe, it, expect } from 'vitest';
import { renderStatusLine } from '../../src/display/status-line.js';
import { createI18n } from '../../src/i18n/index.js';

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
  };

  it('renders Korean status line', () => {
    const i18n = createI18n('ko');
    const line = renderStatusLine(baseData, i18n);
    expect(line).toContain('⚔️ 견습 전사 Lv.9 ★★★');
    expect(line).toContain('❤️ 89%');
    expect(line).toContain('⏱️3h30m');
    expect(line).toContain('💙 80%');
    expect(line).toContain('🧠 6%');
    expect(line).toContain('🔥2일');
  });

  it('renders English status line', () => {
    const i18n = createI18n('en');
    const data = { ...baseData, titleName: 'Apprentice Warrior' };
    const line = renderStatusLine(data, i18n);
    expect(line).toContain('⚔️ Apprentice Warrior Lv.9 ★★★');
    expect(line).toContain('🔥2d');
  });
});
