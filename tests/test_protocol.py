"""Explicit mock-host unit tests: these do NOT establish GenVM/network consensus."""
import importlib.util
import sys
import types
import unittest
import itertools
import json
import random
from datetime import datetime, timezone

class Collection:
    def __class_getitem__(cls, _): return cls
class Return:
    def __init__(self, value): self.calldata = value
class Decorator:
    def __getattr__(self, _): return lambda fn: fn
clock = [1800000000]
sender = ['0x'+'1'*40]
gl = types.SimpleNamespace(Contract=object, public=Decorator(),
    message=types.SimpleNamespace(sender_address=sender[0]),
    message_raw={'datetime': datetime.fromtimestamp(clock[0], timezone.utc).isoformat()},
    vm=types.SimpleNamespace(Return=Return), nondet=types.SimpleNamespace())
shim=types.ModuleType('genlayer');shim.gl=gl;shim.TreeMap=Collection;shim.DynArray=Collection
sys.modules['genlayer']=shim
spec=importlib.util.spec_from_file_location('protocol','contracts/mandate_flow.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
A=['0x'+str(i)*40 for i in range(1,9)]
def ctx(actor=None,at=None):
    gl.message.sender_address=actor or A[0]
    gl.message_raw['datetime']=datetime.fromtimestamp(at or clock[0],timezone.utc).isoformat()
def ballot(c): return {'choice':c,'nonce':1,'at':clock[0]}
def edge(a,b,h=8):return {'owner':a,'to':b,'max_hops':h,'allow':['Routine testing and maintenance'],'exclude':['Personnel appointments']}
def run(members,edges,ballots,states=None,q=1):
    states=states or {a:{'status':'ALLOW'} for a in edges}
    return m.outcome(members,edges,states,ballots,q)

class Routing(unittest.TestCase):
    def test_chain_and_origin_conservation(self):
        r=run(A[:3],{A[0]:edge(A[0],A[1],2),A[1]:edge(A[1],A[2],1)},{A[2]:ballot('YES')})
        self.assertEqual(r['totals']['YES'],3)
        self.assertEqual(r['routes'][0]['path'],A[:3])
    def test_direct_override_and_incoming_votes(self):
        r=run(A[:3],{A[0]:edge(A[0],A[1]),A[1]:edge(A[1],A[2])},{A[1]:ballot('NO'),A[2]:ballot('YES')})
        self.assertEqual(r['totals']['NO'],2);self.assertEqual(r['totals']['YES'],1)
    def test_abstention_is_terminal(self):
        r=run(A[:2],{A[0]:edge(A[0],A[1])},{A[1]:ballot('ABSTAIN')},q=2)
        self.assertEqual(r['totals']['ABSTAIN'],2);self.assertEqual(r['result'],'NOT_PASSED')
    def test_cycle_does_not_mint_votes(self):
        r=run(A[:2],{A[0]:edge(A[0],A[1]),A[1]:edge(A[1],A[0])},{})
        self.assertTrue(all(x['reason']=='CYCLE' for x in r['routes']))
        self.assertEqual(r['totals']['UNEXPRESSED'],2)
    def test_direct_vote_breaks_cycle(self):
        r=run(A[:2],{A[0]:edge(A[0],A[1]),A[1]:edge(A[1],A[0])},{A[1]:ballot('YES')})
        self.assertEqual(r['totals']['YES'],2)
    def test_scope_fail_closed(self):
        for state,reason in [('DENY','OUT_OF_SCOPE'),('UNCERTAIN','UNCERTAIN_SCOPE')]:
            r=run(A[:2],{A[0]:edge(A[0],A[1])},{A[1]:ballot('YES')},{A[0]:{'status':state}})
            self.assertEqual(r['routes'][0]['reason'],reason)
            self.assertEqual(r['totals']['YES'],1)
    def test_hop_limit_keeps_direct_delegate(self):
        edges={A[0]:edge(A[0],A[1],1),A[1]:edge(A[1],A[2],2)}
        r=run(A[:3],edges,{A[2]:ballot('YES')})
        self.assertEqual(r['routes'][0]['reason'],'HOP_LIMIT')
        r=run(A[:3],edges,{A[1]:ballot('NO'),A[2]:ballot('YES')})
        self.assertEqual(r['routes'][0]['choice'],'NO')
    def test_quorum_tie_and_empty(self):
        self.assertEqual(run(A[:2],{}, {},q=2)['result'],'NO_QUORUM')
        self.assertEqual(run(A[:2],{}, {A[0]:ballot('YES'),A[1]:ballot('NO')},q=2)['result'],'NOT_PASSED')
    def test_exhaustive_small_graphs(self):
        members=A[:3]
        for targets in itertools.product(range(4),repeat=3):
            edges={a:edge(a,members[t],2) for a,t in zip(members,targets) if t<3}
            for votes in itertools.product(['','YES','NO','ABSTAIN'],repeat=3):
                b={a:ballot(v) for a,v in zip(members,votes) if v}
                r=run(members,edges,b)
                self.assertEqual(sum(r['totals'].values()),3)
                self.assertEqual(len({x['origin'] for x in r['routes']}),3)
                for path in r['routes']:self.assertLessEqual(len(path['path']),4)

class Lifecycle(unittest.TestCase):
    def setUp(self):
        ctx();self.c=m.MandateFlow();self.c.spaces={};self.c.proposals={};self.c.space_ids=[]
        self.sid=self.c.create_space('garden','Test collective','Alex')
    def space(self):return json.loads(self.c.get_space(self.sid))
    def add(self,a,name):
        ctx();self.c.invite_member(self.sid,self.space()['revision'],a)
        ctx(a);self.c.accept_invitation(self.sid,name);ctx()
    def freeze(self):return self.c.freeze_proposal(self.sid,self.space()['revision'],'monthly','Monthly testing','Renew monthly automated test infrastructure.',1,1)
    def test_member_consent_and_permissions(self):
        ctx(A[1])
        with self.assertRaisesRegex(Exception,'INVITATION_REQUIRED'):self.c.accept_invitation(self.sid,'Rowan')
        with self.assertRaisesRegex(Exception,'OWNER_ONLY'):self.c.invite_member(self.sid,0,A[2])
    def test_snapshot_immutable_after_live_mandate_change(self):
        self.add(A[1],'Rowan')
        e=edge(A[0],A[1],2)
        self.c.set_mandate(self.sid,self.space()['revision'],json.dumps({k:e[k] for k in ['to','allow','exclude','max_hops']}))
        pid=self.freeze();before=self.c.get_proposal(pid)
        self.c.clear_mandate(self.sid,self.space()['revision'])
        self.assertEqual(before,self.c.get_proposal(pid))
    def test_pending_edge_blocks_voting(self):
        self.add(A[1],'Rowan');e=edge(A[0],A[1])
        self.c.set_mandate(self.sid,self.space()['revision'],json.dumps({k:e[k] for k in ['to','allow','exclude','max_hops']}))
        pid=self.freeze()
        with self.assertRaisesRegex(Exception,'ASSESSMENT_PENDING'):self.c.open_voting(pid,0)
    def test_ballot_nonce_deadline_settlement_replay(self):
        pid=self.freeze();self.c.open_voting(pid,0)
        self.c.cast_vote(pid,0,'YES')
        with self.assertRaisesRegex(Exception,'BALLOT_NONCE'):self.c.cast_vote(pid,0,'NO')
        self.c.cast_vote(pid,1,'NO')
        p=json.loads(self.c.get_proposal(pid));ctx(at=p['deadline'])
        with self.assertRaisesRegex(Exception,'VOTING_CLOSED'):self.c.cast_vote(pid,2,'YES')
        self.c.settle(pid)
        self.assertEqual(json.loads(self.c.get_proposal(pid))['result']['totals']['NO'],1)
        with self.assertRaisesRegex(Exception,'NOT_SETTLEABLE'):self.c.settle(pid)
    def test_only_snapshot_members_can_vote(self):
        pid=self.freeze();self.c.open_voting(pid,0);ctx(A[1])
        with self.assertRaisesRegex(Exception,'SNAPSHOT_MEMBER_ONLY'):self.c.cast_vote(pid,0,'YES')
    def test_revision_bool_and_preparation_expiry(self):
        with self.assertRaises(Exception):self.c.freeze_proposal(self.sid,True,'bad','Bad vote','Some testing work.',1,1)
        with self.assertRaises(Exception):self.c.freeze_proposal(self.sid,0,'bad','Bad vote','Some testing work.',1,True)
        pid=self.freeze();p=json.loads(self.c.get_proposal(pid));ctx(A[1],p['prepare_until'])
        self.c.close_preparation(pid,0)
        self.assertEqual(json.loads(self.c.get_proposal(pid))['state'],'EXPIRED')

class Consensus(unittest.TestCase):
    def setUp(self):
        self.data={'title':'Test','body':'Renew testing, not personnel.', 'snapshot_hash':'h','edges':[edge(A[0],A[1])]}
        self.row={'owner':A[0],'coverage':'YES','exclusions':['NO'],'proposal_quote':'Renew testing','mandate_quote':'testing and maintenance'}
    def test_exclusion_and_unknown(self):
        self.assertEqual(m.verdict(dict(self.row,exclusions=['YES'])),'DENY')
        self.assertEqual(m.verdict(dict(self.row,coverage='UNKNOWN')),'UNCERTAIN')
    def test_quotes_and_duplicate_keys(self):
        with self.assertRaisesRegex(Exception,'QUOTE'):m.parse_assessment({'rows':[dict(self.row,proposal_quote='invented')]},self.data)
        with self.assertRaisesRegex(Exception,'DUPLICATE_KEY'):m.decode('{"x":1,"x":2}')
    def test_validator_rejects_disagreement_and_false_quote_audit(self):
        gl.nondet.exec_prompt=lambda *a,**k:{'rows':[dict(self.row,coverage='NO')]}
        def nondet(leader,validator):
            self.assertFalse(validator(Return({'rows':[self.row]})));return {'rows':[self.row]}
        gl.vm.run_nondet_unsafe=nondet;m.scope_consensus(self.data)
        calls=[]
        def respond(prompt,**k):
            calls.append(prompt);return {'valid':False} if 'Independently audit' in prompt else {'rows':[self.row]}
        gl.nondet.exec_prompt=respond;m.scope_consensus(self.data)
        self.assertEqual(len(calls),2)

if __name__=='__main__':unittest.main()
