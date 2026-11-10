import { describe, expect, it } from 'vitest';
import { ago, pct, shortAccount, timeLeft, usd } from '@/lib/format';
import { DIVISIONS, divisionFor } from '@/lib/gamification';

describe('format', () => {
  it('formats money from USDC base units', () => {
    expect(usd('3824872720000')).toBe('$3.8M');
    expect(usd(5_000_000)).toBe('$5');
    expect(usd(2_500_000)).toBe('$2.50');
    expect(usd(12_345_000_000)).toBe('$12.3K');
  });
  it('formats probability and time', () => {
    expect(pct('0.645')).toBe('65%');
    const now = Date.parse('2026-10-21T00:00:00Z');
    expect(timeLeft('2026-10-23T01:00:00Z', now)).toBe('2d left');
    expect(timeLeft('2026-10-21T05:00:00Z', now)).toBe('5h left');
    expect(timeLeft('2026-10-20T00:00:00Z', now)).toBe('Closed');
    expect(ago(now - 90_000, now)).toBe('1m');
    expect(shortAccount('0123456789abcdef0123456789abcdef')).toBe('01234567…abcdef');
  });
});

describe('divisions', () => {
  it('places XP into tiers with progress', () => {
    expect(divisionFor(0).current.name).toBe('Bronze');
    const s = divisionFor(400);
    expect(s.current.name).toBe('Silver');
    expect(s.next?.name).toBe('Gold');
    expect(s.progress).toBeCloseTo(0.5);
    expect(divisionFor(1e6)).toMatchObject({ next: null, progress: 1 });
    expect(DIVISIONS.map((d) => d.min)).toEqual([...DIVISIONS.map((d) => d.min)].sort((a, b) => a - b));
  });
});
