import { describe, it, expect, beforeEach } from 'vitest';
import { createI18n } from '../../src/i18n/index.js';

describe('i18n', () => {
  it('returns Korean title for ko locale', () => {
    const i18n = createI18n('ko');
    expect(i18n.t('title.1')).toBe('🌱 초보 모험가');
  });

  it('returns English title for en locale', () => {
    const i18n = createI18n('en');
    expect(i18n.t('title.1')).toBe('🌱 Novice Adventurer');
  });

  it('returns all 8 tier titles', () => {
    const i18n = createI18n('ko');
    const tierKeys = [1, 6, 11, 16, 21, 31, 41, 51];
    for (const key of tierKeys) {
      expect(i18n.t(`title.${key}`)).toBeTruthy();
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
    expect(i18n.t('title.1')).toBe('🌱 Novice Adventurer');
  });

  it('formats day unit by locale', () => {
    const ko = createI18n('ko');
    const en = createI18n('en');
    expect(ko.t('unit.days')).toBe('일');
    expect(en.t('unit.days')).toBe('d');
  });
});
