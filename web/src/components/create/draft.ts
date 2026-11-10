/** Instant, local take → market draft. The server AI preview refines it when available. */
import type { MarketCategory } from '@called/sdk';

export type ThemeKey = 'auto' | 'crypto' | 'football' | 'f1' | 'boxing' | 'music' | 'movies' | 'tech' | 'space' | 'weather' | 'gta';
export const THEMES: { key: ThemeKey; label: string; hint: string; cat: MarketCategory }[] = [
  { key: 'auto', label: 'Auto', hint: '', cat: 'culture' },
  { key: 'crypto', label: 'Bull vs Bear', hint: 'crypto', cat: 'crypto' },
  { key: 'football', label: 'Matchday', hint: 'premier league', cat: 'sports' },
  { key: 'f1', label: 'Grand Prix', hint: 'f1', cat: 'sports' },
  { key: 'boxing', label: 'Fight night', hint: 'boxing', cat: 'sports' },
  { key: 'music', label: 'Encore', hint: 'album', cat: 'music' },
  { key: 'movies', label: 'Box office', hint: 'movie', cat: 'culture' },
  { key: 'tech', label: 'Tech war', hint: '', cat: 'tech' },
  { key: 'space', label: 'Launch pad', hint: 'rocket', cat: 'tech' },
  { key: 'weather', label: 'Storm', hint: 'weather', cat: 'weather' },
  { key: 'gta', label: 'Gangsters', hint: 'gta', cat: 'culture' },
];
export const CATS: { key: MarketCategory; label: string }[] = [
  { key: 'crypto', label: 'Crypto' }, { key: 'sports', label: 'Sports' }, { key: 'music', label: 'Music' },
  { key: 'culture', label: 'Movies & culture' }, { key: 'tech', label: 'Tech' }, { key: 'weather', label: 'Weather' },
];

const POLITICS = /\b(election|elections|president|presidential|senate|congress|governor|parliament|minister|vote|votes|voting|ballot|referendum|democrat|republican|trump|biden|harris|tinubu|obi|atiku|apc|pdp|labour party|tory|tories|impeach\w*|coup)\b/i;
export const isPolitical = (t: string) => POLITICS.test(t);

const CAT_RX: [MarketCategory, RegExp][] = [
  ['crypto', /\b(bitcoin|btc|eth|ethereum|sol|solana|crypto|xrp|doge|near|token|etf|memecoin|stablecoin)\b/i],
  ['weather', /\b(rain|snow|harmattan|temperature|heat ?wave|storm|hurricane|weather|°c|degrees)\b/i],
  ['music', /\b(grammy|album|single|tour|spotify|afrobeats|song|concert|billboard|streams?)\b/i],
  ['tech', /\b(apple|iphone|google|openai|gpt|ai|nvidia|tesla|spacex|starship|launch|android|meta|microsoft|chip|rocket)\b/i],
  ['sports', /\b(goal|league|cup|fc|united|madrid|arsenal|chelsea|bayern|psg|ballon|afcon|uefa|eagles|derby|premier|f1|grand prix|verstappen|hamilton|norris|ufc|boxing|knockout|fight|nba|lakers|win|beat|score)\b/i],
  ['culture', /\b(movie|film|box office|netflix|nollywood|oscar|marvel|gta|trailer|series|season)\b/i],
];
export const guessCategory = (t: string): MarketCategory => CAT_RX.find(([, r]) => r.test(t))?.[0] ?? 'culture';

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const eod = (d: Date) => { const x = new Date(d); x.setHours(23, 59, 0, 0); return x; };

/** Find a resolve-by date in free text. Returns null when the take has no date. */
export function parseDate(t: string, now = new Date()): Date | null {
  const s = t.toLowerCase();
  if (/\btonight|today\b/.test(s)) return eod(now);
  if (/\btomorrow\b/.test(s)) return eod(new Date(+now + 864e5));
  if (/\bthis weekend\b/.test(s)) { const d = new Date(now); d.setDate(d.getDate() + ((7 - d.getDay()) % 7 || 7)); return eod(d); }
  if (/\bnext week\b/.test(s)) return eod(new Date(+now + 7 * 864e5));
  if (/\b(end of (the )?month|this month)\b/.test(s)) return eod(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  if (/\b(end of (the )?year|this year|by christmas)\b/.test(s)) return eod(new Date(now.getFullYear(), 11, /christmas/.test(s) ? 25 : 31));
  const dn = DAYS.findIndex((d) => new RegExp(`\\b(by|on|this|before)? ?${d}\\b`).test(s));
  if (dn >= 0) { const d = new Date(now); d.setDate(d.getDate() + (((dn - d.getDay()) + 7) % 7 || 7)); return eod(d); }
  const m = s.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b|\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})(?:st|nd|rd|th)?\b/);
  if (m) {
    const mo = MONTHS.indexOf((m[2] ?? m[3])!), day = Number(m[1] ?? m[4]);
    let d = eod(new Date(now.getFullYear(), mo, day)); if (+d < +now) d = eod(new Date(now.getFullYear() + 1, mo, day)); return d;
  }
  const mo = s.match(/\b(?:by|in|before|end of)\s+(january|february|march|april|may|june|july|august|september|october|november|december)\b/);
  if (mo) { const i = MONTHS.indexOf(mo[1]!.slice(0, 3)); let d = eod(new Date(now.getFullYear(), i + 1, 0)); if (+d < +now) d = eod(new Date(now.getFullYear() + 1, i + 1, 0)); return d; }
  const y = s.match(/\b(?:by|in|before)\s+(20[2-9]\d)\b/);
  if (y) return eod(new Date(Number(y[1]), 11, 31));
  return null;
}

const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

export function toQuestion(take: string, close: Date | null): string {
  let t = take.trim().replace(/\s+/g, ' ').replace(/[.!]+$/, '').replace(/^(i think|imo|hot take:?|calling it:?|mark my words:?)\s*/i, '');
  if (!t) return '';
  t = t.replace(/\s+(by|before|on|this|in)\s+(tonight|today|tomorrow|this weekend|next week|end of (the )?(month|year)|this (month|year)|christmas|\w+day|\d{1,2}(st|nd|rd|th)?\s+\w+|\w+\s+\d{1,2}(st|nd|rd|th)?|january|february|march|april|may|june|july|august|september|october|november|december|20\d\d)\s*\??$/i, '');
  if (/\?$/.test(t)) return t;
  const lead = /^(will|does|is|can|do|has|are)\b/i.test(t) ? t[0]!.toUpperCase() + t.slice(1) : `Will ${t[0]!.toLowerCase() === t[0] ? t : /^[A-Z]{2,}|^[A-Z][a-z]+ [A-Z]/.test(t) ? t : t[0]!.toLowerCase() + t.slice(1)}`;
  const fixed = lead.replace(/^Will (.{1,40}?)\b(closes|wins|beats|hits|reaches|gets|makes|drops|releases|announces|grosses|debuts|flips|rains|scores|tops|passes|launches|breaks|finishes|signs|sells|crosses)\b/i, (_m, a: string, v: string) => `Will ${a}${/(ches|shes|sses|xes)$/i.test(v) ? v.slice(0, -2) : v.slice(0, -1)}`);
  return `${fixed.replace(/\bwill\s+will\b/i, 'Will')}${close ? ` by ${fmt(close)}` : ''}?`;
}

export interface Quality { clear: number; verifiable: number; dated: number; score: number; fixes: { id: string; label: string; apply?: string }[] }
export function quality(take: string, close: Date | null): Quality {
  const t = take.trim(), words = t.split(/\s+/).filter(Boolean).length;
  const vague = /\b(soon|eventually|someday|big|huge|a lot|massive|good|bad|better|moon|flop|kill it|trash|goated)\b/i.test(t);
  const clear = Math.max(0, Math.min(1, (words >= 4 ? 0.5 : words / 8) + (words <= 30 ? 0.3 : 0.1) + (vague ? 0 : 0.2)));
  const hasNum = /\$?\d[\d,.]*\s?(k|m|bn|%|°c|goals?|points?|million|billion)?/i.test(t);
  const hasEntity = /[A-Z][a-zA-Z0-9]+/.test(t) || /\b(btc|eth|sol|f1|ufc|nba|epl)\b/i.test(t);
  const verifiable = Math.min(1, (hasNum ? 0.5 : 0.15) + (hasEntity ? 0.4 : 0.1) + (vague ? 0 : 0.1));
  const dated = close ? 1 : 0;
  const fixes: Quality['fixes'] = [];
  if (!close) fixes.push({ id: 'date', label: 'Add a deadline so it can settle', apply: ' by Friday' });
  if (!hasNum) fixes.push({ id: 'num', label: 'Add a number to measure, e.g. price, score or %', apply: undefined });
  if (vague) fixes.push({ id: 'vague', label: 'Swap vague words (“soon”, “big”, “moon”) for a concrete outcome' });
  if (!hasEntity) fixes.push({ id: 'who', label: 'Name who or what: a team, coin, artist or company' });
  if (words > 30) fixes.push({ id: 'short', label: 'Trim to one sentence: one outcome, one deadline' });
  return { clear, verifiable, dated, score: Math.round(((clear + verifiable + dated) / 3) * 100), fixes };
}

export const sourceFor = (c: MarketCategory) => ({ crypto: 'CoinGecko / exchange close price', sports: 'Official league or governing-body result', music: 'Billboard / Spotify charts', culture: 'Box Office Mojo / official release', tech: 'Company announcement or press release', weather: 'National weather service records' }[c]);
