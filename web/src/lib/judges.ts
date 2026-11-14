/** Earlier prefunded testnet judge accounts (crew members on the first testnet chest). Judges now get a fresh account
 *  from the judge faucet on /judges; no private key is in this repo or anywhere outside the judge's browser. */
export const JUDGES = [
  { label: 'Judge 1', accountId: 'raid-judge1-mwce6ry3.testnet', crew: 'Frog Legion' },
  { label: 'Judge 2', accountId: 'raid-judge2-mwce6vli.testnet', crew: 'Frog Legion' },
  { label: 'Judge 3', accountId: 'raid-judge3-mwce6zdz.testnet', crew: 'Doge Pack' },
] as const;

/** One line from the founder, shown on /judges once filled in. Left empty on purpose: the founder writes it. */
export const FOUNDER_LINE = '';
