"""Independent verification of recorded per-origin path witnesses, no SDK/network/model."""
import json
import hashlib
from collections import Counter
from pathlib import Path

root=Path(__file__).resolve().parents[1]
j=json.loads((root/'evidence/live.json').read_text())
p=j['records'].get('settled',j['records']['voting'])
r=p.get('result') or j['records']['preview']['result']
s=p['snapshot']
canonical=lambda x:json.dumps(x,sort_keys=True,separators=(',',':'),ensure_ascii=False)
assert hashlib.sha256(canonical(s).encode()).hexdigest()==p['snapshot_hash']
assert set(x['origin'] for x in r['routes'])==set(s['members'])
assert len(r['routes'])==len(s['members'])
counts=Counter()
for witness in r['routes']:
    path=witness['path'];origin=witness['origin']
    assert path and path[0]==origin
    budget=8
    for index,(source,target) in enumerate(zip(path,path[1:])):
        assert source not in p['ballots'],'A route cannot walk past a direct ballot'
        assert source not in path[:index],'A route cannot walk beyond a repeated node'
        edge=s['edges'][source]
        assert edge['to']==target and target in s['members']
        assert p['eligibility'][source]['status']=='ALLOW'
        budget=min(budget,edge['max_hops'])
        assert budget>0
        budget-=1
    final=path[-1];choice=witness['choice'];reason=witness['reason']
    if choice!='UNEXPRESSED':
        assert final==witness['terminal']
        assert p['ballots'][final]['choice']==choice
        assert reason==('DIRECT' if len(path)==1 else 'DELEGATED')
    else:
        assert final not in p['ballots'] and witness['terminal']==''
        edge=s['edges'].get(final)
        if final in path[:-1]:assert reason=='CYCLE'
        elif edge is None:assert reason=='NO_DELEGATE'
        elif p['eligibility'][final]['status']=='DENY':assert reason=='OUT_OF_SCOPE'
        elif p['eligibility'][final]['status']=='UNCERTAIN':assert reason=='UNCERTAIN_SCOPE'
        else:assert reason=='HOP_LIMIT' and min(budget,edge['max_hops'])==0
    counts[choice]+=1
assert {k:counts[k] for k in r['totals']}==r['totals']
assert sum(counts.values())==len(s['members'])
assert r['participating']==len(s['members'])-counts['UNEXPRESSED']
assert r['quorum']==s['quorum']
expected='NO_QUORUM' if r['participating']<s['quorum'] else 'PASSED' if counts['YES']>counts['NO'] else 'NOT_PASSED'
assert r['result']==expected
if p.get('result'):
    core={k:r[k] for k in ['totals','participating','quorum','member_count','result','routes']}
    digest=hashlib.sha256(canonical({'snapshot':p['snapshot_hash'],'result':core,'ballots':p['ballots']}).encode()).hexdigest()
    assert digest==r['certificate_hash']
print('Valid',len(r['routes']),'origin witnesses;',dict(counts),';',expected,';', 'settled' if p.get('result') else 'recorded voting preview')
