import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {abi} from 'genlayer-js';
import {client,stringify} from './network.mjs';
const d=JSON.parse(fs.readFileSync('public/deployment.json'));
const j=JSON.parse(fs.readFileSync('evidence/live.json'));
const code=await client.getContractCode(d.contract);
assert.equal(code,fs.readFileSync('contracts/mandate_flow.py','utf8'));
assert.equal(crypto.createHash('sha256').update(code).digest('hex'),d.source_sha256);
const receipts=[];
const adversarial=JSON.parse(fs.readFileSync('evidence/adversarial.json'));
assert(adversarial.completed_at,'Adversarial acceptance must be complete');
for(const t of [...j.transactions,...adversarial.transactions]){
 const r=await client.getTransaction({hash:t.hash});
 assert.equal(r.statusName,'FINALIZED',t.label);
 const leaders=r.consensus_data?.leader_receipt;
 const lead=Array.isArray(leaders)?leaders.filter(x=>x.mode==='leader').at(-1):leaders;
 const execution=r.txExecutionResultName??lead?.execution_result;
 assert.equal(execution,t.expected_failure?'ERROR':'SUCCESS',t.label);
 assert.equal(r.leader_only,false,t.label+' must use full consensus');
 assert.equal(r.from_address.toLowerCase(),t.actor.toLowerCase());
 if(t.method!=='deploy'){
  assert.equal(r.to_address.toLowerCase(),d.contract.toLowerCase());
  const b=Uint8Array.from(Buffer.from(r.data.calldata.base64,'base64'));
  const raw=abi.calldata.decode(b);const o=raw instanceof Map?Object.fromEntries(raw):raw;
  assert.equal(o.method,t.method);assert.equal(JSON.stringify(o.args??[],(_,v)=>typeof v==='bigint'?Number(v):v),JSON.stringify(t.args));
 }
 receipts.push({label:t.label,hash:t.hash,status:r.statusName,execution,consensus:r.result_name,leader_only:r.leader_only,votes:r.consensus_data?.votes});
}
const get=async(fn,args)=>JSON.parse(await client.readContract({address:d.contract,functionName:fn,args,transactionHashVariant:'latest-final'}));
const p=await get('get_proposal',[j.proposal]);
assert.equal(p.snapshot_hash,j.records.frozen.snapshot_hash);
assert.equal(p.state,'SETTLED');
assert.equal(p.result.totals.YES,3);assert.equal(p.result.totals.NO,1);assert.equal(p.result.totals.ABSTAIN,1);assert.equal(p.result.totals.UNEXPRESSED,3);
assert.equal(p.result.result,'PASSED');assert.equal(p.result.participating,5);
const ordered={};const canonical=v=>JSON.stringify(v,(_,x)=>{if(x&&typeof x==='object'&&!Array.isArray(x)){return Object.fromEntries(Object.keys(x).sort().map(k=>[k,x[k]]))}return x});
const snapshotDigest=crypto.createHash('sha256').update(canonical(p.snapshot)).digest('hex');assert.equal(snapshotDigest,p.snapshot_hash);
assert.equal(p.eligibility[j.actors[4].address].status,'DENY');assert.equal(p.eligibility[j.actors[7].address].status,'UNCERTAIN');
const mixed=await get('get_proposal',[adversarial.records.cancelled.id]);
assert.equal(mixed.state,'CANCELLED');assert.equal(mixed.eligibility[j.actors[0].address].status,'DENY');assert.equal(mixed.eligibility[j.actors[0].address].exclusions[0],'YES');
const out={adversarial_proposal:mixed,verified_at:new Date().toISOString(),contract:d.contract,source_sha256:d.source_sha256,snapshot_sha256:snapshotDigest,receipts,proposal:p};
fs.writeFileSync('evidence/verification.json',stringify(out));
console.log('Independent verification passed:',receipts.length,'finalized transactions; conserved 8 original votes.');
