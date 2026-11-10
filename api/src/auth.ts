/**
 * Sign-in with NEAR (NEP-413 signMessage). The client signs {message, nonce, recipient}; we verify
 * the ed25519 signature and that the public key is a full-access key of the account (RPC view).
 */
import { createHash } from 'node:crypto';
import bs58 from 'bs58';
import { SignJWT, jwtVerify } from 'jose';
import nacl from 'tweetnacl';

const NEP413_TAG = 2 ** 31 + 413;

function borshString(s: string): Buffer {
  const b = Buffer.from(s, 'utf8');
  const len = Buffer.alloc(4);
  len.writeUInt32LE(b.length);
  return Buffer.concat([len, b]);
}

export function nep413Hash(message: string, nonce: Uint8Array, recipient: string, callbackUrl?: string): Buffer {
  if (nonce.length !== 32) throw new Error('nonce must be 32 bytes');
  const tag = Buffer.alloc(4);
  tag.writeUInt32LE(NEP413_TAG);
  const cb = callbackUrl === undefined ? Buffer.from([0]) : Buffer.concat([Buffer.from([1]), borshString(callbackUrl)]);
  return createHash('sha256').update(Buffer.concat([tag, borshString(message), Buffer.from(nonce), borshString(recipient), cb])).digest();
}

export interface SignedMessage {
  accountId: string;
  publicKey: string; // "ed25519:<base58>"
  signature: string; // base64
  message: string;
  nonce: string; // base64, 32 bytes
  recipient: string;
}

export type KeyChecker = (accountId: string, publicKey: string) => Promise<boolean>;

/** NEAR RPC check that publicKey is a FullAccess key of accountId. */
export const rpcKeyChecker =
  (rpcUrl: string, fetchImpl: typeof fetch = fetch): KeyChecker =>
  async (accountId, publicKey) => {
    const r = await fetchImpl(rpcUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 'k', method: 'query', params: { request_type: 'view_access_key', finality: 'final', account_id: accountId, public_key: publicKey } }),
    });
    const j = (await r.json()) as { result?: { permission?: unknown } };
    return j.result?.permission === 'FullAccess';
  };

export async function verifySignIn(m: SignedMessage, expectedRecipient: string, isFresh: (nonce: string) => Promise<boolean>, checkKey: KeyChecker): Promise<void> {
  if (m.recipient !== expectedRecipient) throw new Error('wrong recipient');
  if (!m.publicKey.startsWith('ed25519:')) throw new Error('unsupported key type');
  const pk = bs58.decode(m.publicKey.slice(8));
  const nonce = Buffer.from(m.nonce, 'base64');
  const sig = Buffer.from(m.signature, 'base64');
  if (pk.length !== 32 || sig.length !== 64) throw new Error('bad key or signature');
  if (!nacl.sign.detached.verify(nep413Hash(m.message, nonce, m.recipient), sig, pk)) throw new Error('bad signature');
  if (!(await isFresh(m.nonce))) throw new Error('nonce reused or expired');
  if (!(await checkKey(m.accountId, m.publicKey))) throw new Error('key not authorized for account');
}

export class Tokens {
  private readonly key: Uint8Array;
  constructor(secret: string) {
    if (secret.length < 32) throw new Error('JWT_SECRET must be >= 32 chars');
    this.key = new TextEncoder().encode(secret);
  }
  issue(userId: string, ttl = '1h'): Promise<string> {
    return new SignJWT({}).setProtectedHeader({ alg: 'HS256' }).setSubject(userId).setIssuedAt().setExpirationTime(ttl).sign(this.key);
  }
  async verify(token: string): Promise<string> {
    const { payload } = await jwtVerify(token, this.key, { algorithms: ['HS256'] });
    if (!payload.sub) throw new Error('no subject');
    return payload.sub;
  }
}

/**
 * Privy access-token verification (ES256 JWT, issuer "privy.io", audience = app id).
 * Uses PRIVY_VERIFICATION_KEY (SPKI PEM) when set, else the app's public JWKS.
 */
import { createRemoteJWKSet, importSPKI, type JWTVerifyGetKey } from "jose";
type KeyLike = CryptoKey;

export interface PrivyIdentity { did: string; nearAccount?: string; email?: string }
export type PrivyVerifier = (accessToken: string) => Promise<PrivyIdentity>;

export function privyVerifier(opts: { appId: string; appSecret?: string; verificationKey?: string; fetchImpl?: typeof fetch }): PrivyVerifier {
  const f = opts.fetchImpl ?? fetch;
  let key: Promise<KeyLike | JWTVerifyGetKey>;
  const getKey = () => (key ??= opts.verificationKey
    ? importSPKI(opts.verificationKey.replace(/\\n/g, '\n'), 'ES256')
    : Promise.resolve(createRemoteJWKSet(new URL(`https://auth.privy.io/api/v1/apps/${opts.appId}/jwks.json`))));
  return async (token) => {
    const k = await getKey();
    const { payload } = await jwtVerify(token, k as KeyLike, { issuer: 'privy.io', audience: opts.appId, algorithms: ['ES256'] });
    const did = payload.sub;
    if (!did || !did.startsWith('did:privy:')) throw new Error('bad privy subject');
    const id: PrivyIdentity = { did };
    // Look up linked accounts (NEAR wallet, email) with the app secret, server-side only.
    if (opts.appSecret) {
      const r = await f(`https://auth.privy.io/api/v1/users/${encodeURIComponent(did)}`, {
        headers: { authorization: `Basic ${Buffer.from(`${opts.appId}:${opts.appSecret}`).toString('base64')}`, 'privy-app-id': opts.appId },
      });
      if (r.ok) {
        const u = (await r.json()) as { linked_accounts?: Array<{ type: string; chain_type?: string; address?: string }> };
        for (const a of u.linked_accounts ?? []) {
          if (a.type === 'wallet' && a.chain_type === 'near' && a.address) id.nearAccount ??= a.address;
          if (a.type === 'email' && a.address) id.email ??= a.address;
        }
      }
    }
    return id;
  };
}
