/**
 * RAID Telegram bot. `/raid PEPE 2x` in a group posts a countdown card for the open PEPE 2x raid on the
 * chest with a "Back this raid" button, then edits the card as the crew fills, and announces the hit or the
 * retreat. It never holds funds and never signs anything: backing happens in the RAID app.
 *
 * Pure logic with injected Telegram + chest clients, so it is tested with mocks (test/telegram.test.ts).
 * The live runner is ./run.ts and needs TELEGRAM_BOT_TOKEN in the environment.
 */
export const COIN_ASSETS: Record<string, string> = {
  PEPE: 'nep141:eth-0x6982508145454ce325ddbe47a25d4ec3d2311933.omft.near',
  DOGE: 'nep141:doge.omft.near',
  TRUMP: 'nep141:sol-c58e6539c2f2e097c251f8edf11f9c03e581f8d4.omft.near',
  BRETT: 'nep141:base-0x532f27101965dd16442e59d40670faf5ebb142e4.omft.near',
  SHITZU: 'nep141:token.0xshitzu.near',
  BLACKDRAGON: 'nep141:blackdragon.tkn.near',
  PENGU: 'nep141:sol-0xaad74c68eecfc9f8c5bdcea614f6167048c795ef.omdep.near',
  SHIB: 'nep141:eth-0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce.omft.near',
  SPX: 'nep141:eth-0xe0f63a424a4439cbe457d80e4f4b51ad25b2c56c.omft.near',
  MOG: 'nep141:eth-0xaaee1a9723aadb7afa2810263653a34ba2c21c7a.omft.near',
  TURBO: 'nep141:eth-0xa35923162c49cf95e6bf26623385eb431ad920d3.omft.near',
};

export interface ChestRaid {
  id: number; caller: string; target: string; target_x_bps: number; opens_until_ms: number; buy_after_ms?: number;
  retreat_at_ms: number; pot: string; status: 'Open' | 'Buying' | 'Held' | 'Selling' | 'Closed'; hit: boolean;
}
export interface ChestReader { listRaids(): Promise<ChestRaid[]>; getRaid(id: number): Promise<ChestRaid | null>; maxPot(): Promise<string | null> }
export interface InlineButton { text: string; url: string }
export interface Telegram {
  sendMessage(p: { chat_id: number | string; text: string; parse_mode: 'HTML'; reply_markup?: { inline_keyboard: InlineButton[][] }; reply_to_message_id?: number; disable_web_page_preview?: boolean }): Promise<{ message_id: number }>;
  editMessageText(p: { chat_id: number | string; message_id: number; text: string; parse_mode: 'HTML'; reply_markup?: { inline_keyboard: InlineButton[][] }; disable_web_page_preview?: boolean }): Promise<unknown>;
}
export interface Update { update_id: number; message?: { message_id: number; chat: { id: number | string }; text?: string } }

export function parseRaidCommand(text: string): { symbol: string; xBps: number } | { error: string } | null {
  const m = /^\/raid(?:@\w+)?(?:\s+(.*))?$/i.exec(text.trim());
  if (!m) return null;
  const parts = (m[1] ?? '').trim().split(/\s+/).filter(Boolean);
  const [sym, mult] = parts;
  if (!sym || !mult) return { error: 'Usage: /raid PEPE 2x' };
  const symbol = sym.replace(/^\$/, '').toUpperCase();
  const x = Number(mult.toLowerCase().replace(/x$/, ''));
  if (!COIN_ASSETS[symbol]) return { error: `I don't know $${symbol} yet. Try: ${Object.keys(COIN_ASSETS).slice(0, 6).join(', ')}` };
  if (!Number.isFinite(x) || x < 1.1 || x > 100) return { error: 'The line is a multiple like 1.5x, 2x or 3x.' };
  return { symbol, xBps: Math.round(x * 1e4) };
}

/** The raid the command means: an Open raid on that coin at that line, the one with the most time left first. */
export function pickRaid(raids: ChestRaid[], symbol: string, xBps: number): ChestRaid | undefined {
  const asset = COIN_ASSETS[symbol];
  return raids.filter((r) => r.target === asset && r.target_x_bps === xBps && r.status !== 'Closed').sort((a, b) => b.opens_until_ms - a.opens_until_ms)[0];
}

const usdc = (raw: string | number) => Number(raw) / 1e6;
const xl = (bps: number) => `${(bps / 1e4).toFixed(bps % 1e4 === 0 ? 0 : 1)}x`;
export function dur(ms: number) {
  if (ms <= 0) return '0m';
  const m = Math.floor(ms / 60000), d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60);
  return d ? `${d}d ${h}h` : h ? `${h}h ${m % 60}m` : `${m % 60}m`;
}
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export type Stage = 'crew' | 'countdown' | 'awaiting' | 'buying' | 'held' | 'selling' | 'hit' | 'retreat';
export function stage(r: ChestRaid, now: number): Stage {
  if (r.status === 'Open') return now < r.opens_until_ms ? 'crew' : r.buy_after_ms && now < r.buy_after_ms ? 'countdown' : 'awaiting';
  if (r.status === 'Buying') return 'buying';
  if (r.status === 'Held') return 'held';
  if (r.status === 'Selling') return 'selling';
  return r.hit ? 'hit' : 'retreat';
}

export function renderCard(r: ChestRaid, symbol: string, now: number, appUrl: string, maxPot: string | null) {
  const s = stage(r, now);
  const pot = usdc(r.pot);
  const cap = maxPot ? usdc(maxPot) : null;
  const filled = cap ? Math.min(100, Math.round((pot / cap) * 100)) : null;
  const bar = filled !== null ? `${'▰'.repeat(Math.round(filled / 10))}${'▱'.repeat(10 - Math.round(filled / 10))} ${filled}%` : '';
  const head = {
    crew: `⏳ Crew closes in <b>${dur(r.opens_until_ms - now)}</b>`,
    countdown: `📣 Public countdown: buy in <b>${dur((r.buy_after_ms ?? now) - now)}</b>`,
    awaiting: '🟦 Crew closed. Awaiting the buy',
    buying: '🛒 Buying now through NEAR Intents',
    held: `📈 Holding. Sells at the line or retreats in <b>${dur(r.retreat_at_ms - now)}</b>`,
    selling: '💰 Line reached. Cashing out',
    hit: '✅ <b>LINE HIT.</b> Backers can claim in the app',
    retreat: '↩️ <b>Retreated.</b> The line was not reached; backers can claim what is left',
  }[s];
  const text = [
    `<b>RAID #${r.id} · $${esc(symbol)} to ${xl(r.target_x_bps)}</b>`,
    head,
    `Pot: <b>${pot.toLocaleString('en-US', { maximumFractionDigits: 2 })} USDC</b>${cap ? ` of ${cap.toLocaleString('en-US')}` : ''}${bar ? `\n${bar}` : ''}`,
    `Caller: <code>${esc(r.caller)}</code>`,
    '<i>Rules on chain: the chest buys together, sells together at the line, and the caller earns only on a hit.</i>',
  ].join('\n');
  const open = s === 'crew' || s === 'countdown';
  const kb: InlineButton[][] = [[{ text: open ? `Back raid #${r.id}` : `Open raid #${r.id}`, url: `${appUrl}/raids/${r.id}` }]];
  return { text, reply_markup: { inline_keyboard: kb }, stage: s, pot };
}

interface Tracked { chat: number | string; message: number; raidId: number; symbol: string; text: string; stage: Stage; pot: number }

export class RaidBot {
  tracked: Tracked[] = [];
  constructor(private o: { tg: Telegram; chest: ChestReader; appUrl: string; now?: () => number }) {}
  private now() { return this.o.now ? this.o.now() : Date.now(); }

  async handle(u: Update) {
    const msg = u.message; if (!msg?.text) return;
    const cmd = parseRaidCommand(msg.text); if (!cmd) return;
    const chat = msg.chat.id;
    if ('error' in cmd) { await this.o.tg.sendMessage({ chat_id: chat, text: esc(cmd.error), parse_mode: 'HTML', reply_to_message_id: msg.message_id }); return; }
    const [raids, maxPot] = await Promise.all([this.o.chest.listRaids(), this.o.chest.maxPot()]);
    const r = pickRaid(raids, cmd.symbol, cmd.xBps);
    if (!r) {
      await this.o.tg.sendMessage({ chat_id: chat, parse_mode: 'HTML', reply_to_message_id: msg.message_id,
        text: `No open <b>$${cmd.symbol} ${xl(cmd.xBps)}</b> raid right now. Be the caller: you earn only if the crew hits the line.`,
        reply_markup: { inline_keyboard: [[{ text: `Call $${cmd.symbol} ${xl(cmd.xBps)}`, url: `${this.o.appUrl}/coin/${cmd.symbol}?x=${cmd.xBps / 1e4}` }]] } });
      return;
    }
    const c = renderCard(r, cmd.symbol, this.now(), this.o.appUrl, maxPot);
    const sent = await this.o.tg.sendMessage({ chat_id: chat, text: c.text, parse_mode: 'HTML', reply_markup: c.reply_markup, disable_web_page_preview: true });
    this.tracked = this.tracked.filter((t) => !(t.chat === chat && t.raidId === r.id));
    this.tracked.push({ chat, message: sent.message_id, raidId: r.id, symbol: cmd.symbol, text: c.text, stage: c.stage, pot: c.pot });
  }

  /** Re-read every tracked raid; edit cards that changed (countdown, fill), announce hit / retreat, stop tracking closed raids. */
  async tick() {
    if (!this.tracked.length) return;
    const maxPot = await this.o.chest.maxPot();
    for (const t of [...this.tracked]) {
      const r = await this.o.chest.getRaid(t.raidId).catch(() => null);
      if (!r) continue;
      const c = renderCard(r, t.symbol, this.now(), this.o.appUrl, maxPot);
      if (c.text !== t.text) {
        await this.o.tg.editMessageText({ chat_id: t.chat, message_id: t.message, text: c.text, parse_mode: 'HTML', reply_markup: c.reply_markup, disable_web_page_preview: true }).catch(() => {});
      }
      if (c.pot > t.pot && (c.stage === 'crew' || c.stage === 'countdown')) {
        await this.o.tg.sendMessage({ chat_id: t.chat, parse_mode: 'HTML', reply_to_message_id: t.message, text: `⚔️ +${(c.pot - t.pot).toLocaleString('en-US', { maximumFractionDigits: 2 })} USDC joined raid #${r.id}. Pot ${c.pot.toLocaleString('en-US', { maximumFractionDigits: 2 })} USDC.` });
      }
      if ((c.stage === 'hit' || c.stage === 'retreat') && c.stage !== t.stage) {
        await this.o.tg.sendMessage({ chat_id: t.chat, parse_mode: 'HTML', reply_to_message_id: t.message,
          text: c.stage === 'hit' ? `✅ Raid #${r.id} hit ${xl(r.target_x_bps)} on $${t.symbol}. Claim in the app.` : `↩️ Raid #${r.id} retreated. Backers claim what the chest sold for.`,
          reply_markup: { inline_keyboard: [[{ text: 'Claim', url: `${this.o.appUrl}/raids/${r.id}` }]] } });
      }
      Object.assign(t, { text: c.text, stage: c.stage, pot: c.pot });
      if (c.stage === 'hit' || c.stage === 'retreat') this.tracked = this.tracked.filter((x) => x !== t);
    }
  }
}

/** Chest reader over NEAR JSON-RPC (read only). */
export function rpcChest(rpc: string, chest: string): ChestReader {
  const view = async <T>(method: string, args: object = {}): Promise<T> => {
    const r = await fetch(rpc, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 'tg', method: 'query', params: { request_type: 'call_function', finality: 'optimistic', account_id: chest, method_name: method, args_base64: Buffer.from(JSON.stringify(args)).toString('base64') } }) });
    const j = (await r.json()) as { error?: { message: string }; result?: { result?: number[]; error?: string } };
    if (j.error || j.result?.error || !j.result?.result) throw new Error(j.error?.message ?? j.result?.error ?? 'rpc');
    return JSON.parse(Buffer.from(j.result.result).toString()) as T;
  };
  return {
    listRaids: () => view<ChestRaid[]>('list_raids', { from: 0, limit: 200 }),
    getRaid: (id) => view<ChestRaid | null>('get_raid', { id }),
    maxPot: async () => (await view<{ max_pot?: string }>('get_config')).max_pot ?? null,
  };
}

/** Telegram Bot API over fetch. The token is only ever read from the environment by run.ts. */
export function botApi(token: string) {
  const call = async <T>(method: string, body: object): Promise<T> => {
    const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const j = (await r.json()) as { ok: boolean; result: T; description?: string };
    if (!j.ok) throw new Error(`telegram ${method}: ${j.description ?? r.status}`);
    return j.result;
  };
  return {
    sendMessage: (p) => call<{ message_id: number }>('sendMessage', p),
    editMessageText: (p) => call('editMessageText', p),
    getUpdates: (offset: number) => call<Update[]>('getUpdates', { offset, timeout: 30, allowed_updates: ['message'] }),
  } satisfies Telegram & { getUpdates(o: number): Promise<Update[]> };
}
