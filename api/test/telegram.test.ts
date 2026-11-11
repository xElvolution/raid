import { describe, expect, it } from 'vitest';
import { COIN_ASSETS, parseRaidCommand, pickRaid, RaidBot, type ChestRaid, type Telegram } from '../src/telegram/bot.js';

const T0 = 1_800_000_000_000;
const raid = (o: Partial<ChestRaid> = {}): ChestRaid => ({ id: 3, caller: 'raid-frog-legion.sputnikv2.testnet', target: COIN_ASSETS.PEPE ?? "", target_x_bps: 20000, opens_until_ms: T0 + 3_600_000, buy_after_ms: T0 + 4_200_000, retreat_at_ms: T0 + 86_400_000, pot: '120000000', status: 'Open', hit: false, ...o });

function mockTg() {
  const sent: { text: string; url?: string; reply?: number }[] = []; const edits: string[] = [];
  const tg: Telegram = {
    sendMessage: async (p) => { sent.push({ text: p.text, url: p.reply_markup?.inline_keyboard[0]?.[0]?.url, reply: p.reply_to_message_id }); return { message_id: 500 + sent.length }; },
    editMessageText: async (p) => { edits.push(p.text); return true; },
  };
  return { tg, sent, edits };
}

describe('telegram raid bot', () => {
  it('parses /raid commands', () => {
    expect(parseRaidCommand('/raid PEPE 2x')).toEqual({ symbol: 'PEPE', xBps: 20000 });
    expect(parseRaidCommand('/raid@RaidBot $doge 1.5')).toEqual({ symbol: 'DOGE', xBps: 15000 });
    expect(parseRaidCommand('/raid')).toHaveProperty('error');
    expect(parseRaidCommand('/raid NOPE 2x')).toHaveProperty('error');
    expect(parseRaidCommand('/raid PEPE 0.5x')).toHaveProperty('error');
    expect(parseRaidCommand('gm')).toBeNull();
  });

  it('picks the open raid with the most time left', () => {
    const r = pickRaid([raid({ id: 0, opens_until_ms: T0 }), raid({ id: 3 }), raid({ id: 7, status: 'Closed' }), raid({ id: 9, target_x_bps: 15000 })], 'PEPE', 20000);
    expect(r?.id).toBe(3);
  });

  it('posts a countdown card with a Back link, then updates on fill, hit and stops', async () => {
    let now = T0; let state = raid();
    const { tg, sent, edits } = mockTg();
    const bot = new RaidBot({ tg, appUrl: 'https://raid.example', now: () => now, chest: { listRaids: async () => [state], getRaid: async () => state, maxPot: async () => '250000000' } });
    await bot.handle({ update_id: 1, message: { message_id: 9, chat: { id: -1 }, text: '/raid PEPE 2x' } });
    expect(sent[0]?.text).toContain('RAID #3 · $PEPE to 2x');
    expect(sent[0]?.text).toContain('Crew closes in <b>1h 0m</b>');
    expect(sent[0]?.text).toContain('120 USDC</b> of 250');
    expect(sent[0]?.url).toBe('https://raid.example/raids/3');

    now += 10 * 60_000; state = raid({ pot: '185000000' });
    await bot.tick();
    expect(edits.at(-1)).toContain('Crew closes in <b>50m</b>');
    expect(edits.at(-1)).toContain('185 USDC');
    expect(sent.at(-1)?.text).toContain('+65 USDC joined raid #3');
    expect(sent.at(-1)?.reply).toBe(501);

    now += 3_600_000; state = raid({ pot: '185000000', status: 'Held' });
    await bot.tick();
    expect(edits.at(-1)).toContain('Holding');

    state = raid({ pot: '185000000', status: 'Closed', hit: true });
    await bot.tick();
    expect(edits.at(-1)).toContain('LINE HIT');
    expect(sent.at(-1)?.text).toContain('Raid #3 hit 2x on $PEPE');
    expect(bot.tracked).toHaveLength(0);
  });

  it('announces a retreat, and offers to call when no raid matches', async () => {
    let state = raid();
    const { tg, sent } = mockTg();
    const bot = new RaidBot({ tg, appUrl: 'https://raid.example', now: () => T0, chest: { listRaids: async () => [state], getRaid: async () => state, maxPot: async () => null } });
    await bot.handle({ update_id: 1, message: { message_id: 1, chat: { id: 1 }, text: '/raid PEPE 2x' } });
    state = raid({ status: 'Closed', hit: false });
    await bot.tick();
    expect(sent.at(-1)?.text).toContain('retreated');
    await bot.handle({ update_id: 2, message: { message_id: 2, chat: { id: 1 }, text: '/raid TRUMP 3x' } });
    expect(sent.at(-1)?.text).toContain('No open <b>$TRUMP 3x</b> raid');
    expect(sent.at(-1)?.url).toBe('https://raid.example/coin/TRUMP?x=3');
  });
});
