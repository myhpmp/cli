import { describe, it, expect } from 'vitest';
import { calcTokenExp, calcSessionExp, calcStreakBonus, calcWeeklyBonus } from '../../src/core/exp-calculator.js';

describe('calcTokenExp', () => {
  it('returns 0 for 0 tokens', () => {
    expect(calcTokenExp(0)).toBe(0);
  });

  it('returns 1 for 1000 tokens', () => {
    expect(calcTokenExp(1000)).toBe(1);
  });

  it('returns 5 for 5500 tokens', () => {
    expect(calcTokenExp(5500)).toBe(5);
  });

  it('floors partial thousands', () => {
    expect(calcTokenExp(999)).toBe(0);
    expect(calcTokenExp(1500)).toBe(1);
  });
});

describe('calcSessionExp', () => {
  it('returns 25', () => {
    expect(calcSessionExp()).toBe(25);
  });
});

describe('calcStreakBonus', () => {
  it('returns streakDays * 5 up to cap', () => {
    expect(calcStreakBonus(0)).toBe(0);
    expect(calcStreakBonus(1)).toBe(5);
    expect(calcStreakBonus(7)).toBe(35);
    expect(calcStreakBonus(30)).toBe(150);
  });

  it('caps at 30 days', () => {
    expect(calcStreakBonus(31)).toBe(150);
    expect(calcStreakBonus(100)).toBe(150);
  });
});

describe('calcWeeklyBonus', () => {
  it('returns 100 when usage >= 70%', () => {
    expect(calcWeeklyBonus(70)).toBe(100);
    expect(calcWeeklyBonus(100)).toBe(100);
  });

  it('returns 0 when usage < 70%', () => {
    expect(calcWeeklyBonus(69)).toBe(0);
    expect(calcWeeklyBonus(0)).toBe(0);
  });
});
