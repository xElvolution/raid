/**
 * NEAR AI Cloud response-signature verification.
 * Mirrors docs.near.ai "Response Signature Verification": the signed text is
 * `${sha256(request)}:${sha256(response)}` (Gateway) or `${model}:${...}` (direct endpoints).
 */
import { createHash, timingSafeEqual } from 'node:crypto';
import { ethers } from 'ethers';
import nacl from 'tweetnacl';

export type SigningAlgo = 'ecdsa' | 'ed25519';

export interface ResponseSignature {
  text: string;
  signature: string;
  signing_algo: SigningAlgo;
  signing_address: string;
}

export interface SignerIdentity {
  signing_algo: SigningAlgo;
  signing_address: string;
}

export const sha256Hex = (bytes: Uint8Array | string): string =>
  createHash('sha256').update(bytes).digest('hex');

export function responseSignatureText(req: Uint8Array | string, res: Uint8Array | string, modelName?: string): string {
  const hashes = `${sha256Hex(req)}:${sha256Hex(res)}`;
  if (modelName === undefined) return hashes;
  if (!modelName) throw new Error('modelName must be non-empty');
  return `${modelName}:${hashes}`;
}

function hexBytes(value: unknown, label: string, expected: number): Buffer {
  if (typeof value !== 'string') throw new Error(`${label} must be hex`);
  const hex = value.replace(/^0x/i, '');
  if (!hex || !/^[0-9a-f]*$/i.test(hex) || hex.length % 2) throw new Error(`${label} must be hexadecimal`);
  const b = Buffer.from(hex, 'hex');
  if (b.length !== expected) throw new Error(`${label} must be ${expected} bytes`);
  return b;
}

function identity(v: SignerIdentity, label: string): { algo: SigningAlgo; address: Buffer } {
  if (v.signing_algo !== 'ecdsa' && v.signing_algo !== 'ed25519') throw new Error(`${label}.signing_algo unsupported`);
  return { algo: v.signing_algo, address: hexBytes(v.signing_address, `${label}.signing_address`, v.signing_algo === 'ecdsa' ? 20 : 32) };
}

const same = (a: Buffer, b: Buffer): boolean => a.length === b.length && timingSafeEqual(a, b);

/** Throws if the signature does not cover exactly `expectedText` by the attested signer. */
export function verifyResponseSignature(sig: ResponseSignature, expectedText: string, attested: SignerIdentity): void {
  if (sig.text !== expectedText) throw new Error('signature text does not match the exact request/response bytes');
  const signer = identity(sig, 'signature');
  const bytes = hexBytes(sig.signature, 'signature.signature', signer.algo === 'ecdsa' ? 65 : 64);
  if (signer.algo === 'ecdsa') {
    const recovered = hexBytes(ethers.verifyMessage(Buffer.from(sig.text, 'utf8'), ethers.hexlify(bytes)), 'recovered', 20);
    if (!same(recovered, signer.address)) throw new Error('ECDSA signature does not match signing_address');
  } else if (!nacl.sign.detached.verify(Buffer.from(sig.text, 'utf8'), bytes, signer.address)) {
    throw new Error('Ed25519 signature does not match signing_address');
  }
  const pre = identity(attested, 'attested');
  if (pre.algo !== signer.algo || !same(pre.address, signer.address)) {
    throw new Error('signer does not match the attested signing identity');
  }
}
