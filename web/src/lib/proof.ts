import type { Resolution } from '@called/sdk';

export type CheckState = 'pending' | 'ok' | 'fail' | 'skip';
export interface ProofChecks { request: CheckState; response: CheckState; signature: CheckState; detail?: string }

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Re-verifies a settlement in the browser, with no trust in our server:
 * 1. sha256(request) and sha256(response) match the hashes inside the signed text
 * 2. the signature over the signed text recovers to the published signer (ECDSA, NEAR AI Cloud format)
 */
export async function verifyResolution(r: Resolution): Promise<ProofChecks> {
  const parts = r.signed_text.split(':');
  const [reqHash, resHash] = parts.slice(-2);
  const out: ProofChecks = { request: 'skip', response: 'skip', signature: 'skip' };
  if (r.request_json) out.request = (await sha256Hex(r.request_json)) === reqHash ? 'ok' : 'fail';
  if (r.response_json) out.response = (await sha256Hex(r.response_json)) === resHash ? 'ok' : 'fail';
  if (r.signature && (r.signing_algo ?? 'ecdsa') === 'ecdsa') {
    try {
      const { verifyMessage } = await import('ethers');
      out.signature = verifyMessage(r.signed_text, r.signature).toLowerCase() === r.signer.toLowerCase() ? 'ok' : 'fail';
    } catch (e) { out.signature = 'fail'; out.detail = e instanceof Error ? e.message : 'signature parse error'; }
  }
  return out;
}
