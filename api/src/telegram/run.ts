/**
 * Live runner: `TELEGRAM_BOT_TOKEN=… npx tsx src/telegram/run.ts`. Long-polls getUpdates and ticks every 30 s.
 * Without a token it refuses to start. `--mock` prints what the bot would post for `/raid PEPE 2x` against the
 * live testnet chest, using a console Telegram (nothing is sent anywhere).
 */
import { botApi, RaidBot, rpcChest, type Telegram } from './bot.js';

const RPC = process.env.NEAR_RPC_URL ?? 'https://rpc.testnet.fastnear.com';
const CHEST = process.env.RAID_CHEST ?? 'raid-chest-mwab3vnk.testnet';
const APP = process.env.RAID_APP_URL ?? 'http://localhost:3420';
const chest = rpcChest(RPC, CHEST);

if (process.argv.includes('--mock')) {
  let n = 100;
  const tg: Telegram = {
    sendMessage: async (p) => { console.log(`\n[sendMessage → ${p.chat_id}]\n${p.text}\n${JSON.stringify(p.reply_markup ?? {})}`); return { message_id: ++n }; },
    editMessageText: async (p) => { console.log(`\n[editMessageText ${p.message_id}]\n${p.text}`); return true; },
  };
  const bot = new RaidBot({ tg, chest, appUrl: APP });
  for (const t of process.argv.slice(3).length ? process.argv.slice(3) : ['/raid PEPE 2x', '/raid DOGE 3x', '/raid TRUMP 2x']) await bot.handle({ update_id: 1, message: { message_id: 1, chat: { id: 'mock' }, text: t } });
  await bot.tick();
  process.exit(0);
}

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) { console.error('TELEGRAM_BOT_TOKEN is not set. Not starting. (Use --mock for a dry run.)'); process.exit(1); }
const api = botApi(token);
const bot = new RaidBot({ tg: api, chest, appUrl: APP });
setInterval(() => void bot.tick().catch((e) => console.error('tick', e)), 30_000);
let offset = 0;
console.log(`RAID Telegram bot polling · chest ${CHEST} · app ${APP}`);
for (;;) {
  try {
    for (const u of await api.getUpdates(offset)) { offset = u.update_id + 1; await bot.handle(u).catch((e) => console.error('handle', e)); }
  } catch (e) { console.error('poll', (e as Error).message); await new Promise((s) => setTimeout(s, 5000)); }
}
