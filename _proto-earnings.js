/* 【原型】財報總覽橫卡列 — 樣式 + 資料 + render，一個檔搞定，三個方案共用。
   定案後：樣式併進 site.css，資料另議（可能維持手寫陣列）。
   GOOGL / META 為真實數字；其餘 6 家為示意數字（fake:1，卡片上會標記）。 */

document.head.insertAdjacentHTML('beforeend','<style>'+`
.erow{background:var(--surface2);border:1px solid var(--border);border-radius:12px;
  padding:14px 16px;margin-bottom:12px;cursor:pointer;transition:border-color .15s}
.erow:hover{border-color:var(--accent)}
.erow-top{display:grid;grid-template-columns:132px 1fr;gap:14px;align-items:start}

.tk{display:inline-block;text-decoration:none;
  font-size:18px;font-weight:800;color:var(--ink);letter-spacing:-.01em}
.tk:hover{color:var(--accent);text-decoration:none}
.erow-id .nmq{font-size:11.5px;color:var(--ink3);margin-top:2px}
.erow-id .upd{font-size:10.5px;color:var(--ink3);margin-top:6px;line-height:1.4}
.erow-id .upd b{color:var(--ink2);font-weight:600;font-variant-numeric:tabular-nums}
.erow-id .fake{display:inline-block;margin-top:6px;font-size:10px;padding:1px 6px;border-radius:99px;
  background:var(--midbg);border:1px solid var(--midbd);color:var(--ink3)}

.mgrid{display:grid;grid-template-columns:repeat(6,1fr);gap:11px}
.mcell{border-left:2px solid var(--border);padding-left:11px}
.mcell .mk{font-size:11px;color:var(--ink3);font-weight:600;letter-spacing:.02em}
.mcell .mv{font-size:18px;font-weight:800;color:var(--ink);margin:2px 0 1px;
  font-variant-numeric:tabular-nums;letter-spacing:-.01em}
.mcell .msub{font-size:11px;color:var(--ink3);line-height:1.45;margin-bottom:5px}
.mcell .dl{display:flex;flex-wrap:wrap;gap:3px 12px;font-size:11.5px;font-variant-numeric:tabular-nums}
.mcell .dl span{color:var(--ink3)}
.mcell .dl b{font-weight:700;margin-left:3px}
.pev{display:flex;align-items:baseline;gap:6px;margin:2px 0}
.pev span{font-size:10.5px;color:var(--ink3);min-width:42px}
.pev b{font-size:17px;font-weight:800;color:var(--ink);font-variant-numeric:tabular-nums;letter-spacing:-.01em}
.pev.dim b{font-size:15px;color:var(--ink2)}
.pev em{font-style:normal;font-size:10.5px;font-weight:700}

.erow-sum{font-size:13px;color:var(--ink2);line-height:1.6;margin-top:12px;
  border-top:1px dashed var(--border);padding-top:10px}
.erow-det{font-size:12.5px;color:var(--ink2);line-height:1.65;margin-top:10px;
  border-top:1px dashed var(--border);padding-top:10px}
.erow-det ul{margin:2px 0 0;padding-left:18px}
.erow-det li{margin:4px 0}
.erow-car{font-size:11.5px;font-weight:700;color:var(--accent);margin-top:9px}

/* 精簡模式（方案 C 的首頁常駐條）：只留 4 格數字，不展開 */
.erow.compact{padding:11px 14px;margin-bottom:8px;cursor:default}
.erow.compact:hover{border-color:var(--border)}
.erow.compact .erow-top{grid-template-columns:110px 1fr}
.erow.compact .mgrid{grid-template-columns:repeat(4,1fr)}
.erow.compact .mcell .mv,.erow.compact .pev b{font-size:15px}
.erow.compact .msub,.erow.compact .upd{display:none}

@media(max-width:1180px){.mgrid{grid-template-columns:repeat(3,1fr);gap:12px 11px}}
@media(max-width:860px){
  .erow-top{grid-template-columns:1fr;gap:12px}
  .mgrid{grid-template-columns:repeat(2,1fr)}
}
`+'</style>');

var EARN=[
{tk:'GOOGL',nm:'Alphabet',q:'2026 Q2',href:'posts/alphabet-2026q2-earnings.html',
 upd:'2026-08-03', rpt:'2026-07-23',
 m:[
  {k:'營收',v:'$119.80B',sub:'beat 預期 $116.51B',
   d:[['YoY','+24.2%','win'],['QoQ','+9.0%','win']]},
  {k:'營業利益率',v:'34%',sub:'Cloud 35.6% / Services 41.8%',
   d:[['YoY','+2pp','win'],['QoQ','−2pp','lose']]},
  {k:'核心 EPS',v:'$2.85',sub:'剔除 $99B 一次性股權利得後',
   d:[['vs 預期','−1%','lose'],['GAAP','$9.11','mid']]},
  {k:'自由現金流',v:'−$5.86B',sub:'近五季首度為負',
   d:[['YoY','自 +$5.30B','lose'],['QoQ','自 +$10.12B','lose']]},
  {k:'Capex',v:'$44.92B',sub:'FY26 指引上修至 $195–205B',
   d:[['YoY','+100.1%','lose'],['QoQ','+25.9%','lose']]},
  {k:'本益比',pe:{f:'26.34x',t:'17.89x',tw:'失真'},
   sub:'forward 貼近一年均值 27.81x;trailing 分母被一次性利得灌大',
   d:[['trailing 分位','3.2%','lose']]}
 ],
 one:'主引擎是 Google Cloud($24.77B、YoY +81.8%、佔比 14.1% → 20.7%),加速是真的。但 EPS $9.11 大 beat 全是 $99B 一次性股權利得撐的,核心 EPS 反而略低於預期;capex 連 3 季上修、FCF 首度轉負,現金牛首度同時發股又發債。',
 d:['$99.0B 認在 Other income,主要來自 Anthropic 約 14% 股權(估值 $380B → $965B)與 SpaceX 增值 —— 未實現,不是現金。',
    '對稱性:標的估值回吐時會產生對稱的一次性虧損,屆時同樣不該當成營運變差。',
    '核心 EPS 時序 $2.67 → $2.76 → $2.85,是溫和爬升,跟頭條暗示的爆發成長是兩回事。',
    '本季對外募資近 $70B(股權 $49.6B + 債券 $20.3B),長期負債自約 $46.5B 增至 $98.2B。財報次日 −6.9%。',
    'Google Network YoY −0.7%,是唯一萎縮的廣告子分部,市場討論中幾乎沒被定價。']},

{tk:'META',nm:'Meta',q:'2026 Q2',href:'posts/meta-2026q2-earnings.html',
 upd:'2026-08-03', rpt:'2026-07-29',
 m:[
  {k:'營收',v:'$60.80B',sub:'逼近 guidance 上緣 $58–61B',
   d:[['YoY','+27.9%','win'],['QoQ','+8.0%','win']]},
  {k:'營業利益率',v:'31%',sub:'剔一次性 36.8%;營業利益 $18.78B',
   d:[['YoY','−12pp','lose'],['QoQ','−9.6pp','lose']]},
  {k:'核心 EPS',v:'$6.18',sub:'無一次性調整,即 GAAP 值',
   d:[['vs 預期','−14.4%','lose'],['GAAP','$6.18 同','mid']]},
  {k:'自由現金流',v:'$1.746B',sub:'八季最低',
   d:[['YoY','−80.6%','lose'],['QoQ','−86.8%','lose']]},
  {k:'Capex',v:'$31.08B',sub:'FY26 指引 $130–145B(下緣 +$5B)',
   d:[['YoY','+82%','lose'],['QoQ','+57%','lose']]},
  {k:'本益比',pe:{f:'17.9x',t:'待補'},
   sub:'forward 為族群最低之一,但便宜是財報後被砸出來的',
   d:[['forward 分位','5.2%','win']]}
 ],
 one:'主引擎廣告營收 $59.36B、YoY +27%,本業還撐得住 —— 但成長的擔子正從量移到價(曝光 +19% → +14%、日活 +3%)。EPS 六季來首度 miss,更重要的是營運現金流 $31.86B 幾乎被 capex 吃光,FCF 只剩 $1.746B;回購歸零、長債 QoQ +42.4%。',
 d:['就算把一次性($2.4B 法律 + $1.18B 資遣)全部扣掉,營益率還原到 36.8%,仍比去年 43% 低 6.2pp —— 折舊與人力是結構性侵蝕,不是雜訊。',
    '營運現金流 YoY +24.7%,本業其實很健康;塌掉的是 capex 之後那一段。',
    '回購 $0、長期借款 $58.75B → $83.66B:財務順位已被改寫,錢全部讓給 capex。',
    'Reality Labs 單季虧損擴大到 −$4.62B,累計約 −$88B。',
    '便宜是「股價被砸出來的」,不是長期低估 —— 便宜的原因正是 capex / FCF 的疑慮,而疑慮下季才有答案。']}
];

/* 其餘 6 家:版面用的示意數字,不是真的（fake:1 → 卡片標「示意數字」）。 */
[['PLTR','Palantir','2026 Q2','palantir-2026q2-earnings','2026-08-05','2026-08-04'],
 ['ON','onsemi','2026 Q2','onsemi-2026q2-earnings','2026-08-05','2026-08-04'],
 ['AMZN','Amazon','2026 Q2','amazon-2026q2-earnings','2026-08-03','2026-07-30'],
 ['MSFT','Microsoft','FY26 Q4','microsoft-2026q2-earnings','2026-08-03','2026-07-29'],
 ['TSLA','Tesla','2026 Q2','tesla-2026q2-earnings','2026-08-03','2026-07-22'],
 ['ORCL','Oracle','FY26 Q4','oracle-fy2026q4-earnings','2026-08-03','2026-06-30']
].forEach(function(r,i){
  var s=[1,-1][i%2];
  EARN.push({tk:r[0],nm:r[1],q:r[2],href:'posts/'+r[3]+'.html',upd:r[4],rpt:r[5],fake:1,
   m:[
    {k:'營收',v:'$'+(12+i*7)+'.3'+i+'B',sub:'示意數字,非真實',
     d:[['YoY','+'+(9+i*3)+'.1%','win'],['QoQ','+'+(2+i)+'.4%','win']]},
    {k:'營業利益率',v:(18+i*4)+'%',sub:'示意數字,非真實',
     d:[['YoY',(s>0?'+':'−')+(1+i)+'pp',s>0?'win':'lose'],['QoQ','−0.'+(i+1)+'pp','lose']]},
    {k:'核心 EPS',v:'$'+(1+i)+'.'+(20+i*7),sub:'示意數字,非真實',
     d:[['vs 預期',(s>0?'+':'−')+(3+i)+'.2%',s>0?'win':'lose'],['GAAP','$'+(1+i)+'.'+(10+i*5),'mid']]},
    {k:'自由現金流',v:(s>0?'':'−')+'$'+(2+i)+'.'+(1+i)+'B',sub:'示意數字,非真實',
     d:[['YoY',(s>0?'+':'−')+(11+i*6)+'%',s>0?'win':'lose'],['QoQ','−'+(4+i)+'%','lose']]},
    {k:'Capex',v:'$'+(3+i*2)+'.'+(4+i)+'B',sub:'示意數字,非真實',
     d:[['YoY','+'+(30+i*11)+'%','lose'],['QoQ','+'+(6+i*3)+'%','lose']]},
    {k:'本益比',pe:{f:(14+i*6)+'.'+(1+i)+'x',t:(20+i*8)+'.'+(2+i)+'x'},
     sub:'示意數字,非真實',
     d:[['forward 分位',(20+i*9)+'%',s>0?'win':'mid']]}
   ],
   one:'（示意文字）這裡是一段兩三行的本季重點,講主引擎是什麼、頭條數字有沒有被一次性項目灌水、以及 capex / FCF 這條線目前的狀態,讓讀者不用進文章就抓得到本季結論。',
   d:['（示意）展開後的細節第一點。','（示意）展開後的細節第二點。','（示意）展開後的細節第三點。']});
});

/* 原型專用:四個版本之間的切換列（定案後整批刪掉，不會進正式站） */
function protoNav(cur){
  var P=[['_proto-a-index.html','A 首頁'],['_proto-overview.html','A 財報頁'],
         ['_proto-b-index.html','B 同頁切換'],['_proto-c-index.html','C 常駐條'],
         ['_proto-ac-index.html','A+C 混合']];
  document.head.insertAdjacentHTML('beforeend','<style>'+`
  .pnav{position:sticky;top:0;z-index:99;display:flex;gap:6px;align-items:center;flex-wrap:wrap;
    background:var(--surface);border-bottom:1px solid var(--border);padding:8px 14px;font-size:12px}
  .pnav .lbl{color:var(--ink3);font-weight:700;margin-right:4px}
  .pnav a{text-decoration:none;color:var(--ink2);border:1px solid var(--border);border-radius:99px;
    padding:3px 11px;background:var(--surface2)}
  .pnav a:hover{border-color:var(--accent);color:var(--accent);text-decoration:none}
  .pnav a.on{background:var(--accent);border-color:var(--accent);color:#fff}
  `+'</style>');
  document.body.insertAdjacentHTML('afterbegin','<div class="pnav"><span class="lbl">原型比較</span>'+
    P.map(function(p){return '<a class="'+(p[0]===cur?'on':'')+'" href="'+p[0]+'">'+p[1]+'</a>';}).join('')+
    '</div>');
}

function earnCell(m){
  var e=function(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');};
  var h='<div class="mcell"><div class="mk">'+e(m.k)+'</div>';
  if(m.pe){
    h+='<div class="pev"><span>forward</span><b>'+e(m.pe.f)+'</b></div>'+
       '<div class="pev dim"><span>trailing</span><b>'+e(m.pe.t)+'</b>'+
       (m.pe.tw?'<em class="lose">'+e(m.pe.tw)+'</em>':'')+'</div>';
  } else {
    h+='<div class="mv">'+e(m.v)+'</div>';
  }
  h+='<div class="msub">'+e(m.sub)+'</div><div class="dl">'+
     m.d.map(function(x){return '<span>'+e(x[0])+'<b class="'+x[2]+'">'+e(x[1])+'</b></span>';}).join('')+
     '</div></div>';
  return h;
}

/* el = 容器；opt = {limit:最多幾家, compact:精簡模式, base:路徑前綴} */
function drawEarnings(el,opt){
  opt=opt||{};
  var e=function(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');};
  var base=opt.base||'', open={};
  var list=EARN.slice(0,opt.limit||EARN.length);
  function render(){
    el.innerHTML=list.map(function(c,i){
      var o=!!open[i], cells=opt.compact?c.m.slice(0,4):c.m;
      return '<div class="erow'+(opt.compact?' compact':'')+'" data-i="'+i+'"><div class="erow-top">'+
        '<div class="erow-id">'+
          '<a class="tk" href="'+base+c.href+'" title="進入 '+e(c.nm)+' 完整拆解">'+c.tk+'</a>'+
          '<div class="nmq">'+e(c.nm)+' · '+e(c.q)+'</div>'+
          '<div class="upd">最後更新 <b>'+c.upd+'</b><br>財報日 <b>'+c.rpt+'</b></div>'+
          (c.fake?'<div class="fake">示意數字</div>':'')+
        '</div><div class="mgrid">'+cells.map(earnCell).join('')+'</div></div>'+
        (opt.compact?'':
          '<div class="erow-sum">'+e(c.one)+'</div>'+
          (o?'<div class="erow-det"><ul>'+c.d.map(function(x){return '<li>'+e(x)+'</li>';}).join('')+'</ul></div>'
            :'<div class="erow-car">▾ 展開細節</div>'))+
        '</div>';
    }).join('');
    if(opt.compact) return;
    el.querySelectorAll('.erow').forEach(function(row){
      row.onclick=function(ev){
        if(ev.target.closest('a')) return;      // 代號連結交給瀏覽器導頁
        var i=row.getAttribute('data-i');open[i]=!open[i];render();};
    });
  }
  render();
}
