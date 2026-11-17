# Verification and limitations

## Local checks

`npm test` runs 18 explicit mock-host Python tests and five receipt-binding JavaScript tests. The routing checks exhaust all 4,096 combinations of three-node target/ballot assignments, including self-cycles. They verify conservation, direct overrides, abstention, scope barriers, hop attenuation, quorum/ties, snapshot immutability, permissions, nonces, deadlines, replay and validator disagreement. Mock-host checks do not establish real network consensus or SDK compatibility.

`npm run schema` uses the actual GenVM endpoint to generate the contract interface. Schema compilation alone does not establish deployment or a successful business workflow.

## Network and product acceptance

The recorded acceptance flow uses eight independently signing synthetic members and actual GenLayer full consensus. All texts, members and governance decisions are test declarations. No real organization, money or personnel action is affected.

The acceptance journal records intents and hashes before waiting, with normalized receipt status, execution result, actual votes and finalized getter readbacks. The independent verifier re-fetches receipts, verifies calldata against intents, compares the exact deployed source and validates the conserved final result. Completion status is reported by the journal and read-only verification output, not assumed from local tests.

Browser validation and its observed limits will be recorded here when complete.

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
