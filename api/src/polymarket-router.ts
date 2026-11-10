/**
 * Polymarket CLOB router. Built only when POLYMARKET_* keys are present (see KEYS-NEEDED.md).
 * Signs with the configured EOA/proxy wallet. Per-user wallets via NEAR Chain Signatures can replace
 * this signer without touching the HTTP layer (VenueRouter interface).
 */
import { Wallet } from '@ethersproject/wallet';
import { ClobClient, OrderType, Side } from '@polymarket/clob-client';
import type { ExternalOrder, OrderResult, VenueRouter } from './external.js';

export interface PolymarketKeys { privateKey: string; apiKey: string; secret: string; passphrase: string; funder?: string; signatureType?: number; host?: string }

export class PolymarketRouter implements VenueRouter {
  readonly venue = 'polymarket' as const;
  private client: ClobClient;
  constructor(k: PolymarketKeys) {
    this.client = new ClobClient(k.host ?? 'https://clob.polymarket.com', 137, new Wallet(k.privateKey), { key: k.apiKey, secret: k.secret, passphrase: k.passphrase }, k.signatureType ?? 0, k.funder);
  }
  async place(o: ExternalOrder): Promise<OrderResult> {
    const [tickSize, negRisk] = await Promise.all([this.client.getTickSize(o.tokenId), this.client.getNegRisk(o.tokenId)]);
    const side = o.side === 'buy' ? Side.BUY : Side.SELL;
    const res = o.type === 'market'
      ? await this.client.createAndPostMarketOrder({ tokenID: o.tokenId, amount: o.amount, side }, { tickSize, negRisk }, OrderType.FOK)
      : await this.client.createAndPostOrder({ tokenID: o.tokenId, price: o.limitPrice!, size: +(o.amount / o.limitPrice!).toFixed(2), side }, { tickSize, negRisk }, OrderType.GTC);
    const r = res as { success?: boolean; orderID?: string; status?: string; errorMsg?: string };
    return { ok: !!r.success, orderId: r.orderID, status: r.status ?? (r.success ? 'live' : 'rejected'), error: r.errorMsg || undefined };
  }
}
