'use strict';
const D=JSON.parse(document.getElementById('market-data').textContent);
const $=id=>document.getElementById(id), NS='http://www.w3.org/2000/svg';
const colors={DE:'#1c6b55',BE:'#c78646',PL:'#779fa4',ES:'#a19865',SE:'#9e788b',AT:'#638ac0',BR:'#b7b870',AU:'#8c9d83',FI:'#b29d93',US:'#6e97a1',other:'#d2dace'};
const palette=['#1c6b55','#c78646','#779fa4','#a19865','#9e788b','#638ac0','#9aaf79','#7a9588'];
const P={green:'#14816d',orange:'#cf6838',blue:'#537ca2',ink:'#173e39',muted:'#6b7e77',grid:'#e4e9df'};
const cname=c=>D.countries[c]||c, ename=e=>D.exporters[e]||e,bname=b=>D.buyers[b]||b;
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=(n,d=0)=>Number.isFinite(n)?n.toLocaleString('ko-KR',{minimumFractionDigits:d,maximumFractionDigits:d}):'—';
const money=n=>!Number.isFinite(n)?'—':Math.abs(n)>=1e8?fmt(n/1e8,2)+'억원':fmt(n/1e4,n%1e4===0?0:1)+'만원';
const sum=(r,k)=>r.reduce((z,v)=>z+(Number(v[k])||0),0);
const aggregate=(rows,key)=>{const map=new Map;for(const r of rows){const k=typeof key==='function'?key(r):r[key];if(!map.has(k))map.set(k,[]);map.get(k).push(r);}return map;};
const weighted=(r,kind='k')=>r.length&&sum(r,'q')>0?sum(r,kind)/sum(r,'q'):null;
const clean=D.trades.filter(r=>!r.o), commercial=clean.filter(r=>r.q>=10000);
const months=D.months;
const monthly=months.map(m=>({m,rows:clean.filter(r=>r.m===m),customs:D.customs.filter(r=>r.m===m)})).map(o=>({...o,p:weighted(o.rows),q:sum(o.customs,'q')}));
const originMonthly=new Map();
for(const c of Object.keys(D.countries))originMonthly.set(c,months.map(m=>{const rr=clean.filter(r=>r.m===m&&r.c===c);return {m,p:weighted(rr),n:rr.length,q:sum(D.customs.filter(r=>r.m===m&&r.c===c),'q')};}));
const state={volume:'monthly',mixCountry:null,flowNode:null,simMode:'direct',active:0,meeting:false};
function svgel(tag,attrs={},text){const n=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))if(v!==undefined&&v!==null)n.setAttribute(k,String(v));if(text!==undefined)n.textContent=text;return n;}
function add(parent,tag,attrs,text){const n=svgel(tag,attrs,text);parent.appendChild(n);return n;}
function svgAt(id,height,title){const box=$(id);box.innerHTML='';const width=Math.max(300,box.clientWidth||800);const s=svgel('svg',{viewBox:`0 0 ${width} ${height}`,role:'img','aria-label':title});add(s,'title',{},title);box.appendChild(s);return {s,w:width,h:height};}
function niceMax(v){if(!(v>0))return 1;const b=10**Math.floor(Math.log10(v));return Math.ceil(v/b*2)/2*b;}
function frame(o,max,keys,{left=54,right=18,top=28,bottom=36,ticks=4,ylabel='',xTick=8,min=0}={}){const{s,w,h}=o;const x0=left,x1=w-right,y0=top,y1=h-bottom;const y=v=>y1-((v-min)/(max-min))*(y1-y0),x=i=>x0+(keys.length>1?i/(keys.length-1):.5)*(x1-x0);for(let k=0;k<=ticks;k++){const v=min+(max-min)*k/ticks;add(s,'line',{x1:x0,x2:x1,y1:y(v),y2:y(v),stroke:P.grid,'stroke-dasharray':k?'3 4':''});add(s,'text',{x:x0-9,y:y(v)+4,'text-anchor':'end'},fmt(v,max<=5?1:0));}if(ylabel)add(s,'text',{x:x0,y:13,class:'axis-label'},ylabel);const n=Math.max(2,Math.min(xTick,Math.floor((w-left-right)/65)));const ix=[...new Set(Array.from({length:n},(_,i)=>Math.round(i*(keys.length-1)/(n-1))))];for(const i of ix)add(s,'text',{x:x(i),y:h-11,'text-anchor':i===0?'start':i===keys.length-1?'end':'middle'},String(keys[i]||'').replace(/^20/,'').replace('-','.'));return{x,y,x0,x1,y0,y1,max};}
function linePath(values,x,y){let out='',live=false;values.forEach((v,i)=>{if(v===null||v===undefined||!Number.isFinite(v)){live=false;return;}out+=(live?'L':'M')+x(i).toFixed(2)+','+y(v).toFixed(2);live=true;});return out;}
function polyArea(a,b,x,y){return 'M'+a.map((v,i)=>x(i)+','+y(v)).join('L')+'L'+b.map((v,i)=>x(i)+','+y(v)).reverse().join('L')+'Z';}
function tooltip(event,content){const t=$('tooltip');t.innerHTML=content;t.style.opacity=1;const rect=t.getBoundingClientRect();t.style.left=Math.max(8,Math.min(innerWidth-rect.width-10,event.clientX+15))+'px';t.style.top=Math.max(8,Math.min(innerHeight-rect.height-10,event.clientY+15))+'px';}
function hideTip(){$('tooltip').style.opacity=0;}
function hoverChart(o,f,rows,describe){const g=add(o.s,'g',{'pointer-events':'none',opacity:0});const line=add(g,'line',{y1:f.y0,y2:f.y1,stroke:P.ink,'stroke-dasharray':'3 3',opacity:.5});const hit=add(o.s,'rect',{x:f.x0,y:f.y0,width:f.x1-f.x0,height:f.y1-f.y0,fill:'transparent'});hit.addEventListener('pointermove',e=>{const b=o.s.getBoundingClientRect(),px=(e.clientX-b.left)/b.width*o.w;const i=Math.max(0,Math.min(rows.length-1,Math.round((px-f.x0)/(f.x1-f.x0)*Math.max(1,rows.length-1))));g.setAttribute('opacity',1);line.setAttribute('x1',f.x(i));line.setAttribute('x2',f.x(i));tooltip(e,describe(rows[i],i));});hit.addEventListener('pointerleave',()=>{g.setAttribute('opacity',0);hideTip();});}
function optionList(el,entries,selected){const prev=selected??el.value;el.innerHTML=entries.map(([v,l])=>`<option value="${esc(v)}">${esc(l)}</option>`).join('');if(entries.some(([v])=>v===prev))el.value=prev;}
function metricHTML(label,value,unit='',caption=''){return `<div class="metric"><div class="metric-label">${esc(label)}</div><div class="metric-value">${esc(value)}<span class="metric-unit">${esc(unit)}</span></div>${caption?`<div class="metric-caption">${esc(caption)}</div>`:''}</div>`;}

function drawVolume(){
 const annual=state.volume==='annual';const data=annual?[...aggregate(D.customs,r=>r.m.slice(0,4))].map(([m,r])=>({m,q:sum(r,'q')/1000})):monthly.map((r,i)=>({m:r.m,q:r.q/1000,avg:i>=11?monthly.slice(i-11,i+1).reduce((z,v)=>z+v.q,0)/12000:null}));
 const o=svgAt('volumeChart',330,'한국 족발용 원료 수입량'),max=niceMax(Math.max(...data.map(r=>r.q))*1.12),f=frame(o,max,data.map(r=>r.m),{ylabel:'톤',xTick:9});
 const step=(f.x1-f.x0)/Math.max(1,data.length-1),bw=Math.min(72,step*.66);
 data.forEach((r,i)=>{const is26=r.m.startsWith('2026');add(o.s,'rect',{x:f.x(i)-bw/2,y:f.y(r.q),width:bw,height:f.y1-f.y(r.q),fill:is26?P.green:'#c1d0bd',rx:2}).addEventListener('pointermove',e=>tooltip(e,`<strong>${r.m}${annual&&is26?' (1~9월)':''}</strong>수입량 ${fmt(r.q,1)}톤`));});
 if(!annual)add(o.s,'path',{d:linePath(data.map(r=>r.avg),f.x,f.y),fill:'none',stroke:P.ink,'stroke-width':2});
 if(annual)data.forEach((r,i)=>add(o.s,'text',{x:f.x(i),y:f.y(r.q)-10,'text-anchor':'middle',class:'strong'},fmt(r.q)));
 if(!annual){add(o.s,'line',{x1:f.x0+9,x2:f.x0+28,y1:13,y2:13,stroke:P.ink,'stroke-width':2});add(o.s,'text',{x:f.x0+34,y:17,class:'axis-label'},'12개월 월평균');}
 o.s.addEventListener('pointerleave',hideTip);hoverChart(o,f,data,r=>`<strong>${esc(r.m)}${annual&&r.m==='2026'?' · 1~9월 누계':''}</strong>수입량 ${fmt(r.q,1)}톤${r.avg?'<br>12개월 월평균 '+fmt(r.avg,1)+'톤':''}`);
}

function drawOrigins(){
 const year=$('originYear').value,all=D.customs.filter(r=>r.m.startsWith(year)&&r.m.slice(5)<='09'),total=sum(all,'q');
 const ranks=[...aggregate(all,'c')].map(([c,r])=>({c,q:sum(r,'q')})).sort((a,b)=>b.q-a.q);const visible=ranks.slice(0,9);visible.push({c:'other',q:ranks.slice(9).reduce((z,v)=>z+v.q,0)});
 $('rankTitle').textContent=`${year}년 1~9월 수입 비중`;
 const o=svgAt('rankChart',370,'원산지별 수입 비중'),left=62,right=53,xx=v=>left+v/Math.max(...visible.map(r=>r.q))*(o.w-left-right),bh=22;
 visible.forEach((r,i)=>{const y=20+i*34,label=r.c==='other'?'기타':cname(r.c),on=!state.mixCountry||state.mixCountry===r.c;add(o.s,'text',{x:left-9,y:y+15,'text-anchor':'end',class:'strong'},label);const mark=add(o.s,'rect',{x:left,y,width:xx(r.q)-left,height:bh,fill:colors[r.c]||P.green,opacity:on?1:.2,rx:3,tabindex:0,role:'button','aria-label':label+' 강조'});const toggle=()=>{state.mixCountry=state.mixCountry===r.c?null:r.c;drawOrigins();};mark.addEventListener('click',toggle);mark.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle();}});mark.addEventListener('pointermove',e=>tooltip(e,`<strong>${label}</strong>${fmt(r.q/1000,1)}톤 · ${fmt(r.q/total*100,1)}%`));add(o.s,'text',{x:xx(r.q)+7,y:y+15,class:'strong'},fmt(r.q/total*100,1)+'%');});o.s.addEventListener('pointerleave',hideTip);
 const keys=['DE','BE','PL','ES','SE','BR','AU','other'],data=monthly.filter(r=>r.m>='2024-01');const mix=svgAt('mixChart',370,'월별 원산지 수입 비중');const f=frame(mix,100,data.map(r=>r.m),{ylabel:'%',xTick:6});const stacks=data.map(r=>{const groups=aggregate(r.customs,'c'),v=keys.map(k=>k==='other'?r.customs.filter(v=>!keys.includes(v.c)).reduce((z,v)=>z+v.q,0):sum(groups.get(k)||[],'q'));let cum=0;return v.map(q=>{const a=cum;cum+=q/r.q*100;return[a,cum];});});
 keys.forEach((c,j)=>{const lower=stacks.map(r=>r[j][0]),upper=stacks.map(r=>r[j][1]);add(mix.s,'path',{d:polyArea(upper,lower,f.x,f.y),fill:colors[c],opacity:state.mixCountry&&state.mixCountry!==c?.13:.86});});
 hoverChart(mix,f,data,r=>{const rr=[...aggregate(r.customs,'c')].map(([c,v])=>({c,q:sum(v,'q')})).sort((a,b)=>b.q-a.q);return `<strong>${r.m}</strong>`+rr.slice(0,5).map(v=>`${cname(v.c)} ${fmt(v.q/r.q*100,1)}%`).join('<br>');});
 $('countryLegend').innerHTML=keys.map(c=>`<span><i class="swatch" style="background:${colors[c]}"></i>${c==='other'?'기타':cname(c)}</span>`).join('');
 if(year==='2026')$('originInsight').innerHTML='독일 <strong>14.1% → 34.6%</strong>, 벨기에 <strong>35.2% → 18.2%</strong>. 전년 동기 대비 공급의 중심이 이동했다. 상위 3개국 비중은 <strong>64.4%</strong>다.';
 else $('originInsight').innerHTML=`${year}년 1~9월 <strong>${cname(ranks[0].c)} ${fmt(ranks[0].q/total*100,1)}%</strong>. 상위 3개국이 전체 수입량의 <strong>${fmt(sum(ranks.slice(0,3),'q')/total*100,1)}%</strong>를 차지한다.`;
}

function drawNetwork(){
 const year=$('networkYear').value,country=$('networkCountry').value,rows=D.trades.filter(r=>r.m.startsWith(year)&&r.m.slice(5)<='09'&&(!country||r.c===country));
 const total=sum(rows,'q');$('networkNumbers').innerHTML=`<span><strong>${fmt(rows.length)}</strong>거래</span><span><strong>${new Set(rows.map(r=>r.c)).size}</strong>원산지</span><span><strong>${new Set(rows.map(r=>r.e)).size}</strong>해외 공급사</span><span><strong>${new Set(rows.map(r=>r.b)).size}</strong>한국 수입사</span><span><strong>${fmt(total/1000)}</strong>톤 · DB 거래 기준</span>`;
 const o=svgAt('sankeyChart',505,'원산지에서 해외 공급사와 한국 수입사로 이어지는 거래중량');
 if(!rows.length){$('sankeyChart').innerHTML='<div class="empty">해당 기간의 거래 연결이 없습니다.</div>';return;}
 function topSet(k,n){return new Set([...aggregate(rows,k)].map(([key,r])=>({key,q:sum(r,'q')})).sort((a,b)=>b.q-a.q).slice(0,n).map(v=>v.key));}
 const top=[topSet('c',6),topSet('e',7),topSet('b',7)],keys=['c','e','b'],nodes=[[],[],[]],nodeMap=new Map(),links=[];
 for(let col=0;col<3;col++){const mm=aggregate(rows,r=>top[col].has(r[keys[col]])?r[keys[col]]:'other');nodes[col]=[...mm].map(([key,rr])=>({id:`${col}:${key}`,col,key,q:sum(rr,'q'),label:key==='other'?'기타':col===0?cname(key):col===1?ename(key):bname(key)})).sort((a,b)=>b.q-a.q);}
 const scale=Math.min(...nodes.map(n=>(420-(n.length-1)*16)/total)),nodeWidth=10,columns=[18,o.w*.46,o.w-22];
 nodes.forEach((nn,col)=>{let yy=48+(420-(nn.reduce((z,v)=>z+v.q*scale,0)+(nn.length-1)*16))/2;for(const n of nn){n.x=columns[col];n.y=yy;n.h=n.q*scale;n.out=0;n.in=0;nodeMap.set(n.id,n);yy+=n.h+16;}});
 for(let stage=0;stage<2;stage++){const mm=aggregate(rows,r=>[top[stage].has(r[keys[stage]])?r[keys[stage]]:'other',top[stage+1].has(r[keys[stage+1]])?r[keys[stage+1]]:'other'].join('\u0001'));for(const [key,rr]of mm){const[from,to]=key.split('\u0001');links.push({source:nodeMap.get(`${stage}:${from}`),target:nodeMap.get(`${stage+1}:${to}`),q:sum(rr,'q')});}}
 links.sort((a,b)=>a.source.y-b.source.y||a.target.y-b.target.y);
 const linkEls=[];
 for(const l of links){const a=l.source,b=l.target,th=l.q*scale,ya=a.y+a.out+th/2,yb=b.y+b.in+th/2;a.out+=th;b.in+=th;const x1=a.x+nodeWidth,x2=b.x,curve=(x2-x1)*.5,color=a.col===0?(colors[a.key]||P.green):palette[nodes[1].indexOf(a)%palette.length];const path=add(o.s,'path',{d:`M${x1},${ya}C${x1+curve},${ya} ${x2-curve},${yb} ${x2},${yb}`,fill:'none',stroke:color,'stroke-width':Math.max(.2,th),opacity:.22,class:'flow-link'});path.addEventListener('pointermove',e=>tooltip(e,`<strong>${esc(a.label)} → ${esc(b.label)}</strong>${fmt(l.q/1000,1)}톤`));path.addEventListener('pointerleave',hideTip);path.addEventListener('click',()=>{state.flowNode=a.id;applyHighlight();$('flowDetail').textContent=`${a.label} → ${b.label} · ${fmt(l.q/1000,1)}톤`;});linkEls.push({l,path});}
 const headings=['원산지','해외 공급사','한국 수입사'];headings.forEach((t,i)=>add(o.s,'text',{x:i===2?columns[i]+10:columns[i],y:20,'text-anchor':i===2?'end':'start',class:'strong'},t));
 const nodeEls=[];
 nodes.flat().forEach(n=>{const g=add(o.s,'g',{class:'flow-node',tabindex:0,role:'button','aria-label':n.label+' 연결 강조'});add(g,'rect',{x:n.x,y:n.y,width:nodeWidth,height:Math.max(.7,n.h),fill:n.col===0?(colors[n.key]||P.green):n.col===1?P.green:'#6d8f7d',rx:2});const right=n.col===2,label=n.label.length>25?n.label.slice(0,23)+'…':n.label;add(g,'text',{x:right?n.x-9:n.x+19,y:n.y+n.h/2+4,'text-anchor':right?'end':'start'},label);const choose=()=>{state.flowNode=state.flowNode===n.id?null:n.id;applyHighlight();$('flowDetail').textContent=state.flowNode?`${n.label} · 연결 거래 ${fmt(n.q/1000,1)}톤`:'전체 연결을 표시합니다.';};g.addEventListener('click',choose);g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();choose();}});g.addEventListener('pointermove',e=>tooltip(e,`<strong>${esc(n.label)}</strong>DB 확인 거래 ${fmt(n.q/1000,1)}톤`));g.addEventListener('pointerleave',hideTip);nodeEls.push({n,g});});
 function applyHighlight(){const id=state.flowNode;const connected=new Set(id?[id]:[]);if(id)for(const {l}of linkEls)if(l.source.id===id||l.target.id===id){connected.add(l.source.id);connected.add(l.target.id);}for(const {l,path}of linkEls)path.setAttribute('opacity',!id?.22:l.source.id===id||l.target.id===id?.68:.035);for(const{n,g}of nodeEls)g.setAttribute('opacity',!id||connected.has(n.id)?1:.18);}
 applyHighlight();
}

function drawPrices(){
 const range=$('priceRange').value,from=range==='recent'?'2025-01':range==='2026'?'2026-01':'2021-01',cs=['DE','BE','PL','ES','SE','AT'];
 $('priceFacets').innerHTML=cs.map(c=>{const rr=originMonthly.get(c).filter(r=>r.m>=from),last=rr.filter(r=>r.p!==null).at(-1);return `<article class="facet"><div class="facet-head"><span class="facet-name">${cname(c)}</span><span class="facet-value">${fmt(last?.p)}<small>원/kg</small></span></div><div class="chart" id="facet-${c}"></div></article>`;}).join('');
 const max=niceMax(Math.max(...cs.flatMap(c=>originMonthly.get(c).filter(r=>r.m>=from&&r.p!==null).map(r=>r.p)))*1.13),maxQ=Math.max(...cs.flatMap(c=>originMonthly.get(c).filter(r=>r.m>=from).map(r=>r.q)));
 for(const c of cs){const data=originMonthly.get(c).filter(r=>r.m>=from),o=svgAt(`facet-${c}`,190,`${cname(c)} 월별 가격과 수입량 배경`),f=frame(o,max,data.map(r=>r.m),{left:45,right:10,top:20,bottom:30,ticks:3,ylabel:'원/kg',xTick:4});let seg=[];function band(){if(!seg.length)return;const up=seg.map(i=>`${f.x(i)},${Math.max(f.y0,f.y(data[i].p)-12*Math.sqrt(data[i].q/maxQ))}`),down=[...seg].reverse().map(i=>`${f.x(i)},${Math.min(f.y1,f.y(data[i].p)+12*Math.sqrt(data[i].q/maxQ))}`);add(o.s,'path',{d:'M'+up.join('L')+'L'+down.join('L')+'Z',fill:colors[c],opacity:.22});seg=[];}data.forEach((r,i)=>{if(r.p===null)band();else seg.push(i);});band();add(o.s,'path',{d:linePath(data.map(r=>r.p),f.x,f.y),stroke:colors[c],fill:'none','stroke-width':2});hoverChart(o,f,data,r=>`<strong>${cname(c)} · ${r.m}</strong>${r.p===null?'거래가격 미확인':fmt(r.p,1)+'원/kg · DB '+r.n+'건'}<br>관세청 수입량 ${fmt(r.q/1000,1)}톤`);}
}

function buyerGroups(rows,minN=1){return [...aggregate(rows,'b')].map(([b,r])=>({b,rows:r,n:r.length,q:sum(r,'q'),p:weighted(r),usd:weighted(r,'u')})).filter(g=>g.n>=minN&&(minN===1||g.q>=20000)).sort((a,b)=>a.p-b.p);}
function spreadExporters(){
 const c=$('spreadCountry').value,m=$('spreadMonth').value,rr=commercial.filter(r=>r.c===c&&r.m===m);const es=[...aggregate(rr,'e')].map(([e,r])=>({e,n:buyerGroups(r,2).length})).sort((a,b)=>b.n-a.n);
 optionList($('spreadExporter'),es.map(v=>[v.e,ename(v.e)]));drawSpread();
}
function drawSpread(){
 const c=$('spreadCountry').value,m=$('spreadMonth').value,e=$('spreadExporter').value,rows=commercial.filter(r=>r.c===c&&r.m===m&&r.e===e),gg=buyerGroups(rows,2);
 if(!gg.length){$('spreadMetrics').innerHTML=metricHTML('원산지',cname(c))+metricHTML('기준월',m)+metricHTML('비교 수입사','0','개');$('spreadChart').innerHTML='<div class="empty">선택 조건에서 2건·20톤 이상의 수입사 거래가 확인되지 않습니다.</div>';$('spreadTable').innerHTML='';$('spreadInsight').textContent='기간과 공급사를 선택하면 확인된 거래가격이 표시됩니다.';return;}
 const low=gg[0].p,high=gg.at(-1).p,gap=high-low;
 $('spreadMetrics').innerHTML=metricHTML('확인된 최저 단가',fmt(low),'원/kg',bname(gg[0].b))+metricHTML('확인된 최고 단가',fmt(high),'원/kg',bname(gg.at(-1).b))+metricHTML('공급망 안의 단가 격차',fmt(gap),'원/kg',gg.length+'개 수입사 비교');
 const o=svgAt('spreadChart',Math.max(180,gg.length*47+55),'동일 공급사 내 수입사별 원화 환산 단가');const left=Math.min(170,o.w*.29),right=73,min=Math.max(0,Math.floor(low*.85/100)*100),max=niceMax(high*1.07),x=v=>left+(v-min)/(max-min)*(o.w-left-right);
 for(let i=0;i<4;i++){const v=min+(max-min)*i/3;add(o.s,'line',{x1:x(v),x2:x(v),y1:20,y2:o.h-32,stroke:P.grid,'stroke-dasharray':'3 4'});add(o.s,'text',{x:x(v),y:o.h-10,'text-anchor':'middle'},fmt(v));}
 gg.forEach((g,i)=>{const yy=35+i*47;add(o.s,'text',{x:left-14,y:yy+4,'text-anchor':'end',class:'strong'},bname(g.b).length>14?bname(g.b).slice(0,13)+'…':bname(g.b));add(o.s,'line',{x1:x(low),x2:x(g.p),y1:yy,y2:yy,stroke:'#bad3c5','stroke-width':4});const p=add(o.s,'circle',{cx:x(g.p),cy:yy,r:6,fill:i===0?P.green:i===gg.length-1?P.orange:P.blue});add(o.s,'text',{x:x(g.p)+12,y:yy+4,class:'strong'},fmt(g.p));p.addEventListener('pointermove',ev=>tooltip(ev,`<strong>${esc(bname(g.b))}</strong>${fmt(g.p,1)}원/kg<br>${g.n}건 · ${fmt(g.q/1000,1)}톤`));p.addEventListener('pointerleave',hideTip);});
 $('spreadTable').innerHTML=gg.map(g=>`<tr><td>${esc(bname(g.b))}</td><td class="numeric">${g.n}</td><td class="numeric">${fmt(g.q/1000,1)}</td><td class="numeric">${fmt(g.usd,3)}</td><td class="numeric"><strong>${fmt(g.p,1)}</strong></td><td class="numeric">${g.p===low?'—':'+'+fmt(g.p-low,1)+'원'}</td></tr>`).join('');
 $('spreadInsight').innerHTML=`${cname(c)} · ${esc(ename(e))} · ${m}. <strong>${fmt(low)}~${fmt(high)}원/kg</strong>에 거래됐다. 관측 격차는 <strong>${fmt(gap)}원/kg</strong>이다.`;
}

function contextChart(id,start,end,color){
 const o=svgAt(id,300,'전체 시세에서 선택 구간을 강조한 가격과 수입량'),max=niceMax(Math.max(...monthly.map(r=>r.p||0))*1.12),f=frame(o,max,months,{bottom:89,ylabel:'원/kg',xTick:6});
 const si=months.indexOf(start),ei=months.indexOf(end),x1=f.x(si),x2=f.x(ei),bw=(f.x1-f.x0)/(months.length-1)*.7;
 add(o.s,'path',{d:linePath(monthly.map(r=>r.p),f.x,f.y),fill:'none',stroke:'#bfc9bc','stroke-width':1.5});
 if(si>0)add(o.s,'rect',{x:f.x0,y:f.y0,width:Math.max(0,x1-f.x0),height:f.y1-f.y0,fill:'#f0f2ee',opacity:.56});if(ei<months.length-1)add(o.s,'rect',{x:x2,y:f.y0,width:f.x1-x2,height:f.y1-f.y0,fill:'#f0f2ee',opacity:.56});
 add(o.s,'rect',{x:x1-3,y:f.y0,width:x2-x1+6,height:f.y1-f.y0,fill:color,opacity:.04});
 const vals=monthly.map((r,i)=>i>=si&&i<=ei?r.p:null);add(o.s,'path',{d:linePath(vals,f.x,f.y),fill:'none',stroke:color,'stroke-width':3});
 [si,ei].forEach((i,j)=>{add(o.s,'circle',{cx:f.x(i),cy:f.y(monthly[i].p),r:4,fill:color});add(o.s,'text',{x:f.x(i)+(j? -7:7),y:f.y(monthly[i].p)-12,'text-anchor':j?'end':'start',class:'strong'},fmt(monthly[i].p));});
 const qmax=Math.max(...monthly.map(r=>r.q)),base=o.h-27;
 monthly.forEach((r,i)=>add(o.s,'rect',{x:f.x(i)-bw/2,y:base-r.q/qmax*39,width:bw,height:r.q/qmax*39,fill:i>=si&&i<=ei?color:'#dfe4db',opacity:i>=si&&i<=ei?.6:.5}));
 add(o.s,'text',{x:f.x0,y:base-44,class:'axis-label'},'수입량 · 톤');
 hoverChart(o,f,monthly,r=>`<strong>${r.m}</strong>DB 단가 ${fmt(r.p,1)}원/kg<br>관세청 수입량 ${fmt(r.q/1000,1)}톤`);
}
function indexChart(id,rows,second,color,fillGap){
 const o=svgAt(id,230,'실측 수입원가 지수와 납품가격 반영 예시'),prices=rows.map(r=>r.p/rows[0].p*100),max=Math.ceil(Math.max(...prices,...second)/20)*20,min=Math.max(0,Math.floor(Math.min(...prices,...second)/20)*20-20),f=frame(o,max,rows.map(r=>r.m),{ylabel:rows[0].m.replace('-','.')+'=100',ticks:4,xTick:5,min});
 if(fillGap)add(o.s,'path',{d:polyArea(second,prices,f.x,f.y),fill:color,opacity:.12});
 add(o.s,'path',{d:linePath(prices,f.x,f.y),stroke:color,fill:'none','stroke-width':2.5});add(o.s,'path',{d:linePath(second,f.x,f.y),stroke:P.blue,fill:'none','stroke-width':2,'stroke-dasharray':'5 4'});
 prices.forEach((p,i)=>add(o.s,'circle',{cx:f.x(i),cy:f.y(p),r:2.6,fill:color}));
 hoverChart(o,f,rows,(r,i)=>`<strong>${r.m}</strong>실측 원가 지수 ${fmt(prices[i],1)}<br>납품가 예시 ${fmt(second[i],1)}<br>실측 수입단가 ${fmt(r.p,1)}원/kg`);
}
function drawPhases(){
 contextChart('riseContext','2024-01','2024-07',P.orange);contextChart('fallContext','2026-01','2026-09',P.green);
 const rise=monthly.filter(r=>r.m>='2024-01'&&r.m<='2024-07'),lag=Number($('riseLag').value),rp=rise.map(r=>r.p/rise[0].p*100),rsecond=rise.map((r,i)=>rp[Math.max(0,i-lag)]);indexChart('riseLagChart',rise,rsecond,P.orange,true);
 const fall=monthly.filter(r=>r.m>='2026-01'),pass=Number($('fallPass').value)/100,fp=fall.map(r=>100+(r.p/fall[0].p*100-100)*pass);$('fallPassText').textContent=fmt(pass*100)+'%';indexChart('fallGapChart',fall,fp,P.green,true);
}

function dashExporters(){const c=$('dashCountry').value,rr=commercial.filter(r=>r.c===c&&r.m>='2025-01'),entries=[...aggregate(rr,'e')].sort((a,b)=>sum(b[1],'q')-sum(a[1],'q'));optionList($('dashExporter'),entries.map(([e])=>[e,ename(e)]));dashBuyers();}
function dashBuyers(){const c=$('dashCountry').value,e=$('dashExporter').value,rr=commercial.filter(r=>r.c===c&&r.e===e),entries=[...aggregate(rr,'b')].sort((a,b)=>sum(b[1],'q')-sum(a[1],'q'));optionList($('dashBuyer'),entries.map(([b])=>[b,bname(b)]));drawDashboard();}
function drawDashboard(){
 const c=$('dashCountry').value,e=$('dashExporter').value,b=$('dashBuyer').value,m=$('dashMonth').value;
 const rr=commercial.filter(r=>r.c===c&&r.e===e&&r.b===b),selected=rr.filter(r=>r.m===m),p=weighted(selected),peers=buyerGroups(commercial.filter(r=>r.c===c&&r.e===e&&r.m===m),2),low=peers.length?peers[0].p:null;
 $('dashMetrics').innerHTML=metricHTML('선택한 수입사 단가',fmt(p),'원/kg',selected.length+'건 · '+fmt(sum(selected,'q')/1000,1)+'톤')+metricHTML('동일 공급사 비교 최저',fmt(low),'원/kg',peers.length?bname(peers[0].b):'2건·20톤 이상 비교 거래 없음')+metricHTML('확인된 비교 간격',p!==null&&low!==null?fmt(p-low):'—','원/kg','선택 수입사와 비교 최저 단가의 차이');
 const idx=months.indexOf(m),ms=months.slice(Math.max(0,idx-23),idx+1),rows=ms.map(mm=>{const rr2=rr.filter(r=>r.m===mm);return{m:mm,p:weighted(rr2),n:rr2.length,q:sum(rr2,'q')};});
 const o=svgAt('dashChart',285,'선택 수입사의 월별 가격'),valid=rows.filter(r=>r.p!==null);
 if(!valid.length){$('dashChart').innerHTML='<div class="empty">선택한 기간의 거래가 없습니다.</div>';drawDashSaving();return;}
 const f=frame(o,niceMax(Math.max(...valid.map(r=>r.p))*1.12),ms,{ylabel:'원/kg',xTick:6});add(o.s,'path',{d:linePath(rows.map(r=>r.p),f.x,f.y),stroke:P.green,'stroke-width':2.5,fill:'none'});rows.forEach((r,i)=>{if(r.p!==null)add(o.s,'circle',{cx:f.x(i),cy:f.y(r.p),r:3.6,fill:P.green});});hoverChart(o,f,rows,r=>`<strong>${r.m} · ${esc(bname(b))}</strong>${r.p===null?'거래 미확인':fmt(r.p,1)+'원/kg<br>'+r.n+'건 · '+fmt(r.q/1000,1)+'톤'}`);drawDashSaving();
}
function nonneg(id){const value=Number($(id).value);return Number.isFinite(value)?Math.max(0,value):0;}
function drawDashSaving(){$('dashSaving').textContent=money(nonneg('dashTons')*1000*nonneg('dashCut'));}
function drawImpact(){
 const tons=nonneg('simTons'),share=nonneg('simShare')/100,pass=nonneg('simPass')/100,extra=nonneg('simExtra'),cut=state.simMode==='linked'?1060.7857233683112*pass:nonneg('simCut'),net=cut-extra,kg=tons*1000*share,monthlySaving=kg*net;
 $('simShareText').textContent=fmt(share*100)+'%';$('simPassText').textContent=fmt(pass*100)+'%';$('directInput').hidden=state.simMode!=='direct';$('linkedInput').hidden=state.simMode!=='linked';
 const display=monthlySaving/10000;$('simMonthly').innerHTML=fmt(display,display%1===0?0:1)+'<small>만원</small>';$('simAnnual').textContent=money(monthlySaving*12);$('simLost').textContent=money(monthlySaving*nonneg('simDelay'));$('simFormula').textContent=`${fmt(kg)}kg × 순인하 ${fmt(net,net%1===0?0:1)}원/kg`;
 const prices=[100,200,300,500],vals=prices.map(p=>(p-extra)*kg/10000),o=svgAt('savingChart',210,'단가 인하폭에 따른 월 원가 영향'),max=niceMax(Math.max(...vals,1)*1.18),min=Math.min(...vals)<0?-niceMax(-Math.min(...vals)*1.18):0,f=frame(o,max,prices.map(p=>p+'원'),{ylabel:'만원 / 월',left:60,xTick:4,min});
 const bw=Math.min(55,(f.x1-f.x0)/7),x=i=>f.x0+(i+.5)*(f.x1-f.x0)/4;
 prices.forEach((p,i)=>{add(o.s,'rect',{x:x(i)-bw/2,y:Math.min(f.y(vals[i]),f.y(0)),width:bw,height:Math.abs(f.y(0)-f.y(vals[i])),fill:vals[i]<0?P.orange:p===100?P.green:'#a9c3ab',rx:3});add(o.s,'text',{x:x(i),y:f.y(vals[i])-9,'text-anchor':'middle',class:'strong'},fmt(vals[i],vals[i]%1===0?0:1));});
 // Replace the default categorical ticks with bar-centred labels.
 const bottomTexts=[...o.s.querySelectorAll('text')].filter(t=>Number(t.getAttribute('y'))===o.h-11);bottomTexts.forEach(n=>n.remove());prices.forEach((p,i)=>add(o.s,'text',{x:x(i),y:o.h-11,'text-anchor':'middle'},p+'원/kg'));
 $('menuSmall').textContent=fmt(net*.410,1)+'원';$('menuMedium').textContent=fmt(net*.560,1)+'원';$('menuLarge').textContent=fmt(net*.680,1)+'원';
}

const sections=[...document.querySelectorAll('.scene')],navLinks=[...document.querySelectorAll('.nav a')];
function activate(index,scroll=true){state.active=Math.max(0,Math.min(sections.length-1,index));navLinks.forEach((n,i)=>n.classList.toggle('active',i===state.active));sections.forEach((n,i)=>n.classList.toggle('selected',i===state.active));$('progress').style.width=(state.active+1)/sections.length*100+'%';if(scroll){if(state.meeting)window.scrollTo({top:0,behavior:'smooth'});else sections[state.active].scrollIntoView({behavior:'smooth',block:'start'});}hideTip();if(state.meeting)requestAnimationFrame(renderAll);}
function toast(msg){$('toast').textContent=msg;$('toast').classList.add('show');setTimeout(()=>$('toast').classList.remove('show'),2200);}
function meetingToggle(force){state.meeting=typeof force==='boolean'?force:!state.meeting;document.body.classList.toggle('meeting',state.meeting);$('meetingButton').textContent=state.meeting?'전체 보기':'미팅 모드';$('meetingButton').setAttribute('aria-pressed',state.meeting);activate(state.active);toast(state.meeting?'← → 키로 챕터 이동 · Esc 전체 보기':'전체 챕터 보기');}
function bindSegment(id,fn){$(id).addEventListener('click',e=>{const b=e.target.closest('button[data-value]');if(!b)return;$(id).querySelectorAll('button').forEach(n=>{n.classList.toggle('on',n===b);n.setAttribute('aria-pressed',n===b);});fn(b.dataset.value);});}
function renderAll(){drawVolume();drawOrigins();drawNetwork();drawPrices();drawSpread();drawPhases();drawDashboard();drawImpact();}
function init(){
 const cs=['AT','DE','BE','PL','ES','SE','BR','AU','FI','US','NL','DK','IE','GB','CA','CL'];const entries=cs.map(c=>[c,cname(c)]);
 optionList($('networkCountry'),[['','전체 원산지'],...entries],'');optionList($('spreadCountry'),entries,'AT');optionList($('dashCountry'),entries,'AT');const ms=[...months].reverse().map(m=>[m,m.replace('-','.')]);optionList($('spreadMonth'),ms,'2026-09');optionList($('dashMonth'),ms,'2026-09');
 optionList($('spreadExporter'),[['STEIRERFLEISCHGESELLSCHAFTMBH',ename('STEIRERFLEISCHGESELLSCHAFTMBH')]]);optionList($('dashExporter'),[['STEIRERFLEISCHGESELLSCHAFTMBH',ename('STEIRERFLEISCHGESELLSCHAFTMBH')]]);optionList($('dashBuyer'),[['솔미트','솔미트']]);spreadExporters();dashExporters();
 bindSegment('volumeMode',v=>{state.volume=v;drawVolume();});bindSegment('simMode',v=>{state.simMode=v;drawImpact();});
 $('originYear').addEventListener('change',()=>{state.mixCountry=null;drawOrigins();});['networkYear','networkCountry'].forEach(id=>$(id).addEventListener('change',()=>{state.flowNode=null;drawNetwork();}));$('resetFlow').addEventListener('click',()=>{state.flowNode=null;drawNetwork();$('flowDetail').textContent='전체 연결을 표시합니다.';});
 $('priceRange').addEventListener('change',drawPrices);['spreadCountry','spreadMonth'].forEach(id=>$(id).addEventListener('change',spreadExporters));$('spreadExporter').addEventListener('change',drawSpread);$('riseLag').addEventListener('change',drawPhases);$('fallPass').addEventListener('input',drawPhases);
 $('dashCountry').addEventListener('change',dashExporters);$('dashExporter').addEventListener('change',dashBuyers);['dashBuyer','dashMonth'].forEach(id=>$(id).addEventListener('change',drawDashboard));['dashTons','dashCut'].forEach(id=>$(id).addEventListener('input',drawDashSaving));
 ['simTons','simShare','simCut','simPass','simExtra','simDelay'].forEach(id=>$(id).addEventListener('input',drawImpact));
 $('goImpact').addEventListener('click',()=>{$('simTons').value=nonneg('dashTons');$('simCut').value=nonneg('dashCut');state.simMode='direct';$('simMode').querySelectorAll('button').forEach(n=>n.classList.toggle('on',n.dataset.value==='direct'));drawImpact();activate(8);});
 navLinks.forEach((n,i)=>n.addEventListener('click',e=>{e.preventDefault();activate(i);}));sections.forEach((s,i)=>{const b=document.createElement('div');b.className='chapter-bottom';b.innerHTML=`<span>${String(i+1).padStart(2,'0')} / 09 · Fran:D</span>${i<8?'<button type="button">다음 챕터 →</button>':'<button type="button">처음으로 ↑</button>'}`;s.appendChild(b);b.querySelector('button').addEventListener('click',()=>activate(i<8?i+1:0));});
 $('meetingButton').addEventListener('click',()=>meetingToggle());$('fullButton').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{toast('이 환경에서는 전체 화면이 지원되지 않습니다.');}});$('printButton').addEventListener('click',()=>{const was=state.meeting;if(was)meetingToggle(false);window.print();if(was)meetingToggle(true);});
 document.addEventListener('keydown',e=>{if(['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;if(e.key==='ArrowRight'||e.key==='PageDown'){e.preventDefault();activate(state.active+1);}if(e.key==='ArrowLeft'||e.key==='PageUp'){e.preventDefault();activate(state.active-1);}if(e.key==='Escape'&&state.meeting)meetingToggle(false);});
 const observer=new IntersectionObserver(entries=>{if(state.meeting)return;const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio);if(visible.length)activate(sections.indexOf(visible[0].target),false);},{rootMargin:'-15% 0px -45% 0px',threshold:[0,.1,.3,.5]});sections.forEach(s=>observer.observe(s));
 let rt;window.addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(renderAll,180);});renderAll();
}
init();
