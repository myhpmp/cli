import { describe, it, expect } from 'vitest';
import { computeHP, computeMP, computeCTX, formatTime } from '../../src/core/stats-aggregator.js';

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
