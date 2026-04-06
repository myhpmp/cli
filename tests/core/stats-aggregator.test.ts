import { describe, it, expect } from 'vitest';
import { computeHP, computeMP, computeCTX, computeStreak, formatTime } from '../../src/core/stats-aggregator.js';

describe('computeHP', () => {
  it('computes percentage of remaining tokens', () => {
    expect(computeHP(82341, 92500)).toBe(89);
  });

  it('returns 100 when no tokens used', () => {
    expect(computeHP(92500, 92500)).toBe(100);
  });

  it('returns 0 when all tokens used', () => {
    expect(computeHP(0, 92500)).toBe(0);
  });
});

describe('computeMP', () => {
  it('computes weekly remaining percentage', () => {
    expect(computeMP(1600000, 2000000)).toBe(80);
  });
});

describe('computeCTX', () => {
  it('computes context usage percentage', () => {
    expect(computeCTX(60000, 1000000)).toBe(6);
  });
});

describe('computeStreak', () => {
  it('returns streak + 1 if last active was yesterday', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(computeStreak(5, yesterday.toISOString().split('T')[0])).toBe(6);
  });

  it('returns 1 if last active was 2+ days ago', () => {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    expect(computeStreak(5, twoDaysAgo.toISOString().split('T')[0])).toBe(1);
  });

  it('keeps streak if last active is today', () => {
    const today = new Date().toISOString().split('T')[0];
    expect(computeStreak(5, today)).toBe(5);
  });

  it('returns 1 if no last active date', () => {
    expect(computeStreak(0, null)).toBe(1);
  });
});

describe('formatTime', () => {
  it('formats minutes to Xh Ym', () => {
    expect(formatTime(210)).toBe('3h30m');
  });

  it('formats hours only', () => {
    expect(formatTime(120)).toBe('2h0m');
  });

  it('formats minutes only', () => {
    expect(formatTime(45)).toBe('0h45m');
  });
});
