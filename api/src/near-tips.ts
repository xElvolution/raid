/** Verifies a NEAR tip on-chain: the tx succeeded, was signed by `from`, and transferred >= `yocto` to `to`. */
export function nearTipVerifier(rpcUrl: string, fetchImpl: typeof fetch = fetch) {
  return async (hash: string, from: string, to: string, yocto: bigint): Promise<boolean> => {
    const res = await fetchImpl(rpcUrl, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 'tip', method: 'tx', params: { tx_hash: hash, sender_account_id: from, wait_until: 'EXECUTED_OPTIMISTIC' } }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`rpc ${res.status}`);
    const j = (await res.json()) as { result?: { status?: Record<string, unknown>; transaction?: { signer_id: string; receiver_id: string; actions: unknown[] } } };
    const r = j.result;
    if (!r?.transaction || !r.status || !('SuccessValue' in r.status)) return false;
    if (r.transaction.signer_id !== from || r.transaction.receiver_id !== to) return false;
    const sent = r.transaction.actions.reduce<bigint>((s, a) => {
      const t = (a as { Transfer?: { deposit: string } }).Transfer;
      return t ? s + BigInt(t.deposit) : s;
    }, 0n);
    return sent >= yocto;
  };
}

/** Total yocto transferred from `from` to `to` in a successful tx (0n if it does not match). */
export function nearTransferAmount(rpcUrl: string, fetchImpl: typeof fetch = fetch) {
  return async (hash: string, from: string, to: string): Promise<bigint> => {
    const res = await fetchImpl(rpcUrl, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 'dep', method: 'tx', params: { tx_hash: hash, sender_account_id: from, wait_until: 'EXECUTED_OPTIMISTIC' } }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`rpc ${res.status}`);
    const j = (await res.json()) as { result?: { status?: Record<string, unknown>; transaction?: { signer_id: string; receiver_id: string; actions: unknown[] } } };
    const r = j.result;
    if (!r?.transaction || !r.status || !('SuccessValue' in r.status)) return 0n;
    if (r.transaction.signer_id !== from || r.transaction.receiver_id !== to) return 0n;
    return r.transaction.actions.reduce<bigint>((s, a) => { const t = (a as { Transfer?: { deposit: string } }).Transfer; return t ? s + BigInt(t.deposit) : s; }, 0n);
  };
}
