# Builds web/src/lib/receipts.json from evidence/testnet-lifecycle-run.json (the testnet lifecycle run).
import json, re
d = json.load(open('evidence/testnet-lifecycle-run.json'))
txof = lambda x: x.get('tx') or (re.search(r'txns/(\w+)', x.get('url', '')) or [None, None])[1]
raids = {}
cur = None
pending = []
label = {
  'crew DAO proposes call_raid': 'Crew DAO proposes the raid',
  'vote 2/2 passes: the DAO calls call_raid on the chest': 'Vote passes, the DAO calls the raid',
  'execute_buy during the public countdown is refused': 'Buy during the countdown: refused',
  "Chain Signatures: MPC signs the chest's own buy intent for the whole pot (mpc_sign_buy)": 'Chain Signatures signs the buy intent',
  'execute_buy with a quote whose signature does not match is refused': 'Buy with a bad quote signature: refused',
  'execute_buy: chest checks the signed quote and sends the pot to the solver deposit account': 'Buy: signed quote checked, pot sent',
  'solver fills: pays tPEPE to the chest inside the venue': 'Solver delivers the coin',
  'settle (anyone): Buying -> Held': 'Settle: Held',
  'execute_sell below the 2x line before retreat is refused': 'Sell below the line: refused',
  'execute_sell at the line: quote minAmountOut >= entry x 2': 'Sell at the line',
  'solver fills: pays tUSDC to the chest inside the venue': 'Solver pays tUSDC',
  'settle (anyone): Selling -> Closed, fee split': 'Settle: Closed, fees split',
  'claim: backer1 withdraws tUSDC to the wallet': 'Backer 1 paid',
  'claim: backer2 withdraws tUSDC to the wallet': 'Backer 2 paid',
  "claim_into_intents: the share lands in the venue under the wallet's own account": 'Any-chain backer paid',
  'vote passes: the DAO claims its caller fee into the crew treasury': 'Crew DAO claims the caller fee',
}
for x in d:
  s = x['step']
  if s == 'raid called by the DAO':
    cur = str(x['id']); raids[cur] = {'call': None, 'backs': [], 'steps': pending}
    pending = []
    continue
  if s.startswith('raid B called'):
    cur = str(x['id']); raids[cur] = {'call': {'tx': txof(x), 'block': None, 'caller': 'raidcaller-mwgr1iba.testnet', 'signer': 'raidcaller-mwgr1iba.testnet'}, 'backs': [], 'steps': []}
    continue
  t = txof(x)
  if s in ('crew DAO proposes call_raid', 'vote 2/2 passes: the DAO calls call_raid on the chest'):
    pending.append({'label': label[s], 'tx': t})
    continue
  if cur is None: continue
  if s == 'vote 2/2 passes: the DAO calls call_raid on the chest': pass
  if s.startswith('back from a NEAR wallet') or s.startswith('any-chain back for') or s.startswith('raid B: backer2 backs'):
    who = x.get('for') or ('raidbacker1-mwgr1iba.testnet' if 'backer1' in s else 'raidbacker2-mwgr1iba.testnet')
    amt = str(int(float(re.search(r'(\d+) tUSDC', s).group(1)) * 1e6))
    raids[cur]['backs'].append({'tx': t, 'block': None, 'backer': who, 'amount': amt})
  if s in label and t:
    raids[cur]['steps'].append({'label': label[s], 'tx': t})
  elif s.startswith('raid B: ') and t:
    raids[cur]['steps'].append({'label': s[len('raid B: '):][:60], 'tx': t})
# call receipts for DAO raids: the passing vote tx is the tx where call_raid ran
for k, v in raids.items():
  if v['call'] is None:
    st = [s for s in v['steps'] if s['label'] == 'Vote passes, the DAO calls the raid']
    v['call'] = {'tx': st[0]['tx'] if st else None, 'block': None, 'caller': 'raid-crew-mwgr1iba.sputnikv2.testnet', 'signer': 'raid-crew-mwgr1iba.sputnikv2.testnet'}
out = {'chest': 'raidchest-mwgr1bk0.testnet', 'network': 'testnet', 'generated_from': 'evidence/testnet-lifecycle-run.json', 'raids': raids}
json.dump(out, open('web/src/lib/receipts.json', 'w'), indent=1)
print({k: (len(v['backs']), len(v['steps'])) for k, v in raids.items()})
