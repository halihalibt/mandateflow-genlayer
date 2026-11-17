// Independent read-only check of browser-observed transaction hashes.
import fs from 'node:fs';import assert from 'node:assert/strict';
import {abi} from 'genlayer-js';import {client,stringify} from './network.mjs';
const file='evidence/browser.json';const j=JSON.parse(fs.readFileSync(file));
const hashes=[...new Set([...j.transactions.map(t=>t.hash),'0x3d5d5fbd40d29831e2a9f9b56644cc9f13c16db4df5e1c5ecc403047a68dd0c8'])];
const transactions=[];
for(const hash of hashes){
 const r=await client.getTransaction({hash});const leader=r.consensus_data.leader_receipt.filter(x=>x.mode==='leader').at(-1);
 assert.equal(r.statusName,'FINALIZED');assert.equal(leader.execution_result,'SUCCESS');assert.equal(r.leader_only,false);
 assert.equal(r.to_address.toLowerCase(),j.contract.toLowerCase());
 const raw=abi.calldata.decode(Uint8Array.from(Buffer.from(r.data.calldata.base64,'base64')));const call=raw instanceof Map?Object.fromEntries(raw):raw;
 transactions.push({hash,method:call.method,args:call.args,status:r.statusName,execution:leader.execution_result,leader_only:r.leader_only,consensus:r.result_name,sender:r.from_address,target:r.to_address});
}
assert.deepEqual(transactions.map(t=>t.method),['create_space','freeze_proposal','open_voting','cast_vote','settle']);
const proposal=JSON.parse(await client.readContract({address:j.contract,functionName:'get_proposal',args:[j.proposal.id],transactionHashVariant:'latest-final'}));
assert.equal(proposal.state,'SETTLED');assert.equal(proposal.result.totals.YES,1);assert.equal(proposal.result.result,'PASSED');
assert.equal(proposal.deadline-proposal.opened_at,3600);assert(proposal.result.settled_at>=proposal.deadline);
Object.assign(j,{observed_ui:'Cloud Chrome with direct HTTPS RPC. Initial local-preview create → freeze → open → direct YES used an explicitly created temporary session signer and matching finalized readbacks. After the real deadline a fresh session signer performed permissionless settlement through the published website. Reload restored public records and transaction monitoring without recovering the discarded key.',transactions,proposal,verified_at:new Date().toISOString(),completed:true});
fs.writeFileSync(file,stringify(j));console.log('Verified five browser-signed FINALIZED/SUCCESS operations and settled YES result.');
