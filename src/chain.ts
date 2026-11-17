import {createClient,abi} from 'genlayer-js';
import {executionOf,verifyReceiptIdentity} from './receipt.mjs';
import {studionet} from 'genlayer-js/chains';
import {generatePrivateKey,privateKeyToAccount} from 'viem/accounts';
import type {Deployment,TxEntry} from './types';
export const reader=createClient({chain:studionet});
export const explorer='https://explorer-studio.genlayer.com';
export type Provider={request:(a:{method:string;params?:any})=>Promise<any>;on?:(name:string,fn:(...a:any[])=>void)=>void;removeListener?:(name:string,fn:(...a:any[])=>void)=>void};
export type Wallet={id:string;name:string;provider:Provider};
export type Connection={address:string;label:string;provider?:Provider;localAccount?:ReturnType<typeof privateKeyToAccount>};
export function discover(onWallet:(w:Wallet)=>void){
 const receive=(e:any)=>onWallet({id:e.detail.info.uuid,name:e.detail.info.name,provider:e.detail.provider});
 window.addEventListener('eip6963:announceProvider',receive);window.dispatchEvent(new Event('eip6963:requestProvider'));
 const eth=(window as any).ethereum;
 if(eth){const providers=Array.isArray(eth.providers)?eth.providers:[eth];providers.forEach((p:Provider,i:number)=>onWallet({id:'legacy-'+i,name:`Browser wallet${providers.length>1?' '+(i+1):''}`,provider:p}));}
 return ()=>window.removeEventListener('eip6963:announceProvider',receive);
}
export async function connect(w:Wallet):Promise<Connection>{
 const accounts=await w.provider.request({method:'eth_requestAccounts'});if(!accounts?.[0])throw Error('No account returned by the selected wallet.');
 await ensureNetwork(w.provider);return {address:accounts[0].toLowerCase(),label:w.name,provider:w.provider};
}
export async function ensureNetwork(p:Provider){
 if(Number(await p.request({method:'eth_chainId'}))===61999)return;
 try{await p.request({method:'wallet_switchEthereumChain',params:[{chainId:'0xf22f'}]});}catch(e:any){
  if(e.code!==4902)throw e;
  await p.request({method:'wallet_addEthereumChain',params:[{chainId:'0xf22f',chainName:'GenLayer Stable Studionet',nativeCurrency:{name:'GEN',symbol:'GEN',decimals:18},rpcUrls:['https://studio.genlayer.com/api'],blockExplorerUrls:[explorer]}]});
 }
 if(Number(await p.request({method:'eth_chainId'}))!==61999)throw Error('Switch your wallet to Stable Studionet before signing.');
}
export async function session():Promise<Connection>{
 const a=privateKeyToAccount(generatePrivateKey());
 const r=await fetch('https://studio.genlayer.com/api',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:Date.now(),method:'sim_fundAccount',params:[a.address,10000]})});
 const data=await r.json();if(data.error)throw Error('The official testnet faucet is unavailable.');
 return {address:a.address.toLowerCase(),label:'Temporary testnet session',localAccount:a};
}
export async function read<T>(d:Deployment,fn:string,args:any[]=[]):Promise<T>{
 for(let attempt=0;attempt<2;attempt++){
  try{const raw=await reader.readContract({address:d.contract,functionName:fn,args,transactionHashVariant:'latest-final' as any});
   if(typeof raw!=='string')throw Error('Unexpected contract response.');return JSON.parse(raw);
  }catch(e:any){if(attempt===0&&/fetch|network|timeout|timed out/i.test(e.message??'')){await new Promise(r=>setTimeout(r,800));continue;}throw e;}
 }
 throw Error('Could not read the finalized record.');
}
export function explainError(e:any):string{
 const message=String(e?.shortMessage??e?.message??e??'The operation could not complete.');
 if(/fetch|network|timeout|timed out/i.test(message))return 'GenLayer could not be reached. Any visible record is the last successful read. Retry the read; do not repeat a pending submission.';
 if(/rejected|denied|4001/i.test(message))return 'The selected wallet declined the request. No successful operation is being claimed.';
 if(/STALE_REVISION|BALLOT_NONCE/i.test(message))return 'This record changed since your preview. Refresh it and review the current state before signing again.';
 return message.replace(/Version:.*$/s,'').trim().slice(0,420);
}
export async function verify(d:Deployment){
 if(d.chain_id!==61999||d.rpc!=='https://studio.genlayer.com/api')throw Error('Unsupported deployment configuration.');
 const code=await reader.getContractCode(d.contract);
 const digest=await hash(code);
 if(digest!==d.source_sha256)throw Error('Deployed source differs from the pinned contract. Writes disabled.');
 const p=await read<{version:string}>(d,'get_protocol');if(p.version!==d.protocol)throw Error('Contract protocol mismatch.');
}
export async function hash(s:string){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)))].map(x=>x.toString(16).padStart(2,'0')).join('');}
export async function submit(d:Deployment,c:Connection,method:string,args:any[]):Promise<TxEntry>{
 await verify(d);
 if(c.provider){await ensureNetwork(c.provider);const current=await c.provider.request({method:'eth_accounts'});if(current[0]?.toLowerCase()!==c.address)throw Error('Wallet account changed. Connect again.');}
 const client=c.localAccount?createClient({chain:studionet,account:c.localAccount}):createClient({chain:studionet,account:c.address as any,provider:c.provider as any});
 const digest=await hash(JSON.stringify({chainId:61999,contract:d.contract.toLowerCase(),sender:c.address,method,args}));
 const txHash=await client.writeContract({address:d.contract,functionName:method,args,value:0n,leaderOnly:false});
 return {hash:txHash,method,args,sender:c.address,contract:d.contract.toLowerCase(),chainId:61999,intent_digest:digest,at:new Date().toISOString(),status:'SUBMITTED'};
}
export const execution=executionOf;
export async function poll(t:TxEntry):Promise<TxEntry>{
 const r:any=await reader.getTransaction({hash:t.hash as any});
 const raw=r.data?.calldata?.base64;
 if(!raw)throw Error('Receipt lacks verifiable calldata.');
 const decoded:any=abi.calldata.decode(Uint8Array.from(atob(raw),(x:string)=>x.charCodeAt(0)));
 const obj=decoded instanceof Map?Object.fromEntries(decoded):decoded;
 return {...t,...verifyReceiptIdentity(r,t,obj),error:undefined};
}
export function download(name:string,obj:unknown){const blob=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500);}
