/**
 * Minimal NEAR AI Cloud client (OpenAI-compatible gateway at https://cloud-api.near.ai/v1).
 * Endpoints (docs.near.ai/llms.txt): POST /chat/completions, GET /signature/{id},
 * GET /attestation/report, GET /model/list (public; `metadata.verifiable`).
 */
import { randomBytes } from 'node:crypto';
import type { NearReport } from './attestation.js';
import type { ResponseSignature, SigningAlgo } from './signature.js';

export interface ChatResult {
  id: string;
  requestBytes: string;
  responseBytes: string;
  content: string;
}

export interface AttestationBody {
  gateway_attestation: NearReport;
  model_attestations?: NearReport[];
}

export class NearAiClient {
  constructor(
    private readonly apiKey: string,
    private readonly baseUrl = 'https://cloud-api.near.ai/v1',
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  private headers(): Record<string, string> {
    return { authorization: `Bearer ${this.apiKey}`, 'content-type': 'application/json' };
  }

  /** Send exact request bytes; return exact response bytes (needed for the signature check). */
  async chat(requestBytes: string): Promise<ChatResult> {
    const r = await this.fetchImpl(`${this.baseUrl}/chat/completions`, { method: 'POST', headers: this.headers(), body: requestBytes });
    const responseBytes = await r.text();
    if (!r.ok) throw new Error(`chat failed ${r.status}: ${responseBytes.slice(0, 300)}`);
    const json = JSON.parse(responseBytes) as { id: string; choices: { message: { content: string } }[] };
    return { id: json.id, requestBytes, responseBytes, content: json.choices[0]?.message.content ?? '' };
  }

  async signature(chatId: string, model: string, algo: SigningAlgo): Promise<ResponseSignature> {
    const u = new URL(`${this.baseUrl}/signature/${encodeURIComponent(chatId)}`);
    u.searchParams.set('model', model);
    u.searchParams.set('signing_algo', algo);
    const r = await this.fetchImpl(u, { headers: this.headers() });
    if (!r.ok) throw new Error(`signature unavailable ${r.status}`);
    return (await r.json()) as ResponseSignature;
  }

  /** Fetch fresh attestation evidence bound to a client nonce (32 random bytes, hex). */
  async attestationReport(model: string, algo: SigningAlgo, nonce = randomBytes(32).toString('hex')): Promise<{ nonce: string; body: AttestationBody }> {
    const u = new URL(`${this.baseUrl}/attestation/report`);
    u.searchParams.set('model', model);
    u.searchParams.set('provider', 'near');
    u.searchParams.set('signing_algo', algo);
    u.searchParams.set('nonce', nonce);
    const r = await this.fetchImpl(u, { headers: { ...this.headers(), 'x-no-aliasing': 'true' } });
    if (!r.ok) throw new Error(`attestation failed ${r.status}`);
    return { nonce, body: (await r.json()) as AttestationBody };
  }
}

/** Public, unauthenticated: list models flagged verifiable (only these may judge). */
export async function verifiableModels(fetchImpl: typeof fetch = fetch, baseUrl = 'https://cloud-api.near.ai/v1'): Promise<string[]> {
  const r = await fetchImpl(`${baseUrl}/model/list`);
  const j = (await r.json()) as { models: { modelId: string; metadata?: { verifiable?: boolean } }[] };
  return j.models.filter((m) => m.metadata?.verifiable).map((m) => m.modelId);
}
