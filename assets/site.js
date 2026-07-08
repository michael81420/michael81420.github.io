/* 主題切換 + 語言切換 + 首頁分類/搜尋過濾 + 文章頁左側全文章樹。無框架，純原生。 */

/* 全站文章清單（單一事實來源）。新增文章時在這裡加一筆即可同步側欄。
   順序＝首頁卡片順序（新→舊）。cat 用首頁 data-cat 的正規中文值。 */
var POSTS=[
  {slug:'gooaye-ep677-stocks',        cat:'股癌podcast分析', zh:'股癌 EP677 · 個股觀點整理',          en:'Gooaye EP677 · Stock Notes'},
  {slug:'gooaye-ep676-stocks',        cat:'股癌podcast分析', zh:'股癌 EP676 · 個股觀點整理',          en:'Gooaye EP676 · Stock Notes'},
  {slug:'gooaye-ep675-stocks',        cat:'股癌podcast分析', zh:'股癌 EP675 · 個股觀點整理',          en:'Gooaye EP675 · Stock Notes'},
  {slug:'gooaye-ep674-stocks',        cat:'股癌podcast分析', zh:'股癌 EP674 · 個股觀點整理',          en:'Gooaye EP674 · Stock Notes'},
  {slug:'ponytail',                   cat:'AI 技術分享',     zh:'Ponytail · 讓 AI agent 別過度工程',   en:'Ponytail · Stop AI Agents Over-Engineering'},
  {slug:'gooaye-ep673-stocks',        cat:'股癌podcast分析', zh:'股癌 EP673 · 個股觀點整理',          en:'Gooaye EP673 · Stock Notes'},
  {slug:'power-semiconductor-ep672',  cat:'股癌podcast分析', zh:'股癌 EP672 · 個股觀點整理',          en:'Gooaye EP672 · Stock Notes'},
  {slug:'nagoya-5d4n',                cat:'旅遊',           zh:'5天4夜 名古屋在地文化之旅',          en:'Nagoya 5-Day Local Culture Trip'}
];
var CATL={
  '全部':            {zh:'全部',            en:'All'},
  '股癌podcast分析': {zh:'股癌podcast分析', en:'Gooaye Podcast'},
  'AI 技術分享':     {zh:'AI 技術分享',     en:'AI Notes'},
  '旅遊':            {zh:'旅遊',            en:'Travel'}
};
var LANG=(document.documentElement.getAttribute('lang')||'').toLowerCase().indexOf('en')===0?'en':'zh';
function catLabel(c){return (CATL[c]||{})[LANG]||c;}

/* 語言切換：跳到對應的 .en.html / .html 版本（平行英文檔架構）。 */
function toggleLang(){
  var p=location.pathname;
  if(!/\.html$/.test(p)) p=p.replace(/\/?$/,'/index.html'); // 處理 GitHub Pages 的「/」根路徑
  var isEn=/\.en\.html$/.test(p);
  var next=isEn?p.replace(/\.en\.html$/,'.html'):p.replace(/\.html$/,'.en.html');
  try{localStorage.setItem('lang',isEn?'zh':'en');}catch(e){}
  location.href=next+location.hash;
}

function toggleTheme(){
  var h=document.documentElement;
  var next=h.getAttribute('data-theme')==='dark'?'light':'dark';
  h.setAttribute('data-theme',next);
  try{localStorage.setItem('theme',next);}catch(e){}
  updateThemeIcons(next);
}
function updateThemeIcons(t){
  document.querySelectorAll('.theme-toggle').forEach(function(b){b.textContent=t==='dark'?'☀':'☾';});
}
function initHome(){
  var grid=document.getElementById('grid');
  if(!grid) return;
  var chips=document.querySelectorAll('.chip');
  var search=document.getElementById('search');
  var hero=document.getElementById('hero');
  var empty=document.getElementById('empty');
  var cat='全部',q='';
  // 自動把最新一篇（依 .pc-date）填進精選
  function dateNum(c){var p=(c.querySelector('.pc-date')||{}).textContent||'';var m=p.match(/\d+/g)||[];return (+m[0]||0)*10000+(+m[1]||0)*100+(+m[2]||0);}
  if(hero){
    var cards=[].slice.call(grid.querySelectorAll('.post-card'));
    var latest=cards.sort(function(a,b){return dateNum(b)-dateNum(a);})[0];
    if(latest){
      hero.href=latest.getAttribute('href');
      hero.querySelector('.kicker').textContent=(LANG==='en'?'Featured · ':'精選 · ')+catLabel(latest.dataset.cat);
      hero.querySelector('.f-title').textContent=latest.querySelector('.pc-title').textContent;
      hero.querySelector('.f-excerpt').textContent=latest.querySelector('.pc-excerpt').textContent;
      hero.querySelector('.f-meta').textContent=latest.querySelector('.pc-date').textContent;
    }
  }
  // 超過 6 篇時預設只顯示最新 6 篇（DOM 已是新→舊），按鈕展開全部
  var expanded=false,showAll=document.getElementById('showAll');
  window.toggleAll=function(){expanded=!expanded;apply();};
  function apply(){
    var shown=0,matched=0;
    grid.querySelectorAll('.post-card').forEach(function(c){
      var okCat=cat==='全部'||c.dataset.cat===cat;
      var hay=(c.dataset.title+' '+(c.dataset.excerpt||'')).toLowerCase();
      var okQ=q===''||hay.indexOf(q)>=0;
      var match=okCat&&okQ;
      if(match)matched++;
      var show=match&&(expanded||matched<=6);
      c.style.display=show?'':'none';
      if(show)shown++;
    });
    var heroVisible=hero&&cat==='全部'&&q==='';
    if(hero)hero.style.display=heroVisible?'':'none';
    if(empty)empty.style.display=(!shown&&!heroVisible)?'':'none';
    if(showAll){
      showAll.style.display=matched>6?'inline-flex':'none';
      showAll.classList.toggle('open',expanded);
      var txt=document.getElementById('showAllTxt');
      if(txt)txt.textContent=expanded?(LANG==='en'?'Show less':'收合文章'):(LANG==='en'?'Show all posts':'顯示全部文章');
    }
  }
  chips.forEach(function(ch){
    ch.addEventListener('click',function(){
      chips.forEach(function(x){x.classList.remove('active');});
      ch.classList.add('active');
      cat=ch.dataset.cat;apply();
    });
  });
  if(search)search.addEventListener('input',function(){q=this.value.trim().toLowerCase();apply();});
  apply();
}
/* 文章頁：頂部返回鈕與標題（含標誌線）維持整列、置中；
   標誌線「以下」才切成 [左側清單][置中內文][右側對稱留白]。
   只在帶 body[data-slug] 的文章頁啟用；首頁無此屬性故略過。 */
function initArticle(){
  var slug=document.body.getAttribute('data-slug');
  if(!slug) return;
  var wrap=document.querySelector('.wrap');
  if(!wrap) return;
  var ext=LANG==='en'?'.en.html':'.html';

  var rail=document.createElement('aside');
  rail.className='rail';
  var title=document.createElement('div');
  title.className='rail-title';
  title.textContent=LANG==='en'?'All posts':'所有文章';
  rail.appendChild(title);
  var nav=document.createElement('nav');
  rail.appendChild(nav);

  // 依 POSTS 出現順序分組
  var order=[],groups={};
  POSTS.forEach(function(p){
    if(!groups[p.cat]){groups[p.cat]=[];order.push(p.cat);}
    groups[p.cat].push(p);
  });
  order.forEach(function(cat){
    var items=groups[cat];
    var hasActive=items.some(function(p){return p.slug===slug;});
    var g=document.createElement('div');
    g.className='rail-group'+(hasActive?'':' collapsed'); // 預設只展開當前文章所屬分類
    var btn=document.createElement('button');
    btn.className='rail-toggle';
    btn.innerHTML='<span class="chev">▶</span><span class="rg-cat"></span><span class="rg-count">'+items.length+'</span>';
    btn.querySelector('.rg-cat').textContent=catLabel(cat);
    btn.addEventListener('click',function(){g.classList.toggle('collapsed');});
    g.appendChild(btn);
    var box=document.createElement('div');
    box.className='rail-items';
    items.forEach(function(p){
      var a=document.createElement('a');
      a.className='rail-item'+(p.slug===slug?' active':'');
      a.href=p.slug+ext;
      a.textContent=LANG==='en'?p.en:p.zh;
      box.appendChild(a);
    });
    g.appendChild(box);
    nav.appendChild(g);
  });

  // 把標題（含標誌線）以下的內容搬進置中內文欄，左側放清單，右側對稱留白
  var header=wrap.querySelector(':scope > header');
  var cols=document.createElement('div');
  cols.className='article-cols';
  var body=document.createElement('div');
  body.className='article-body';
  var start=header?header.nextSibling:wrap.firstChild;
  var n=start;
  while(n){var next=n.nextSibling;body.appendChild(n);n=next;}
  cols.appendChild(rail);
  cols.appendChild(body);
  wrap.appendChild(cols);
}

document.addEventListener('DOMContentLoaded',function(){
  updateThemeIcons(document.documentElement.getAttribute('data-theme')==='dark'?'dark':'light');
  document.querySelectorAll('.lang-toggle').forEach(function(b){b.textContent=LANG==='en'?'中':'EN';});
  initHome();
  initArticle();
});
