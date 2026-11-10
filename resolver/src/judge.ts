/**
 * Judge panel. Each judge returns a verdict plus everything the contract needs to verify it.
 * - NearAiJudge: real NEAR AI Cloud verifiable model (requires NEARAI_API_KEY).
 * - StubJudge: local ed25519 key, identical signed-text format; used when no key exists and in tests.
 */
import nacl from 'tweetnacl';
import type { NearAiClient } from './nearai.js';
import { buildJudgeRequest, parseVerdict, type Evidence, type MarketForJudging, type Verdict } from './prompt.js';
import { responseSignatureText, sha256Hex, verifyResponseSignature, type ResponseSignature, type SignerIdentity, type SigningAlgo } from './signature.js';

export interface SignedVerdict {
  model: string;
  verdict: Verdict | null;
  requestBytes: string;
  responseBytes: string;
  requestSha256: string;
  signature: ResponseSignature;
}

export interface Judge {
  readonly model: string;
  judge(m: MarketForJudging, evidence: Evidence[]): Promise<SignedVerdict>;
}

export class NearAiJudge implements Judge {
  constructor(
    private readonly client: NearAiClient,
    readonly model: string,
    private readonly attested: SignerIdentity,
    private readonly algo: SigningAlgo = 'ed25519',
  ) {}

  async judge(m: MarketForJudging, evidence: Evidence[]): Promise<SignedVerdict> {
    const req = buildJudgeRequest(this.model, m, evidence);
    const chat = await this.client.chat(req);
    const sig = await this.client.signature(chat.id, this.model, this.algo);
    verifyResponseSignature(sig, responseSignatureText(chat.requestBytes, chat.responseBytes), this.attested);
    return {
      model: this.model,
      verdict: parseVerdict(chat.content, m.id),
      requestBytes: chat.requestBytes,
      responseBytes: chat.responseBytes,
      requestSha256: sha256Hex(chat.requestBytes),
      signature: sig,
    };
  }
}

/** Deterministic offline judge. `decide` stands in for the model. NOT for production verdicts. */
export class StubJudge implements Judge {
  readonly keyPair: nacl.SignKeyPair;
  constructor(
    readonly model: string,
    private readonly decide: (m: MarketForJudging, ev: Evidence[]) => Verdict,
    seed: Uint8Array = nacl.randomBytes(32),
  ) {
    this.keyPair = nacl.sign.keyPair.fromSeed(seed);
  }

  get identity(): SignerIdentity {
    return { signing_algo: 'ed25519', signing_address: Buffer.from(this.keyPair.publicKey).toString('hex') };
  }

  async judge(m: MarketForJudging, evidence: Evidence[]): Promise<SignedVerdict> {
    const req = buildJudgeRequest(this.model, m, evidence);
    const v = this.decide(m, evidence);
    const content = `Stub judgement based on ${evidence.length} evidence item(s).\nCALLED_VERDICT:${m.id}:${v}`;
    const res = JSON.stringify({ id: `stub-${sha256Hex(req).slice(0, 12)}`, model: this.model, choices: [{ index: 0, message: { role: 'assistant', content } }] });
    const text = responseSignatureText(req, res);
    const signature: ResponseSignature = {
      text,
      signature: Buffer.from(nacl.sign.detached(Buffer.from(text, 'utf8'), this.keyPair.secretKey)).toString('hex'),
      signing_algo: 'ed25519',
      signing_address: this.identity.signing_address,
    };
    return { model: this.model, verdict: parseVerdict(content, m.id), requestBytes: req, responseBytes: res, requestSha256: sha256Hex(req), signature };
  }
}

export interface PanelResult {
  outcome: Verdict;
  agreeing: SignedVerdict[];
  all: SignedVerdict[];
}

/** 2-of-3 (majority) panel. No majority or failures => INVALID (escalates to court). */
export async function runPanel(judges: Judge[], m: MarketForJudging, evidence: Evidence[]): Promise<PanelResult> {
  const settled = await Promise.allSettled(judges.map((j) => j.judge(m, evidence)));
  const ok = settled.flatMap((s) => (s.status === 'fulfilled' ? [s.value] : []));
  const need = Math.floor(judges.length / 2) + 1;
  for (const v of ['YES', 'NO', 'INVALID'] as const) {
    const agreeing = ok.filter((r) => r.verdict === v);
    if (agreeing.length >= need) return { outcome: v, agreeing, all: ok };
  }
  return { outcome: 'INVALID', agreeing: [], all: ok };
}

/** Arguments for the contract's `propose_resolution`. */
export function toContractArgs(marketId: number, r: SignedVerdict) {
  return {
    market_id: String(marketId),
    request_sha256: r.requestSha256,
    response: Buffer.from(r.responseBytes, 'utf8').toString('base64'),
    signature_hex: r.signature.signature,
    signer_hex: r.signature.signing_address.replace(/^0x/i, ''),
    model_name: null,
  };
}
