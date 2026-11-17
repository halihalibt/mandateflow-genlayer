import fs from 'node:fs';
import crypto from 'node:crypto';
import {createClient} from 'genlayer-js';
import {studionet} from 'genlayer-js/chains';
import {generatePrivateKey,privateKeyToAccount} from 'viem/accounts';
import {rpc,stringify} from './network.mjs';
const names=['Alex','Rowan','Casey','Devon','Emery','Finley','Gray','Harper'];
fs.mkdirSync('artifacts',{recursive:true});fs.mkdirSync('evidence',{recursive:true});
const journalFile='evidence/live.json';
const previous=fs.existsSync(journalFile)?JSON.parse(fs.readFileSync(journalFile)):null;
const source=fs.readFileSync('contracts/mandate_flow.py','utf8');
const sourceHash=crypto.createHash('sha256').update(source).digest('hex');
if(previous?.source_sha256&&previous.source_sha256!==sourceHash)throw Error('SOURCE_CHANGED_SINCE_DEPLOYMENT');
if(previous?.completed_at){console.log('Acceptance already completed. Use npm run verify for read-only validation.');process.exit(0);}
const keyfile='artifacts/acceptance-signers.json';
if(previous&&!fs.existsSync(keyfile))throw Error('Pending signer file is missing. Refusing to replace acceptance accounts.');
const keys=fs.existsSync(keyfile)?JSON.parse(fs.readFileSync(keyfile)):names.map(()=>generatePrivateKey());
if(!fs.existsSync(keyfile))fs.writeFileSync(keyfile,JSON.stringify(keys),{mode:0o600});
const accounts=keys.map(privateKeyToAccount), a=accounts.map(x=>x.address.toLowerCase());
const clients=accounts.map(account=>createClient({chain:studionet,account}));
const j=previous??{version:1,network:61999,actors:a.map((address,i)=>({name:names[i],address})),transactions:[],records:{},started_at:new Date().toISOString()};
const execution=r=>r.txExecutionResultName??(Array.isArray(r.consensus_data?.leader_receipt)?r.consensus_data.leader_receipt.findLast(x=>x.mode==='leader')?.execution_result:r.consensus_data?.leader_receipt?.execution_result);
const compact=r=>({hash:r.hash,statusName:r.statusName,txExecutionResultName:execution(r),result_name:r.result_name,from_address:r.from_address,to_address:r.to_address,data:{contract_address:r.data?.contract_address},leader_only:r.leader_only,votes:r.votes??r.consensus_data?.votes,leader_result:r.leader_result??(Array.isArray(r.consensus_data?.leader_receipt)?r.consensus_data.leader_receipt.findLast(x=>x.mode==='leader')?.result:null)});
const save=()=>fs.writeFileSync(journalFile,stringify(j));
j.source_sha256=sourceHash;save();
async function wait(entry){
 for(let i=0;i<360;i++){
  const receipt=await clients[0].getTransaction({hash:entry.hash});
  entry.last_status=receipt.statusName;save();
  if(['FINALIZED','UNDETERMINED','CANCELED'].includes(receipt.statusName)){
   entry.receipt=compact(receipt);save();console.log(entry.label,receipt.statusName,execution(receipt));
   if(receipt.statusName!=='FINALIZED')throw Error(`Not finalized: ${entry.label}`);
   const success=execution(receipt)==='SUCCESS';
   if(success===!!entry.expected_failure)throw Error(`Unexpected execution: ${entry.label} ${receipt.txExecutionResultName}`);
   return receipt;
  }
  await new Promise(r=>setTimeout(r,4000));
 }
 throw Error(`Pending ${entry.hash}; resume same journal`);
}
async function tx(label,actor,method,args,expectedFailure=false){
 let e=j.transactions.find(x=>x.label===label);
 if(!e){
  const hash=method==='deploy'?await clients[actor].deployContract({code:source,args:[],leaderOnly:false}):
   await clients[actor].writeContract({address:j.contract,functionName:method,args,value:0n,leaderOnly:false});
  e={label,actor:a[actor],method,args,expected_failure:expectedFailure,hash,submitted_at:new Date().toISOString()};j.transactions.push(e);save();console.log('Submitted',label,hash);
 }
 if(e.receipt){const r=compact(e.receipt);e.receipt=r;save();if((execution(r)==='SUCCESS')===!!e.expected_failure)throw Error('Stored failure');return r;}
 return wait(e);
}
async function read(method,args=[]){return JSON.parse(await clients[0].readContract({address:j.contract,functionName:method,args,transactionHashVariant:'latest-final'}));}
async function record(key,method,args){if(j.records[key])return j.records[key];j.records[key]=await read(method,args);save();return j.records[key];}
if(!j.funded){for(const x of a)await rpc('sim_fundAccount',[x,10000]);j.funded=true;save();console.log('Funded test signers via official Studio faucet');}
const deployed=await tx('deployment',0,'deploy',[]);
if(!j.contract){
 j.contract=deployed.data?.contract_address??deployed.contractAddress??deployed.recipient;
 if(!j.contract||/^0x0+$/.test(j.contract)) {console.log('DEPLOY RECEIPT',stringify(deployed));throw Error('Inspect deployed address');}
 save();
}
const canonicalCode=await clients[0].getContractCode(j.contract);
if(canonicalCode!==source)throw Error('DEPLOYED_SOURCE_MISMATCH');
fs.writeFileSync('public/deployment.json',stringify({network:'Stable Studionet',chain_id:61999,rpc:'https://studio.genlayer.com/api',contract:j.contract,source_sha256:sourceHash,deploy_tx:j.transactions[0].hash,protocol:'mandateflow-1',verified_proposal:j.proposal??null}));
const sid=a[0]+':open-harbor';j.space=sid;save();
await tx('space',0,'create_space',['open-harbor','Open Harbor Collective','Alex']);
for(let i=1;i<a.length;i++){
 let s=await read('get_space',[sid]);
 if(!s.members.includes(a[i])&&!s.invited.includes(a[i]))await tx('invite-'+i,0,'invite_member',[sid,s.revision,a[i]]);
 if(!s.members.includes(a[i]))await tx('accept-'+i,i,'accept_invitation',[sid,names[i]]);
}
const routine='Renewal of monthly automated testing infrastructure and routine software maintenance services.';
const mandates=[
 [0,1,[routine],['Personnel appointments or removals.'],2],
 [1,2,[routine],[],1],
 [4,5,['Editing the content of documentation pages only.'],[],2],
 [5,6,[routine],[],2],
 [6,5,[routine],[],2],
 [7,2,['Decisions about things that are good for the community.'],[],1],
];
for(const [i,t,allow,exclude,h] of mandates){const s=await read('get_space',[sid]);if(!s.mandates[a[i]])await tx('mandate-'+i,i,'set_mandate',[sid,s.revision,JSON.stringify({to:a[t],allow,exclude,max_hops:h})]);}
let s=await record('space_before_freeze','get_space',[sid]);
const pid=sid+':'+a[0]+':testing-renewal';j.proposal=pid;save();
await tx('freeze',0,'freeze_proposal',[sid,s.revision,'testing-renewal','Renew one month of testing infrastructure','Renew the automated testing infrastructure service for one month. This proposal only authorizes routine software test execution infrastructure. It does not appoint or remove personnel, edit documentation content, sell assets, or change membership rules.',5,1]);
let p=await record('frozen','get_proposal',[pid]);
let pending=Object.keys(p.eligibility).filter(k=>p.eligibility[k].status==='PENDING');
for(let i=0;i<pending.length;i+=4){p=await read('get_proposal',[pid]);await tx('scope-batch-'+i,0,'assess_batch',[pid,p.revision,JSON.stringify(pending.slice(i,i+4))]);}
p=await record('assessed','get_proposal',[pid]);
if(p.state==='ASSESSING')await tx('open-voting',0,'open_voting',[pid,p.revision]);
for(const [i,choice] of [[2,'YES'],[3,'NO'],[7,'ABSTAIN']])await tx('ballot-'+i,i,'cast_vote',[pid,0,choice]);
await record('voting','get_proposal',[pid]);
await record('preview','get_preview',[pid]);
await tx('unauthorized-ballot',0,'cast_vote',[pid,99,'YES'],true);
await tx('early-settlement',0,'settle',[pid],true);
console.log('Voting deadline',new Date(j.records.voting.deadline*1000).toISOString());
const metadata=JSON.parse(fs.readFileSync('public/deployment.json'));metadata.verified_proposal=pid;metadata.verified_space=sid;fs.writeFileSync('public/deployment.json',stringify(metadata));
if(process.argv.includes('--prepare-only'))process.exit(0);
while(Date.now()/1000<j.records.voting.deadline+2){await new Promise(r=>setTimeout(r,15000));}
await tx('settlement',0,'settle',[pid]);
await record('settled','get_proposal',[pid]);await record('final-preview','get_preview',[pid]);
await tx('settlement-replay',0,'settle',[pid],true);
j.completed_at=new Date().toISOString();save();fs.unlinkSync(keyfile);
console.log('Acceptance complete',j.contract,pid);
