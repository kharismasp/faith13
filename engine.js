/* Pure lesson logic: every apple requires checked calculation, not a card click. */
(function(root){
'use strict';
const integer=v=>/^\d+$/.test(String(v??'').trim())&&Number(v)<=99?Number(v):null;
const operation=q=>q.type==='detective'?{a:1,d:2,b:1,e:3,op:'+'}:q;
const phases=(q,r)=>q.type==='equiv'?['equiv','factors']:q.type==='grid'?['common','factors']:q.type==='match'?['choice','factors']:q.type==='missing'?['choice','missingConvert','result']:q.type==='detective'?(r?.choiceFallback?['common','rewrite','result']:['method','common','rewrite','result']):q.checkpoint?['resultFirst','common','rewrite']:['common','rewrite','result'];
function createRun(){return{version:3,steps:[],drafts:{},errors:0,hints:0,duplicateClicks:0,wrongByStep:{},failed:{},choiceDraft:null,choiceFallback:false,review:false,done:false,recorded:false};}
function active(q,r){return phases(q,r)[r.steps.length]||null;}
function accepted(r,key){return r.steps.find(s=>s.key===key)?.value;}
function fingerprint(values){return JSON.stringify(Object.fromEntries(Object.keys(values).sort().map(k=>[k,String(values[k]??'').trim()])));}
function duplicate(q,r,values){return !!r.failed[active(q,r)]?.includes(fingerprint(values));}
function submit(q,r,values){
 if(r.done)return{kind:'ignored',reason:'complete'};
 const stage=active(q,r),v=Object.fromEntries(Object.entries(values).map(([k,x])=>[k,integer(x)]));
 const op=operation(q);let ok=false,value=null,reason='tryAgain';
 if(duplicate(q,r,values)){r.duplicateClicks++;return{kind:'duplicate',reason:'changeAnswer'};}
 const requireFields=names=>names.every(n=>v[n]!==null&&v[n]!==undefined);
 if(stage==='equiv'){
  if(!requireFields(['n']))return{kind:'incomplete',reason:'fillBoxes'};
  ok=v.n*q.d===q.n*q.target;value={n:v.n,d:q.target};reason='sameAmount';
 }else if(stage==='common'||(stage==='method'&&r.choiceFallback)){
  if(!requireFields(['target']))return{kind:'incomplete',reason:'fillBoxes'};
  ok=v.target>0&&v.target%op.d===0&&v.target%op.e===0;value={target:v.target};reason='bottomCheck';
 }else if(stage==='rewrite'){
  if(!requireFields(['a','b']))return{kind:'incomplete',reason:'fillBoxes'};
  const D=accepted(r,'common').target;
  ok=v.a*op.d===op.a*D&&v.b*op.e===op.b*D;value={a:v.a,b:v.b,d:D};reason='rewriteCheck';
 }else if(stage==='factors'){
  if(!requireFields(['top','bottom']))return{kind:'incomplete',reason:'fillBoxes'};
  if(q.type==='grid'){const D=accepted(r,'common').target;ok=v.top*q.d===D&&v.bottom*q.e===D;}
  else{const D=q.type==='equiv'?q.target:q.options[q.correct][1];ok=v.top*q.d===D&&v.bottom*q.d===D;}
  value={top:v.top,bottom:v.bottom};reason='factorCheck';
 }else if(stage==='choice'){
  let n,d;
  if(r.choiceFallback){if(!requireFields(['n','d']))return{kind:'incomplete',reason:'fillBoxes'};n=v.n;d=v.d;}
  else{if(!requireFields(['choice'])||!q.options[v.choice])return{kind:'incomplete',reason:'chooseFirst'};[n,d]=q.options[v.choice];}
  ok=d>0&&(q.type==='match'?d===q.options[q.correct][1]&&n*q.d===q.n*d:n*3===d);
  value={n,d};reason=q.type==='match'?'sameAmount':'gapCheck';
 }else if(stage==='method'){
  if(!['match','both'].includes(values.method))return{kind:'incomplete',reason:'chooseFirst'};
  ok=values.method==='match';value={method:values.method};reason='methodCheck';
 }else if(stage==='missingConvert'){
  if(!requireFields(['n']))return{kind:'incomplete',reason:'fillBoxes'};
  const chosen=accepted(r,'choice');ok=v.n*chosen.d===chosen.n*6;value={n:v.n,d:6};reason='rewriteCheck';
 }else if(stage==='result'||stage==='resultFirst'){
  if(!requireFields(['n','d']))return{kind:'incomplete',reason:'fillBoxes'};
  if(q.type==='missing')ok=v.d>0&&v.n*2===v.d;
  else{const signed=op.op==='+'?1:-1;ok=v.d>0&&v.n*op.d*op.e===(op.a*op.e+signed*op.b*op.d)*v.d;}
  value={n:v.n,d:v.d};reason='resultCheck';
 }
 if(!ok){r.errors++;r.wrongByStep[stage]=(r.wrongByStep[stage]||0)+1;(r.failed[stage]??=[]).push(fingerprint(values));r.review=r.wrongByStep[stage]>=2;
  const limit=stage==='method'?1:Math.min(2,(q.options?.length||3)-1);const fallback=(stage==='choice'||stage==='method')&&r.wrongByStep[stage]>=limit;
  if(fallback){r.choiceFallback=true;r.choiceDraft=null;r.drafts[stage]={};}
  return{kind:'wrong',reason,fallback,review:r.review};
 }
 r.steps.push({key:stage,value});

 r.review=false;r.choiceDraft=null;r.message='';r.done=r.steps.length===phases(q,r).length;
 return{kind:r.done?'complete':'step',accepted:stage,next:active(q,r)};
}
root.FractionEngine={integer,operation,phases,createRun,active,accepted,fingerprint,duplicate,submit};
})(typeof window==='undefined'?globalThis:window);
