// Deploy Called contracts. NETWORK=testnet|mainnet. Reads accounts/keys from SECRETS_FILE (mode 600). Never prints keys.
// Steps: deploy test USDC (testnet only) -> deploy markets -> set operator -> register judge (stub/real) is done by the resolver.
import fs from 'node:fs';
import { connect, keyStores, KeyPair, utils } from 'near-api-js';
const NETWORK = process.env.NETWORK ?? 'testnet';
const file = process.env.SECRETS_FILE ?? '/home/box/.called-testnet.env';
const E = Object.fromEntries(fs.readFileSync(file, 'utf8').split('\n').filter((l) => l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]));
const ks = new keyStores.InMemoryKeyStore();
for (const r of ['CONTRACT', 'OWNER', 'COURT', 'TREASURY', 'RELAYER', 'TOKEN']) if (E[`${r}_ACCOUNT`]) await ks.setKey(NETWORK, E[`${r}_ACCOUNT`], KeyPair.fromString(E[`${r}_PRIVATE_KEY`]));
const near = await connect({ networkId: NETWORK, nodeUrl: process.env.NEAR_RPC_URL ?? `https://rpc.${NETWORK}.fastnear.com`, keyStore: ks });
const acct = (r) => near.account(E[`${r}_ACCOUNT`]);
const root = new URL('../../contracts/', import.meta.url).pathname;
const gas = 300_000_000_000_000n;
const view = (c, m, a = {}) => near.connection.provider.query({ request_type: 'call_function', finality: 'final', account_id: c, method_name: m, args_base64: Buffer.from(JSON.stringify(a)).toString('base64') }).then((r) => JSON.parse(Buffer.from(r.result).toString()));
const isInit = (c, m) => view(c, m).then(() => true, () => false);

let collateral = process.env.COLLATERAL_TOKEN;
if (!collateral) {
  if (NETWORK === 'mainnet') throw new Error('COLLATERAL_TOKEN required on mainnet');
  collateral = E.TOKEN_ACCOUNT;
  const t = await acct('TOKEN');
  await t.deployContract(fs.readFileSync(root + 'test-usdc/target/near/test_usdc.wasm'));
  if (!(await isInit(collateral, 'ft_metadata'))) await t.functionCall({ contractId: collateral, methodName: 'new', args: { owner: E.RELAYER_ACCOUNT }, gas });
  console.log('token', collateral);
}
const c = await acct('CONTRACT');
await c.deployContract(fs.readFileSync(root + 'target/near/called_contracts.wasm'));
if (!(await isInit(E.CONTRACT_ACCOUNT, 'get_config'))) {
  await c.functionCall({ contractId: E.CONTRACT_ACCOUNT, methodName: 'new', gas, args: {
    owner: E.OWNER_ACCOUNT, court: E.COURT_ACCOUNT, treasury: E.TREASURY_ACCOUNT, collateral_token: collateral,
    fee_bps: Number(process.env.FEE_BPS ?? 100), dispute_window_ms: process.env.DISPUTE_WINDOW_MS ?? '3600000',
    dispute_bond: process.env.DISPUTE_BOND ?? '10000000', min_liquidity: process.env.MIN_LIQUIDITY ?? '10000000' } });
}
await (await acct('OWNER')).functionCall({ contractId: E.CONTRACT_ACCOUNT, methodName: 'set_operator', args: { operator: E.RELAYER_ACCOUNT }, gas });
console.log('markets', E.CONTRACT_ACCOUNT, 'operator', await view(E.CONTRACT_ACCOUNT, 'get_operator'));
console.log('config', JSON.stringify(await view(E.CONTRACT_ACCOUNT, 'get_config')));
