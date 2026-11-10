# Called resolver: the AI judge
- **Drafts** markets from posts.
- **Judges** closed markets with a panel of *verifiable* NEAR AI Cloud models (2-of-3 majority; no majority means INVALID, which escalates to the court).
- **Proves** each verdict, so the `called` contract can check it on-chain.

## Run
```bash
npm i && cp .env.example .env
npm test          # 25 tests (signatures, attestation bindings, panel, drafting, HTTP)
npm run lint && npm run typecheck
npm run dev       # :8788  GET /health  POST /draft  POST /judge
npm run fixture   # regenerates ../contracts/src/fixtures/stub_verdict.json (cross-language test)
```

## Verification flow
Implemented in `src/attestation.ts`, `src/signature.ts` and `src/judge.ts`, following docs.near.ai.
1. **Attest:** `GET /v1/attestation/report?model=…&provider=near&signing_algo=ed25519&nonce=<32B hex>`.
   - For `gateway_attestation` and every `model_attestations[]` entry:
     - verify the TDX quote (`@phala/dcap-qvl`) with TCB status in policy and no debug mode;
     - check `report_data` = signer identity (zero-padded, or sha256 with the TLS fingerprint) ‖ nonce;
     - check the echoed nonce;
     - check MRCONFIGID = `01‖sha256(app_compose)‖0*15`;
     - replay RTMR3 from the event log.
   - GPU evidence goes to NVIDIA NRAS (TODO: add the NRAS check before mainnet).
2. **Judge:** `POST /v1/chat/completions` with **exact request bytes**. The evidence (fetched and hashed by us) is inside the prompt, so it's covered by the signature. The model must end with `CALLED_VERDICT:{id}:{YES|NO|INVALID}`.
3. **Signature:** `GET /v1/signature/{chat_id}?model=…&signing_algo=ed25519` returns `{text, signature, signing_address}`.
   - Check `text == sha256(req):sha256(resp)`.
   - Check the ed25519/ECDSA signature.
   - Check the signer equals the attested identity.
4. **On-chain:**
   - The owner registers the attested signer once with `add_judge(key, Ed25519)`.
   - Anyone relays `propose_resolution(market_id, request_sha256, response(base64), signature_hex, signer_hex)`.
   - The contract recomputes `sha256(response)`, verifies the signature (`env::ed25519_verify` / EIP-191 `ecrecover`), and parses the verdict tag.
   - A dispute window follows.

**Stub mode:** `StubJudge` signs with a local ed25519 key in the identical format. It's used in tests and for the cross-language contract fixture. It never produces production verdicts.

**Only verifiable models may judge.** The live `/v1/model/list` (21 Oct 2026) marks external models (e.g. Anthropic) `verifiable:false`.
