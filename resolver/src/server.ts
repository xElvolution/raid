import Fastify from 'fastify';
import { z } from 'zod';
import { loadEnv } from './config.js';
import { aiDraft, heuristicDraft } from './draft.js';
import { NearAiClient } from './nearai.js';
import { checkNearReport } from './attestation.js';
import { NearAiJudge, runPanel, toContractArgs, type Judge } from './judge.js';
import type { SignerIdentity } from './signature.js';

export function buildServer(env = loadEnv()) {
  const app = Fastify({ logger: true });
  const client = env.NEARAI_API_KEY ? new NearAiClient(env.NEARAI_API_KEY, env.NEARAI_BASE_URL) : null;
  const mode = client ? 'nearai' : 'stub';

  app.addHook('onRequest', async (req, reply) => {
    if (req.url === '/health') return;
    if (env.RESOLVER_TOKEN && req.headers.authorization !== `Bearer ${env.RESOLVER_TOKEN}`) {
      await reply.code(401).send({ error: 'unauthorized' });
    }
  });

  app.get('/health', async () => ({ ok: true, mode }));

  const DraftBody = z.object({ post: z.string().min(1).max(3000) });
  app.post('/draft', async (req, reply) => {
    const body = DraftBody.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() });
    const now = Date.now();
    const draft = client ? await aiDraft(client, env.DRAFT_MODEL, body.data.post, now) : heuristicDraft(body.data.post, now);
    return { mode, draft };
  });

  const JudgeBody = z.object({
    market: z.object({ id: z.number().int().nonnegative(), question: z.string(), rules: z.string(), closeMs: z.number() }),
    evidence: z.array(z.object({ url: z.string().url(), fetchedAt: z.string(), sha256: z.string().length(64), excerpt: z.string().max(8000) })).max(10),
  });
  // Attested gateway signer, re-verified every 10 minutes (docs.near.ai: gateway response signatures
  // are made by the key bound in gateway_attestation; model evidence is checked for every candidate).
  let attested: { identity: SignerIdentity; at: number } | null = null;
  const acceptedTcb = env.ACCEPTED_TCB.split(',');
  async function attestedSigner(c: NearAiClient, model: string): Promise<SignerIdentity> {
    if (attested && Date.now() - attested.at < 10 * 60_000) return attested.identity;
    const { nonce, body } = await c.attestationReport(model, 'ed25519');
    const gw = await checkNearReport(body.gateway_attestation, nonce, acceptedTcb);
    for (const c of body.model_attestations ?? []) await checkNearReport(c, nonce, acceptedTcb);
    attested = { identity: { signing_algo: gw.signing_algo, signing_address: gw.signing_address }, at: Date.now() };
    return attested.identity;
  }

  app.post('/judge', async (req, reply) => {
    if (!client) return reply.code(503).send({ error: 'NEARAI_API_KEY not configured' });
    const body = JudgeBody.safeParse(req.body);
    if (!body.success) return reply.code(400).send({ error: body.error.flatten() });
    const models = env.JUDGE_MODELS.split(',').map((m) => m.trim()).filter(Boolean);
    const first = models[0];
    if (!first) return reply.code(500).send({ error: 'no JUDGE_MODELS' });
    const identity = await attestedSigner(client, first);
    const judges: Judge[] = models.map((m) => new NearAiJudge(client, m, identity, 'ed25519'));
    const r = await runPanel(judges, body.data.market, body.data.evidence);
    return {
      outcome: r.outcome,
      signer: identity,
      contractArgs: r.agreeing[0] ? toContractArgs(body.data.market.id, r.agreeing[0]) : null,
      votes: r.all.map((v) => ({ model: v.model, verdict: v.verdict })),
    };
  });

  return app;
}

if (import.meta.url === `file://${process.argv[1]}` || process.env.pm_id !== undefined) {
  const env = loadEnv();
  buildServer(env).listen({ port: env.PORT, host: process.env.HOST ?? '0.0.0.0' }).catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  });
}
