import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { checkNearReport, expectedMrConfigId, expectedReportData, replayRtmr3, type NearReport, type VerifiedQuote } from '../src/attestation.js';

const nonce = 'ab'.repeat(32);
const signer = 'cd'.repeat(32);
const appCompose = '{"services":{"judge":{}}}';
const events = [
  { imr: 3, event_type: 134217729, event: 'compose-hash', event_payload: 'aa' },
  { imr: 1, event_type: 1, event: 'ignored', event_payload: '' },
];

function report(over: Partial<NearReport> = {}): NearReport {
  return {
    intel_quote: '00',
    signing_address: signer,
    signing_algo: 'ed25519',
    request_nonce: nonce,
    info: { tcb_info: JSON.stringify({ app_compose: appCompose }) },
    event_log: JSON.stringify(events),
    ...over,
  };
}

const goodQuote = (): VerifiedQuote => ({
  status: 'UpToDate',
  tdAttributes: new Uint8Array([0]),
  reportData: expectedReportData(report(), nonce),
  mrConfigId: expectedMrConfigId(appCompose),
  rtMr3: replayRtmr3(events),
});

describe('NEAR report bindings', () => {
  it('accepts a report whose quote binds signer, nonce, config and RTMR3', async () => {
    const r = await checkNearReport(report(), nonce, ['UpToDate'], async () => goodQuote());
    expect(r.signing_address).toBe(signer);
  });

  it('report data = identity zero-padded || nonce (no TLS binding)', () => {
    const ecdsa = expectedReportData({ signing_address: '0x' + '11'.repeat(20), signing_algo: 'ecdsa' }, nonce);
    expect(ecdsa.subarray(20, 32).every((b) => b === 0)).toBe(true);
    expect(ecdsa.subarray(32).toString('hex')).toBe(nonce);
  });

  it('report data = sha256(identity||fingerprint) || nonce with TLS binding', () => {
    const fp = 'ef'.repeat(32);
    const d = expectedReportData({ signing_address: signer, signing_algo: 'ed25519', tls_cert_fingerprint: fp }, nonce);
    const h = createHash('sha256').update(Buffer.from(signer + fp, 'hex')).digest();
    expect(d.subarray(0, 32).equals(h)).toBe(true);
  });

  it.each([
    ['stale TCB', { status: 'OutOfDate' }, /TCB status/],
    ['debug mode', { tdAttributes: new Uint8Array([1]) }, /debug/],
    ['wrong nonce', { reportData: expectedReportData(report(), 'ff'.repeat(32)) }, /bind/],
    ['wrong config', { mrConfigId: expectedMrConfigId('{}') }, /MRCONFIGID/],
    ['wrong RTMR3', { rtMr3: Buffer.alloc(48) }, /RTMR3/],
  ])('rejects %s', async (_n, patch, err) => {
    await expect(checkNearReport(report(), nonce, ['UpToDate'], async () => ({ ...goodQuote(), ...patch }))).rejects.toThrow(err);
  });

  it('rejects a mismatched event digest', () => {
    expect(() => replayRtmr3([{ ...events[0], digest: '00'.repeat(48) } as (typeof events)[number]])).toThrow(/digest mismatch/);
  });
});
