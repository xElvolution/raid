# @called/sdk

Typed TypeScript client for Called. Works in browsers, React Native and Node 20+.

```ts
import { CalledClient, LiveClient, CalledContract, withSlippage } from '@called/sdk';

const api = new CalledClient({ baseUrl: 'https://api.called.app' });
const { nonce, recipient, message } = await api.nonce();
// sign with a NEAR wallet (NEP-413) then:
await api.signIn(signed);
const feed = await api.feed({ tab: 'foryou' });

const live = new LiveClient({ url: 'wss://api.called.app/v1/live', token: api.getToken() });
const off = live.subscribe('market:42', (e) => e.type === 'odds' && console.log(e.data.priceYes));

const c = new CalledContract('called.testnet', 'https://rpc.testnet.near.org');
const q = await c.quoteBuy('42', 1, '5000000');
const tx = c.buy('42', 1, '5000000', withSlippage(q, 100)); // hand to wallet-selector signAndSendTransaction
```

- `CalledClient`: every REST endpoint, typed; `CalledError` with status + code; `paginate()` async iterator.
- `LiveClient`: auto-reconnect with jittered backoff, ref-counted subscriptions replayed on reconnect, status events.
- `CalledContract`: RPC views + wallet-ready `Tx` objects (no wallet dependency).

`npm test` · `npm run lint` · `npm run build`
