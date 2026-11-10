import { describe, expect, it } from 'vitest';
import { SignJWT, exportSPKI, generateKeyPair } from 'jose';
import { privyVerifier } from '../src/auth.js';

describe('privyVerifier', async () => {
  const { publicKey, privateKey } = await generateKeyPair('ES256', { extractable: true });
  const pem = await exportSPKI(publicKey);
  const tok = (claims: { aud?: string; iss?: string; sub?: string }) => new SignJWT({}).setProtectedHeader({ alg: 'ES256' })
    .setIssuer(claims.iss ?? 'privy.io').setAudience(claims.aud ?? 'app_1').setSubject(claims.sub ?? 'did:privy:abc').setIssuedAt().setExpirationTime('1h').sign(privateKey);
  const fetchImpl = (async () => new Response(JSON.stringify({ linked_accounts: [{ type: 'email', address: 'a@b.co' }, { type: 'wallet', chain_type: 'near', address: 'abc.testnet' }] }))) as unknown as typeof fetch;
  const verify = privyVerifier({ appId: 'app_1', appSecret: 's', verificationKey: pem, fetchImpl });

  it('accepts a valid token and reads linked accounts', async () => {
    expect(await verify(await tok({}))).toEqual({ did: 'did:privy:abc', email: 'a@b.co', nearAccount: 'abc.testnet' });
  });
  it('rejects the wrong audience or issuer', async () => {
    await expect(verify(await tok({ aud: 'other' }))).rejects.toThrow();
    await expect(verify(await tok({ iss: 'evil' }))).rejects.toThrow();
  });
});
