/* 楓之谷倖存者：遊戲引擎（M1 戰鬥核心）。素材 atlas＝window.MSA（maple-survivors/assets/atlas.js），數值＝window.MSD。
   效能：怪物／投射物／特效／傷害數字全走物件池；碰撞用空間網格；只畫鏡頭內。怪物數量不設上限。
   畫面分兩種：選單面板（#msv-panel：角色欄位、建立角色、結算）和遊戲畫布，同一位置輪流顯示。
   網址加 ?dur=20 → 關卡縮成 20 秒；?bosst=5 → BOSS 第 5 秒就出場（測試用）。
   網址加 ?bench=500 → 怪物數量固定補滿 500 隻、玩家無敵，右上角顯示 fps，用來量效能。 */
(function(){
var A=window.MSA, D=window.MSD, $=function(id){return document.getElementById(id)};
var cv=$('msv'), g=cv.getContext('2d'), W=960, H=600, scale=1;
var Q=new URLSearchParams(location.search), BENCH=+Q.get('bench')||0;

// ---- 素材 ----
var IMG={};
function img(src){ if(!IMG[src]){ IMG[src]=new Image(); IMG[src].src='maple-survivors/assets/'+src } return IMG[src] }
// 每個動作預先算總長，取幀不用每次加總
[A.mob,A.chr,A.skl,A.map,A.npc,A.ico].forEach(function(set){ for(var k in set){ var e=set[k]; e.tot={}; for(var a in e.a) e.tot[a]=e.a[a].reduce(function(s,f){return s+f[6]},0)/1000 } });
function frameAt(e,act,t,loop){
  var fr=e.a[act]; if(!fr) return null;
  var tt=loop? t%e.tot[act] : Math.min(t,e.tot[act]-1e-6), i=0;
  while(i<fr.length-1 && (tt-=fr[i][6]/1000)>=0) i++;
  return fr[i];
}
// 原作素材都面向左；flip＝面向右。原點對到 (x,y)
function spr(e,f,x,y,flip,s){
  if(!f) return; s=s||1; var im=img(e.src);
  if(!flip) return g.drawImage(im,f[0],f[1],f[2],f[3],x-f[4]*s,y-f[5]*s,f[2]*s,f[3]*s);
  g.save(); g.translate(x,y); g.scale(-1,1); g.drawImage(im,f[0],f[1],f[2],f[3],-f[4]*s,-f[5]*s,f[2]*s,f[3]*s); g.restore();
}
var C={}; function colors(){ var s=getComputedStyle(document.documentElement); ['--ink','--ink2','--surface','--win','--lose','--mid','--turn','--accent'].forEach(function(n){C[n]=s.getPropertyValue(n).trim()}) }
new MutationObserver(colors).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']}); colors();

// ---- 物件池 ----
function Pool(make){ this.a=[]; this.make=make; this.n=0 }
Pool.prototype.get=function(){ for(var i=0;i<this.a.length;i++) if(!this.a[i].on){ this.a[i].on=true; this.n++; return this.a[i] } var o=this.make(); o.on=true; this.a.push(o); this.n++; return o };
Pool.prototype.free=function(o){ if(o.on){ o.on=false; this.n-- } };
Pool.prototype.each=function(fn){ for(var i=0;i<this.a.length;i++) if(this.a[i].on) fn(this.a[i]) };
var mobs=new Pool(function(){return {}}), shots=new Pool(function(){return {}}), fxs=new Pool(function(){return {}}), nums=new Pool(function(){return {}});

// ---- 空間網格（怪物用；每幀重建）----
var CELL=64, grid=new Map();
function gkey(cx,cy){ return (cx+32768)*65536+(cy+32768) }
function buildGrid(){
  grid.forEach(function(l){l.length=0});
  mobs.each(function(m){ if(m.dieT>=0) return; var k=gkey(Math.floor(m.x/CELL),Math.floor(m.y/CELL)), l=grid.get(k); if(!l) grid.set(k,l=[]); l.push(m) });
}
function near(x,y,r,fn){ // 半徑 r 內的怪物
  var x0=Math.floor((x-r)/CELL), x1=Math.floor((x+r)/CELL), y0=Math.floor((y-r)/CELL), y1=Math.floor((y+r)/CELL);
  for(var cx=x0;cx<=x1;cx++) for(var cy=y0;cy<=y1;cy++){ var l=grid.get(gkey(cx,cy)); if(l) for(var i=0;i<l.length;i++) if(fn(l[i])===false) return }
}
function nearest(x,y,r){ var best=null, bd=r*r; near(x,y,r,function(m){ var d=(m.x-x)*(m.x-x)+(m.y-y)*(m.y-y); if(d<bd){bd=d; best=m} }); return best }

// ---- 存檔：4 個角色欄位，彼此不共用任何東西 ----
// 欄位：{nm, job, lv, exp, adv(0 見習/1/2), ap, sp, str/dex/int/luk, sk:{技能id:等級}, load:[帶進關卡的主動技能], st:{關卡id:{best 最久存活秒, clears}},
//        meso, eqp:{部位:裝備}, inv:[裝備], scr:{卷軸k:數量}}；裝備＝{id, st:{屬性}, tuc 剩餘強化次數, up 成功次數, q 浮動總和, req?（新手武器 0）}
var KEY='msvSave', SV=load();
function load(){
  var raw=null; try{ raw=localStorage.getItem(KEY) }catch(e){}
  if(raw){ try{ var s=JSON.parse(raw); if(valid(s)){ s.slots.forEach(fix); return s } }catch(e){}
    try{ localStorage.setItem(KEY+'.bak',raw) }catch(e){}   // 讀不懂的存檔先備份，不直接蓋掉
    setTimeout(function(){ msg('存檔讀取失敗，原始資料已備份到 '+KEY+'.bak') }) }
  return {v:1, slots:[null,null,null,null]};
}
// 匯入與讀檔共用：只收結構對的資料（名字之後一律 esc 才進 innerHTML）
function valid(s){
  return s&&s.v===1&&Array.isArray(s.slots)&&s.slots.length===4&&s.slots.every(function(c){
    return c===null||(c&&typeof c.nm==='string'&&c.nm.length<=12&&D.JOBS.hasOwnProperty(c.job)&&Number.isInteger(c.lv)&&c.lv>=1&&c.lv<=250&&Number.isFinite(c.exp)) });
}
// 補齊舊版存檔缺的欄位（M1 的存檔沒有能力值與技能）
function fix(s){
  if(!s) return; var J=D.JOBS[s.job];
  if(s.str==null){ D.STATS.forEach(function(k){ s[k]=D.START_STAT }); s[J.main]=D.START_MAIN; s.ap=(s.lv-1)*D.AP_LV; s.sp=0 }
  s.adv=s.adv||0; s.sk=s.sk||{}; s.load=s.load||[]; s.st=s.st||{}; s.meso=s.meso||0; s.inv=s.inv||[]; s.scr=s.scr||{};
  if(!s.eqp){ s.eqp={}; var w=starter(s.job); if(w){ w.req=0; s.eqp.weapon=w } }   // 創角送本職業最低階武器
  // 舊存檔的裝備沒有 q：沒強化過的直接跟原始數值比；強化過的分不出卷軸加了多少，當白字
  s.inv.concat(Object.values(s.eqp)).forEach(function(it){ if(it&&it.q==null){ var m=A.itm[it.id]; it.q=0; if(m&&!it.up) for(var k in m.st) it.q+=(it.st[k]||0)-m.st[k] } });
}
// ---- 裝備 ----
function mkItem(id,roll){
  var m=A.itm[id], st={}, q=0;
  for(var k in m.st){ var r=roll?(k==='pad'||k==='mad'?D.ROLL.atk:D.ROLL.stat):[0,0]; st[k]=Math.max(1,m.st[k]+Math.round(r[0]+Math.random()*(r[1]-r[0]))); q+=st[k]-m.st[k] }
  return {id:+id, st:st, tuc:m.tuc, up:0, q:q};   // q＝浮動總和：>0 藍字、<0 灰字、0 白字（卷軸加的不算）
}
function starter(job){ var best=null; for(var id in A.itm){ var m=A.itm[id]; if(m.s==='weapon'&&m.job===job&&!m.rare&&(!best||m.req<A.itm[best].req)) best=id } return best&&mkItem(best,false) }
function reqOf(it){ return it.req!=null?it.req:A.itm[it.id].req }
function jobOk(s,m){ return m.job===s.job||m.job==='all' }
// 原作規則：等級＋屬性需求（屬性算身上裝備加成後的總值）。回傳不符合的原因，空字串＝可以穿
function whyNot(s,it){
  var m=A.itm[it.id], q=calc(s).q, out=[];
  if(!jobOk(s,m)) return D.JOBS[m.job]?D.JOBS[m.job].nm+'專用':'職業不符';
  if(reqOf(it)>s.lv) out.push('Lv.'+reqOf(it));
  if(it.req!==0) for(var k in m.rq) if(q[k]<m.rq[k]) out.push(k.toUpperCase()+' '+m.rq[k]);
  return out.length?'需要 '+out.join('、'):'';
}
// 掉落表：怪物 Lv＋band 範圍內的裝備（全部職業，圖鑑用）＋指定的稀有裝備
var DT={};
function dropTable(id){
  if(DT[id]) return DT[id]; var M=D.MOBS[id], b=D.DROP.band;
  return DT[id]={eq:Object.keys(A.itm).filter(function(i){ var m=A.itm[i]; return !m.rare&&m.req>=M.lv+b[0]&&m.req<=M.lv+b[1] }).map(Number),
    rare:(M.rare||[]).filter(function(i){ return A.itm[i] })};
}
function stageMobs(g2){ var o=[]; g2.waves.forEach(function(w){ w.mobs.forEach(function(id){ if(o.indexOf(id)<0) o.push(id) }) }); if(g2.boss) o.push(g2.boss.id); return o }
function unlocked(s,id){ var ks=Object.keys(D.STAGES), i=ks.indexOf(id); return i<=0||!!(s.st[ks[i-1]]&&s.st[ks[i-1]].clears) }
// 套服佔上衣＋褲子兩格；換下來的東西回背包
function equip(s,i){
  var it=s.inv[i], m=A.itm[it.id], out=[];
  if(s.eqp[m.s]) out.push(s.eqp[m.s]);
  if(m.ov&&s.eqp.pants){ out.push(s.eqp.pants); delete s.eqp.pants }
  if(m.s==='pants'&&s.eqp.coat&&A.itm[s.eqp.coat.id].ov){ out.push(s.eqp.coat); delete s.eqp.coat }
  s.eqp[m.s]=it; s.inv.splice(i,1); s.inv.push.apply(s.inv,out);
}
// 卷軸：成功失敗都扣一次強化次數；詛咒卷軸失敗 50% 爆裝。回傳 ok/fail/boom（rng 可注入，自檢用）
function useScroll(s,it,sc,rng){
  rng=rng||Math.random; if(it.tuc<=0) return null; it.tuc--;
  if(rng()<sc.pct){ var main=D.JOBS[s.job].main, atk=s.job==='magician'?'mad':'pad';
    if(sc.fx.atk) it.st[atk]=(it.st[atk]||0)+sc.fx.atk; if(sc.fx.main) it.st[main]=(it.st[main]||0)+sc.fx.main; if(sc.fx.pdd) it.st.pdd=(it.st.pdd||0)+sc.fx.pdd;
    it.up++; return 'ok' }
  return sc.dark&&rng()<.5?'boom':'fail';
}
window.__msvScroll=useScroll; window.__msvDropTable=dropTable;   // 給 maple-survivors/tools/selfcheck.mjs 用
function newSlot(nm,job){ var s={nm:nm, job:job, lv:1, exp:0}; fix(s); return s }
function persist(){ try{ localStorage.setItem(KEY,JSON.stringify(SV)) }catch(e){ msg('存檔失敗：瀏覽器可能關閉了儲存空間') } }
function esc(t){ return String(t).replace(/[&<>"']/g,function(c){return '&#'+c.charCodeAt(0)+';'}) }

// ---- 角色數值：存檔 → 戰鬥用數值 ----
function lerp(a,lv,max){ return Array.isArray(a)? a[0]+(a[1]-a[0])*(max>1?(lv-1)/(max-1):1) : a }
function calc(s){
  var J=D.JOBS[s.job], m={hp:0,def:0,eva:0,crit:0,dmg:0,cdr:0,range:0,final:0}, finalId=null;
  for(var id in s.sk){ var d=D.SK[id], lv=s.sk[id]; if(!d||d.act||!lv) continue;
    for(var k in d.mods) m[k]+=lerp(d.mods[k],lv,d.max); if(d.mods.final) finalId=+id }
  var q={str:s.str,dex:s.dex,int:s.int,luk:s.luk,pdd:0,mhp:0,eva:0,spd:0}, W=0, atkKey=s.job==='magician'?'mad':'pad';
  for(var sl in s.eqp){ var st2=s.eqp[sl]&&s.eqp[sl].st; if(!st2) continue; W+=st2[atkKey]||0; for(var k2 in q) q[k2]+=st2[k2]||0 }
  var eva=q.dex*.5+q.luk+m.eva+q.eva;
  return {maxHp:Math.round((J.hp+(s.lv-1)*J.hpLv)*(1+m.hp))+q.mhp, atk:(J.base+W)*(q[J.main]*4+q[J.sub])/52*D.ATK_K, W:W, q:q,
    def:Math.min(D.DEF_MAX,m.def+q.pdd/(q.pdd+D.DEF_K)), evaPts:eva, eva:Math.min(D.EVA_MAX,eva/(eva+D.EVA_K)), crit:D.CRIT+m.crit, dmg:1+m.dmg,
    cdr:Math.min(.6,m.cdr), range:1+m.range, final:m.final, finalId:finalId, spd:J.spd*(1+q.spd/100)};
}
// 帶進關卡、而且真的能用的主動技能
function loadout(s){ return s.load.filter(function(id){ var d=D.SK[id]; return d&&d.act&&d.adv<=s.adv&&s.sk[id] }).slice(0,D.SLOTS[s.adv]) }

// ---- 聲音：BGM 一個 <audio> 循環；音效每次 clone 一個 <audio>（file:// 直開也能播，Web Audio 的 fetch 不行）----
// ponytail: 同一個音效 70ms 內只響一次、同時最多 10 個，怪物再多也不會炸耳朵；要更準的混音再換 Web Audio
var AU={bgm:true,sfx:true,vol:.5}, SN=A.snd||{bgm:{},fx:{}}, SND={}, sLast={}, sLive=0, bgmEl=new Audio(), bgmF='';
try{ Object.assign(AU,JSON.parse(localStorage.getItem('msvAudio'))||{}) }catch(e){}
bgmEl.loop=true;
function snd(f){ return SND[f]||(SND[f]=new Audio('maple-survivors/assets/'+f)) }
function sfx(k,v){ var f=SN.fx[k], t=performance.now(); if(!AU.sfx||!f||t-(sLast[k]||0)<70||sLive>=10) return; sLast[k]=t;
  var a=snd(f).cloneNode(); a.volume=AU.vol*(v||1); sLive++; a.onended=a.onerror=function(){ sLive-- }; a.play().catch(function(){ sLive-- }) }
function bgm(k){ var f=SN.bgm[k]||SN.bgm.menu; if(!f) return; if(f!==bgmF){ bgmF=f; bgmEl.src='maple-survivors/assets/'+f } bgmEl.volume=AU.vol*.6; if(AU.bgm) bgmEl.play().catch(function(){}); else bgmEl.pause() }
// 瀏覽器要等使用者第一次互動才准出聲
['pointerdown','keydown'].forEach(function(t){ addEventListener(t,function(){ if(AU.bgm&&bgmF&&bgmEl.paused) bgmEl.play().catch(function(){}) },true) });

// ---- 狀態 ----
var P, slot=null, stage, st, cam={x:0,y:0}, keys={}, joy=null, state='menu', fps=0;
var zones=new Pool(function(){return {}}), drops=new Pool(function(){return {}});
function start(i,stageId){
  var s=i==null?newSlot('bench',Q.get('job')||'magician'):SV.slots[i], J=D.JOBS[s.job], S=calc(s);
  slot=i;
  P={job:s.job, adv:s.adv, J:J, S:S, x:0, y:0, hp:S.maxHp, maxHp:S.maxHp, rage:0, rageN:0, R:{cdr:0,dmg:0,n:0,area:0,crit:0,spd:0,hp:0,leech:0,magnet:0}, boons:[], face:false, moving:false, t:0, atkAnim:-1, inv:0, kills:0, exp:0, buffs:[], B:{dmg:0,spd:0,inv:0},
     // 基本攻擊永遠在第一格；其餘是技能欄裡的主動技能
     acts:[{d:J.atk, lv:1, cd:0}].concat(loadout(s).map(function(id){ return {id:+id, d:D.SK[id], lv:s.sk[id], cd:.5} }))};
  stage=D.STAGES[stageId||'s1']; stage.id=stageId||'s1'; floorE=A.map[stage.floor]; keys={}; joy=null;
  st={t:0, spawnAcc:0, dur:+Q.get('dur')||stage.dur, bossT:stage.boss&&(Q.has('bosst')?+Q.get('bosst'):stage.boss.t), boss:null, winT:-1};
  pickEl.style.display='none';
  // 實際掉落只掉本職業＋共用（每種怪先算好）
  P.drops={}; stageMobs(stage).forEach(function(id){ var t=dropTable(id), own=function(i){ return jobOk(s,A.itm[i]) };
    P.drops[id]={eq:t.eq.filter(own), rare:t.rare.filter(own)} });
  P.loot={meso:0, items:[], scr:{}}; P.room=i==null?0:D.INV_MAX-s.inv.length;
  [mobs,shots,fxs,nums,zones,drops].forEach(function(p){ p.each(function(o){p.free(o)}) });
  view('game'); state='run'; msg(''); bgm(stage.id); sfx('Portal');
}
function msg(s){ $('msv-msg').textContent=s }

// ---- 生怪：鏡頭外一圈 ----
function spawn(id){
  var M=D.MOBS[id], e=A.mob[id], m=mobs.get(), a=Math.random()*Math.PI*2, R=Math.hypot(W,H)/2+60;
  m.id=id; m.M=M; m.e=e; m.x=P.x+Math.cos(a)*R; m.y=P.y+Math.sin(a)*R; m.hp=M.hp; m.face=false;
  m.t=Math.random(); m.hitT=-1; m.dieT=-1; m.r=M.r||Math.max(10,e.a.stand[0][2]*.32); m.slamT=M.slam?M.slam.cd:0; m.slamA=-1;
  return m;
}
function curWave(){ var w=stage.waves[0]; for(var i=0;i<stage.waves.length;i++) if(st.t>=stage.waves[i].t) w=stage.waves[i]; return w }

// ---- 傷害 ----
function hurt(m,dmg,crit){
  if(m.dieT>=0) return; dmg=Math.max(1,Math.round(dmg*(.9+Math.random()*.2)));
  m.hp-=dmg; m.hitT=0; num(m.x,m.y-m.e.a.stand[0][5],dmg,crit?2:0); sfx((m.hp<=0?'mobx-':'mobd-')+m.id,m.hp<=0?.8:.4);
  if(m.hp<=0){ m.dieT=0; P.kills++; P.exp+=m.M.exp; if(BENCH) return; dropFrom(m);
    if(P.R.leech) P.hp=Math.min(P.maxHp,P.hp+P.maxHp*P.R.leech);
    if(m.M.boss) st.winT=1.5;   // BOSS 倒下 1.5 秒後結算（讓死亡動畫播完）
    if(++P.rage>=D.RAGE.need*(P.rageN+1)){ P.rage=0; P.rageN++; openPick() } }
}
// 怒氣集滿：暫停，三選一本場增益（鍵盤 1/2/3 或點選）
var pickEl=$('msv-pick'), picks=[];
function openPick(){
  sfx('gaugeFull');
  var pool=D.BOONS.filter(function(b){ return !b.heal||P.hp<P.maxHp }); picks=[];
  while(picks.length<Math.min(D.RAGE.choices,pool.length)){ var b=pool[(Math.random()*pool.length)|0]; if(picks.indexOf(b)<0) picks.push(b) }
  state='pick'; keys={}; joy=null;
  pickEl.innerHTML='<div class="msv-eqo msv-boons"><div class="msv-eqhd">RAGE BURST — 選一個本場增益</div><div class="msv-boonrow">'+picks.map(function(b,i){
    var n=P.boons.filter(function(x){ return x===b.k }).length, f=A.ico.skills.a[b.ico];
    return '<button class="msv-boon" data-pick="'+i+'"><kbd>'+(i+1)+'</kbd><span class="tp-ico">'+(f?ico(f[0],'','',A.ico.skills):'')+'</span><span class="nm">'+b.nm+'</span><span class="ds">'+b.desc+'</span>'+
      '<span class="lv">'+(n?'目前 '+n+' 層 → '+(n+1)+' 層':'新增益')+'</span></button>' }).join('')+'</div><div class="msv-boonft">按數字鍵 1–3 或點一下選擇・只在這一場有效</div></div>';
  pickEl.style.display='';
}
function choose(i){
  var b=picks[i]; if(!b) return;
  if(b.heal) P.hp=Math.min(P.maxHp,P.hp+P.maxHp*b.heal);
  for(var k in b.mods) P.R[k]+=b.mods[k];
  if(b.mods&&b.mods.hp){ P.maxHp=Math.round(P.S.maxHp*(1+P.R.hp)); P.hp=P.maxHp }
  P.boons.push(b.k); sfx('BtMouseClick'); pickEl.style.display='none'; state='run';
}
pickEl.addEventListener('click',function(e){ var b=e.target.closest('[data-pick]'); if(b) choose(+b.dataset.pick) });
function dropFrom(m){
  var R=D.DROP, r=Math.random;
  if(r()<R.meso) addDrop(m,'meso',Math.round(m.M.exp*(1+r())));
  var t=P.drops[m.id]||dropTable(m.id);
  if(r()<R.eq&&t.eq.length){ addDrop(m,'eq',t.eq[(r()*t.eq.length)|0]); sfx('DropItem') }
  if(r()<R.rare&&t.rare.length) addDrop(m,'eq',t.rare[(r()*t.rare.length)|0]);
  if(r()<R.scroll){ var w=D.SCROLL_DROP_W, tot=w.reduce(function(a,b){return a+b}), x=r()*tot, i=0; while((x-=w[i])>0) i++; addDrop(m,'sc',i) }
}
function addDrop(m,kind,v){ var d=drops.get(); d.x=m.x+(Math.random()-.5)*30; d.y=m.y+(Math.random()-.5)*20; d.kind=kind; d.v=v; d.t=0; d.fly=false }
// 撿起：楓幣直接記；裝備背包滿了就不撿（留在地上）
function pick(d){
  sfx('PickUpItem',.6);
  if(d.kind==='meso') P.loot.meso+=d.v;
  else if(d.kind==='sc'){ var k=D.SCROLLS[d.v].k; P.loot.scr[k]=(P.loot.scr[k]||0)+1 }
  else { if(P.loot.items.length>=P.room){ if(!P.fullWarn){ P.fullWarn=1; num(P.x,P.y-80,'背包滿了',3) } return false } P.loot.items.push(mkItem(d.v,true)) }
  return true;
}
// 玩家打怪都走這裡：爆擊、追擊（終極之劍／弓）
function deal(m,dmg){
  var c=Math.random()<P.S.crit+P.R.crit; hurt(m,dmg*(c?D.CRIT_DMG:1),c);
  if(P.S.final && Math.random()<P.S.final && m.dieT<0){ hurt(m,dmg*.6,false); fx(P.S.finalId,'hit',m.x,m.y-20,false) }
}
function num(x,y,v,kind){ var n=nums.get(); n.x=x+(Math.random()-.5)*16; n.y=y; n.v=v; n.t=0; n.kind=kind }  // kind 0 一般 1 玩家受傷 2 爆擊 3 MISS
function fx(id,act,x,y,flip,follow){ var e=A.skl[id]; if(!e||!e.a[act]) return; var f=fxs.get(); f.e=e; f.act=act; f.x=x; f.y=y; f.t=0; f.flip=flip; f.follow=follow }

// ---- 施放：基本攻擊與主動技能共用一套 ----
function cast(k){
  var d=k.d, V=function(key){ return lerp(d[key],k.lv,d.max) };
  if(d.k==='buff'){ sfx('skl-'+k.id); P.buffs.push({mods:d.mods, lv:k.lv, max:d.max, t:V('dur')}); fx(k.id,d.fx,P.x,P.y,P.face,true); return true }
  var rg=d.range*P.S.range, tg=nearest(P.x,P.y,rg); if(!tg) return false;
  var dmg=P.S.atk*V('dmg')*(P.S.dmg+P.B.dmg+P.R.dmg), area=1+P.R.area;
  P.face=tg.x>P.x; P.atkAnim=0; sfx(k.id?'skl-'+k.id:'atk-'+P.job,.7);
  if(d.k==='slash'){
    var dir=Math.atan2(tg.y-P.y,tg.x-P.x), arc=d.arc; rg*=area;
    near(P.x,P.y,rg,function(m){ var a=Math.atan2(m.y-P.y,m.x-P.x)-dir; a=Math.atan2(Math.sin(a),Math.cos(a));
      if(Math.abs(a)<arc/2 && Math.hypot(m.x-P.x,m.y-P.y)<rg+m.r) deal(m,dmg) });
    fx(k.id||d.fx,k.id?d.fx:'effect',P.x,P.y-30,P.face);
  } else if(d.k==='shot'){
    var n=Math.round(V('n')||1)+P.R.n;
    for(var i=0;i<n;i++){
      var s=shots.get(), a2=Math.atan2(tg.y-12-(P.y-30),tg.x-P.x)+(i-(n-1)/2)*.18, v=d.v;
      s.x=P.x; s.y=P.y-30; s.vx=Math.cos(a2)*v; s.vy=Math.sin(a2)*v; s.life=rg/v; s.pierce=Math.round(V('pierce')||1); s.dmg=dmg;
      s.splash=(d.splash||0)*area; s.e=d.ball?A.skl[d.ball]:null; s.hitFx=d.hit||d.ball; s.t=0; s.ang=a2; s.hit=s.hit||new Set(); s.hit.clear();
    }
  } else if(d.k==='strike'){   // 魔力爪：直接打最近的 n 隻，每隻 hits 下
    var list=[]; near(P.x,P.y,rg,function(m){ list.push(m) });
    list.sort(function(a,b){ return Math.hypot(a.x-P.x,a.y-P.y)-Math.hypot(b.x-P.x,b.y-P.y) });
    list.slice(0,Math.round(V('n'))).forEach(function(m){ for(var h=0;h<d.hits;h++) deal(m,dmg); fx(k.id,d.fx,m.x,m.y-20,m.x<P.x) });
  } else if(d.k==='mist'){     // 毒霧：在目標腳下放一塊持續傷害區
    var z=zones.get(); z.x=tg.x; z.y=tg.y; z.r=V('r')*area; z.t=0; z.dur=d.dur; z.tick=0; z.dmg=dmg; z.id=k.id;
  }
  return true;
}

// ---- 更新 ----
function update(dt){
  st.t+=dt; P.t+=dt;
  // buff：每幀重算加總
  P.B.dmg=0; P.B.spd=0; P.B.inv=0;
  P.buffs=P.buffs.filter(function(b){ b.t-=dt; if(b.t<=0) return false; for(var k in b.mods) P.B[k]+=lerp(b.mods[k],b.lv,b.max); return true });
  // 移動
  var mx=(keys.right?1:0)-(keys.left?1:0), my=(keys.down?1:0)-(keys.up?1:0);
  if(joy){ mx=joy.dx; my=joy.dy }
  var ml=Math.hypot(mx,my), spd=P.S.spd*(1+P.B.spd+P.R.spd); P.moving=ml>.1;
  if(P.moving){ if(ml>1){mx/=ml; my/=ml} P.x+=mx*spd*dt; P.y+=my*spd*dt; if(Math.abs(mx)>.1) P.face=mx>0 }
  cam.x=P.x-W/2; cam.y=P.y-H/2+30;
  // 生怪
  if(BENCH){ while(mobs.n<BENCH) spawn(curWave().mobs[(Math.random()*curWave().mobs.length)|0]) }
  else { var w=curWave(), k=Math.min(1,st.t/st.dur); st.spawnAcc+=dt*(w.rate+(w.rate2-w.rate)*k);
    while(st.spawnAcc>=1){ st.spawnAcc--; spawn(w.mobs[(Math.random()*w.mobs.length)|0]) } }
  if(stage.boss&&!st.boss&&st.t>=st.bossT&&!BENCH){ st.boss=spawn(stage.boss.id); num(P.x,P.y-100,D.MOBS[stage.boss.id].nm+'出現了！',2) }
  buildGrid();
  // 怪物：朝玩家走 + 互相推開；碰到玩家 → 迴避判定 → 減傷
  var pr=14, safe=P.inv>0||P.B.inv>0||BENCH;
  mobs.each(function(m){
    m.t+=dt;
    if(m.dieT>=0){ m.dieT+=dt; if(m.dieT>m.e.tot.die1) mobs.free(m); return }
    if(m.hitT>=0){ m.hitT+=dt; if(m.hitT>.25||m.M.boss) m.hitT=-1 }
    var dx=P.x-m.x, dy=P.y-m.y, d=Math.hypot(dx,dy)||1, sp=m.hitT>=0?m.M.spd*.3:m.M.spd;
    if(m.M.slam){ var SL=m.M.slam;
      if(m.slamA>=0){ m.slamA+=dt; sp=0;
        if(m.slamA>=SL.warn&&!m.slammed){ m.slammed=1; if(d<SL.r&&!(P.inv>0||P.B.inv>0)){ P.inv=D.HIT_INV;
          if(Math.random()<P.S.eva) num(P.x,P.y-60,'MISS',3); else { var sh=Math.round(SL.dmg*(1-P.S.def)); P.hp-=sh; num(P.x,P.y-60,sh,1) } } }
        if(m.slamA>=Math.max(SL.warn,m.e.tot.attack1)) m.slamA=-1 }
      else if((m.slamT-=dt)<=0){ m.slamT=SL.cd; m.slamA=0; m.slammed=0 } }
    var vx=dx/d*sp, vy=dy/d*sp;
    near(m.x,m.y,m.r*2,function(o){ if(o===m) return; var ox=m.x-o.x, oy=m.y-o.y, od=Math.hypot(ox,oy)||.01, mn=m.r+o.r;
      if(od<mn){ var push=(mn-od)/mn*90; vx+=ox/od*push; vy+=oy/od*push } });
    m.x+=vx*dt; m.y+=vy*dt; m.face=dx>0;
    // 怪物不設上限，離太遠的移到另一側（不刪，避免數量掉）
    if(d>Math.hypot(W,H)*1.2){ m.x=P.x-dx*.9; m.y=P.y-dy*.9 }
    if(d<m.r+pr && !safe){ P.inv=D.HIT_INV; safe=true;
      if(Math.random()<P.S.eva) num(P.x,P.y-60,'MISS',3);
      else { var hit=Math.max(1,Math.round(m.M.atk*(1-P.S.def))); P.hp-=hit; num(P.x,P.y-60,hit,1) } }
  });
  if(P.inv>0) P.inv-=dt;
  // 攻擊：每個技能各自冷卻，好了就放（沒目標就等下一幀）
  P.acts.forEach(function(k){ k.cd-=dt; if(k.cd<=0 && cast(k)) k.cd=lerp(k.d.cd,k.lv,k.d.max)*(1-Math.min(.75,P.S.cdr+P.R.cdr)) });
  if(P.atkAnim>=0){ P.atkAnim+=dt; if(P.atkAnim>.35) P.atkAnim=-1 }
  // 投射物
  shots.each(function(s){
    s.t+=dt; s.life-=dt; s.x+=s.vx*dt; s.y+=s.vy*dt;
    if(s.life<=0) return shots.free(s);
    near(s.x,s.y,40,function(m){
      if(s.hit.has(m) || Math.hypot(m.x-s.x,m.y-12-s.y)>m.r+8) return;
      s.hit.add(m);
      if(s.splash) near(s.x,s.y,s.splash,function(o){ deal(o,s.dmg) }); else deal(m,s.dmg);
      if(s.hitFx) fx(s.hitFx,'hit',s.x,s.y,false);
      if(--s.pierce<=0){ shots.free(s); return false }
    });
  });
  drops.each(function(d){ d.t+=dt; var dx=P.x-d.x, dy=P.y-d.y, dd=Math.hypot(dx,dy);
    if(dd<D.MAGNET*(1+P.R.magnet)) d.fly=true;
    if(d.fly){ var v=Math.min(dd,(260+d.t*60)*dt); d.x+=dx/dd*v; d.y+=dy/dd*v }
    if(dd<D.PICK&&pick(d)) drops.free(d) });
  zones.each(function(z){ z.t+=dt; z.tick-=dt;
    if(z.tick<=0){ z.tick=.5; near(z.x,z.y,z.r,function(m){ if(Math.hypot(m.x-z.x,m.y-z.y)<z.r) deal(m,z.dmg) }) }
    if(z.t>=z.dur) zones.free(z) });
  fxs.each(function(f){ f.t+=dt; if(f.follow){ f.x=P.x; f.y=P.y } if(f.t>=f.e.tot[f.act]) fxs.free(f) });
  nums.each(function(n){ n.t+=dt; n.y-=40*dt; if(n.t>.8) nums.free(n) });
  if(st.winT>=0&&(st.winT-=dt)<=0) return end(true);
  if(P.hp<=0){ P.hp=0; end(false) } else if(!BENCH && st.t>=st.dur) end(!stage.boss);
}
// 結算：只在這裡把經驗寫進存檔（遊玩中不升級）；每升一級發 AP，轉職後也發 SP
function end(win){
  state='over'; var gain=win?P.exp:Math.round(P.exp*D.DEATH_EXP), s=SV.slots[slot], up=0;
  if(s){
    s.exp+=gain; while(s.exp>=D.exp(s.lv)){ s.exp-=D.exp(s.lv); s.lv++; up++; s.ap+=D.AP_LV; if(s.adv>=1) s.sp+=D.SP_LV }
    var r=s.st[stage.id]||(s.st[stage.id]={best:0,clears:0}); r.best=Math.max(r.best,Math.floor(st.t)); if(win) r.clears++;
    if(win) drops.each(function(d){ if(pick(d)) drops.free(d) });
    s.meso+=P.loot.meso;
    if(win){ s.inv.push.apply(s.inv,P.loot.items); for(var k in P.loot.scr) s.scr[k]=(s.scr[k]||0)+P.loot.scr[k] }
    var FC=D.FIRST_CLEAR[stage.id]; P.first=null;
    if(win&&FC&&r.clears===1){ P.first={meso:FC.meso, title:FC.title}; s.meso+=FC.meso; s.title=FC.title;
      if(FC.rareOwnJob){ var rs=(D.MOBS[stage.boss.id].rare||[]).filter(function(i){ return A.itm[i]&&A.itm[i].job===s.job });
        if(rs.length){ var ri=mkItem(rs[(Math.random()*rs.length)|0],true); s.inv.push(ri); P.first.item=ri } } }
    persist();
  }
  bgm('menu'); sfx(up?'LevelUp':win?'QuestClear':'Tombstone');
  resultScreen(win,gain,up);
}

// ---- 繪製 ----
var floorE=A.map.s1;
function hash(x,y){ var h=(x*374761393+y*668265263)|0; h=(h^(h>>>13))*1274126177|0; return (h^(h>>>16))>>>0 }
function drawFloor(){
  var e=floorE, b=e.a.bsc, tw=b[0][2], th=b[0][3], im=img(e.src);
  var x0=Math.floor(cam.x/tw), y0=Math.floor(cam.y/th);
  for(var ty=y0; ty*th<cam.y+H; ty++) for(var tx=x0; tx*tw<cam.x+W; tx++){ var f=b[hash(tx,ty)%b.length]; g.drawImage(im,f[0],f[1],f[2],f[3],tx*tw-cam.x,ty*th-cam.y,tw,th) }
  // 每 480px 區塊撒 0–3 個小物件（位置由座標雜湊決定，走回來還在原處）
  var o=e.a.obj; if(!o) return; var CH=480, small=e.small||(e.small=o.filter(function(f){return f[3]<100&&f[2]<180}));
  for(var cy=Math.floor((cam.y-120)/CH); cy*CH<cam.y+H+120; cy++) for(var cx=Math.floor((cam.x-180)/CH); cx*CH<cam.x+W+180; cx++){
    var h=hash(cx,cy), n=h%4;
    for(var i=0;i<n;i++){ h=hash(h,i); var f2=small[h%small.length]; spr(e,f2,cx*CH+(h>>>8)%CH-cam.x,cy*CH+(h>>>18)%CH-cam.y,false) }
  }
}
var drawList=[];
function draw(){
  g.setTransform(scale,0,0,scale,0,0);
  drawFloor();
  mobs.each(function(m){ if(m.slamA<0||!m.M.slam||m.slammed) return; var x=m.x-cam.x, y=m.y-cam.y, k=m.slamA/m.M.slam.warn;
    g.globalAlpha=.15+.25*k; g.fillStyle=C['--lose']; g.beginPath(); g.ellipse(x,y,m.M.slam.r,m.M.slam.r*.6,0,0,7); g.fill();
    g.globalAlpha=.8; g.strokeStyle=C['--lose']; g.lineWidth=3; g.beginPath(); g.ellipse(x,y,m.M.slam.r*k,m.M.slam.r*.6*k,0,0,7); g.stroke(); g.globalAlpha=1 });
  var IC=A.ico.items;
  drops.each(function(d){ var x=d.x-cam.x, y=d.y-cam.y-Math.abs(Math.sin(d.t*3))*6, f;
    if(d.kind==='meso'){ var k=d.v<50?0:d.v<100?1:d.v<1000?2:3; f=frameAt(IC,'meso'+k,d.t,true) }
    else if(d.kind==='sc') f=IC.a.sc[D.SCROLLS[d.v].icon];
    else { f=IC.a.eq[A.itm[d.v].i]; if(A.itm[d.v].rare){ g.globalAlpha=.35; g.fillStyle=C['--turn']; g.beginPath(); g.arc(x,y-12,18,0,7); g.fill(); g.globalAlpha=1 } }
    if(f) spr(IC,f,x,y,false) });
  zones.each(function(z){ var e=A.skl[z.id], x=z.x-cam.x, y=z.y-cam.y;
    g.globalAlpha=.18*Math.min(1,(z.dur-z.t)*2); g.fillStyle=C['--win']; g.beginPath(); g.ellipse(x,y,z.r,z.r*.6,0,0,7); g.fill(); g.globalAlpha=1;
    if(e&&e.a.hit) spr(e,frameAt(e,'hit',z.t,true),x,y,false,z.r/60) });
  // 依 y 排序畫（後面的先畫）
  drawList.length=0; mobs.each(function(m){ drawList.push(m) }); drawList.push(P);
  drawList.sort(function(a,b){return a.y-b.y});
  var vx0=cam.x-200, vx1=cam.x+W+200, vy0=cam.y-100, vy1=cam.y+H+300;
  for(var i=0;i<drawList.length;i++){ var o=drawList[i]; if(o.x<vx0||o.x>vx1||o.y<vy0||o.y>vy1) continue;
    if(o===P) drawPlayer(); else drawMob(o) }
  shots.each(function(s){ var x=s.x-cam.x, y=s.y-cam.y;
    if(s.e){ var f=frameAt(s.e,'ball',s.t,true); g.save(); g.translate(x,y); g.rotate(s.ang+Math.PI); spr(s.e,f,0,0,false); g.restore() }
    else { g.save(); g.translate(x,y); g.rotate(s.t*20); g.fillStyle=C['--ink2']; g.beginPath(); for(var k=0;k<8;k++){ var r=k%2?3:8; g.lineTo(Math.cos(k*Math.PI/4)*r,Math.sin(k*Math.PI/4)*r) } g.fill(); g.restore() } });
  fxs.each(function(f){ spr(f.e,frameAt(f.e,f.act,f.t,false),f.x-cam.x,f.y-cam.y,f.flip) });
  g.textAlign='center'; g.lineWidth=3; g.strokeStyle=C['--surface'];
  var NC=['--mid','--lose','--turn','--ink2'];
  nums.each(function(n){ g.globalAlpha=Math.min(1,(.8-n.t)*4); g.font=n.kind===2?'bold 26px sans-serif':'bold 20px sans-serif'; g.fillStyle=C[NC[n.kind]];
    g.strokeText(n.v,n.x-cam.x,n.y-cam.y); g.fillText(n.v,n.x-cam.x,n.y-cam.y) }); g.globalAlpha=1;
  drawHud();
}
function drawMob(m){
  var act=m.dieT>=0?'die1':m.slamA>=0?'attack1':m.hitT>=0?'hit1':'move', t=m.dieT>=0?m.dieT:m.slamA>=0?m.slamA:m.t;
  if(m.dieT>=0) g.globalAlpha=Math.max(0,1-m.dieT/m.e.tot.die1*.6);
  spr(m.e,frameAt(m.e,act,t,act==='move'),m.x-cam.x,m.y-cam.y,m.face); g.globalAlpha=1;
}
function drawPlayer(){
  var e=A.chr[P.job+'-'+P.adv], act=P.atkAnim>=0?'atk':P.moving?'walk1':'stand1', t=P.atkAnim>=0?P.atkAnim/.35*e.tot.atk:P.t;
  if(P.inv>0 && (P.inv*20|0)%2) g.globalAlpha=.4;
  spr(e,frameAt(e,act,t,act!=='atk'),P.x-cam.x,P.y-cam.y,P.face); g.globalAlpha=1;
}
function drawHud(){
  var w=220; g.fillStyle=C['--surface']; g.globalAlpha=.8; g.fillRect(12,12,w+8,22); g.globalAlpha=1;
  g.fillStyle=C['--lose']; g.fillRect(16,16,w*P.hp/P.maxHp,14);
  g.fillStyle=C['--ink']; g.font='bold 12px sans-serif'; g.textAlign='left'; g.fillText('HP '+Math.ceil(P.hp)+' / '+P.maxHp,22,27);
  g.globalAlpha=.8; g.fillStyle=C['--surface']; g.fillRect(12,36,w+8,10); g.globalAlpha=1; g.fillStyle=C['--turn']; g.fillRect(16,38,w*P.rage/(D.RAGE.need*(P.rageN+1)),6);
  if(st.boss&&st.boss.dieT<0){ var bw=420, bm=st.boss; g.globalAlpha=.85; g.fillStyle=C['--surface']; g.fillRect(W/2-bw/2-4,44,bw+8,24); g.globalAlpha=1;
    g.fillStyle=C['--lose']; g.fillRect(W/2-bw/2,48,bw*Math.max(0,bm.hp)/bm.M.hp,16); g.fillStyle=C['--ink']; g.textAlign='center'; g.fillText(bm.M.nm+'　'+Math.max(0,Math.ceil(bm.hp))+' / '+bm.M.hp,W/2,61) }
  var left=Math.max(0,st.dur-st.t), s=String(Math.floor(left%60)).padStart(2,'0');
  g.font='bold 22px sans-serif'; g.textAlign='center'; g.strokeStyle=C['--surface']; g.lineWidth=4;
  g.strokeText(Math.floor(left/60)+':'+s,W/2,34); g.fillText(Math.floor(left/60)+':'+s,W/2,34);
  g.font='bold 13px sans-serif'; g.textAlign='right'; var txt='擊倒 '+P.kills+'　楓幣 '+P.loot.meso+'　裝備 '+P.loot.items.length+'　怪物 '+mobs.n+(BENCH?'　'+fps.toFixed(0)+' fps　'+(window.__msvMs||0).toFixed(1)+' ms':'');
  g.strokeText(txt,W-14,28); g.fillText(txt,W-14,28);
  // 技能冷卻列（左下）
  var bx=14; P.acts.forEach(function(k,i){ if(!i) return; var full=lerp(k.d.cd,k.lv,k.d.max)*(1-P.S.cdr), r=Math.max(0,k.cd)/full;
    g.globalAlpha=.85; g.fillStyle=C['--surface']; g.fillRect(bx,H-34,96,22); g.fillStyle=C['--accent']; g.fillRect(bx,H-34,96*(1-r),22); g.globalAlpha=1;
    g.fillStyle=C['--ink']; g.font='bold 12px sans-serif'; g.textAlign='center'; g.fillText(k.d.nm,bx+48,H-19); bx+=102 });
  if(joy){ g.globalAlpha=.35; g.strokeStyle=C['--ink']; g.lineWidth=3; g.beginPath(); g.arc(joy.ox,joy.oy,50,0,7); g.stroke();
    g.fillStyle=C['--ink']; g.beginPath(); g.arc(joy.ox+joy.dx*50,joy.oy+joy.dy*50,20,0,7); g.fill(); g.globalAlpha=1 }
}

// ---- 主迴圈 ----
var last=0, fpsAcc=0, fpsN=0, msAcc=0;
function loop(ts){
  var dt=Math.min(.05,(ts-last)/1000||0); last=ts;
  var t0=performance.now();
  // 加速＝每幀多跑幾次 update（不放大 dt，碰撞才不會穿透）；中途結算或跳出三選一就停
  if(state==='run'){ for(var i=0;i<spd&&state==='run';i++) update(dt); draw() } else if(minis.length) drawMinis(ts/1000);
  // fps 會被螢幕更新率鎖住，另外量「每幀實際花幾毫秒」才看得出餘裕（16.7ms 以內＝60fps 守得住）
  msAcc+=performance.now()-t0; fpsAcc+=dt; fpsN++;
  if(fpsAcc>=.5){ fps=fpsN/fpsAcc; window.__msvFps=fps; window.__msvMs=msAcc/fpsN; fpsAcc=0; fpsN=0; msAcc=0 }
  requestAnimationFrame(loop);
}

// ---- 遊戲中控制列：倍速、強制結束 ----
var spd=1, ctl=document.createElement('div'); ctl.className='msv-ctl'; ctl.style.display='none'; cv.parentNode.appendChild(ctl);
function drawCtl(){ ctl.innerHTML='<button data-spd="1" title="倍速循環 1x→2x→4x（F）">'+spd+'x</button><button data-pause="1" title="暫停（P／Esc）">暫停</button>'+
  '<button data-quit="1" title="比照倒下結算：經驗 '+D.DEATH_EXP*100+'%、本場裝備與卷軸沒收">結束</button>' }
function cycleSpd(){ spd=spd===4?1:spd*2; drawCtl(); if(state==='pause') pause() }
ctl.addEventListener('click',function(e){ var b=e.target.closest('button'); if(!b||state!=='run'&&state!=='pick'&&state!=='pause') return; sfx('BtMouseClick');
  if(b.dataset.spd) cycleSpd(); else if(b.dataset.pause) state==='pause'?resume():pause(); else quitAsk() });

// 確認視窗與暫停視窗：疊在遊戲框正中（選單、關卡中共用）；Enter＝確定、Esc＝取消
var modal=document.createElement('div'), askCb=null; modal.className='msv-modal'; modal.hidden=true; cv.parentNode.appendChild(modal);
function dlg(hd,body,btns){ modal.innerHTML='<div class="msv-eqo msv-dlg"><div class="msv-eqhd">'+hd+'</div><div class="msv-mb">'+body+'</div><div class="msv-row">'+btns+'</div></div>'; modal.hidden=false; hideTip() }
function ask(txt,yes,no){ askCb={yes:yes,no:no}; dlg('確認',txt,'<button class="msv-mbtn" data-ok="1">確定（Enter）</button><button class="msv-mbtn ghost" data-ok="0">取消（Esc）</button>') }
function answer(ok){ var c=askCb; askCb=null; modal.hidden=true; if(c&&(ok?c.yes:c.no)) (ok?c.yes:c.no)() }
function pause(){ if(state!=='run'&&state!=='pause') return; state='pause'; keys={}; joy=null;
  dlg('PAUSE','<div class="msv-keys"><kbd>P</kbd><span>繼續（Esc 也可以）</span><kbd>Q</kbd><span>結束挑戰（經驗只拿 '+D.DEATH_EXP*100+'%，本場裝備與卷軸沒收）</span><kbd>F</kbd><span>倍速 1x → 2x → 4x（目前 '+spd+'x）</span></div>',
    '<button class="msv-mbtn" data-resume="1">繼續（P）</button><button class="msv-mbtn ghost" data-endq="1">結束挑戰（Q）</button>') }
function resume(){ if(state!=='pause') return; modal.hidden=true; state='run' }
function quitAsk(){ var from=state; if(from==='run'){ state='pause'; keys={}; joy=null }
  ask('確定結束挑戰？<small>比照倒下結算：經驗只拿 '+D.DEATH_EXP*100+'%，本場撿到的裝備與卷軸沒收。</small>',
    function(){ P.quit=true; pickEl.style.display='none'; end(false) }, function(){ if(from==='run') state='run'; else if(from==='pause') pause() }) }
modal.addEventListener('click',function(e){ var b=e.target.closest('button'); if(!b) return; sfx('BtMouseClick');
  if(b.dataset.ok) answer(b.dataset.ok==='1'); else if(b.dataset.resume) resume(); else if(b.dataset.endq) quitAsk() });
addEventListener('keydown',function(e){
  if(askCb){ if(e.key==='Enter'||e.key==='Escape'){ e.preventDefault(); e.stopImmediatePropagation(); answer(e.key==='Enter') } return }
  if(state!=='run'&&state!=='pause'&&state!=='pick') return;
  if(e.code==='KeyF'){ e.preventDefault(); cycleSpd() }
  else if(e.code==='KeyP'||e.key==='Escape'){ if(state==='pick') return; e.preventDefault(); state==='pause'?resume():pause() }
  else if(e.code==='KeyQ'&&state==='pause'){ e.preventDefault(); quitAsk() } },true);

// ---- 輸入 ----
var KM={ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right'};
addEventListener('keydown',function(e){ var k=KM[e.code]; if(k&&state==='run'){ keys[k]=true; e.preventDefault() }
  if(state==='pick'&&/^Digit[1-3]$/.test(e.code)){ choose(+e.code.slice(5)-1); e.preventDefault() } });
addEventListener('keyup',function(e){ var k=KM[e.code]; if(k) keys[k]=false });
addEventListener('blur',function(){ keys={} });
function lp(e){ var r=cv.getBoundingClientRect(); return [(e.clientX-r.left)/r.width*W,(e.clientY-r.top)/r.height*H] }
cv.addEventListener('pointerdown',function(e){ var p=lp(e); joy={ox:p[0],oy:p[1],dx:0,dy:0,id:e.pointerId}; cv.setPointerCapture(e.pointerId) });
cv.addEventListener('pointermove',function(e){ if(!joy||e.pointerId!==joy.id) return; var p=lp(e), dx=(p[0]-joy.ox)/50, dy=(p[1]-joy.oy)/50, l=Math.hypot(dx,dy); if(l>1){dx/=l; dy/=l} joy.dx=dx; joy.dy=dy });
['pointerup','pointercancel'].forEach(function(t){ cv.addEventListener(t,function(e){ if(joy&&e.pointerId===joy.id) joy=null }) });

// ---- 選單面板 ----
var panel=$('msv-panel'), minis=[], ui={sel:null, job:null, tab:'go'};
function view(v){ cv.style.display=ctl.style.display=v==='game'?'':'none'; panel.style.display=v==='game'?'none':''; if(v==='game'){ modal.hidden=true; drawCtl(); resize() } }
// 所有選單都包在一個視窗裡；內容太長時在視窗（或角色主畫面的 .msv-scroll）裡面捲，整個遊戲框不變
function scroller(){ return panel.querySelector('.msv-scroll')||panel.firstChild }
function show(h,cls){
  view('panel'); var sc=scroller(), top=ui.top0||!sc?0:sc.scrollTop, keep=ui.top0?[]:[].map.call(panel.querySelectorAll('.msv-keep'),function(e){ return e.scrollTop }); ui.top0=false;
  panel.innerHTML='<div class="msv-win '+(cls||'')+'">'+h+'</div>'; scroller().scrollTop=top; state='menu'; hideTip();
  [].forEach.call(panel.querySelectorAll('.msv-keep'),function(e,i){ e.scrollTop=keep[i]||0 });   // 視窗內自己捲的清單（商店），重畫後留在原位
  // data-spr="npc:1022000" / "chr:warrior-0" 的小畫布在選單迴圈裡播站立動畫
  minis=[].map.call(panel.querySelectorAll('canvas[data-spr]'),function(c){ var p=c.dataset.spr.split(':'), e=A[p[0]][p[1]], r=c.getBoundingClientRect(), d=window.devicePixelRatio||1;
    c.width=Math.round(r.width*d); c.height=Math.round(r.height*d); return {c:c, g:c.getContext('2d'), e:e, act:p[2]||(p[0]==='chr'?'stand1':'stand'), flip:p[0]==='chr'} });
}
function drawMinis(t){
  minis.forEach(function(m){ var fr=m.e.a[m.act], f=frameAt(m.e,m.act,t,true), mh=Math.max.apply(null,fr.map(function(q){return q[5]})), mw=Math.max.apply(null,fr.map(function(q){return q[2]})), k=Math.min(2,(m.c.height-8)/mh,(m.c.width-4)/mw);
    m.g.setTransform(1,0,0,1,0,0); m.g.clearRect(0,0,m.c.width,m.c.height); m.g.imageSmoothingEnabled=false;
    var x=m.c.width/2, y=m.c.height-4, im=img(m.e.src);
    m.g.translate(x,y); if(m.flip) m.g.scale(-1,1); m.g.drawImage(im,f[0],f[1],f[2],f[3],-f[4]*k,-f[5]*k,f[2]*k,f[3]*k) });
}
function fmt(sec){ return Math.floor(sec/60)+':'+String(sec%60).padStart(2,'0') }
function advNm(s){ return D.JOBS[s.job].adv[s.adv] }
function canAdv(s){ return s.adv<D.ADV_LV.length-1 && s.lv>=D.ADV_LV[s.adv+1] }
function pct(v){ return Math.round(v*1000)/10+'%' }

// 標題畫面：自製 logo（仿原作描邊金字＋楓葉，不用官方商標），整片是一顆按鈕，點一下或 Enter 進角色選擇
var LEAF='M50 4L57 20L65 16L62 38L75 25L78 32L92 29L87 44L94 47L72 64L75 72L53 69L54 94L46 94L47 69L25 72L28 64L6 47L13 44L8 29L22 32L25 25L38 38L35 16L43 20Z';
var LOGO='<svg class="msv-logo" viewBox="0 0 600 270" role="img" aria-label="楓之谷倖存者"><defs><linearGradient id="msv-lg" x1="0" y1="0" x2="0" y2="1">'+
  '<stop offset="0" style="stop-color:var(--msv-cream)"/><stop offset=".35" style="stop-color:var(--msv-gold)"/><stop offset="1" style="stop-color:var(--msv-orange)"/></linearGradient></defs>'+
  '<path d="'+LEAF+'" transform="translate(52 0) rotate(-18 50 50) scale(1.15)" style="fill:var(--msv-leaf);stroke:var(--msv-brown);stroke-width:5;stroke-linejoin:round"/>'+
  '<text x="315" y="150" text-anchor="middle" style="font:700 132px \'Noto Sans TC\',sans-serif;letter-spacing:8px;fill:url(#msv-lg);stroke:var(--msv-brown);stroke-width:16;stroke-linejoin:round;paint-order:stroke">楓之谷</text>'+
  '<path d="M160 186H440L422 210L440 234H160L178 210Z" style="fill:var(--msv-red);stroke:var(--msv-brown);stroke-width:5;stroke-linejoin:round"/>'+
  '<text x="300" y="222" text-anchor="middle" style="font:700 34px \'Noto Sans TC\',sans-serif;letter-spacing:22px;fill:var(--msv-cream)">倖存者</text>'+
  '<text x="300" y="262" text-anchor="middle" style="font:700 18px \'Hanken Grotesk\',sans-serif;letter-spacing:6px;fill:var(--msv-cream);stroke:var(--msv-brown);stroke-width:5;paint-order:stroke">MAPLE SURVIVORS</text></svg>';
function titleScreen(){
  bgm('menu');
  // 怪物在右下那片地面上來回巡邏：[怪物, 起點 left%, 終點 left%, 週期秒, 起始偏移秒]
  var walk=[[100100,95,68,14,0],[1210102,88,64,11,-4],[120100,97,76,9,-2],[130101,84,63,12,-7]];
  show('<button class="msv-title" data-act="home">'+LOGO+'<span class="msv-start">開始遊戲</span><span class="msv-press">點一下或按 Enter</span><span class="msv-press">Alt（Mac 是 Option）＋ Enter 全螢幕</span>'+
    walk.map(function(w){ return '<span class="msv-walker" style="--a:'+w[1]+'%;--b:'+w[2]+'%;animation-duration:'+w[3]+'s;animation-delay:'+w[4]+'s"><canvas data-spr="mob:'+w[0]+':move"></canvas></span>' }).join('')+
    '<span class="msv-legal">非官方同人作品・遊戲素材 © NEXON</span></button>','title');
}
addEventListener('keydown',function(e){ if(e.key==='Enter'&&!e.altKey&&panel.querySelector('.msv-title')){ e.preventDefault(); slotsScreen() } });
function slotsScreen(){
  var h='<h3>選擇角色</h3><div class="msv-grid">';
  SV.slots.forEach(function(s,i){
    if(!s){ h+='<button class="msv-slot empty" data-new="'+i+'">＋ 建立角色</button>'; return }
    var r=s.st.s1;
    h+='<button class="msv-slot'+(ui.sel===i?' on':'')+'" data-slot="'+i+'"><canvas data-spr="chr:'+s.job+'-'+s.adv+'"></canvas>'+
       '<span class="nm">'+esc(s.nm)+'</span><span class="sub">Lv.'+s.lv+'　'+advNm(s)+'</span>'+
       '<span class="sub">EXP '+Math.floor(s.exp/D.exp(s.lv)*100)+'%'+(s.ap||s.sp||canAdv(s)?'・<b>有點數可以分配</b>':'')+'</span>'+
       '<span class="sub">'+(r?esc(D.STAGES.s1.nm)+' 最久 '+fmt(r.best)+(r.clears?'・通關 '+r.clears+' 次':''):'尚未挑戰')+'</span></button>';
  });
  h+='</div><div class="msv-row">';
  var s=ui.sel!=null&&SV.slots[ui.sel];
  if(!s) h+='<span class="hint">點選一個角色，或建立新角色</span>';
  else h+='<button class="game-btn" data-act="enter">進入</button><button class="game-btn ghost" data-act="del">刪除角色</button>';
  show(h+'</div><div class="msv-row"><button class="game-btn ghost" data-act="export">匯出存檔</button><button class="game-btn ghost" data-act="import">匯入存檔</button></div><span class="hint">Alt（Mac 是 Option）＋ Enter 全螢幕</span>','bare');
}
function createScreen(i){
  var h='<h3>選擇你的職業</h3><p class="hint">到各村莊找轉職教官，選一條要走的路。</p><div class="msv-grid">';
  Object.keys(D.JOBS).forEach(function(k){ var J=D.JOBS[k];
    h+='<button class="msv-slot'+(ui.job===k?' on':'')+'" data-job="'+k+'"><canvas data-spr="npc:'+J.npc+'"></canvas>'+
       '<span class="sub">'+J.town+'・'+J.npcNm+'</span><span class="nm">'+J.nm+'</span><span class="sub">'+J.tag+'・主屬性 '+J.main.toUpperCase()+'</span><span class="sub">'+J.line+'</span></button>' });
  h+='</div><div class="msv-row"><input class="msv-in" id="msv-nm" maxlength="12" placeholder="角色名字" aria-label="角色名字">'+
     '<button class="game-btn" data-act="create" data-i="'+i+'"'+(ui.job?'':' disabled')+'>建立角色</button><button class="game-btn ghost" data-act="back">返回</button></div>';
  var keep=$('msv-nm')&&$('msv-nm').value; show(h,'bare'); if(keep) $('msv-nm').value=keep;
}

// ---- 物品顯示 ----
// tip＝滑鼠移上去要顯示的說明框（見「滑鼠提示」）；沒有 tip 才用瀏覽器原生 title
function ico(f,title,tip,set){ set=set||A.ico.items; return '<i class="msv-ico"'+(tip?' data-tip="'+tip+'"':' title="'+esc(title||'')+'"')+' style="width:'+f[2]+'px;height:'+f[3]+'px;background-image:url(maple-survivors/assets/'+set.src+');background-position:-'+f[0]+'px -'+f[1]+'px"></i>' }
function itIco(id,tip){ return ico(A.ico.items.a.eq[A.itm[id].i],'',tip||'id:'+id) }
function skIco(id,off){ var f=A.ico.skills.a[id]; return f?ico(f[off?1:0],D.SK[id].nm,'',A.ico.skills):'' }
function qCls(it){ return it.q>0?'q-up':it.q<0?'q-dn':'' }
function mesoIco(){ return ico(A.ico.items.a.meso0[0],'楓幣') }
function scIco(sc){ return ico(A.ico.items.a.sc[sc.icon],(sc.t==='w'?'武器':'防具')+'卷軸 '+sc.pct*100+'%') }
function stTxt(st){ return Object.keys(st).map(function(k){ return D.ST_NM[k]+' +'+st[k] }).join('、')||'無' }
function rqTxt(m,free){ if(free) return 'Lv.0'; var a=['Lv.'+m.req]; for(var k in m.rq) a.push(k.toUpperCase()+' '+m.rq[k]); return a.join('、') }
function slotNm(k){ for(var i=0;i<D.EQ_SLOTS.length;i++) if(D.EQ_SLOTS[i][0]===k) return D.EQ_SLOTS[i][1] }
function sellP(m){ return Math.floor(D.PRICE(m.price)*D.SELL) }
function scSellP(sc){ return Math.floor(sc.price*D.SELL) }
function fxTxt(sc){ var f=sc.fx; return sc.t==='w'?'攻擊 +'+f.atk+(f.main?'、主屬性 +'+f.main:''):'主屬性 +'+f.main+'、防禦 +'+f.pdd }
function selItem(s){ return !ui.it?null:ui.it.from==='eqp'?s.eqp[ui.it.k]:s.inv[ui.it.k] }

// 自動清理：灰字＝浮動比原始差；「全部」不含身上穿的與稀有裝備
function sellList(s,kind){ return s.inv.filter(function(it){ return kind==='all'?!A.itm[it.id].rare:it.q<0 }) }
function sellBtn(s,kind,nm){ var l=sellList(s,kind), p=l.reduce(function(a,it){ return a+sellP(A.itm[it.id]) },0);
  return '<button class="msv-mbtn" data-sell="'+kind+'" data-nm="'+nm+'"'+(l.length?'':' disabled')+'>'+nm+'（'+l.length+'）</button>' }
// 原作裝備欄（5×6）：[部位 key 或 名稱, 欄, 列, 底色 r 戒指／b 藍]；key 在 D.EQ_SLOTS 裡的才能穿，其餘先鎖住
var EQ_GRID=[['戒指',1,1,'r'],['戒指',1,2,'r'],['戒指',1,3,'r'],['戒指',1,4,'r'],['口袋',1,5],
  ['墜飾',2,2,'b'],['墜飾',2,3,'b'],['weapon',2,4],['腰帶',2,5],
  ['cap',3,1],['臉飾',3,2],['眼飾',3,3],['coat',3,4],['pants',3,5],['shoes',3,6],
  ['耳飾',4,3],['肩飾',4,4],['glove',4,5],['機器人',4,6],
  ['能源',5,1,'b'],['胸章',5,2,'b'],['勳章',5,3,'b'],['副手武器',5,4,'b'],['cape',5,5],['心臟',5,6]];
var LOCK='<svg viewBox="0 0 16 16" class="msv-lock" aria-hidden="true"><path d="M4 7V5a4 4 0 0 1 8 0v2h1v8H3V7zm2 0h4V5a2 2 0 0 0-4 0z"/></svg>';
function eqTab(s){
  var S=calc(s), h='<div class="msv-eqwrap">'+
    '<div class="msv-eqo"><div class="msv-eqhd">EQUIPMENT INVENTORY</div><div class="msv-eqtabs"><span class="on">裝備</span><span>現金</span><span>寵物</span></div><div class="msv-equip"><canvas class="msv-eqbg" data-spr="chr:'+s.job+'-'+s.adv+'"></canvas>';
  EQ_GRID.forEach(function(e){ var k=e[0], pos='grid-area:'+e[2]+'/'+e[1], c=e[3]?' '+e[3]:'';
    if(!slotNm(k)){ h+='<span class="msv-cell lock'+c+'" style="'+pos+'" title="尚未開放">'+e[0]+LOCK+'</span>'; return }
    var it=s.eqp[k], ov=k==='pants'&&s.eqp.coat&&A.itm[s.eqp.coat.id].ov, on=ui.it&&ui.it.from==='eqp'&&ui.it.k===k;
    h+='<button class="msv-cell'+c+(on?' on':'')+'" style="'+pos+'" data-eqp="'+k+'"'+(it?'':' disabled')+'>'+(it?itIco(it.id,'eqp:'+k):ov?'套服':slotNm(k))+'</button>' });
  // 右邊：原作 ITEM INVENTORY（目前只有裝備分頁），楓幣在視窗底部
  h+='</div><div class="msv-meso">攻擊力 <b>'+Math.round(S.atk)+'</b>・HP <b>'+S.maxHp+'</b>・減傷 <b>'+pct(S.def)+'</b></div></div><div class="msv-invcol"><div class="msv-eqo"><div class="msv-eqhd">ITEM INVENTORY</div><div class="msv-eqtabs"><span class="on">裝備</span><span>消耗</span><span>裝飾</span><span>其他</span><span>特殊</span></div>'+
    '<div class="msv-mb">'+bagCells(s,'inv')+'</div>'+mesoBar(s)+'</div>'+itemActs(s)+'</div></div>';
  return h;
}
// 背包格子：attr＝點下去的 data 屬性（裝備頁 inv、商店 sinv）；空格補到背包上限
function bagCells(s,attr){
  var h='<div class="msv-bag">';
  s.inv.forEach(function(it,i){ var on=ui.it&&ui.it.from==='inv'&&ui.it.k===i;
    h+='<button class="msv-cell'+(on?' on':'')+(whyNot(s,it)?' no':'')+'" data-'+attr+'="'+i+'">'+itIco(it.id,'inv:'+i)+(it.up?'<span>+'+it.up+'</span>':'')+'</button>' });
  for(var k=s.inv.length;k<D.INV_MAX;k++) h+='<span class="msv-cell"></span>';
  return h+'</div>';
}
function mesoBar(s){ return '<div class="msv-meso">'+mesoIco()+'<b>'+s.meso.toLocaleString()+'</b><span>'+s.inv.length+' / '+D.INV_MAX+'</span></div>' }
// 選中裝備的操作（數值看滑鼠提示，這裡只放按鈕）；按兩下格子直接穿／脫
function itemActs(s){
  var it=selItem(s); if(!it) return '<p class="hint">滑鼠移上去看數值；點一下選取（強化），按兩下直接穿上／卸下；要賣到商店。紅框＝還穿不了。</p>';
  var m=A.itm[it.id], why=whyNot(s,it), h='<div class="msv-row">';
  if(ui.it.from==='inv') h+='<button class="game-btn" data-act="wear"'+(why?' disabled':'')+'>'+(why||'裝備')+'</button>';
  else h+='<button class="game-btn ghost" data-act="unwear"'+(s.inv.length>=D.INV_MAX?' disabled':'')+'>'+(s.inv.length>=D.INV_MAX?'背包滿了':'卸下')+'</button>';
  if(it.tuc>0){ var t=m.s==='weapon'?'w':'a', any=0;
    D.SCROLLS.forEach(function(sc){ if(sc.t!==t||!s.scr[sc.k]) return; any=1;
      h+='<button class="game-btn ghost" data-scroll="'+sc.k+'">'+ico(A.ico.items.a.sc[sc.icon])+' '+sc.pct*100+'%'+(sc.dark?'詛咒':'')+' ×'+s.scr[sc.k]+'</button>' });
    if(!any) h+='<span class="hint">沒有'+(t==='w'?'武器':'防具')+'卷軸</span>' }
  return h+'</div>';
}
function shopTab(s){
  // 原作 NPC 商店：左邊店家貨架、右邊自己的物品；楓幣與分頁固定在上面，只有兩欄清單各自捲
  var J=D.JOBS[s.job], full=s.inv.length>=D.INV_MAX, tab=ui.shop||'sc', L='', R='';
  if(tab==='sc'){
    D.SCROLLS.forEach(function(sc){
      L+='<div class="msv-srow">'+scIco(sc)+'<div><b>'+(sc.t==='w'?'武器':'防具')+'卷軸 '+sc.pct*100+'%</b>'+(sc.dark?' <span class="msv-dark">詛咒</span>':'')+'<small>成功：'+fxTxt(sc)+(sc.dark?'・失敗 50% 爆裝':'')+'</small></div>'+
        '<span class="msv-price">'+mesoIco()+sc.price.toLocaleString()+'</span><button class="msv-mbtn" data-buysc="'+sc.k+'"'+(s.meso<sc.price?' disabled':'')+'>購買</button></div>' });
  } else {
    Object.keys(A.itm).filter(function(id){ var m=A.itm[id]; return !m.rare&&jobOk(s,m)&&m.req<=s.lv+10&&(m.s==='weapon')===(tab==='w') })
      .sort(function(a,b){ return A.itm[a].req-A.itm[b].req }).forEach(function(id){ var m=A.itm[id], p=D.PRICE(m.price);
        L+='<div class="msv-srow">'+itIco(id)+'<div><b>'+m.nm+'</b><small>'+slotNm(m.s)+'・需求 '+rqTxt(m)+'</small></div>'+
          '<span class="msv-price">'+mesoIco()+p.toLocaleString()+'</span><button class="msv-mbtn" data-buyeq="'+id+'"'+(s.meso<p||full?' disabled':'')+'>'+(full?'滿了':'購買')+'</button></div>' });
  }
  // 右欄＝自己的物品：不管左邊在哪個分頁，裝備與卷軸都能賣
  var it=ui.it&&ui.it.from==='inv'&&s.inv[ui.it.k];
  R=bagCells(s,'sinv')+'<div class="msv-row">'+(it?'<button class="msv-mbtn" data-act="sell">賣出 '+A.itm[it.id].nm+'（'+sellP(A.itm[it.id]).toLocaleString()+' 楓幣）</button>':'<small>點一下裝備選取，再按賣出</small>')+'</div>'+
    '<div class="msv-row">'+sellBtn(s,'grey','賣出灰字')+sellBtn(s,'all','全部賣出')+'</div>';
  D.SCROLLS.forEach(function(sc){ if(s.scr[sc.k]) R+='<div class="msv-srow">'+scIco(sc)+'<div><b>'+(sc.t==='w'?'武器':'防具')+'卷軸 '+sc.pct*100+'%</b><small>持有 '+s.scr[sc.k]+'</small></div>'+
    '<button class="msv-mbtn" data-sellsc="'+sc.k+'">賣 1 張（'+scSellP(sc)+'）</button></div>' });
  return '<div class="msv-eqo msv-shop"><div class="msv-eqhd">SHOP</div><div class="msv-shoptop"><canvas data-spr="npc:'+J.npc+'"></canvas><div><b>'+J.town+'雜貨商店</b><small>'+J.nm+'與共用裝備，Lv.'+(s.lv+10)+' 以下；稀有裝備只會掉落</small></div>'+mesoBar(s)+'</div>'+
    '<div class="msv-eqtabs">'+[['sc','卷軸'],['w','武器'],['a','防具']].map(function(t){ return '<button data-shop="'+t[0]+'"'+(tab===t[0]?' class="on"':'')+'>'+t[1]+'</button>' }).join('')+'</div>'+
    '<div class="msv-shopcols"><div class="msv-mb msv-keep">'+L+'</div><div class="msv-mb msv-keep"><div class="msv-cap">我的物品</div>'+R+'</div></div></div>';
}
// 圖鑑：怪物與掉落表（裝備數值看滑鼠提示）
function codexTab(s){
  var h='';
  Object.keys(D.MOBS).forEach(function(id){ var M=D.MOBS[id], t=dropTable(id), own=t.eq.filter(function(i){ return jobOk(s,A.itm[i]) });
    var where=Object.keys(D.STAGES).filter(function(k){ return stageMobs(D.STAGES[k]).indexOf(+id)>=0 }).map(function(k){ return D.STAGES[k].nm });
    h+='<div class="msv-line mob" id="msv-cx-'+id+'"><canvas data-spr="mob:'+id+'"></canvas><div><b>'+M.nm+'</b> <span class="hint">Lv.'+M.lv+'・HP '+M.hp+'・經驗 '+M.exp+(M.boss?'・BOSS':'')+'・出現：'+(where.join('、')||'尚未開放')+'</span>'+
      '<div class="hint">掉落 '+t.eq.length+' 種裝備（'+D.JOBS[s.job].nm+'能用 '+own.length+' 種）'+(t.rare.length?'，稀有 '+t.rare.length+' 種':'')+'・'+mesoIco()+' 楓幣 '+scIco(D.SCROLLS[0])+' 卷軸</div>'+
      '<div class="msv-drops">'+t.rare.map(function(i){ return '<span class="rare">'+itIco(i)+'</span>' }).join('')+own.map(function(i){ return itIco(i) }).join('')+'</div></div></div>' });
  return h;
}

// 角色主畫面：上方角色資訊＋分頁
function hubScreen(){
  var s=SV.slots[ui.sel], tabs=[['go','出發'],['stat','能力值'+(s.ap?' ('+s.ap+')':'')],['skill','技能'+(s.sp?' ('+s.sp+')':'')],['eq','裝備'],['shop','商店'],['codex','圖鑑']];
  if(canAdv(s)) tabs.push(['adv','轉職！']);
  var h='<div class="msv-hub"><canvas data-spr="chr:'+s.job+'-'+s.adv+'"></canvas><div><div class="nm">'+esc(s.nm)+(s.title?' <span class="hint">「'+esc(s.title)+'」</span>':'')+'</div>'+
    '<div class="hint">Lv.'+s.lv+'　'+advNm(s)+'</div><div class="msv-bar"><i style="width:'+Math.floor(s.exp/D.exp(s.lv)*100)+'%"></i></div>'+
    '<div class="hint">EXP '+s.exp+' / '+D.exp(s.lv)+'</div></div><button class="game-btn ghost" data-act="home">回到角色選擇</button></div><div class="msv-tabs" role="tablist">';
  tabs.forEach(function(t){ h+='<button role="tab" aria-selected="'+(ui.tab===t[0])+'" data-tab="'+t[0]+'">'+t[1]+'</button>' });
  h+='</div><div class="msv-scroll"><div class="msv-tab'+(ui.tab==='shop'?' full':'')+'">'+({go:goTab,stat:statTab,skill:skillTab,eq:eqTab,shop:shopTab,codex:codexTab,adv:advTab}[ui.tab]||goTab)(s)+'</div></div>';
  show(h,'fix');
}
function goTab(s){
  return Object.keys(D.STAGES).map(function(id){ var g2=D.STAGES[id], r=s.st[id], ok=unlocked(s,id), B=g2.boss&&D.MOBS[g2.boss.id];
    var goal=B?'打倒'+B.nm+'（'+fmt(g2.boss.t)+' 出場，時限 '+fmt(g2.dur)+'）'+(D.FIRST_CLEAR[id]&&!(r&&r.clears)?'・首通送稀有武器':''):'撐過 '+fmt(g2.dur)+' 通關';
    return '<div class="msv-line'+(ok?'':' off')+'"><div><b>'+esc(g2.nm)+'</b> <span class="hint">建議 Lv.'+g2.rec+'</span><div class="hint">'+goal+'・'+(r?'最久 '+fmt(r.best)+(r.clears?'・通關 '+r.clears+' 次':''):'尚未挑戰')+'</div>'+
      '<div class="msv-mobs">'+stageMobs(g2).map(function(m){ return '<button data-cxmob="'+m+'"><canvas data-spr="mob:'+m+'"></canvas><span>'+D.MOBS[m].nm+'<br>Lv.'+D.MOBS[m].lv+'</span></button>' }).join('')+'</div></div>'+
      '<button class="game-btn" data-stage="'+id+'"'+(ok?'':' disabled')+'>'+(ok?'出發':'先通關上一關')+'</button></div>' }).join('')+
    '<p class="hint">帶進關卡的技能：'+(loadout(s).map(function(id){return skIco(id)+' '+D.SK[id].nm}).join('、')||'只有基本攻擊')+'</p>';
}
// 原作 CHARACTER STAT＋DETAIL 兩個視窗：上面角色資訊、中間 AP、下面四圍各一顆 ▲
function kv(k,v,cls){ return '<div class="msv-kv'+(cls?' '+cls:'')+'"><span>'+k+'</span><b>'+v+'</b></div>' }
function statTab(s){
  var S=calc(s), J=D.JOBS[s.job], cost=D.AP_RESET(s.lv), h='<div class="msv-eqwrap msv-stwrap"><div class="msv-eqo msv-stw"><div class="msv-eqhd">CHARACTER STAT</div><div class="msv-mb">'+
    kv('名稱',esc(s.nm))+kv('職業',advNm(s))+kv('等級',s.lv)+kv('經驗',s.exp+' ('+Math.floor(s.exp/D.exp(s.lv)*100)+'%)')+kv('HP',S.maxHp)+kv('稱號',s.title?esc(s.title):'—')+
    '<div class="msv-kv ap"><span>能力點 AP</span><b>'+s.ap+'</b></div>';
  D.STATS.forEach(function(k){ var nm=D.STAT_NM[k].split(' ')[0], tag=k===J.main?'主':k===J.sub?'副':'';
    h+='<div class="msv-kv st"><span>'+nm+(tag?'<i>'+tag+'</i>':'')+'</span><b>'+s[k]+(S.q[k]!==s[k]?' <em>(+'+(S.q[k]-s[k])+')</em>':'')+'</b>'+
      '<button class="msv-up" data-stat="'+k+'" data-n="1" title="+1"'+(s.ap?'':' disabled')+'>▲</button><button class="msv-up x5" data-stat="'+k+'" data-n="5" title="+5"'+(s.ap>=5?'':' disabled')+'>+5</button></div>' });
  h+='</div></div><div class="msv-eqo msv-stw"><div class="msv-eqhd">DETAIL</div><div class="msv-mb">'+
    kv('攻擊力',Math.round(S.atk))+kv(s.job==='magician'?'武器魔攻':'武器攻擊',S.W)+kv('防禦',S.q.pdd)+kv('減傷',pct(S.def))+kv('迴避',Math.round(S.evaPts))+kv('閃避率',pct(S.eva))+
    kv('爆擊率',pct(S.crit))+kv('技能傷害',pct(S.dmg))+kv('冷卻縮短',pct(S.cdr))+kv('移動速度',Math.round(S.spd))+
    '</div><button class="msv-mbtn" data-act="ap-reset"'+(s.meso>=cost?'':' disabled')+'>重置 AP（'+cost.toLocaleString()+' 楓幣）</button></div></div>';
  return h;
}
// 原作 SKILL 視窗：轉職分頁（還沒到的看不到）、每列圖示＋名稱＋等級＋▲，說明看滑鼠提示（data-tip="sk:id"）
function skillTab(s){
  var J=D.JOBS[s.job], used=loadout(s).length, pg=Math.min(ui.skAdv||s.adv,s.adv), body='', tabs='';
  for(var a=s.adv?1:0;a<=s.adv;a++) tabs+='<button data-skadv="'+a+'"'+(pg===a?' class="on"':'')+'>'+['見習','一轉','二轉','三轉','四轉'][a]+'</button>';
  if(!s.adv) body='<p class="msv-empty">'+J.adv[0]+'還沒有技能。Lv.'+D.ADV_LV[1]+' 時回去找'+J.npcNm+'轉職。</p>';
  else Object.keys(D.SK).filter(function(id){ return D.SK[id].job===s.job&&D.SK[id].adv===pg })
    .sort(function(a,b){ return (D.SK[b].act?1:0)-(D.SK[a].act?1:0) })   // 主動在前
    .forEach(function(id){ var d=D.SK[id], lv=s.sk[id]||0, on=s.load.indexOf(+id)>=0;
      body+='<div class="msv-skr'+(lv?'':' off')+'" data-tip="sk:'+id+'">'+skIco(id,!lv)+'<div><b>'+d.nm+'</b><small>'+(d.act?'主動':'被動')+'</small></div><span class="msv-sklv">'+lv+' / '+d.max+'</span>'+
        (d.act&&lv?'<button class="msv-mbtn'+(on?' on':'')+'" data-load="'+id+'" aria-pressed="'+on+'">'+(on?'✓ 已帶':'帶進關卡')+'</button>':'<span></span>')+
        '<button class="msv-up" data-skill="'+id+'" title="+1"'+(!s.sp||lv>=d.max?' disabled':'')+'>▲</button></div>' });
  return '<div class="msv-eqo msv-skw"><div class="msv-eqhd">SKILL</div><div class="msv-eqtabs">'+tabs+'</div><div class="msv-mb">'+
    '<div class="msv-skjob">'+advNm(s)+'<small>勾選的主動技能會在關卡中自動施放・技能欄 '+used+' / '+D.SLOTS[s.adv]+'</small></div>'+body+'</div>'+
    '<div class="msv-meso"><span>SKILL POINT</span><b>'+s.sp+'</b></div></div>';
}
// 技能在某等級的實際數值（跟 cast()／calc() 用同一套 lerp），例：「攻擊力 133% 傷害 2 次，冷卻 1.8 秒」
var MODTXT={hp:['最大HP +','%'], def:['受到的傷害 −','%'], eva:['迴避 +',''], crit:['爆擊率 +','%'], dmg:['傷害 +','%'], cdr:['冷卻時間 −','%'], spd:['移動速度 +','%'], range:['射程 +','%'], final:['','% 機率追擊一次（60% 傷害）']};
function skFx(d,lv){
  var V=function(k){ return lerp(d[k],lv,d.max) }, n1=function(v){ return +v.toFixed(1) }, o=[], dm='攻擊力 '+Math.round(V('dmg')*100)+'% 傷害';
  if(d.k==='slash') o.push((d.arc>6?'身邊一圈':'前方')+'的怪物受到'+dm);
  if(d.k==='shot'){ var n=Math.round(V('n')||1), pr=Math.round(V('pierce')||1); o.push(dm+(n>1?' × '+n+' 發':'')+(pr>1?'，每發穿透 '+pr+' 隻':'')+(d.splash?'，命中後爆炸':'')) }
  if(d.k==='strike') o.push('最近的 '+Math.round(V('n'))+' 隻，各受到'+dm+' '+d.hits+' 次');
  if(d.k==='mist') o.push('半徑 '+Math.round(V('r'))+' 的毒霧，每 0.5 秒'+dm+'，持續 '+d.dur+' 秒');
  if(d.k==='buff') o.push('持續 '+n1(V('dur'))+' 秒');
  for(var k in d.mods){ var v=lerp(d.mods[k],lv,d.max); o.push(k==='inv'?'不會受傷':MODTXT[k][0]+(MODTXT[k][1]?n1(v*100):Math.round(v))+MODTXT[k][1]) }
  if(d.cd) o.push('冷卻 '+n1(V('cd'))+' 秒');
  return o.join('，');
}
function advTab(s){
  var J=D.JOBS[s.job];
  return '<div class="msv-hub"><canvas data-spr="npc:'+J.npc+'"></canvas><div><b>'+J.npcNm+'</b><p>「'+esc(s.nm)+'，你已經 Lv.'+s.lv+' 了。準備好成為<b>'+J.adv[s.adv+1]+'</b>了嗎？」</p>'+
    '<p class="hint">轉職後獲得 '+D.SP_ADV+' SP，之後每升一級 '+D.SP_LV+' SP；技能欄變成 '+D.SLOTS[s.adv+1]+' 格。</p>'+
    '<button class="game-btn" data-act="adv">轉職成為'+J.adv[s.adv+1]+'</button></div></div>';
}
function resultScreen(win,gain,up){
  var s=SV.slots[slot], h='<h3>'+(win?'通關！':P.quit?'結束挑戰':P.hp>0?'時間到…':'倒下了…')+'</h3><p class="hint">存活 '+fmt(Math.floor(st.t))+'・擊倒 '+P.kills+' 隻</p>'+
    '<p>經驗 +'+gain+(win?'':'<span class="hint">（'+(P.quit?'中途結束':'死亡')+'只結算 '+D.DEATH_EXP*100+'%，原本 '+P.exp+'）</span>')+'</p>';
  if(s) h+=(up?'<p><b>等級提升！Lv.'+(s.lv-up)+' → Lv.'+s.lv+'</b>　獲得 AP '+up*D.AP_LV+(s.adv?'、SP '+up*D.SP_LV:'')+'</p>':'')+
    (canAdv(s)?'<p><b>可以轉職了！</b>回角色畫面找'+D.JOBS[s.job].npcNm+'。</p>':'')+
    '<div class="msv-bar"><i style="width:'+Math.floor(s.exp/D.exp(s.lv)*100)+'%"></i></div><p class="hint">Lv.'+s.lv+'　EXP '+s.exp+' / '+D.exp(s.lv)+'</p>';
  if(s){ var L=P.loot, sc=Object.keys(L.scr);
    h+='<p>楓幣 +'+L.meso+'</p>';
    if(P.first) h+='<p><b>首次通關獎勵！</b>楓幣 +'+P.first.meso+'、稱號「'+esc(P.first.title)+'」'+(P.first.item?'、'+itIco(P.first.item.id)+' '+A.itm[P.first.item.id].nm:'')+'</p>';
    if(L.items.length||sc.length) h+='<p class="hint">'+(win?'獲得':'<b>死亡沒收</b>')+'：</p><div class="msv-drops'+(win?'':' lost')+'">'+L.items.map(function(it,i){ return itIco(it.id,'loot:'+i) }).join('')+
      sc.map(function(k){ var d2=D.SCROLLS.filter(function(x){ return x.k===k })[0]; return ico(A.ico.items.a.sc[d2.icon],d2.pct*100+'% 卷軸')+'×'+L.scr[k] }).join('')+'</div>' }
  show(h+'<div class="msv-row"><button class="game-btn" data-act="again">再挑戰一次</button><button class="game-btn ghost" data-act="hub">回到角色畫面</button></div>');
}
function exportScreen(){
  show('<h3>匯出存檔</h3><p class="hint">複製下面整段文字保存起來，換瀏覽器或裝置時用「匯入存檔」貼回去。</p>'+
    '<textarea class="msv-ta" id="msv-ta" readonly>'+esc(JSON.stringify(SV))+'</textarea>'+
    '<div class="msv-row"><button class="game-btn" data-act="copy">複製</button><button class="game-btn ghost" data-act="home">返回</button></div>');
}
function importScreen(){
  var keep=$('msv-ta')&&!$('msv-ta').readOnly?$('msv-ta').value:'';
  show('<h3>匯入存檔</h3><p class="hint">貼上之前匯出的文字。<b>匯入會覆蓋目前全部 4 個角色。</b></p><textarea class="msv-ta" id="msv-ta"></textarea>'+
    '<div class="msv-row"><button class="game-btn" data-act="imp">匯入</button><button class="game-btn ghost" data-act="home">返回</button></div>');
  $('msv-ta').value=keep;
}

panel.addEventListener('dblclick',function(e){
  var b=e.target.closest('[data-inv],[data-eqp]'), s=SV.slots[ui.sel]; if(!b||!s) return;
  if(b.dataset.inv!=null){ var i=+b.dataset.inv; if(!s.inv[i]||whyNot(s,s.inv[i])) return; var wm=A.itm[s.inv[i].id]; equip(s,i); ui.it={from:'eqp',k:wm.s} }
  else { var sl=b.dataset.eqp; if(!s.eqp[sl]||s.inv.length>=D.INV_MAX) return; s.inv.push(s.eqp[sl]); delete s.eqp[sl]; ui.it=null }
  persist(); sfx('BtMouseClick'); hubScreen();
});
panel.addEventListener('click',function(e){
  var b=e.target.closest('button'); if(!b||b.disabled) return; var d=b.dataset, s=SV.slots[ui.sel]; sfx(d.tab||d.shop||d.skadv?'Tab':'BtMouseClick');
  if(d.slot!=null){ ui.sel=+d.slot; slotsScreen() }
  else if(d.new!=null){ ui.job=null; createScreen(+d.new) }
  else if(d.job){ ui.job=d.job; createScreen(+panel.querySelector('[data-act=create]').dataset.i) }
  else if(d.tab){ ui.tab=d.tab; ui.it=null; ui.top0=true; hubScreen() }
  else if(d.cxmob){ ui.tab='codex'; ui.top0=true; hubScreen(); var to=$('msv-cx-'+d.cxmob); if(to) scroller().scrollTop=to.offsetTop-8 }
  else if(d.shop){ ui.shop=d.shop; ui.it=null; ui.top0=true; hubScreen() }
  else if(d.sinv!=null){ ui.it={from:'inv',k:+d.sinv}; hubScreen() }
  else if(d.skadv){ ui.skAdv=+d.skadv; ui.top0=true; hubScreen() }
  else if(d.sell){ var l=sellList(s,d.sell), got=l.reduce(function(a,it){ return a+sellP(A.itm[it.id]) },0);
    ask(d.nm+'：確定賣出 '+l.length+' 件？<small>可以拿到 '+got.toLocaleString()+' 楓幣。身上穿的與稀有裝備不會賣。</small>',function(){
      l.forEach(function(it){ s.inv.splice(s.inv.indexOf(it),1) }); s.meso+=got; ui.it=null; persist(); sfx('BuyShopItem'); msg('賣掉 '+l.length+' 件，獲得 '+got+' 楓幣'); hubScreen() }) }
  else if(d.eqp||d.inv!=null){ var from=d.eqp?'eqp':'inv', k=d.eqp||+d.inv;   // 點已選的那格不重畫，不然按兩下的第二下會落在被換掉的節點上
    if(!ui.it||ui.it.from!==from||ui.it.k!==k){ ui.it={from:from,k:k}; hubScreen() } }
  else if(d.act==='wear'){ if(!whyNot(s,s.inv[ui.it.k])){ var wm=A.itm[s.inv[ui.it.k].id]; equip(s,ui.it.k); ui.it={from:'eqp',k:wm.s}; persist() } hubScreen() }
  else if(d.act==='unwear'){ var sl=ui.it.k; if(s.eqp[sl]&&s.inv.length<D.INV_MAX){ s.inv.push(s.eqp[sl]); delete s.eqp[sl]; ui.it={from:'inv',k:s.inv.length-1}; persist() } hubScreen() }
  else if(d.act==='sell'){ var si=s.inv[ui.it.k]; s.meso+=sellP(A.itm[si.id]); s.inv.splice(ui.it.k,1); ui.it=null; persist(); msg('賣掉了'); hubScreen() }
  else if(d.scroll){ var it2=selItem(s), sc2=D.SCROLLS.filter(function(x){ return x.k===d.scroll })[0];
    if(it2&&s.scr[sc2.k]>0&&it2.tuc>0){ s.scr[sc2.k]--; var res=useScroll(s,it2,sc2);
      sfx({ok:'EnchantSuccess',fail:'EnchantFailure',boom:'EnchantDestroyed'}[res]);
      if(res==='boom'){ if(ui.it.from==='eqp') delete s.eqp[ui.it.k]; else s.inv.splice(ui.it.k,1); ui.it=null }
      msg({ok:'強化成功！',fail:'強化失敗…（用掉一次強化次數）',boom:'詛咒發動，裝備爆掉了！'}[res]); persist() } hubScreen() }
  else if(d.sellsc){ var sc4=D.SCROLLS.filter(function(x){ return x.k===d.sellsc })[0]; if(s.scr[sc4.k]>0){ s.scr[sc4.k]--; s.meso+=scSellP(sc4); persist(); sfx('BuyShopItem') } hubScreen() }
  else if(d.buysc){ var sc3=D.SCROLLS.filter(function(x){ return x.k===d.buysc })[0]; if(s.meso>=sc3.price){ s.meso-=sc3.price; s.scr[sc3.k]=(s.scr[sc3.k]||0)+1; persist(); sfx('BuyShopItem') } hubScreen() }
  else if(d.buyeq){ var bm=A.itm[d.buyeq], bp=D.PRICE(bm.price); if(s.meso>=bp&&s.inv.length<D.INV_MAX){ s.meso-=bp; s.inv.push(mkItem(d.buyeq,false)); persist(); sfx('BuyShopItem'); msg('買了「'+bm.nm+'」，到裝備頁穿上') } hubScreen() }
  else if(d.stage){ if(unlocked(s,d.stage)) start(ui.sel,d.stage) }
  else if(d.stat){ var n=Math.min(+d.n,s.ap); s[d.stat]+=n; s.ap-=n; persist(); hubScreen() }
  else if(d.skill){ var sd=D.SK[d.skill], lv=s.sk[d.skill]||0;
    if(s.sp>0&&lv<sd.max&&sd.adv<=s.adv){ s.sk[d.skill]=lv+1; s.sp--;
      if(!lv&&sd.act&&loadout(s).length<D.SLOTS[s.adv]) s.load.push(+d.skill);   // 剛學會的主動技能，欄位有空就自動帶上
      persist() } hubScreen() }
  else if(d.load){ var id=+d.load, at=s.load.indexOf(id);
    if(at>=0) s.load.splice(at,1); else if(loadout(s).length<D.SLOTS[s.adv]) s.load.push(id); else msg('技能欄滿了，先取消一個');
    persist(); hubScreen() }
  else if(d.act==='create'){ var nm=$('msv-nm').value.trim()||'冒險家'; SV.slots[+d.i]=newSlot(nm,ui.job); persist(); ui.sel=+d.i; slotsScreen() }
  else if(d.act==='enter'||d.act==='hub'){ ui.tab='go'; msg(''); hubScreen() }
  else if(d.act==='adv'){ sfx('JobChanged'); s.adv++; s.sp+=D.SP_ADV; persist(); ui.tab='skill'; msg('轉職成功！現在是'+advNm(s)+'了。'); hubScreen() }
  else if(d.act==='ap-reset'){ var cost=D.AP_RESET(s.lv), J=D.JOBS[s.job]; if(s.meso<cost) return; s.meso-=cost;
    D.STATS.forEach(function(k){ s[k]=D.START_STAT }); s[J.main]=D.START_MAIN; s.ap=(s.lv-1)*D.AP_LV; persist(); hubScreen() }
  else if(d.act==='back'||d.act==='home'){ msg(''); slotsScreen() }
  else if(d.act==='del') ask('確定刪除「'+esc(s.nm)+'」？<small>刪除後無法復原。</small>',function(){ SV.slots[ui.sel]=null; persist(); ui.sel=null; slotsScreen() });
  else if(d.act==='again') start(slot,stage.id);
  else if(d.act==='export') exportScreen();
  else if(d.act==='copy'){ var ta=$('msv-ta'); ta.select(); (navigator.clipboard?navigator.clipboard.writeText(ta.value):Promise.reject()).then(function(){ msg('已複製') },function(){ msg('請手動選取複製') }) }
  else if(d.act==='import') importScreen();
  else if(d.act==='imp'){ var o; try{ o=JSON.parse($('msv-ta').value); if(!valid(o)) throw 0 }catch(x){ return msg('格式不對，請貼上完整的匯出文字') }
    ask('確定匯入？<small>會覆蓋目前全部 4 個角色。</small>',function(){ o.slots.forEach(fix); SV=o; persist(); ui.sel=null; msg('匯入完成'); slotsScreen() }) }
});

// 畫布實際像素＝CSS 尺寸 × dpr，邏輯座標固定 960×600
function resize(){ var r=cv.getBoundingClientRect(), d=window.devicePixelRatio||1; cv.width=Math.round(r.width*d); cv.height=Math.round(r.width*d*H/W); scale=cv.width/W; g.imageSmoothingEnabled=false; if(state!=='run'&&P) draw() }
addEventListener('resize',resize); resize();
var stageEl=cv.parentNode;
// 聲音設定收在遊戲框右下角的 ♪ 鈕裡（選單、關卡中都在）
var auEl=document.createElement('div'), auOpen=false; auEl.className='msv-au'; stageEl.appendChild(auEl);
function drawAu(){ auEl.innerHTML=(auOpen?'<div class="msv-tabs msv-au-pop"><button data-au="bgm" aria-pressed="'+AU.bgm+'">音樂</button><button data-au="sfx" aria-pressed="'+AU.sfx+'">音效</button>'+
  '<label>音量 <input type="range" min="0" max="1" step="0.05" value="'+AU.vol+'" aria-label="音量"></label></div>':'')+
  '<button class="msv-au-btn'+(AU.bgm||AU.sfx?'':' mute')+'" data-au="open" aria-expanded="'+auOpen+'" title="音樂與音效">♪</button>' }
function saveAu(){ try{ localStorage.setItem('msvAudio',JSON.stringify(AU)) }catch(e){} }
auEl.addEventListener('click',function(e){ var b=e.target.closest('[data-au]'); if(!b) return; var k=b.dataset.au;
  if(k==='open') auOpen=!auOpen; else { AU[k]=!AU[k]; saveAu(); bgm(state==='run'||state==='pick'?stage.id:'menu') } drawAu(); sfx('BtMouseClick') });

// Alt＋Enter 全螢幕（原作的快捷鍵）；整張卡片進全螢幕，CSS 讓 16:10 框置中放大
addEventListener('keydown',function(e){ if(e.key!=='Enter'||!e.altKey) return; e.preventDefault(); var c=stageEl.parentNode;
  if(document.fullscreenElement) document.exitFullscreen(); else if(c.requestFullscreen) c.requestFullscreen().catch(function(){ msg('瀏覽器不允許全螢幕') }) });
document.addEventListener('fullscreenchange',function(){ requestAnimationFrame(resize) });

// ---- 滑鼠提示：原作式裝備說明框（data-tip="inv:3"／"eqp:weapon"／"loot:0"／"id:1302000"）----
var tip=document.createElement('div'), tipKey=null; tip.className='msv-tip'; tip.hidden=true; stageEl.appendChild(tip);
function hideTip(){ tip.hidden=true; tipKey=null }
var TIP_ST=['str','dex','int','luk','mhp','pad','mad','pdd','eva','spd'];
function itemTip(s,it,cmp){
  var m=A.itm[it.id], q=s?calc(s).q:null, free=it.req===0, h='<div class="tp-nm '+qCls(it)+'">'+m.nm+(it.up?' (+'+it.up+')':'')+'</div>'+(m.rare?'<div class="tp-rare">商店買不到的稀有裝備</div>':'');
  var rq=[['等級',free?0:reqOf(it),s&&s.lv]].concat(D.STATS.map(function(k){ return [D.STAT_NM[k].split(' ')[1],free?0:m.rq[k]||0,q&&q[k]] }));
  h+='<div class="tp-top"><span class="tp-ico">'+ico(A.ico.items.a.eq[m.i])+'</span><div>'+rq.map(function(r){ return '<div class="'+(s&&r[1]>r[2]?'tp-no':'')+'">需要'+r[0]+'：'+r[1]+'</div>' }).join('')+'</div></div>';
  h+='<div class="tp-jobs">'+Object.keys(D.JOBS).map(function(j){ var ok=m.job==='all'||m.job===j; return '<span class="'+(ok?(s&&s.job===j?'me':''):'off')+'">'+D.JOBS[j].nm+'</span>' }).join('')+'</div>';
  h+='<div class="tp-st"><div>類型：'+slotNm(m.s)+(m.ov?'（套服）':'')+'</div>'+TIP_ST.filter(function(k){ return it.st[k] }).map(function(k){ var dv=cmp?it.st[k]-(cmp.st[k]||0):0;
    return '<div>'+D.ST_NM[k]+'：+'+it.st[k]+(dv?' <span class="'+(dv>0?'tp-up':'tp-dn')+'">('+(dv>0?'▲':'▼')+Math.abs(dv)+')</span>':'')+'</div>' }).join('')+
    '<div>可使用卷軸次數：'+it.tuc+'</div></div>';
  return h;
}
function skTip(s,id){
  var d=D.SK[id], lv=s.sk[id]||0;
  return '<div class="tp-box"><div class="tp-nm">'+d.nm+'</div><div class="tp-cap">'+(d.act?'主動':'被動')+'・Lv.'+lv+' / '+d.max+'</div><div>'+d.desc+'</div>'+
    '<div class="tp-st">'+(lv?'<div>目前：'+skFx(d,lv)+'</div>':'<div>尚未學習</div>')+(lv<d.max?'<div class="tp-nx">下一級：'+skFx(d,lv+1)+'</div>':'')+'</div></div>';
}
function tipHtml(key){
  var s=SV.slots[ui.sel], p=key.split(':');
  if(p[0]==='sk') return s&&D.SK[p[1]]?skTip(s,p[1]):'';
  var it=p[0]==='id'?mkItem(p[1],false):!s?null:p[0]==='inv'?s.inv[p[1]]:p[0]==='eqp'?s.eqp[p[1]]:p[0]==='loot'&&P?P.loot.items[p[1]]:null;
  if(!it||!A.itm[it.id]) return '';
  // 不是身上那件時，右邊多一框「目前裝備」方便比較（穿套服時，褲子跟套服比）
  var m=A.itm[it.id], cur=s&&p[0]!=='eqp'&&jobOk(s,m)?s.eqp[m.s]||(m.s==='pants'&&s.eqp.coat&&A.itm[s.eqp.coat.id].ov?s.eqp.coat:null):null;
  return '<div class="tp-box">'+itemTip(s,it,cur)+'</div>'+(cur?'<div class="tp-box"><div class="tp-cap">目前裝備</div>'+itemTip(s,cur)+'</div>':'');
}
stageEl.addEventListener('mousemove',function(e){
  var el=e.target.closest&&e.target.closest('[data-tip]'); if(!el){ if(tipKey) hideTip(); return }
  if(el.dataset.tip!==tipKey){ tipKey=el.dataset.tip; tip.innerHTML=tipHtml(tipKey); tip.hidden=!tip.innerHTML }
  // 預設在滑鼠右下；超出遊戲框就翻到左邊／往上貼齊
  var r=stageEl.getBoundingClientRect(), x=e.clientX-r.left+16, y=e.clientY-r.top+16;
  if(x+tip.offsetWidth>r.width) x=Math.max(0,e.clientX-r.left-16-tip.offsetWidth);
  if(y+tip.offsetHeight>r.height) y=Math.max(0,r.height-tip.offsetHeight);
  tip.style.left=x+'px'; tip.style.top=y+'px';
});
stageEl.addEventListener('mouseleave',hideTip);
auEl.addEventListener('input',function(e){ AU.vol=+e.target.value; bgmEl.volume=AU.vol*.6; saveAu() });
auEl.addEventListener('change',function(){ sfx('BtMouseClick') });
drawAu();
if(A.title) cv.parentNode.style.backgroundImage='url(maple-survivors/assets/'+A.title.src+')';
if(BENCH) start(null); else titleScreen();
requestAnimationFrame(loop);
})();
