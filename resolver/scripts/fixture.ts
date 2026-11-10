// Generates a stub verdict fixture consumed by the Rust contract tests (cross-language format check).
import { writeFileSync } from 'node:fs';
import { StubJudge, toContractArgs } from '../src/judge.js';
const j = new StubJudge('stub', () => 'YES', new Uint8Array(32).fill(5));
const r = await j.judge({ id: 0, question: 'Will it rain in Lagos on 1 Nov?', rules: 'YES if NiMet reports rain', closeMs: 100_000 }, []);
writeFileSync('../../contracts/src/fixtures/stub_verdict.json', JSON.stringify({ ...toContractArgs(0, r), signer_algo: 'ed25519' }, null, 2));
console.log('fixture written');
