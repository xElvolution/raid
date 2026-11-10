import { describe, expect, it } from 'vitest';
import { ethers } from 'ethers';
import { responseSignatureText, verifyResponseSignature } from '../src/signature.js';
import { StubJudge, runPanel, toContractArgs } from '../src/judge.js';
import { parseVerdict } from '../src/prompt.js';

const market = { id: 7, question: 'Will it rain in Lagos on 1 Nov 2026?', rules: 'YES if NiMet reports rain.', closeMs: Date.UTC(2026, 10, 2) };

describe('response signatures', () => {
  it('stub judge produces a signature that verifies against its identity', async () => {
    const j = new StubJudge('stub', () => 'YES', new Uint8Array(32).fill(1));
    const r = await j.judge(market, []);
    expect(r.verdict).toBe('YES');
    expect(() => verifyResponseSignature(r.signature, responseSignatureText(r.requestBytes, r.responseBytes), j.identity)).not.toThrow();
  });

  it('rejects tampered response bytes', async () => {
    const j = new StubJudge('stub', () => 'NO');
    const r = await j.judge(market, []);
    const tampered = r.responseBytes.replace(':NO', ':YES');
    expect(() => verifyResponseSignature(r.signature, responseSignatureText(r.requestBytes, tampered), j.identity)).toThrow(/does not match/);
  });

  it('rejects a valid signature from a non-attested signer', async () => {
    const j = new StubJudge('stub', () => 'NO');
    const other = new StubJudge('other', () => 'NO');
    const r = await j.judge(market, []);
    expect(() => verifyResponseSignature(r.signature, r.signature.text, other.identity)).toThrow(/attested/);
  });

  it('verifies ECDSA / EIP-191 signatures like the NEAR AI docs', async () => {
    const w = ethers.Wallet.createRandom();
    const text = responseSignatureText('{"a":1}', '{"b":2}');
    const signature = await w.signMessage(text);
    const sig = { text, signature, signing_algo: 'ecdsa' as const, signing_address: w.address };
    expect(() => verifyResponseSignature(sig, text, { signing_algo: 'ecdsa', signing_address: w.address })).not.toThrow();
  });

  it('model-prefixed text for direct endpoints', () => {
    expect(responseSignatureText('a', 'b', 'm')).toMatch(/^m:[0-9a-f]{64}:[0-9a-f]{64}$/);
  });
});

describe('verdict parsing and panel', () => {
  it('takes the last verdict tag for the right market only', () => {
    expect(parseVerdict('CALLED_VERDICT:7:NO ... CALLED_VERDICT:7:YES', 7)).toBe('YES');
    expect(parseVerdict('CALLED_VERDICT:8:YES', 7)).toBeNull();
  });

  it('2-of-3 majority wins; split panel is INVALID', async () => {
    const yes = await runPanel([new StubJudge('a', () => 'YES'), new StubJudge('b', () => 'YES'), new StubJudge('c', () => 'NO')], market, []);
    expect(yes.outcome).toBe('YES');
    expect(yes.agreeing).toHaveLength(2);
    const split = await runPanel([new StubJudge('a', () => 'YES'), new StubJudge('b', () => 'NO'), new StubJudge('c', () => 'INVALID')], market, []);
    expect(split.outcome).toBe('INVALID');
    expect(split.agreeing).toHaveLength(0);
  });

  it('failed judges count against the majority', async () => {
    const boom = { model: 'x', judge: async () => { throw new Error('down'); } };
    const r = await runPanel([new StubJudge('a', () => 'NO'), boom, boom], market, []);
    expect(r.outcome).toBe('INVALID');
  });

  it('builds contract args', async () => {
    const r = await new StubJudge('a', () => 'NO').judge(market, []);
    const a = toContractArgs(7, r);
    expect(a.request_sha256).toHaveLength(64);
    expect(Buffer.from(a.response, 'base64').toString()).toContain('CALLED_VERDICT:7:NO');
  });
});
