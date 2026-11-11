/** Prefunded NEAR testnet judge accounts (10 testnet NEAR + 500 tUSDC each, made with the public testnet faucet helper).
 *  Account ids are public. Their keys are NOT in this repo: they are in the submission notes for judges only. */
export const JUDGES = [
  { label: 'Judge 1', accountId: 'raid-judge1-mwce6ry3.testnet', crew: 'Frog Legion' },
  { label: 'Judge 2', accountId: 'raid-judge2-mwce6vli.testnet', crew: 'Frog Legion' },
  { label: 'Judge 3', accountId: 'raid-judge3-mwce6zdz.testnet', crew: 'Doge Pack' },
] as const;

/** One line from the founder, shown on /judges once filled in. Left empty on purpose: the founder writes it. */
export const FOUNDER_LINE = '';
