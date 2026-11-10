// Creates a funded top-level testnet account via the NEAR faucet helper; appends keys to the secrets file (mode 600). Never prints keys.
import { KeyPair } from 'near-api-js';
import fs from 'node:fs';
const [,, envName, accountId] = process.argv;
const file = process.env.SECRETS_FILE ?? '/home/box/.called-testnet.env';
const kp = KeyPair.fromRandom('ed25519');
const r = await fetch('https://helper.nearprotocol.com/account', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ newAccountId: accountId, newAccountPublicKey: kp.getPublicKey().toString() }) });
const t = await r.text();
if (!r.ok) { console.error('faucet failed', r.status, t.slice(0, 200)); process.exit(1); }
fs.appendFileSync(file, `${envName}_ACCOUNT=${accountId}\n${envName}_PRIVATE_KEY=${kp.toString()}\n`, { mode: 0o600 });
fs.chmodSync(file, 0o600);
console.log('created', accountId);
