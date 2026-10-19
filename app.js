const DATA_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRjEbtdcLEi97EdNutQNLo8mgyRZUG7q_xUeAY2hbOBg-G9yAPq6sGJbyf_0fBBfRP7YP3T0zzfpSw2/pub?gid=1578702085&single=true&output=csv';
const TARGET_MARGIN = 30;

const brl=n=>Number(n||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0});
const num=v=>{const s=String(v??'').trim().replace(/R$\s?/g,'').replace(/\s/g,''); if(!s)return 0; const normalized=s.includes(',')?s.replace(/\./g,'').replace(',','.'):s; return Number(normalized.replace('%',''))||0};
const norm=s=>String(s??'').trim().toLocaleLowerCase('pt-BR');
const marginClass=m=>m>=TARGET_MARGIN?'good':m>=20?'warn':'bad';
const marginStatus=m=>m>=TARGET_MARGIN?'Acima da meta':m>=20?'Atenção':'Crítico';
let customers=[];

function parseCSV(text){
  const rows=[]; let row=[], cell='', quoted=false;
  for(let i=0;i<text.length;i++){
    const ch=text[i], next=text[i+1];
    if(ch==='"' && quoted && next==='"'){cell+='"'; i++; continue;}
    if(ch==='"'){quoted=!quoted; continue;}
    if(ch===',' && !quoted){row.push(cell); cell=''; continue;}
    if((ch==='\n'||ch==='\r') && !quoted){
      if(ch==='\r'&&next==='\n') i++;
      row.push(cell); cell=''; if(row.some(x=>x.trim()!=='')){rows.push(row)} row=[]; continue;
    }
    cell+=ch;
  }
  if(cell!==''||row.length){row.push(cell); if(row.some(x=>x.trim()!=='')) rows.push(row)}
  return rows;
}

function buildCustomers(rows){
  const headers=rows[0].map(x=>norm(x));
  const idx=name=>headers.indexOf(norm(name));
  const iCliente=idx('Cliente'), iOperadora=idx('Operadora'), iLinhas=idx('Número de Linhas'), iReceita=idx('Receita'), iCusto=idx('Custo');
  if(iCliente<0||iOperadora<0||iReceita<0||iCusto<0) throw new Error('Cabeçalhos da DASH_BASE não encontrados.');
  return rows.slice(1).map(r=>{
    const revenue=num(r[iReceita]), cost=num(r[iCusto]);
    const profit=revenue-cost;
    const margin=revenue?profit/revenue*100:0;
    return {name:String(r[iCliente]||'').trim(),operator:String(r[iOperadora]||'').trim(),lines:iLinhas>=0?num(r[iLinhas]):0,revenue,cost,profit,margin};
  }).filter(x=>x.name&&x.operator);
}

function aggregateByCustomer(rows){
  const map=new Map();
  rows.forEach(r=>{const key=r.name;if(!map.has(key))map.set(key,{name:key,revenue:0,cost:0,lines:0,operators:new Set()}); const x=map.get(key); x.revenue+=r.revenue; x.cost+=r.cost; x.lines+=r.lines; x.operators.add(r.operator)});
  return [...map.values()].map(x=>({...x,profit:x.revenue-x.cost,margin:x.revenue?(x.revenue-x.cost)/x.revenue*100:0,operator:[...x.operators].join(', ')}));
}

function aggregateByOperator(rows){
  const map=new Map();
  rows.forEach(r=>{if(!map.has(r.operator))map.set(r.operator,{operator:r.operator,revenue:0,cost:0,profit:0,lines:0}); const x=map.get(r.operator); x.revenue+=r.revenue; x.cost+=r.cost; x.profit+=r.profit; x.lines+=r.lines});
  return [...map.values()].map(x=>({...x,margin:x.revenue?x.profit/x.revenue*100:0})).sort((a,b)=>b.profit-a.profit);
}

function filtered(){const c=document.querySelector('#customer').value, o=document.querySelector('#operator').value; return customers.filter(x=>(c==='all'||x.name===c)&&(o==='all'||x.operator===o));}

function render(){
  const rows=filtered();
  const revenue=rows.reduce((s,c)=>s+c.revenue,0), cost=rows.reduce((s,c)=>s+c.cost,0), profit=revenue-cost, margin=revenue?profit/revenue*100:0;
  const customerRows=aggregateByCustomer(rows);
  const withRevenue=customerRows.filter(x=>x.revenue>0);
  const belowTarget=withRevenue.filter(x=>x.margin<TARGET_MARGIN).sort((a,b)=>a.margin-b.margin);
  const noRevenue=customerRows.filter(x=>x.revenue<=0).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));

  document.querySelector('#kpis').innerHTML=[
    ['Receita total',brl(revenue),`${withRevenue.length} clientes com receita`],
    ['Custo total',brl(cost),`${rows.reduce((s,x)=>s+x.lines,0).toLocaleString('pt-BR')} linhas`],
    ['Lucro bruto',brl(profit),profit>=0?'Resultado positivo':'Resultado negativo'],
    ['Margem consolidada',margin.toFixed(1)+'%',`Meta corporativa: ${TARGET_MARGIN}%`]
  ].map(([l,v,d])=>`<div class="panel kpi"><div class="label">${l}</div><div class="value">${v}</div><div class="delta">${d}</div></div>`).join('');

  document.querySelector('#customerTable').innerHTML=rows.slice().sort((a,b)=>b.profit-a.profit).map(c=>`<tr><td><strong>${c.name}</strong></td><td>${c.operator}</td><td>${c.lines.toLocaleString('pt-BR')}</td><td>${brl(c.revenue)}</td><td>${brl(c.cost)}</td><td>${brl(c.profit)}</td><td><strong>${c.revenue?c.margin.toFixed(1)+'%':'—'}</strong></td><td><span class="pill ${marginClass(c.margin)}">${c.revenue?marginStatus(c.margin):'Sem receita'}</span></td></tr>`).join('');
  document.querySelector('#rowCount').textContent=`${rows.length} combinações`;

  const topProfit=withRevenue.slice().sort((a,b)=>b.profit-a.profit).slice(0,10);
  const max=Math.max(...topProfit.map(x=>x.revenue),1);
  document.querySelector('#profitChart').innerHTML=topProfit.map(x=>`<div class="month"><div class="bars"><div class="bar revenue" style="height:${x.revenue/max*100}%" title="${x.name}: Receita ${brl(x.revenue)}"></div><div class="bar profit" style="height:${Math.max(0,x.profit)/max*100}%" title="Lucro ${brl(x.profit)}"></div></div><span class="month-label">${x.name.slice(0,12)}</span></div>`).join('')+`<div class="legend"><span><i class="legend-revenue"></i>Receita</span><span><i class="legend-profit"></i>Lucro bruto</span></div>`;

  document.querySelector('#marginChart').innerHTML=withRevenue.slice().sort((a,b)=>b.margin-a.margin).slice(0,10).map(c=>`<div class="margin-row"><span>${c.name}</span><div class="track"><div class="fill ${marginClass(c.margin)}" style="width:${Math.min(Math.max(c.margin,0),50)*2}%"></div></div><strong>${c.margin.toFixed(1)}%</strong></div>`).join('') || '<div class="empty">Nenhum cliente com receita no filtro atual.</div>';

  const alertItems=[...belowTarget.slice(0,8).map(c=>`<div class="alert-row"><span class="alert-dot ${marginClass(c.margin)}"></span><div><strong>${c.name}</strong><small>Margem ${c.margin.toFixed(1)}% • ${brl(c.profit)} de lucro</small></div></div>`),...noRevenue.slice(0,8).map(c=>`<div class="alert-row"><span class="alert-dot bad"></span><div><strong>${c.name}</strong><small>Sem receita cadastrada • custo ${brl(c.cost)}</small></div></div>`)];
  document.querySelector('#alerts').innerHTML=alertItems.length?alertItems.join(''):'<div class="empty">Nenhum ponto de atenção no filtro atual.</div>';
  document.querySelector('#alertCount').textContent=`${belowTarget.length+noRevenue.length} itens`;

  const operators=aggregateByOperator(rows);
  const maxOp=Math.max(...operators.map(x=>x.revenue),1);
  document.querySelector('#operatorSummary').innerHTML=operators.map(x=>`<div class="operator-row"><div class="operator-title"><strong>${x.operator}</strong><span>${x.margin.toFixed(1)}%</span></div><div class="operator-track"><div style="width:${x.revenue/maxOp*100}%"></div></div><div class="operator-meta"><span>Receita ${brl(x.revenue)}</span><span>Lucro ${brl(x.profit)}</span></div></div>`).join('') || '<div class="empty">Nenhuma operadora no filtro atual.</div>';
}

async function init(){
  try{
    const res=await fetch(DATA_URL,{cache:'no-store'}); if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const text=await res.text(); const rows=parseCSV(text); if(rows.length<2) throw new Error('A DASH_BASE publicada não contém dados.');
    customers=buildCustomers(rows);
    const customerSelect=document.querySelector('#customer');
    const operatorSelect=document.querySelector('#operator');
    [...new Set(customers.map(c=>c.name))].sort((a,b)=>a.localeCompare(b,'pt-BR')).forEach(name=>{const o=document.createElement('option');o.value=name;o.textContent=name;customerSelect.appendChild(o)});
    [...new Set(customers.map(c=>c.operator))].sort((a,b)=>a.localeCompare(b,'pt-BR')).forEach(name=>{const o=document.createElement('option');o.value=name;o.textContent=name;operatorSelect.appendChild(o)});
    ['customer','operator'].forEach(id=>document.querySelector('#'+id).addEventListener('change',render));
    document.querySelector('#reset').addEventListener('click',()=>{document.querySelector('#customer').value='all';document.querySelector('#operator').value='all';render()});
    render();
  }catch(err){document.querySelector('#kpis').innerHTML=`<div class="panel" style="grid-column:1/-1"><strong>Não foi possível carregar a DASH_BASE.</strong><p>${err.message}</p><small>Verifique se a aba DASH_BASE continua publicada como CSV no Google Sheets.</small></div>`;}
}
init();
