import { describe, expect, it } from 'vitest';
import { fmtPrice, fmtUsd, shortAddr, shortName, countdown } from '../lib/market';
import { phase, xLabel, stepIndex, type Raid } from '../lib/raid';
import { callerStats } from '../lib/callers';

const raid = (o: Partial<Raid> = {}): Raid => ({ id: 0, caller: 'a.testnet', title: 't', target: 'nep141:eth-0x6982508145454ce325ddbe47a25d4ec3d2311933.omft.near', target_x_bps: 15000, opens_until_ms: 1000, retreat_at_ms: 5000, pot: '5000000', entry_cost: '0', held: '0', proceeds: '0', pending_min_out: '0', pending_deadline_ms: 0, status: 'Open', hit: false, buy_quote_hash: null, sell_quote_hash: null, ...o });

describe('formatting', () => {
  it('uses subscript zeros for tiny memecoin prices', () => {
    expect(fmtPrice(0.000005275)).toBe('$0.0₅5275');
    expect(fmtPrice(1.13)).toBe('$1.13');
    expect(fmtPrice(0.0697)).toBe('$0.0697');
  });
  it('compacts usd and accounts', () => {
    expect(fmtUsd(2_182_822_874)).toBe('$2.18B');
    expect(shortAddr('0x1057c855a823203b32f49e1c1741a77fbe13ae31')).toBe('0x1057…ae31');
    expect(shortName('raid-chest-mwab3vnk.testnet')).toBe('raid-ch…3vnk');
    expect(countdown(3_661_000)).toBe('01:01:01');
  });
});

describe('raid model', () => {
  it('labels lines and phases from contract state', () => {
    expect(xLabel(15000)).toBe('1.5x');
    expect(xLabel(20000)).toBe('2x');
    expect(phase(raid(), 500).key).toBe('crew');
    expect(phase(raid(), 2000).key).toBe('boarding');
    expect(phase(raid({ status: 'Closed', hit: true }), 2000).key).toBe('hit');
    expect(stepIndex(raid({ status: 'Held' }))).toBe(2);
  });
  it('aggregates callers from raids only', () => {
    const s = callerStats([raid(), raid({ id: 1, status: 'Closed', hit: true, entry_cost: '1000000', proceeds: '1500000' })]);
    expect(s[0]).toMatchObject({ account: 'a.testnet', called: 2, hits: 1, settled: 1, rallied: 10 });
  });
});
