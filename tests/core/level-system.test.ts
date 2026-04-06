import { describe, it, expect } from 'vitest';
import { getLevelInfo, getTierForLevel, getStars } from '../../src/core/level-system.js';

describe('getLevelInfo', () => {
  it('returns level 1 for 0 exp', () => {
    const info = getLevelInfo(0);
    expect(info.level).toBe(1);
    expect(info.currentLevelExp).toBe(0);
    expect(info.expForNextLevel).toBe(100);
  });

  it('returns level 2 for 100 exp', () => {
    const info = getLevelInfo(100);
    expect(info.level).toBe(2);
  });

  it('returns level 5 for 499 exp', () => {
    const info = getLevelInfo(499);
    expect(info.level).toBe(5);
  });

  it('returns level 6 for 500 exp (tier change)', () => {
    const info = getLevelInfo(500);
    expect(info.level).toBe(6);
    expect(info.expForNextLevel).toBe(300);
  });

  it('returns level 11 for 2000 exp', () => {
    const info = getLevelInfo(2000);
    expect(info.level).toBe(11);
  });

  it('returns level 50+ for very high exp', () => {
    const info = getLevelInfo(300000);
    expect(info.level).toBeGreaterThanOrEqual(51);
  });
});

describe('getTierForLevel', () => {
  it('returns tier 0 for level 1-5', () => {
    expect(getTierForLevel(1).tierIndex).toBe(0);
    expect(getTierForLevel(5).tierIndex).toBe(0);
  });

  it('returns tier 1 for level 6-10', () => {
    expect(getTierForLevel(6).tierIndex).toBe(1);
    expect(getTierForLevel(10).tierIndex).toBe(1);
  });

  it('returns tier 7 for level 51+', () => {
    expect(getTierForLevel(51).tierIndex).toBe(7);
    expect(getTierForLevel(99).tierIndex).toBe(7);
  });
});

describe('getStars', () => {
  it('returns 1 star for first level in 5-level tier', () => {
    expect(getStars(1)).toBe(1);
    expect(getStars(6)).toBe(1);
  });

  it('returns 5 stars for last level in 5-level tier', () => {
    expect(getStars(5)).toBe(5);
    expect(getStars(10)).toBe(5);
  });

  it('returns stars for 10-level tier (2 levels per star)', () => {
    expect(getStars(21)).toBe(1);
    expect(getStars(22)).toBe(1);
    expect(getStars(23)).toBe(2);
    expect(getStars(30)).toBe(5);
  });
});
