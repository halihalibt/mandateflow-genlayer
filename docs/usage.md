# Using MandateFlow

The default language is English. Public records need no wallet. Choose a collective in the header, open Proposals, and inspect its frozen body, graph, authorization evidence and every original member's path. The result page says whether it is a current preview or settled record.

## Participate

Connect an injected wallet announced through EIP-6963 or a legacy EIP-1193 provider. The selected provider handles account selection and signatures. Before each write, the application rechecks account and network (Stable Studionet 61999). Account/chain changes invalidate the local connection; reconnect explicitly.

For testing only, the separately labeled temporary session option generates a real signer in tab memory and requests free testnet funds from Studio. It is not an extension wallet. Reloading or disconnecting discards access. Never use it for important ongoing membership or send valuable funds to it. No private-key form or WalletConnect QR is provided.

Create a collective, invite another wallet and have that wallet accept through Members. Set your own delegation through My delegation. You cannot sign another member's mandate. Display names are labels, not verified identities.

Create a proposal with an unused lowercase reference, complete body, integer quorum and 1–72-hour voting duration. Review the exact frozen arguments before signing. The local draft is browser-local; it is not a chain record. Prepare scope batches, then explicitly open voting. If scope review cannot complete, the creator can cancel preparation or anyone may expire it after 24 hours.

During voting, a direct YES/NO/ABSTAIN overrides your frozen default. You may update that direct ballot before the deadline. If upstream delegations terminate at you, they may follow your direct choice as well. Follow the per-origin path list rather than interpreting a terminal's combined weight as newly created voting rights.

At the deadline, settle through Proposal detail. Voting results shows exact counts and explanations. Export the current record as JSON. A passed result does not perform treasury payments or other proposal actions.

## Transactions and recovery

Review exact arguments, contract method and account before signing. The UI never treats a returned signature or provisional ACCEPTED state as completed business. It tracks FINALIZED, execution status and matching finalized getter readback.

Public transaction intent/hash records are saved in this browser's local storage to resume monitoring after reload. Signing keys are not saved. If broadcasting returns an unknown outcome, inspect your wallet and explorer before retrying; the application does not automatically resend.

A finalized execution error remains a failed business action even if consensus agreed on that error. An UNCERTAIN scope finding is instead a successful saved business finding. A timeout or unavailable RPC leaves monitoring incomplete, not a fabricated scope decision.
