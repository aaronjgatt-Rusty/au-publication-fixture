import http from 'node:http';
import { randomUUID } from 'node:crypto';

const instance = randomUUID();
const sessions = new Map();
const job = 'a'.repeat(64);
const assessment = 'b'.repeat(64);
const result = {
  rating_region: 'AU', rating_value: 'PG', reading_age: null,
  parent_summary: 'Synthetic fixture: mild fantasy threat and brief grief references.',
  confidence: 'high', classification_status: 'supported', review_status: 'clear',
  publication_allowed: true, verified: true,
  policy_version: 'booksense-au-film-2012-v1',
  evidence_version: 'booksense-evidence-context-advisories-2026-10-14-v3',
  synthesis_version: 'booksense-protected-synthesis-v4-au-advisories',
  violence_level: 'low', profanity_level: 'none', sexual_content_level: 'none',
  substance_use_level: 'none', mature_themes_level: 'low',
  film_age_guidance: 'Australian film-age guidance only; not a legal restriction on books.'
};
const catalogueBase = {"worker_version":"booksense-simple-test-v3-ai-transport","version":"booksense-simple-test-v3-ai-transport","stage":"SIMPLE_TEST","success":true,"status":"cached_assessment","job_id":"906d44a31b7b588244a8dcc4925ef1673a8fd77ddf07715e894b86278f30c2a2","result":{"classification_status":"supported","rating_value":"MA15+","category_levels":{"violence":"high","profanity":"none","sexual_content":"none","substance_use":"none","mature_themes":"none"},"parent_summary":"Fixture parental guidance.","age_rationale":"Fixture age rationale based on the supplied content.","confidence":"high","review_state":"clear","review_reason":"","protected_findings":[{"finding_id":"445bd3cff192545c2e96e7a57ba6a42ea69c9bcb4fccc8ade8a91d1921168f10","disposition":"retained","rationale":"This finding informs the fixture rating and parental guidance."}],"country":"AU","classification_policy_version":"booksense-au-film-2012-v1","evidence_instruction_revision":"booksense-evidence-context-advisories-2026-10-14-v3","synthesis_contract_version":"booksense-protected-synthesis-v4-au-advisories","film_age_guidance":{"guidance":"Unsuitable for persons under 15 years; legally restricted film category","status":"restricted"},"review_reasons":[],"recommended_age":null,"status":"analysis_completed","publishable":true,"identity":{"title":"Synthetic fixture","author":"BookSense tests","edition_id":"fixture-1","source_url":"https://fixture.invalid/book.txt","language":"en","format":"digital_text","content_variant":"unabridged","source_hash":"2882bb21f8340a06c34ceb1552932f6c1d0476c5c63256f6b49019870bca83aa"},"verification":{"title":"Synthetic fixture","author":"BookSense tests","edition_id":"fixture-1","language":"en","format":"digital_text","content_variant":"unabridged","source_url":"https://fixture.invalid/book.txt","source_hash":"2882bb21f8340a06c34ceb1552932f6c1d0476c5c63256f6b49019870bca83aa","complete":true,"status":"verified","confidence":"high","verifier":"booksense-stage-d-v1","normalization_version":"booksense-c3.1-normalized-v1","reference_id":"mock-only","evidence_id":"0000000000000000000000000000000000000000000000000000000000000000","reasons":[],"evidence":[{"kind":"pinned_catalog","sha256":"0000000000000000000000000000000000000000000000000000000000000000","url":"https://fixture.invalid/mock","test_only":true},{"kind":"edition_reference","reference_id":"mock-only","test_only":true},{"kind":"complete_edition_match","sha256":"2882bb21f8340a06c34ceb1552932f6c1d0476c5c63256f6b49019870bca83aa","test_only":true}]},"version":"booksense-simple-test-v3-ai-transport","ai_version":"mock-publication-contract","analysis_date":"2026-10-14T00:00:00.000Z","segment_count":1,"findings":[{"category":"violence","severity":"high","description":"Hand-authored serious isolated depiction.","rating_driver":true,"frequency":"isolated","finding_id":"445bd3cff192545c2e96e7a57ba6a42ea69c9bcb4fccc8ade8a91d1921168f10"}],"assessment_id":"e825027a85c17211bcb991d75e4619cd8368c2664332f2e558e81c1af78ccc44"},"publishable":true,"verification":{"vcp_verified":false,"source_scope_verified":true},"extraction":{"requested_segments":1,"completed_segments":1,"failed_segments":0},"assessment_id":"e825027a85c17211bcb991d75e4619cd8368c2664332f2e558e81c1af78ccc44","publication_decision":"allow","cached":true};
const catalogueCases = ["cat-allow", "cat-block", "cat-array", "cat-missing-decision", "cat-null-decision", "cat-boolean-decision", "cat-number-decision", "cat-object-decision", "cat-malformed", "cat-missing-result", "cat-edition-mismatch", "cat-job-mismatch", "cat-assessment-mismatch", "cat-missing-rating", "cat-bad-rating", "cat-bad-age", "cat-missing-age", "cat-bad-guidance", "cat-bad-categories", "cat-bad-summary", "cat-old-version", "cat-bad-identity"];
function catalogueFixture(id) {
 const x=structuredClone(catalogueBase);
 switch(id) {
 case "cat-block": x.publication_decision="block"; break;
 case "cat-array": x.publication_decision=["allow"]; break;
 case "cat-missing-decision": delete x.publication_decision; break;
 case "cat-null-decision": x.publication_decision=null; break;
 case "cat-boolean-decision": x.publication_decision=true; break;
 case "cat-number-decision": x.publication_decision=1; break;
 case "cat-object-decision": x.publication_decision={value:"allow"}; break;
 case "cat-malformed": return {status:200,body:"{broken",type:"application/json"};
 case "cat-missing-result": delete x.result; break;
 case "cat-edition-mismatch": x.result.identity.edition_id="fixture-2"; break;
 case "cat-job-mismatch": x.job_id="c".repeat(64); break;
 case "cat-assessment-mismatch": x.assessment_id="d".repeat(64); break;
 case "cat-missing-rating": delete x.result.rating_value; break;
 case "cat-bad-rating": x.result.rating_value=["MA15+"]; break;
 case "cat-bad-age": x.result.recommended_age="15+"; break;
 case "cat-missing-age": delete x.result.recommended_age; break;
 case "cat-bad-guidance": x.result.film_age_guidance="Not book restrictions"; break;
 case "cat-bad-categories": delete x.result.category_levels.profanity; break;
 case "cat-bad-summary": x.result.parent_summary=["Coerced summary"]; break;
 case "cat-old-version": x.result.evidence_instruction_revision="legacy-unversioned"; break;
 case "cat-bad-identity": x.job_id=[x.job_id]; break;
 case "cat-allow": break;
 default: throw Error("Unknown catalogue fixture");
 }
 return {status:200,body:JSON.stringify(x),type:"application/json"};
}
const cases = ['allow','block','upper','mixed','space','missing','null','boolean','number','object','array','malformed','http-error','job-mismatch','assessment-mismatch','workflow-mismatch','nullable','missing-rating','workflow','missing-result','review','unsupported','version-mismatch','historical','cached',...catalogueCases];
function fixture(id) {
  if(catalogueCases.includes(id)) return catalogueFixture(id);
  const x = { publication_decision: 'allow', job_id: job, assessment_id: assessment,
    workflow_id: 'synthetic-workflow-1', result: structuredClone(result) };
  switch (id) {
    case 'block': x.publication_decision = 'block'; break;
    case 'upper': x.publication_decision = 'ALLOW'; break;
    case 'mixed': x.publication_decision = 'Allow'; break;
    case 'space': x.publication_decision = ' allow '; break;
    case 'missing': delete x.publication_decision; break;
    case 'null': x.publication_decision = null; break;
    case 'boolean': x.publication_decision = true; break;
    case 'number': x.publication_decision = 1; break;
    case 'object': x.publication_decision = { value: 'allow' }; break;
    case 'array': x.publication_decision = ['allow']; break;
    case 'malformed': return { status: 200, body: '{broken', type: 'application/json' };
    case 'http-error': return { status: 500, body: '{"error":"synthetic HTTP error"}', type: 'application/json' };
    case 'job-mismatch': x.job_id = 'c'.repeat(64); break;
    case 'assessment-mismatch': x.assessment_id = 'd'.repeat(64); break;
    case 'workflow-mismatch': x.workflow_id = 'synthetic-workflow-2'; break;
    case 'nullable': x.result.reading_age = null; break;
    case 'missing-rating': x.publication_decision = 'block'; x.result.rating_value = null; break;
    case 'workflow': x.status = 'completed'; x.details = { output: { result: x.result } }; delete x.result; break;
    case 'missing-result': x.publication_decision = 'block'; delete x.result; break;
    case 'review': x.publication_decision = 'block'; x.result.review_status = 'required'; break;
    case 'unsupported': x.publication_decision = 'block'; x.result.classification_status = 'unsupported'; x.result.rating_value = null; break;
    case 'version-mismatch': x.publication_decision = 'block'; x.result.policy_version = 'synthetic-old-policy'; break;
    case 'historical': x.publication_decision = 'block'; x.historical = true; break;
    case 'cached': x.cached = true; break;
    case 'allow': break;
    default: throw new Error('Unknown fixed case');
  }
  return { status: 200, body: JSON.stringify(x), type: 'application/json' };
}
function send(res, status, body, type = 'application/json') {
  res.writeHead(status, {'Content-Type': type, 'Cache-Control':'no-store', 'X-Fixture-Instance': instance});
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}
function deliver(item, session) {
  const f = fixture(item.case_id);
  session.events.push({action:'release',request_id:item.request_id,case_id:item.case_id});
  send(item.res, f.status, f.body, f.type);
  session.pending.delete(item.request_id);
}
const html = `<!doctype html><html><head><meta charset="utf-8"><title>Isolated fixture control</title></head>
<body><h1>Synthetic publication fixture control</h1><p>No BookSense connections. No assessment or AI calls.</p>
<button id="start">Start isolated session</button><button id="refresh">Refresh pending requests</button><button id="close">Deactivate session</button>
<p id="session">Inactive</p><pre id="state"></pre><div id="pending"></div>
<script>
let sid='';
async function post(path){const r=await fetch(path,{method:'POST'});return r.json();}
async function refresh(){
 if(!sid)return;
 const x=await (await fetch('/session/'+sid)).json();
 document.getElementById('state').textContent=JSON.stringify(x,null,2);
 const p=document.getElementById('pending');p.replaceChildren();
 for(const item of x.pending||[]){
 const b=document.createElement('button'); b.textContent='Release '+item.request_id+' ('+item.case_id+')';
 b.onclick=async()=>{await post('/session/'+sid+'/release/'+encodeURIComponent(item.request_id));await refresh();};p.appendChild(b);
 }
}
document.getElementById('start').onclick=async()=>{if(sid)return;const x=await post('/session');sid=x.session_id;document.getElementById('session').textContent=sid;await refresh();};
document.getElementById('refresh').onclick=refresh;
document.getElementById('close').onclick=async()=>{if(!sid)return;await post('/session/'+sid+'/close');sid='';document.getElementById('session').textContent='Inactive';document.getElementById('pending').replaceChildren();document.getElementById('state').textContent='Session deactivated';};
</script></body></html>`;
const server = http.createServer((req,res)=>{
  const u = new URL(req.url, 'http://fixture.invalid');
  const parts = u.pathname.split('/').filter(Boolean);
  if(req.method === 'GET' && u.pathname === '/') return send(res,200,html,'text/html; charset=utf-8');
  if(req.method === 'GET' && u.pathname === '/health') return send(res,200,{fixture_only:true,instance,active_sessions:sessions.size});
  if(req.method === 'POST' && u.pathname === '/session'){
    const session_id=randomUUID();
    sessions.set(session_id,{pending:new Map(),events:[]});
    return send(res,200,{session_id,instance,cases,job_id:job,assessment_id:assessment,workflow_id:'synthetic-workflow-1'});
  }
  if(parts[0] === 'session'){
    const s=sessions.get(parts[1]);if(!s)return send(res,404,{error:'inactive session'});
    if(req.method === 'GET' && parts.length === 2) return send(res,200,{
      instance,pending:[...s.pending.values()].map(({request_id,case_id})=>({request_id,case_id})),events:s.events});
    if(req.method === 'POST' && parts[2] === 'release'){
      const item=s.pending.get(decodeURIComponent(parts[3]||''));
      if(!item)return send(res,404,{error:'no matching pending request'});
      deliver(item,s);return send(res,200,{released:item.request_id});
    }
    if(req.method === 'POST' && parts[2] === 'close'){
      for(const item of s.pending.values())send(item.res,503,{error:'fixture session closed'});
      sessions.delete(parts[1]);return send(res,200,{inactive:true});
    }
  }
  if(req.method === 'GET' && u.pathname === '/fixture'){
    const case_id=u.searchParams.get('case_id')||'allow';
    if(!cases.includes(case_id))return send(res,400,{error:'unknown fixed case'});
    const s=sessions.get(u.searchParams.get('session_id'));
    if(!s)return send(res,503,{error:'fixture inactive'});
    const request_id=u.searchParams.get('request_id');
    if(!request_id || request_id.length>100)return send(res,400,{error:'request identifier required'});
    if(s.pending.has(request_id))return send(res,409,{error:'duplicate pending request'});
    const item={res,request_id,case_id};
    s.events.push({action:'arrive',request_id,case_id});
    if(u.searchParams.get('hold')==='yes'){
      s.pending.set(request_id,item);
      res.on('close',()=>{if(s.pending.get(request_id)===item){s.pending.delete(request_id);s.events.push({action:'disconnect',request_id});}});
      return;
    }
    return deliver(item,s);
  }
  return send(res,404,{error:'fixture route not found'});
});
server.listen(Number(process.env.PORT||10000),'0.0.0.0');

