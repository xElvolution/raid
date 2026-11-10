import { describe, expect, it } from 'vitest';
import { heuristicDraft, isAllowedTopic } from '../src/draft.js';

describe('drafting', () => {
  it('turns a falsifiable take into a market draft', () => {
    const d = heuristicDraft('Arsenal will win the league this season', Date.UTC(2026, 9, 21));
    expect(d?.question).toMatch(/^Will this happen: Arsenal will win/);
    expect(d?.outcomes).toEqual(['NO', 'YES']);
  });
  it('ignores non-falsifiable posts', () => {
    expect(heuristicDraft('good morning everyone', Date.now())).toBeNull();
  });
  it('blocks banned topics', () => {
    expect(isAllowedTopic('will X die before 2027')).toBe(false);
    expect(heuristicDraft('Will the president die by Friday', Date.now())).toBeNull();
  });
});
