import { z } from 'zod';

export const Verdict = z.enum(['YES', 'NO', 'INVALID']);
export type Verdict = z.infer<typeof Verdict>;

export interface MarketForJudging {
  id: number;
  question: string;
  rules: string;
  closeMs: number;
}

export interface Evidence {
  url: string;
  fetchedAt: string;
  sha256: string;
  excerpt: string;
}

export const JUDGE_SYSTEM = [
  'You are the Called resolution judge. Decide a binary prediction market strictly from the rules and the evidence provided.',
  'Do not use outside knowledge. If the evidence is insufficient, ambiguous, or the rules cannot be applied, answer INVALID.',
  'Explain briefly, then end with exactly one line: CALLED_VERDICT:<market_id>:<YES|NO|INVALID>',
].join(' ');

/** Builds the exact request body bytes. Evidence is embedded so it is covered by the signature. */
export function buildJudgeRequest(model: string, m: MarketForJudging, evidence: Evidence[]): string {
  const user = [
    `Market #${m.id}: ${m.question}`,
    `Closed at: ${new Date(m.closeMs).toISOString()}`,
    `Rules: ${m.rules}`,
    'Evidence:',
    ...evidence.map((e, i) => `[${i + 1}] ${e.url} (fetched ${e.fetchedAt}, sha256 ${e.sha256})\n${e.excerpt}`),
  ].join('\n');
  return JSON.stringify({
    model,
    temperature: 0,
    stream: false,
    messages: [
      { role: 'system', content: JUDGE_SYSTEM },
      { role: 'user', content: user },
    ],
  });
}

export function parseVerdict(content: string, marketId: number): Verdict | null {
  const re = new RegExp(`CALLED_VERDICT:${marketId}:(YES|NO|INVALID)`, 'g');
  let last: string | null = null;
  for (const m of content.matchAll(re)) last = m[1] ?? null;
  return last ? Verdict.parse(last) : null;
}

export const MarketDraft = z.object({
  question: z.string().min(8).max(280),
  outcomes: z.tuple([z.literal('NO'), z.literal('YES')]),
  closeMs: z.number().int().positive(),
  rules: z.string().min(10).max(4000),
  sources: z.array(z.string().url()).max(5),
  clarity: z.number().min(0).max(1),
});
export type MarketDraft = z.infer<typeof MarketDraft>;
