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
const cases = ['allow','block','upper','mixed','space','missing','null','boolean','number','object','array','malformed','http-error','job-mismatch','assessment-mismatch','workflow-mismatch','nullable','missing-rating','workflow','missing-result','review','unsupported','version-mismatch','historical','cached'];
function fixture(id) {
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

