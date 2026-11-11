// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { generateKeyPairSync, sign as edSign } from 'node:crypto';
import { Wallet } from 'ethers';
import { b58decode, b58encode, backIntentPayload, erc191Signature, intentsAccount, readBackIntent, saltedNonce, toHex } from '@/lib/keyless';
import { localVerify } from '@/lib/keyless-server';

describe('keyless backing (Phantom / MetaMask)', () => {
  it('base58 round-trips, keeping leading zeros', () => {
    const b = new Uint8Array([0, 0, 1, 2, 250, 255]);
    expect(b58decode(b58encode(b))).toEqual(b);
  });
  it('derives the intents account from each wallet', () => {
    expect(intentsAccount('metamask', '0xCA67c1bB3fd69857E5edaf6aA1C65371bF46a464')).toBe('0xca67c1bb3fd69857e5edaf6aa1c65371bf46a464');
    const pk = new Uint8Array(32).map((_, i) => i + 1);
    expect(intentsAccount('phantom', b58encode(pk))).toBe(toHex(pk));
  });
  it('nonce starts with the verifier salt', () => {
    const n = atob(saltedNonce('252812b3', new Uint8Array(28)));
    expect([...n.slice(0, 4)].map((c) => c.charCodeAt(0))).toEqual([0x25, 0x28, 0x12, 0xb3]);
    expect(n.length).toBe(32);
  });
  it('MetaMask: ERC-191 signature recovers the signer and v is normalised', async () => {
    const w = Wallet.createRandom();
    const signer = w.address.toLowerCase();
    const payload = backIntentPayload({ signer, chest: 'raid.near', raidId: 3, amountRaw: '5000000', saltHex: '252812b3' });
    const i = readBackIntent(payload);
    expect(i).toMatchObject({ signer, intent: 'ft_withdraw', chest: 'raid.near', amountRaw: '5000000', raidId: 3, for: signer, verifier: 'intents.near' });
    const sig = erc191Signature(await w.signMessage(payload));
    expect(b58decode(sig.slice(10))[64]).toBeLessThan(2);
    expect(localVerify({ standard: 'erc191', payload, signature: sig })).toMatchObject({ ok: true, signer });
    expect(localVerify({ standard: 'erc191', payload: payload.replace('5000000', '6000000'), signature: sig }).signer).not.toBe(signer);
  });
  it('Phantom: raw Ed25519 over the payload bytes verifies for the hex account', () => {
    const { publicKey, privateKey } = generateKeyPairSync('ed25519');
    const raw = new Uint8Array(Buffer.from(publicKey.export({ format: 'jwk' }).x!, 'base64url'));
    const address = b58encode(raw);
    const signer = intentsAccount('phantom', address);
    const payload = backIntentPayload({ signer, chest: 'raid.near', raidId: 1, amountRaw: '1000000', saltHex: '00000000' });
    const signature = `ed25519:${b58encode(new Uint8Array(edSign(null, Buffer.from(payload), privateKey)))}`;
    expect(localVerify({ standard: 'raw_ed25519', payload, public_key: `ed25519:${address}`, signature })).toMatchObject({ ok: true, signer });
    expect(localVerify({ standard: 'raw_ed25519', payload: payload + ' ', public_key: `ed25519:${address}`, signature }).ok).toBe(false);
  });
});
