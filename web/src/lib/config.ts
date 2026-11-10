export const config = {
  /** Empty = same origin (the preview proxy routes /v1 to the API). */
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? '',
  networkId: (process.env.NEXT_PUBLIC_NEAR_NETWORK ?? 'testnet') as 'testnet' | 'mainnet',
  contractId: process.env.NEXT_PUBLIC_CONTRACT_ID ?? '',
  collateralToken: process.env.NEXT_PUBLIC_COLLATERAL_TOKEN ?? '',
  rpcUrl: process.env.NEXT_PUBLIC_NEAR_RPC_URL ?? 'https://rpc.testnet.near.org',
  privyAppId: process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? '',
  /** Show the one-tap demo button (previews only). */
  demo: process.env.NEXT_PUBLIC_DEMO_MODE === '1',
  /** Show NEAR wallet sign-in alongside Privy. */
  nearSignIn: process.env.NEXT_PUBLIC_NEAR_SIGNIN !== '0',
  signInRecipient: process.env.NEXT_PUBLIC_SIGNIN_RECIPIENT ?? 'called.testnet',
};

export function apiBase(): string {
  if (config.apiUrl) return config.apiUrl;
  return typeof window === 'undefined' ? 'http://localhost:8787' : window.location.origin;
}

export function liveUrl(): string {
  const u = new URL('/v1/live', apiBase());
  u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
  return u.toString();
}
