import { describe, it, expect } from 'vitest';
import { createI18n } from '../../src/i18n/index.js';

describe('i18n', () => {
  it('returns totalExp label in Korean', () => {
    const i18n = createI18n('ko');
    expect(i18n.t('status.totalExp')).toBe('총 누적 EXP');
  });

  it('returns totalExp label in English', () => {
    const i18n = createI18n('en');
    expect(i18n.t('status.totalExp')).toBe('Total EXP');
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
