# Architecture

## Authority and data flow

React is a client for one GenLayer Intelligent Contract. Writes are signed by the selected EIP-1193 provider or an explicitly created temporary session account; reads use `latest-final`. The frontend checks deployed source bytes against the manifest before writes, binds receipts to the sender/recipient/method/arguments, checks finalized execution and reads the matching business record back.

`public/deployment.json` pins network, address, protocol and source SHA-256. `contracts/mandate_flow.py` is the complete canonical contract. It has no constructor parameters and no administrator bypass for scope, ballots or counting.

## Frozen proposal and scope consensus

A space stores accepted members, invitation state, current mandates and proposal IDs. Space revisions guard edits. A proposal freezes the complete body, member addresses/display names, each mandate, source-space revision, quorum and duration under a canonical JSON SHA-256. Later membership or mandate edits cannot alter it.

The scope task evaluates complete coverage of substantive proposal actions plus an ordered YES/NO/UNKNOWN vector for explicit exclusions. Coverage NO or any exclusion YES produces DENY. Complete coverage YES with all exclusions NO produces ALLOW. Other well-formed findings produce UNCERTAIN.

Leader and validators read the same immutable source inputs independently. Validators repeat classification and compare all decision-bearing fields, then separately audit the proposed quotation anchors against the complete original input. Exact substring/schema checks are additional deterministic constraints, not the consensus mechanism. Invalid model output or failed execution is not a legitimate uncertainty finding.

Quotes are bounded evidence anchors, not exhaustive summaries. Very long or multi-action proposals may be difficult to assess; use concise, separable motions. An unassessable batch remains incomplete and retryable before preparation expiry; there is no leader-only fallback.

## Fixed state machine

`ASSESSING → VOTING → SETTLED`.

During preparation, the creator may cancel. After 24 hours anyone may expire incomplete preparation. Voting can open only before preparation expiry and after every frozen edge has a decision; opening starts the immutable 1–72-hour deadline. DENY and UNCERTAIN are valid edge decisions and do not prevent members voting directly.

Direct ballot nonce guards prevent replaying an earlier ballot intent. Before the deadline a snapshot member can replace their own direct ballot; previous choices are not added to the count. There is no delete-ballot operation restoring delegation. A member can vote ABSTAIN to explicitly terminate their default route. At/after the deadline new ballots are rejected. Anyone may settle once.

## Origin-preserving routing

Start independently at each original member, with an eight-hop budget. A direct ballot terminates the path before examining the node's outgoing mandate. Otherwise a repeated node is a cycle. Missing edges stop. DENY/UNCERTAIN edges stop. For each edge, reduce the remaining budget to the smaller of its current value and that mandate's max_hops; crossing consumes one. An exhausted budget can still terminate at a direct ballot at the current node but cannot cross another edge.

Every traversed mandate must be ALLOW. A wider downstream mandate cannot override a rejected upstream mandate. Incoming paths can share a terminal, but each still represents exactly one original unit.

Explicit ABSTAIN counts toward quorum. UNEXPRESSED does not. Passing requires quorum and YES > NO. The final record contains every route, counts, snapshot hash, timestamp and certificate hash binding the result and latest ballots. It is a governance record, not an execution engine.

## Public API

All methods return JSON strings except writes returning a record ID. No method is payable.

| Method | Access / purpose |
|---|---|
| `create_space(slug, name, member_name)` | Create owner/member space |
| `invite_member(sid, expected_revision, member)` | Owner invites wallet |
| `accept_invitation(sid, name)` | Invited wallet accepts itself |
| `remove_member(sid, expected_revision, member)` | Owner removes member/invitation for future snapshots |
| `set_mandate(sid, expected_revision, payload)` | Member signs `{to, allow, exclude, max_hops}` |
| `clear_mandate(sid, expected_revision)` | Member removes future default |
| `freeze_proposal(sid, expected_revision, slug, title, body, quorum, duration_hours)` | Current member freezes full snapshot |
| `assess_batch(pid, expected_revision, owners_json)` | Anyone reviews 1–4 distinct pending snapshot edge owners |
| `open_voting(pid, expected_revision)` | Anyone after complete review, before preparation expiry |
| `cast_vote(pid, expected_nonce, choice)` | Snapshot member before deadline |
| `settle(pid)` | Anyone after deadline, once |
| `close_preparation(pid, expected_revision)` | Creator before opening, or anyone after expiry |
| `get_protocol()` | Limits and protocol ID |
| `list_spaces(offset, limit)` | Public paginated summaries, max 20/page |
| `get_space(sid)` | Public full space |
| `get_proposal(pid)` | Public frozen proposal, evidence and ballots |
| `get_preview(pid)` | Public current or settled routing; `final` distinguishes them |

Caps: 256 spaces, 16 accepted+invited members/space, 32 proposals/space, four clauses/mandate, eight hops, four edges/consensus batch. IDs are owner-namespaced; existing IDs cannot be overwritten. A recreated mandate can reuse a local version number, so evidence identity is always snapshot hash + member + source-space revision, never just a mandate version.
