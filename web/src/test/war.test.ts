import { describe, expect, it } from 'vitest';
import { CHEST_ID, type Raid } from '../lib/raid';
import { CREWS, crewName, raidCall, votesNeeded, warLeader, warScore, type Policy, type Proposal } from '../lib/crews';

const raid = (o: Partial<Raid> = {}): Raid => ({ id: 0, caller: CREWS[0]!.dao, title: 't', target: 'nep141:doge.omft.near', target_x_bps: 20000, opens_until_ms: 1000, retreat_at_ms: 5000, pot: '100000000', entry_cost: '0', held: '0', proceeds: '0', pending_min_out: '0', pending_deadline_ms: 0, status: 'Open', hit: false, buy_quote_hash: null, sell_quote_hash: null, ...o });

describe('raid war', () => {
  it('scores backed USDC, times the realised multiple once settled', () => {
    const [frogs, dogs] = CREWS as [typeof CREWS[0], typeof CREWS[0]];
    const raids = [
      raid({ id: 1, pot: '100000000' }), // live, 100
      raid({ id: 2, pot: '50000000', status: 'Closed', hit: true, entry_cost: '50000000', proceeds: '100000000' }), // 50 at 2x = 100
      raid({ id: 3, caller: dogs.dao, pot: '300000000', status: 'Closed', hit: false, entry_cost: '300000000', proceeds: '150000000' }), // 300 at 0.5x = 150
      raid({ id: 4, caller: 'someone.testnet', pot: '999000000' }),
    ];
    const a = warScore(frogs, raids), b = warScore(dogs, raids);
    expect(a.firepower).toBe(200); expect(a.hits).toBe(1); expect(a.backed).toBe(150); expect(a.live).toBe(1);
    expect(b.firepower).toBe(150); expect(b.hits).toBe(0);
    expect(warLeader(a, b)?.crew.key).toBe('frogs');
  });
  it('hits beat firepower, ties are even', () => {
    const [frogs, dogs] = CREWS as [typeof CREWS[0], typeof CREWS[0]];
    const a = warScore(frogs, [raid({ pot: '900000000' })]);
    const b = warScore(dogs, [raid({ caller: dogs.dao, pot: '10000000', status: 'Closed', hit: true, entry_cost: '10000000', proceeds: '20000000' })]);
    expect(warLeader(a, b)?.crew.key).toBe('dogs');
    expect(warLeader(warScore(frogs, []), warScore(dogs, []))).toBeNull();
  });
  it('sputnik ratio threshold: floor(n*num/den)+1 capped at n', () => {
    const p = { default_vote_policy: { threshold: [1, 2] } } as Policy;
    expect(votesNeeded(p, 3)).toBe(2); expect(votesNeeded(p, 2)).toBe(2); expect(votesNeeded(p, 5)).toBe(3);
  });
  it('decodes a call_raid FunctionCall proposal', () => {
    const args = Buffer.from(JSON.stringify({ title: 'Raid $PEPE to 2x', target: 'nep141:x', target_x_bps: 20000, open_minutes: 600, retreat_hours: 72 })).toString('base64');
    const p = { kind: { FunctionCall: { receiver_id: CHEST_ID, actions: [{ method_name: 'call_raid', args }] } } } as unknown as Proposal;
    expect(raidCall(p)?.target_x_bps).toBe(20000);
    expect(raidCall({ kind: { Vote: {} } } as unknown as Proposal)).toBeNull();
  });
  it('names crew DAO callers', () => {
    expect(crewName(CREWS[0]!.dao)).toBe('Frog Legion');
    expect(crewName('raid-crew-mwgr1iba.sputnikv2.testnet')).toBe('RAID Crew');
    expect(crewName('raid-moon-squad-abc123x.sputnikv2.testnet')).toBe('RAID Moon Squad');
    expect(crewName('someone.testnet')).toBeNull();
  });
});
