import { describe, it, expect } from 'vitest';
import { createI18n } from '../../src/i18n/index.js';
import { getTierTitle, getTierEmoji } from '../../src/core/level-system.js';

describe('i18n', () => {
  it('returns Korean tier title from core', () => {
    expect(getTierTitle(0, 'ko')).toBe('프롬프트 뉴비');
    expect(getTierEmoji(0)).toBe('🌱');
  });

  it('returns English tier title from core', () => {
    expect(getTierTitle(0, 'en')).toBe('Prompt Newbie');
  });

  it('returns all 8 tier titles', () => {
    for (let i = 0; i < 8; i++) {
      expect(getTierTitle(i, 'ko')).toBeTruthy();
      expect(getTierTitle(i, 'en')).toBeTruthy();
      expect(getTierEmoji(i)).toBeTruthy();
    }
  });

  it('returns streak label in Korean', () => {
    const i18n = createI18n('ko');
    expect(i18n.t('status.streak')).toBe('연속');
  });

  it('returns streak label in English', () => {
    const i18n = createI18n('en');
    expect(i18n.t('status.streak')).toBe('Streak');
  });

  it('falls back to en for unknown locale', () => {
    const i18n = createI18n('fr');
    expect(i18n.t('unit.days')).toBe('d');
  });

  it('formats day unit by locale', () => {
    const ko = createI18n('ko');
    const en = createI18n('en');
    expect(ko.t('unit.days')).toBe('일');
    expect(en.t('unit.days')).toBe('d');
  });
});
