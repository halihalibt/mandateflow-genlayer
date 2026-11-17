# Verification and limitations

## Local checks

`npm test` runs 18 explicit mock-host Python tests and five receipt-binding JavaScript tests. The routing checks exhaust all 4,096 combinations of three-node target/ballot assignments, including self-cycles. They verify conservation, direct overrides, abstention, scope barriers, hop attenuation, quorum/ties, snapshot immutability, permissions, nonces, deadlines, replay and validator disagreement. Mock-host checks do not establish real network consensus or SDK compatibility.

`npm run schema` uses the actual GenVM endpoint to generate the contract interface. Schema compilation alone does not establish deployment or a successful business workflow.

## Network and product acceptance

The canonical source SHA-256 is `2ff09c3b9c110ba845f2eedc19c9b107ad9690c6edc8875095ae5a372c195b37`. Contract `0xAbF34de3273BDbF463Ea8d5b944D746394bd12F6` was deployed with full consensus on Stable Studionet 61999. The independent verifier matches deployed code byte-for-byte, checks the manifest digest and verifies every recorded method/argument against actual receipt calldata.

The main acceptance journal has 33 FINALIZED transactions: 30 successful operations and three expected execution errors (wrong ballot nonce, premature settlement, settlement replay). Its eight independently signing synthetic members complete invitations, scope-bound mandates, a frozen proposal, two consensus batches, opening, direct ballots and settlement after the real one-hour minimum. The final counts are YES 3, NO 1, ABSTAIN 1, UNEXPRESSED 3; participation/quorum is 5/5 and PASSED.

Four delegation edges are ALLOW, one DENY and one UNCERTAIN. The uncertain member's direct ABSTAIN correctly overrides the disabled default. Two unexpressed votes terminate in a cycle; the third is blocked by scope. `scripts/verify-proof.py` independently checks each original path, hop budget, termination reason, conservation, quorum and the final certificate without importing the contract or a model/SDK.

Five additional FINALIZED transactions cover a mixed testing/personnel proposal containing hostile embedded model instructions. The original exclusion is still independently classified YES and the edge DENY. Opening with incomplete scope review and an outsider's ballot both fail with execution errors. The adversarial preparation is cancelled, retaining its evidence. Total independently re-fetched primary/adversarial receipts: 38 (33 successful executions, five expected errors). Observed votes are recorded as returned; no unanimity claim is made.

Browser acceptance uses an explicitly labeled in-memory temporary signer and direct HTTPS RPC: create space → freeze → open → direct YES, with successful finalized readbacks. Reload loses signing access as documented and restores the public record. A fresh temporary signer performs permissionless settlement on the deployed public website after the real deadline. `evidence/browser.json` records the actual hashes and final state; it does not assert branded extension-wallet signing.

The public English application is built successfully and checked in Chrome: finalized proposal/graph/results, authorization drawers, route selection, keyboard dismissal, transaction center and deep-link reload. Responsive layout is checked at desktop width and a 340-CSS-pixel narrow layout using browser zoom; this is CSS-layout coverage, not a physical mobile-wallet test. The narrow layout uses readable path lists instead of shrinking graph labels. Decorative overflow and short-height navigation scrolling were corrected.

All member identities, proposal content and choices are synthetic test declarations. No real organization, funds or personnel action is affected. Model calls, signatures, consensus, contract writes and final-state reads are real. No RPC or onchain results are mocked in these records.

## Limits

- Public membership, mandates and ballots. No unique-human proof, privacy or coercion protection.
- The owner controls future invitations/membership; frozen proposal membership cannot be changed by that owner.
- Scope interpretation can be wrong despite consensus. Conservative uncertainty and direct voting are explicit paths, not guarantees of decision correctness.
- One default outgoing mandate/member; no ranked fallback delegates. A proposal freezes that graph. Direct ABSTAIN is the per-proposal opt-out.
- Model/schema/network failure is not an accepted uncertainty result. No unilateral manual override.
- Concise proposals are recommended; bounded excerpt requirements may reduce availability for long complex motions.
- No independent external-fact oracle. Missing factual prerequisites prevent confident authorization.
- One-hour minimum voting duration and real transaction time. No hidden fast-test mode.
- Free Studionet, model and RPC availability are external dependencies. SDK and runtime pins do not guarantee future service availability.
- Commercial wallet brand signing and physical mobile-wallet operation require their own verification; generic EIP-1193 support is not a brand-specific certification.

Canonical protocol documentation: https://docs.genlayer.com/developers/intelligent-contracts/equivalence-principle and https://docs.genlayer.com/understand-genlayer-protocol/core-concepts/optimistic-democracy/finality.
