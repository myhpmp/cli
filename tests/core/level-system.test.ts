import { describe, it, expect } from 'vitest';
import { getLevelInfo } from '../../src/core/level-system.js';

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
