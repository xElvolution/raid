/** Post -> market draft. Uses a verifiable NEAR AI model when configured; otherwise a conservative heuristic. */
import { MarketDraft } from './prompt.js';
import type { NearAiClient } from './nearai.js';

const DRAFT_SYSTEM =
  'Turn a social post into a binary prediction market. Respond with JSON only: {"question","outcomes":["NO","YES"],"closeMs","rules","sources","clarity"}. ' +
  'question: one falsifiable yes/no question under 280 chars. rules: precise resolution criteria incl. timezone and source of truth. ' +
  'clarity: 0..1, how unambiguously it can be resolved. If the post is not falsifiable, set clarity 0.';

const BANNED = /\b(die|death|dead|kill|assassinat|suicide|self-harm|murder|rape|child|minor)\b/i;

export function isAllowedTopic(text: string): boolean {
  return !BANNED.test(text);
}

export function heuristicDraft(post: string, nowMs: number): MarketDraft | null {
  const text = post.trim().replace(/\s+/g, ' ');
  if (!text || !isAllowedTopic(text)) return null;
  const m = text.match(/\b(will|won't|gonna|going to|by|before)\b/i);
  if (!m) return null;
  const q = text.endsWith('?') ? text : `${text.replace(/[.!]+$/, '')}?`;
  const question = (/^will\b/i.test(q) ? q : `Will this happen: ${q}`).slice(0, 280);
  return MarketDraft.parse({
    question,
    outcomes: ['NO', 'YES'],
    closeMs: nowMs + 7 * 24 * 3600 * 1000,
    rules: `Resolves YES if, by the close time (UTC), credible public reporting confirms: "${text.slice(0, 500)}". Otherwise NO. Ambiguous or unverifiable outcomes resolve INVALID.`,
    sources: [],
    clarity: 0.4,
  });
}

export async function aiDraft(client: NearAiClient, model: string, post: string, nowMs: number): Promise<MarketDraft | null> {
  if (!isAllowedTopic(post)) return null;
  const req = JSON.stringify({
    model,
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: DRAFT_SYSTEM },
      { role: 'user', content: `Now (UTC): ${new Date(nowMs).toISOString()}\nPost: ${post}` },
    ],
  });
  const r = await client.chat(req);
  const parsed = MarketDraft.safeParse(JSON.parse(r.content));
  if (!parsed.success || parsed.data.clarity < 0.5 || parsed.data.closeMs <= nowMs) return null;
  return parsed.data;
}
