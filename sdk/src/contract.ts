/** Typed access to the Called NEAR contract. Views go over JSON-RPC; writes return wallet-ready actions. */

export interface ContractMarket {
  id: string; creator: string; question: string; rules: string; close_ms: string;
  pools: [string, string]; collateral: string; price_yes_ppm: string;
  status: 'Open' | 'Proposed' | 'Disputed' | 'Final'; proposed: 'Yes' | 'No' | 'Invalid' | null; final_outcome: 'Yes' | 'No' | 'Invalid' | null;
}

export interface FunctionCall { type: 'FunctionCall'; params: { methodName: string; args: Record<string, unknown>; gas: string; deposit: string } }
export interface Tx { receiverId: string; actions: FunctionCall[] }

const TGAS = 1_000_000_000_000n;
const call = (receiverId: string, methodName: string, args: Record<string, unknown>, tgas = 30n, deposit = '0'): Tx =>
  ({ receiverId, actions: [{ type: 'FunctionCall', params: { methodName, args, gas: String(tgas * TGAS), deposit } }] });

export const YES = 1, NO = 0;

export class CalledContract {
  constructor(readonly contractId: string, readonly rpcUrl: string, private readonly f: typeof fetch = globalThis.fetch.bind(globalThis)) {}

  async view<T>(method: string, args: Record<string, unknown> = {}): Promise<T> {
    const res = await this.f(this.rpcUrl, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 'called', method: 'query', params: { request_type: 'call_function', finality: 'optimistic', account_id: this.contractId, method_name: method, args_base64: btoa(JSON.stringify(args)) } }),
    });
    const j = (await res.json()) as { error?: { message?: string }; result?: { result?: number[]; error?: string } };
    if (j.error || j.result?.error || !j.result?.result) throw new Error(j.error?.message ?? j.result?.error ?? 'rpc_error');
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(j.result.result))) as T;
  }

  getMarket(id: string) { return this.view<ContractMarket | null>('get_market', { market_id: id }); }
  listMarkets(from = '0', limit = 50) { return this.view<ContractMarket[]>('list_markets', { from, limit }); }
  balanceOf(accountId: string) { return this.view<string>('balance_of', { account_id: accountId }); }
  quoteBuy(id: string, outcome: number, amount: string) { return this.view<string>('quote_buy', { market_id: id, outcome, amount }); }
  shares(accountId: string, id: string, outcome: number) { return this.view<string>('mt_balance_of', { account_id: accountId, token_id: `${id}:${outcome}` }); }

  /** Deposit collateral: an ft_transfer_call on the collateral token. */
  deposit(collateralToken: string, amount: string): Tx {
    return call(collateralToken, 'ft_transfer_call', { receiver_id: this.contractId, amount, msg: JSON.stringify({ action: 'deposit' }) }, 60n, '1');
  }
  withdraw(amount: string) { return call(this.contractId, 'withdraw', { amount }, 60n, '1'); }
  createMarket(question: string, rules: string, closeMs: number, liquidity: string) { return call(this.contractId, 'create_market', { question, rules, close_ms: String(closeMs), liquidity }, 50n); }
  buy(id: string, outcome: number, amount: string, minShares: string) { return call(this.contractId, 'buy', { market_id: id, outcome, amount, min_shares: minShares }); }
  sell(id: string, outcome: number, shares: string, minOut: string) { return call(this.contractId, 'sell', { market_id: id, outcome, shares, min_out: minOut }); }
  dispute(id: string) { return call(this.contractId, 'dispute', { market_id: id }); }
  finalize(id: string) { return call(this.contractId, 'finalize', { market_id: id }); }
  redeem(id: string) { return call(this.contractId, 'redeem', { market_id: id }); }
}

/** Apply slippage tolerance in basis points to a quoted amount. */
export function withSlippage(quoted: string, bps: number): string {
  return ((BigInt(quoted) * BigInt(10_000 - bps)) / 10_000n).toString();
}

/** Price of YES as a 0..1 number from contract ppm. */
export const ppmToProb = (ppm: string | number): number => Number(ppm) / 1_000_000;
