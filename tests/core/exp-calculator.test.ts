import { describe, it, expect } from 'vitest';
import { calcTokenExp } from '../../src/core/exp-calculator.js';

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

