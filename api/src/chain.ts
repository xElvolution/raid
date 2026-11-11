/**
 * On-chain execution for Called markets (NEAR). The API relayer is the contract's custodial operator:
 * each user has a ledger account `u<id>.<contract>` inside the contract; trades run as buy_for/sell_for
 * and every resulting EVENT_JSON log is fed to the indexer path. Collateral is NEP-141 (6 decimals).
 */
import { connect, keyStores, KeyPair, type Account, type Near } from 'near-api-js';
import { must } from './must.js';

export const UNIT = 1_000_000; // collateral decimals
const GAS = 300_000_000_000_000n;

export interface ChainConfig {
  network: string; rpcUrl: string; contractId: string; tokenId: string;
  relayerId: string; relayerKey: string; courtId?: string; courtKey?: string;
  houseLiquidity: number; faucetAmount: number; testnetFaucet: boolean;
}
export interface ChainLog { receiptId: string; logIndex: number; log: string }
export interface CallResult<T> { value: T; logs: ChainLog[]; txHash: string }

export class Chain {
  private near!: Near;
  private ready: Promise<void>;
  constructor(readonly cfg: ChainConfig) {
    const ks = new keyStores.InMemoryKeyStore();
    this.ready = (async () => {
      await ks.setKey(cfg.network, cfg.relayerId, KeyPair.fromString(cfg.relayerKey as never));
      if (cfg.courtId && cfg.courtKey) await ks.setKey(cfg.network, cfg.courtId, KeyPair.fromString(cfg.courtKey as never));
      this.near = await connect({ networkId: cfg.network, nodeUrl: cfg.rpcUrl, keyStore: ks } as never);
    })();
  }
  ledger(userId: string): string { return `u${userId}.${this.cfg.contractId}`; }

  async view<T>(contractId: string, method: string, args: object = {}): Promise<T> {
    await this.ready;
    const r = await this.near.connection.provider.query({
      request_type: 'call_function', finality: 'optimistic', account_id: contractId, method_name: method, args_base64: Buffer.from(JSON.stringify(args)).toString('base64'),
    } as never);
    return JSON.parse(Buffer.from((r as unknown as { result: number[] }).result).toString()) as T;
  }

  private async call<T>(as: 'relayer' | 'court', contractId: string, method: string, args: object, deposit = 0n): Promise<CallResult<T>> {
    await this.ready;
    const acct: Account = await this.near.account(as === 'court' ? must(this.cfg.courtId, 'COURT_ACCOUNT') : this.cfg.relayerId);
    const out = await acct.functionCall({ contractId, methodName: method, args, gas: GAS, attachedDeposit: deposit });
    const logs: ChainLog[] = [];
    for (const r of out.receipts_outcome) r.outcome.logs.forEach((log: string, i: number) => logs.push({ receiptId: r.id, logIndex: i, log }));
    const st = out.status as { SuccessValue?: string; Failure?: unknown };
    if (st.Failure) throw new Error(`chain_failure:${JSON.stringify(st.Failure).slice(0, 300)}`);
    const raw = st.SuccessValue ? Buffer.from(st.SuccessValue, 'base64').toString() : '';
    return { value: (raw ? JSON.parse(raw) : null) as T, logs, txHash: out.transaction.hash };
  }

  async balance(userId: string): Promise<number> {
    return Number(await this.view<string>(this.cfg.contractId, 'balance_of', { account_id: this.ledger(userId) })) / UNIT;
  }
  /** Mint test collateral (relayer is the token owner on testnet) and deposit it to a ledger account. */
  async fund(ledgerAccount: string, amount: number): Promise<ChainLog[]> {
    const units = String(Math.round(amount * UNIT));
    if (this.cfg.testnetFaucet) await this.call('relayer', this.cfg.tokenId, 'mint', { account_id: this.cfg.relayerId, amount: units });
    const r = await this.call('relayer', this.cfg.tokenId, 'ft_transfer_call', { receiver_id: this.cfg.contractId, amount: units, msg: JSON.stringify({ action: 'deposit_for', account: ledgerAccount }) }, 1n);
    return r.logs;
  }
  async createMarket(question: string, rules: string, closeMs: number): Promise<CallResult<string>> {
    const house = this.cfg.relayerId;
    const bal = Number(await this.view<string>(this.cfg.contractId, 'balance_of', { account_id: house })) / UNIT;
    if (bal < this.cfg.houseLiquidity) await this.fund(house, this.cfg.houseLiquidity * 10);
    return this.call('relayer', this.cfg.contractId, 'create_market_for', { account: house, question: question.slice(0, 280), rules: rules.slice(0, 4000), close_ms: String(closeMs), liquidity: String(this.cfg.houseLiquidity * UNIT) });
  }
  buy(userId: string, marketId: string, outcome: 0 | 1, amount: number) {
    return this.call<string>('relayer', this.cfg.contractId, 'buy_for', { account: this.ledger(userId), market_id: marketId, outcome, amount: String(Math.round(amount * UNIT)), min_shares: '0' });
  }
  sell(userId: string, marketId: string, outcome: 0 | 1, shares: number) {
    return this.call<string>('relayer', this.cfg.contractId, 'sell_for', { account: this.ledger(userId), market_id: marketId, outcome, shares: String(Math.floor(shares * UNIT)), min_out: '0' });
  }
  redeem(userId: string, marketId: string) {
    return this.call<string>('relayer', this.cfg.contractId, 'redeem_for', { account: this.ledger(userId), market_id: marketId });
  }
  /** Withdraw: ledger -> operator inside the contract, contract -> operator wallet, then operator -> user's NEAR wallet. */
  async withdraw(userId: string, amount: number, to: string) {
    const units = String(Math.round(amount * UNIT));
    await this.call('relayer', this.cfg.contractId, 'release_for', { account: this.ledger(userId), amount: units });
    await this.call('relayer', this.cfg.contractId, 'withdraw', { amount: units });
    return this.call('relayer', this.cfg.tokenId, 'ft_transfer', { receiver_id: to, amount: units, memo: 'called withdrawal' }, 1n);
  }
  courtResolve(marketId: string, outcome: 'Yes' | 'No' | 'Invalid') {
    if (!this.cfg.courtId) throw new Error('court_not_configured');
    return this.call('court', this.cfg.contractId, 'court_resolve', { market_id: marketId, outcome });
  }
  proposeResolution(args: object) { return this.call('relayer', this.cfg.contractId, 'propose_resolution', args); }
  finalize(marketId: string) { return this.call('relayer', this.cfg.contractId, 'finalize', { market_id: marketId }); }
  market(marketId: string) { return this.view<{ status: string; close_ms: string; price_yes_ppm: string } | null>(this.cfg.contractId, 'get_market', { market_id: marketId }); }
}

export function chainFromEnv(env: Record<string, string | undefined>): Chain | null {
  const need = ['NEAR_CONTRACT_ID', 'COLLATERAL_TOKEN', 'RELAYER_ACCOUNT', 'RELAYER_PRIVATE_KEY'];
  if (need.some((k) => !env[k])) return null;
  const network = env.NEAR_NETWORK ?? 'testnet';
  return new Chain({
    network, rpcUrl: env.NEAR_RPC_URL ?? `https://rpc.${network}.fastnear.com`,
    contractId: must(env.NEAR_CONTRACT_ID, 'NEAR_CONTRACT_ID'), tokenId: must(env.COLLATERAL_TOKEN, 'COLLATERAL_TOKEN'), relayerId: must(env.RELAYER_ACCOUNT, 'RELAYER_ACCOUNT'), relayerKey: must(env.RELAYER_PRIVATE_KEY, 'RELAYER_PRIVATE_KEY'),
    courtId: env.COURT_ACCOUNT, courtKey: env.COURT_PRIVATE_KEY,
    houseLiquidity: Number(env.HOUSE_LIQUIDITY ?? 1000), faucetAmount: Number(env.FAUCET_AMOUNT ?? 1000),
    testnetFaucet: network === 'testnet' && env.TESTNET_FAUCET !== '0',
  });
}
