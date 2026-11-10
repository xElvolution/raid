/**
 * TEE attestation checks for NEAR-operated reports (docs.near.ai "Quote, Nonce, and Signer Bindings").
 * Quote verification is delegated to an injectable verifier (default: @phala/dcap-qvl) so the
 * binding logic (report data, nonce, MRCONFIGID, RTMR3) is unit-testable.
 */
import { createHash } from 'node:crypto';

export interface NearReport {
  intel_quote: string;
  signing_address: string;
  signing_algo: 'ecdsa' | 'ed25519';
  request_nonce: string;
  tls_cert_fingerprint?: string;
  info: { tcb_info: string | { app_compose: string } };
  event_log: string | RtmrEvent[];
}

export interface RtmrEvent {
  imr: number;
  event_type: number;
  event: string;
  event_payload?: string;
  digest?: string;
}

export interface VerifiedQuote {
  status: string;
  advisoryIds?: string[];
  tdAttributes: Uint8Array;
  reportData: Uint8Array;
  mrConfigId: Uint8Array;
  rtMr3: Uint8Array;
}

export type QuoteVerifier = (quote: Buffer) => Promise<VerifiedQuote>;

const hexBytes = (v: string): Buffer => Buffer.from(v.replace(/^0x/i, ''), 'hex');
const parse = <T>(v: string | T): T => (typeof v === 'string' ? (JSON.parse(v) as T) : v);
const hash = (alg: string, ...parts: (Buffer | string)[]): Buffer => {
  const h = createHash(alg);
  for (const p of parts) h.update(p);
  return h.digest();
};

export function replayRtmr3(eventLog: string | RtmrEvent[]): Buffer {
  let rtmr3: Buffer = Buffer.alloc(48);
  for (const e of parse<RtmrEvent[]>(eventLog)) {
    if (e.imr !== 3) continue;
    const t = Buffer.alloc(4);
    t.writeUInt32LE(e.event_type);
    const digest = hash('sha384', t, ':', Buffer.from(e.event, 'utf8'), ':', hexBytes(e.event_payload ?? ''));
    if (e.digest && !hexBytes(e.digest).equals(digest)) throw new Error(`digest mismatch for event ${e.event}`);
    rtmr3 = hash('sha384', rtmr3, digest);
  }
  return rtmr3;
}

export function expectedReportData(r: Pick<NearReport, 'signing_address' | 'signing_algo' | 'tls_cert_fingerprint'>, nonceHex: string): Buffer {
  const id = hexBytes(r.signing_address);
  if ({ ecdsa: 20, ed25519: 32 }[r.signing_algo] !== id.length) throw new Error('unsupported signing identity');
  const bound = r.tls_cert_fingerprint
    ? hash('sha256', id, hexBytes(r.tls_cert_fingerprint))
    : Buffer.concat([id, Buffer.alloc(32 - id.length)]);
  return Buffer.concat([bound, hexBytes(nonceHex)]);
}

export function expectedMrConfigId(appCompose: string): Buffer {
  return Buffer.concat([Buffer.from([1]), hash('sha256', Buffer.from(appCompose, 'utf8')), Buffer.alloc(15)]);
}

export async function defaultQuoteVerifier(quote: Buffer): Promise<VerifiedQuote> {
  const { getCollateralAndVerify } = (await import('@phala/dcap-qvl')) as unknown as {
    getCollateralAndVerify: (q: Buffer) => Promise<{ status: string; advisory_ids?: string[]; report: { type: string; data: { tdAttributes: Uint8Array; reportData: Uint8Array; mrConfigId: Uint8Array; rtMr3: Uint8Array } } }>;
  };
  const v = await getCollateralAndVerify(quote);
  if (v.report.type !== 'td10') throw new Error('expected a TDX quote');
  return { status: v.status, advisoryIds: v.advisory_ids, ...v.report.data };
}

/** Full check of one NEAR report. Returns the attested signer identity on success. */
export async function checkNearReport(
  report: NearReport,
  nonceHex: string,
  acceptedTcb: string[],
  verifier: QuoteVerifier = defaultQuoteVerifier,
): Promise<{ signing_algo: NearReport['signing_algo']; signing_address: string; tcb: string }> {
  const q = await verifier(hexBytes(report.intel_quote));
  if (!acceptedTcb.includes(q.status)) throw new Error(`TCB status ${q.status} not accepted: ${q.advisoryIds?.join(',') ?? ''}`);
  if ((q.tdAttributes[0] ?? 0) & 1) throw new Error('TDX debug mode is enabled');
  if (!Buffer.from(q.reportData).equals(expectedReportData(report, nonceHex))) throw new Error('report data does not bind the signer and nonce');
  if (report.request_nonce.toLowerCase() !== nonceHex.toLowerCase()) throw new Error('echoed nonce does not match');
  const appCompose = parse<{ app_compose: string }>(report.info.tcb_info).app_compose;
  if (!Buffer.from(q.mrConfigId).equals(expectedMrConfigId(appCompose))) throw new Error('MRCONFIGID does not match app_compose');
  if (!replayRtmr3(report.event_log).equals(Buffer.from(q.rtMr3))) throw new Error('event log does not match RTMR3');
  return { signing_algo: report.signing_algo, signing_address: report.signing_address.replace(/^0x/i, '').toLowerCase(), tcb: q.status };
}
