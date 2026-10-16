const customers = [
  {name:'Alpha Telecom',segment:'Enterprise',revenue:184500,cost:118080,margin:36},
  {name:'Beta Sistemas',segment:'Enterprise',revenue:156200,cost:112464,margin:28},
  {name:'Gamma Digital',segment:'Mid-Market',revenue:98200,cost:63830,margin:35},
  {name:'Delta Saúde',segment:'Mid-Market',revenue:87500,cost:66500,margin:24},
  {name:'Epsilon Serviços',segment:'SMB',revenue:64200,cost:41730,margin:35},
  {name:'Zeta Comércio',segment:'SMB',revenue:52300,cost:44455,margin:15},
  {name:'Ômega Tech',segment:'Enterprise',revenue:121800,cost:82824,margin:32},
  {name:'Nova Corp',segment:'Mid-Market',revenue:79300,cost:54717,margin:31}
];
const monthly=[['Mai',412000,136000],['Jun',438000,149000],['Jul',461000,157000],['Ago',489000,164000],['Set',521000,181000],['Out',customers.reduce((s,c)=>s+c.revenue,0),customers.reduce((s,c)=>s+c.revenue-c.cost,0)]];
const brl=n=>n.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0});
const marginClass=m=>m>=30?'good':m>=20?'warn':'bad';
const marginStatus=m=>m>=30?'Acima da meta':m>=20?'Atenção':'Crítico';
const customerSelect=document.querySelector('#customer');
customers.forEach(c=>{const o=document.createElement('option');o.value=c.name;o.textContent=c.name;customerSelect.appendChild(o)});
function filtered(){const p=document.querySelector('#period').value, s=document.querySelector('#segment').value, c=document.querySelector('#customer').value; let rows=customers.filter(x=>(s==='all'||x.segment===s)&&(c==='all'||x.name===c)); if(p==='2026-10') return rows; return rows.map(x=>({...x,revenue:x.revenue*.92,cost:x.cost*.91,margin:Math.round((1-(x.cost*.91)/(x.revenue*.92))*100)}));}
function render(){const rows=filtered();const revenue=rows.reduce((s,c)=>s+c.revenue,0),cost=rows.reduce((s,c)=>s+c.cost,0),profit=revenue-cost,margin=revenue?profit/revenue*100:0;
document.querySelector('#kpis').innerHTML=[['Receita total',brl(revenue),'vs. período anterior +8,4%'],['Custo total',brl(cost),'Operação +5,1%'],['Lucro bruto',brl(profit),'vs. período anterior +11,2%'],['Margem média',margin.toFixed(1)+'%','Meta corporativa: 30%']].map(([l,v,d])=>`<div class="panel kpi"><div class="label">${l}</div><div class="value">${v}</div><div class="delta">${d}</div></div>`).join('');
document.querySelector('#customerTable').innerHTML=rows.sort((a,b)=>(b.revenue-b.cost)-(a.revenue-a.cost)).map(c=>`<tr><td><strong>${c.name}</strong></td><td>${c.segment}</td><td>${brl(c.revenue)}</td><td>${brl(c.cost)}</td><td>${brl(c.revenue-c.cost)}</td><td><strong>${c.margin}%</strong></td><td><span class="pill ${marginClass(c.margin)}">${marginStatus(c.margin)}</span></td></tr>`).join('');
document.querySelector('#rowCount').textContent=`${rows.length} clientes`;
const max=Math.max(...monthly.map(x=>x[1]));document.querySelector('#monthlyChart').innerHTML=monthly.map(([m,r,p])=>`<div class="month"><div class="bars"><div class="bar revenue" style="height:${r/max*100}%" title="Receita ${brl(r)}"></div><div class="bar profit" style="height:${p/max*100}%" title="Lucro ${brl(p)}"></div></div><span class="month-label">${m}</span></div>`).join('')+`<div class="legend"><span><i style="background:#172033"></i>Receita</span><span><i style="background:#94a3b8"></i>Lucro bruto</span></div>`;
document.querySelector('#marginChart').innerHTML=rows.slice().sort((a,b)=>b.margin-a.margin).map(c=>`<div class="margin-row"><span>${c.name}</span><div class="track"><div class="fill ${marginClass(c.margin)}" style="width:${Math.min(c.margin,50)*2}%"></div></div><strong>${c.margin}%</strong></div>`).join('');}
['period','customer','segment'].forEach(id=>document.querySelector('#'+id).addEventListener('change',render));document.querySelector('#reset').addEventListener('click',()=>{document.querySelector('#period').value='all';document.querySelector('#customer').value='all';document.querySelector('#segment').value='all';render()});render();
