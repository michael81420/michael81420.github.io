/* 主題切換 + 首頁分類/搜尋過濾。無框架，純原生。 */
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
  function apply(){
    var anyVisible=false;
    grid.querySelectorAll('.post-card').forEach(function(c){
      var okCat=cat==='全部'||c.dataset.cat===cat;
      var hay=(c.dataset.title+' '+(c.dataset.excerpt||'')).toLowerCase();
      var okQ=q===''||hay.indexOf(q)>=0;
      var show=okCat&&okQ;
      c.style.display=show?'':'none';
      if(show)anyVisible=true;
    });
    var heroVisible=hero&&cat==='全部'&&q==='';
    if(hero)hero.style.display=heroVisible?'':'none';
    if(empty)empty.style.display=(!anyVisible&&!heroVisible)?'':'none';
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
document.addEventListener('DOMContentLoaded',function(){
  updateThemeIcons(document.documentElement.getAttribute('data-theme')==='dark'?'dark':'light');
  initHome();
});
