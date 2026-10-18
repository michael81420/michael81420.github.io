/* 楓之谷倖存者：遊戲引擎（M1 戰鬥核心）。素材 atlas＝window.MSA（assets/maple/atlas.js），數值＝window.MSD。
   效能：怪物／投射物／特效／傷害數字全走物件池；碰撞用空間網格；只畫鏡頭內。怪物數量不設上限。
   畫面分兩種：選單面板（#msv-panel：角色欄位、建立角色、結算）和遊戲畫布，同一位置輪流顯示。
   網址加 ?dur=20 → 關卡縮成 20 秒（測結算用）。
   網址加 ?bench=500 → 怪物數量固定補滿 500 隻、玩家無敵，右上角顯示 fps，用來量效能。 */
(function(){
var A=window.MSA, D=window.MSD, $=function(id){return document.getElementById(id)};
var cv=$('msv'), g=cv.getContext('2d'), W=960, H=600, scale=1;
var Q=new URLSearchParams(location.search), BENCH=+Q.get('bench')||0;

// ---- 素材 ----
var IMG={};
function img(src){ if(!IMG[src]){ IMG[src]=new Image(); IMG[src].src='../assets/maple/'+src } return IMG[src] }
// 每個動作預先算總長，取幀不用每次加總
[A.mob,A.chr,A.skl,A.map,A.npc].forEach(function(set){ for(var k in set){ var e=set[k]; e.tot={}; for(var a in e.a) e.tot[a]=e.a[a].reduce(function(s,f){return s+f[6]},0)/1000 } });
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
// 欄位：{nm, job, lv, exp, adv(0 見習/1/2), ap, sp, str/dex/int/luk, sk:{技能id:等級}, load:[帶進關卡的主動技能], st:{關卡id:{best 最久存活秒, clears}}}
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
  s.adv=s.adv||0; s.sk=s.sk||{}; s.load=s.load||[]; s.st=s.st||{}; s.meso=s.meso||0;
}
function newSlot(nm,job){ var s={nm:nm, job:job, lv:1, exp:0}; fix(s); return s }
function persist(){ try{ localStorage.setItem(KEY,JSON.stringify(SV)) }catch(e){ msg('存檔失敗：瀏覽器可能關閉了儲存空間') } }
function esc(t){ return String(t).replace(/[&<>"']/g,function(c){return '&#'+c.charCodeAt(0)+';'}) }

// ---- 角色數值：存檔 → 戰鬥用數值 ----
function lerp(a,lv,max){ return Array.isArray(a)? a[0]+(a[1]-a[0])*(max>1?(lv-1)/(max-1):1) : a }
function calc(s){
  var J=D.JOBS[s.job], m={hp:0,def:0,eva:0,crit:0,dmg:0,cdr:0,range:0,final:0}, finalId=null;
  for(var id in s.sk){ var d=D.SK[id], lv=s.sk[id]; if(!d||d.act||!lv) continue;
    for(var k in d.mods) m[k]+=lerp(d.mods[k],lv,d.max); if(d.mods.final) finalId=+id }
  var eva=s.dex*.5+s.luk+m.eva;
  return {maxHp:Math.round((J.hp+(s.lv-1)*J.hpLv)*(1+m.hp)), atk:J.base*(s[J.main]*4+s[J.sub])/52, def:Math.min(D.DEF_MAX,m.def),
    evaPts:eva, eva:Math.min(D.EVA_MAX,eva/(eva+D.EVA_K)), crit:D.CRIT+m.crit, dmg:1+m.dmg, cdr:Math.min(.6,m.cdr), range:1+m.range, final:m.final, finalId:finalId};
}
// 帶進關卡、而且真的能用的主動技能
function loadout(s){ return s.load.filter(function(id){ var d=D.SK[id]; return d&&d.act&&d.adv<=s.adv&&s.sk[id] }).slice(0,D.SLOTS[s.adv]) }

// ---- 狀態 ----
var P, slot=null, stage, st, cam={x:0,y:0}, keys={}, joy=null, state='menu', fps=0;
var zones=new Pool(function(){return {}});
function start(i,stageId){
  var s=i==null?newSlot('bench',Q.get('job')||'magician'):SV.slots[i], J=D.JOBS[s.job], S=calc(s);
  slot=i;
  P={job:s.job, adv:s.adv, J:J, S:S, x:0, y:0, hp:S.maxHp, maxHp:S.maxHp, face:false, moving:false, t:0, atkAnim:-1, inv:0, kills:0, exp:0, buffs:[], B:{dmg:0,spd:0,inv:0},
     // 基本攻擊永遠在第一格；其餘是技能欄裡的主動技能
     acts:[{d:J.atk, lv:1, cd:0}].concat(loadout(s).map(function(id){ return {id:+id, d:D.SK[id], lv:s.sk[id], cd:.5} }))};
  stage=D.STAGES[stageId||'s1']; stage.id=stageId||'s1'; st={t:0, spawnAcc:0, dur:+Q.get('dur')||stage.dur}; keys={}; joy=null;
  [mobs,shots,fxs,nums,zones].forEach(function(p){ p.each(function(o){p.free(o)}) });
  view('game'); state='run'; msg('');
}
function msg(s){ $('msv-msg').textContent=s }

// ---- 生怪：鏡頭外一圈 ----
function spawn(id){
  var M=D.MOBS[id], e=A.mob[id], m=mobs.get(), a=Math.random()*Math.PI*2, R=Math.hypot(W,H)/2+60;
  m.id=id; m.M=M; m.e=e; m.x=P.x+Math.cos(a)*R; m.y=P.y+Math.sin(a)*R; m.hp=M.hp; m.face=false;
  m.t=Math.random(); m.hitT=-1; m.dieT=-1; m.r=M.r||Math.max(10,e.a.stand[0][2]*.32);
}
function curWave(){ var w=stage.waves[0]; for(var i=0;i<stage.waves.length;i++) if(st.t>=stage.waves[i].t) w=stage.waves[i]; return w }

// ---- 傷害 ----
function hurt(m,dmg,crit){
  if(m.dieT>=0) return; dmg=Math.max(1,Math.round(dmg*(.9+Math.random()*.2)));
  m.hp-=dmg; m.hitT=0; num(m.x,m.y-m.e.a.stand[0][5],dmg,crit?2:0);
  if(m.hp<=0){ m.dieT=0; P.kills++; P.exp+=m.M.exp }
}
// 玩家打怪都走這裡：爆擊、追擊（終極之劍／弓）
function deal(m,dmg){
  var c=Math.random()<P.S.crit; hurt(m,dmg*(c?D.CRIT_DMG:1),c);
  if(P.S.final && Math.random()<P.S.final && m.dieT<0){ hurt(m,dmg*.6,false); fx(P.S.finalId,'hit',m.x,m.y-20,false) }
}
function num(x,y,v,kind){ var n=nums.get(); n.x=x+(Math.random()-.5)*16; n.y=y; n.v=v; n.t=0; n.kind=kind }  // kind 0 一般 1 玩家受傷 2 爆擊 3 MISS
function fx(id,act,x,y,flip,follow){ var e=A.skl[id]; if(!e||!e.a[act]) return; var f=fxs.get(); f.e=e; f.act=act; f.x=x; f.y=y; f.t=0; f.flip=flip; f.follow=follow }

// ---- 施放：基本攻擊與主動技能共用一套 ----
function cast(k){
  var d=k.d, V=function(key){ return lerp(d[key],k.lv,d.max) };
  if(d.k==='buff'){ P.buffs.push({mods:d.mods, lv:k.lv, max:d.max, t:V('dur')}); fx(k.id,d.fx,P.x,P.y,P.face,true); return true }
  var rg=d.range*P.S.range, tg=nearest(P.x,P.y,rg); if(!tg) return false;
  var dmg=P.S.atk*V('dmg')*(P.S.dmg+P.B.dmg);
  P.face=tg.x>P.x; P.atkAnim=0;
  if(d.k==='slash'){
    var dir=Math.atan2(tg.y-P.y,tg.x-P.x), arc=d.arc;
    near(P.x,P.y,rg,function(m){ var a=Math.atan2(m.y-P.y,m.x-P.x)-dir; a=Math.atan2(Math.sin(a),Math.cos(a));
      if(Math.abs(a)<arc/2 && Math.hypot(m.x-P.x,m.y-P.y)<rg+m.r) deal(m,dmg) });
    fx(k.id||d.fx,k.id?d.fx:'effect',P.x,P.y-30,P.face);
  } else if(d.k==='shot'){
    var n=Math.round(V('n')||1);
    for(var i=0;i<n;i++){
      var s=shots.get(), a2=Math.atan2(tg.y-12-(P.y-30),tg.x-P.x)+(i-(n-1)/2)*.18, v=d.v;
      s.x=P.x; s.y=P.y-30; s.vx=Math.cos(a2)*v; s.vy=Math.sin(a2)*v; s.life=rg/v; s.pierce=Math.round(V('pierce')||1); s.dmg=dmg;
      s.splash=d.splash||0; s.e=d.ball?A.skl[d.ball]:null; s.hitFx=d.hit||d.ball; s.t=0; s.ang=a2; s.hit=s.hit||new Set(); s.hit.clear();
    }
  } else if(d.k==='strike'){   // 魔力爪：直接打最近的 n 隻，每隻 hits 下
    var list=[]; near(P.x,P.y,rg,function(m){ list.push(m) });
    list.sort(function(a,b){ return Math.hypot(a.x-P.x,a.y-P.y)-Math.hypot(b.x-P.x,b.y-P.y) });
    list.slice(0,Math.round(V('n'))).forEach(function(m){ for(var h=0;h<d.hits;h++) deal(m,dmg); fx(k.id,d.fx,m.x,m.y-20,m.x<P.x) });
  } else if(d.k==='mist'){     // 毒霧：在目標腳下放一塊持續傷害區
    var z=zones.get(); z.x=tg.x; z.y=tg.y; z.r=V('r'); z.t=0; z.dur=d.dur; z.tick=0; z.dmg=dmg; z.id=k.id;
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
  var ml=Math.hypot(mx,my), spd=P.J.spd*(1+P.B.spd); P.moving=ml>.1;
  if(P.moving){ if(ml>1){mx/=ml; my/=ml} P.x+=mx*spd*dt; P.y+=my*spd*dt; if(Math.abs(mx)>.1) P.face=mx>0 }
  cam.x=P.x-W/2; cam.y=P.y-H/2+30;
  // 生怪
  if(BENCH){ while(mobs.n<BENCH) spawn(curWave().mobs[(Math.random()*curWave().mobs.length)|0]) }
  else { var w=curWave(), k=Math.min(1,st.t/st.dur); st.spawnAcc+=dt*(w.rate+(w.rate2-w.rate)*k);
    while(st.spawnAcc>=1){ st.spawnAcc--; spawn(w.mobs[(Math.random()*w.mobs.length)|0]) } }
  buildGrid();
  // 怪物：朝玩家走 + 互相推開；碰到玩家 → 迴避判定 → 減傷
  var pr=14, safe=P.inv>0||P.B.inv>0||BENCH;
  mobs.each(function(m){
    m.t+=dt;
    if(m.dieT>=0){ m.dieT+=dt; if(m.dieT>m.e.tot.die1) mobs.free(m); return }
    if(m.hitT>=0){ m.hitT+=dt; if(m.hitT>.25) m.hitT=-1 }
    var dx=P.x-m.x, dy=P.y-m.y, d=Math.hypot(dx,dy)||1, sp=m.hitT>=0?m.M.spd*.3:m.M.spd;
    var vx=dx/d*sp, vy=dy/d*sp;
    near(m.x,m.y,m.r*2,function(o){ if(o===m) return; var ox=m.x-o.x, oy=m.y-o.y, od=Math.hypot(ox,oy)||.01, mn=m.r+o.r;
      if(od<mn){ var push=(mn-od)/mn*90; vx+=ox/od*push; vy+=oy/od*push } });
    m.x+=vx*dt; m.y+=vy*dt; m.face=dx>0;
    // 怪物不設上限，離太遠的移到另一側（不刪，避免數量掉）
    if(d>Math.hypot(W,H)*1.2){ m.x=P.x-dx*.9; m.y=P.y-dy*.9 }
    if(d<m.r+pr && !safe){ P.inv=.7; safe=true;
      if(Math.random()<P.S.eva) num(P.x,P.y-60,'MISS',3);
      else { var hit=Math.max(1,Math.round(m.M.atk*(1-P.S.def))); P.hp-=hit; num(P.x,P.y-60,hit,1) } }
  });
  if(P.inv>0) P.inv-=dt;
  // 攻擊：每個技能各自冷卻，好了就放（沒目標就等下一幀）
  P.acts.forEach(function(k){ k.cd-=dt; if(k.cd<=0 && cast(k)) k.cd=lerp(k.d.cd,k.lv,k.d.max)*(1-P.S.cdr) });
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
  zones.each(function(z){ z.t+=dt; z.tick-=dt;
    if(z.tick<=0){ z.tick=.5; near(z.x,z.y,z.r,function(m){ if(Math.hypot(m.x-z.x,m.y-z.y)<z.r) deal(m,z.dmg) }) }
    if(z.t>=z.dur) zones.free(z) });
  fxs.each(function(f){ f.t+=dt; if(f.follow){ f.x=P.x; f.y=P.y } if(f.t>=f.e.tot[f.act]) fxs.free(f) });
  nums.each(function(n){ n.t+=dt; n.y-=40*dt; if(n.t>.8) nums.free(n) });
  if(P.hp<=0){ P.hp=0; end(false) } else if(!BENCH && st.t>=st.dur) end(true);
}
// 結算：只在這裡把經驗寫進存檔（遊玩中不升級）；每升一級發 AP，轉職後也發 SP
function end(win){
  state='over'; var gain=win?P.exp:Math.round(P.exp*D.DEATH_EXP), s=SV.slots[slot], up=0;
  if(s){
    s.exp+=gain; while(s.exp>=D.exp(s.lv)){ s.exp-=D.exp(s.lv); s.lv++; up++; s.ap+=D.AP_LV; if(s.adv>=1) s.sp+=D.SP_LV }
    var r=s.st[stage.id]||(s.st[stage.id]={best:0,clears:0}); r.best=Math.max(r.best,Math.floor(st.t)); if(win) r.clears++;
    persist();
  }
  resultScreen(win,gain,up);
}

// ---- 繪製 ----
var floorE=A.map[D.STAGES.s1.floor];
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
  var act=m.dieT>=0?'die1':m.hitT>=0?'hit1':'move', t=m.dieT>=0?m.dieT:m.t;
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
  var left=Math.max(0,st.dur-st.t), s=String(Math.floor(left%60)).padStart(2,'0');
  g.font='bold 22px sans-serif'; g.textAlign='center'; g.strokeStyle=C['--surface']; g.lineWidth=4;
  g.strokeText(Math.floor(left/60)+':'+s,W/2,34); g.fillText(Math.floor(left/60)+':'+s,W/2,34);
  g.font='bold 13px sans-serif'; g.textAlign='right'; var txt='擊倒 '+P.kills+'　怪物 '+mobs.n+(BENCH?'　'+fps.toFixed(0)+' fps　'+(window.__msvMs||0).toFixed(1)+' ms':'');
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
  if(state==='run'){ update(dt); draw() } else if(minis.length) drawMinis(ts/1000);
  // fps 會被螢幕更新率鎖住，另外量「每幀實際花幾毫秒」才看得出餘裕（16.7ms 以內＝60fps 守得住）
  msAcc+=performance.now()-t0; fpsAcc+=dt; fpsN++;
  if(fpsAcc>=.5){ fps=fpsN/fpsAcc; window.__msvFps=fps; window.__msvMs=msAcc/fpsN; fpsAcc=0; fpsN=0; msAcc=0 }
  requestAnimationFrame(loop);
}

// ---- 輸入 ----
var KM={ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right'};
addEventListener('keydown',function(e){ var k=KM[e.code]; if(k&&state==='run'){ keys[k]=true; e.preventDefault() } });
addEventListener('keyup',function(e){ var k=KM[e.code]; if(k) keys[k]=false });
addEventListener('blur',function(){ keys={} });
function lp(e){ var r=cv.getBoundingClientRect(); return [(e.clientX-r.left)/r.width*W,(e.clientY-r.top)/r.height*H] }
cv.addEventListener('pointerdown',function(e){ var p=lp(e); joy={ox:p[0],oy:p[1],dx:0,dy:0,id:e.pointerId}; cv.setPointerCapture(e.pointerId) });
cv.addEventListener('pointermove',function(e){ if(!joy||e.pointerId!==joy.id) return; var p=lp(e), dx=(p[0]-joy.ox)/50, dy=(p[1]-joy.oy)/50, l=Math.hypot(dx,dy); if(l>1){dx/=l; dy/=l} joy.dx=dx; joy.dy=dy });
['pointerup','pointercancel'].forEach(function(t){ cv.addEventListener(t,function(e){ if(joy&&e.pointerId===joy.id) joy=null }) });

// ---- 選單面板 ----
var panel=$('msv-panel'), minis=[], ui={sel:null, del:false, job:null, tab:'go', imp:false};
function view(v){ cv.style.display=v==='game'?'':'none'; panel.style.display=v==='game'?'none':''; if(v==='game') resize() }
function show(h){
  view('panel'); var top=panel.scrollTop; panel.innerHTML=h; panel.scrollTop=top; state='menu';
  // data-spr="npc:1022000" / "chr:warrior-0" 的小畫布在選單迴圈裡播站立動畫
  minis=[].map.call(panel.querySelectorAll('canvas[data-spr]'),function(c){ var p=c.dataset.spr.split(':'), e=A[p[0]][p[1]], r=c.getBoundingClientRect(), d=window.devicePixelRatio||1;
    c.width=Math.round(r.width*d); c.height=Math.round(r.height*d); return {c:c, g:c.getContext('2d'), e:e, act:p[0]==='npc'?'stand':'stand1', flip:p[0]==='chr'} });
}
function drawMinis(t){
  minis.forEach(function(m){ var fr=m.e.a[m.act], f=frameAt(m.e,m.act,t,true), mh=Math.max.apply(null,fr.map(function(q){return q[5]})), k=Math.min(2,(m.c.height-8)/mh);
    m.g.setTransform(1,0,0,1,0,0); m.g.clearRect(0,0,m.c.width,m.c.height); m.g.imageSmoothingEnabled=false;
    var x=m.c.width/2, y=m.c.height-4, im=img(m.e.src);
    m.g.translate(x,y); if(m.flip) m.g.scale(-1,1); m.g.drawImage(im,f[0],f[1],f[2],f[3],-f[4]*k,-f[5]*k,f[2]*k,f[3]*k) });
}
function fmt(sec){ return Math.floor(sec/60)+':'+String(sec%60).padStart(2,'0') }
function advNm(s){ return D.JOBS[s.job].adv[s.adv] }
function canAdv(s){ return s.adv<D.ADV_LV.length-1 && s.lv>=D.ADV_LV[s.adv+1] }
function pct(v){ return Math.round(v*1000)/10+'%' }

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
  else if(ui.del) h+='<span class="hint">確定刪除「'+esc(s.nm)+'」？刪除後無法復原。</span><button class="game-btn" data-act="del-yes">確定刪除</button><button class="game-btn ghost" data-act="del-no">取消</button>';
  else h+='<button class="game-btn" data-act="enter">進入</button><button class="game-btn ghost" data-act="del">刪除角色</button>';
  show(h+'</div><div class="msv-row"><button class="game-btn ghost" data-act="export">匯出存檔</button><button class="game-btn ghost" data-act="import">匯入存檔</button></div>');
}
function createScreen(i){
  var h='<h3>選擇你的職業</h3><p class="hint">到各村莊找轉職教官，選一條要走的路。</p><div class="msv-grid">';
  Object.keys(D.JOBS).forEach(function(k){ var J=D.JOBS[k];
    h+='<button class="msv-slot'+(ui.job===k?' on':'')+'" data-job="'+k+'"><canvas data-spr="npc:'+J.npc+'"></canvas>'+
       '<span class="sub">'+J.town+'・'+J.npcNm+'</span><span class="nm">'+J.nm+'</span><span class="sub">'+J.tag+'・主屬性 '+J.main.toUpperCase()+'</span><span class="sub">'+J.line+'</span></button>' });
  h+='</div><div class="msv-row"><input class="msv-in" id="msv-nm" maxlength="12" placeholder="角色名字" aria-label="角色名字">'+
     '<button class="game-btn" data-act="create" data-i="'+i+'"'+(ui.job?'':' disabled')+'>建立角色</button><button class="game-btn ghost" data-act="back">返回</button></div>';
  var keep=$('msv-nm')&&$('msv-nm').value; show(h); if(keep) $('msv-nm').value=keep;
}

// 角色主畫面：上方角色資訊＋分頁
function hubScreen(){
  var s=SV.slots[ui.sel], tabs=[['go','出發'],['stat','能力值'+(s.ap?' ('+s.ap+')':'')],['skill','技能'+(s.sp?' ('+s.sp+')':'')]];
  if(canAdv(s)) tabs.push(['adv','轉職！']);
  var h='<div class="msv-hub"><canvas data-spr="chr:'+s.job+'-'+s.adv+'"></canvas><div><div class="nm">'+esc(s.nm)+'</div>'+
    '<div class="hint">Lv.'+s.lv+'　'+advNm(s)+'</div><div class="msv-bar"><i style="width:'+Math.floor(s.exp/D.exp(s.lv)*100)+'%"></i></div>'+
    '<div class="hint">EXP '+s.exp+' / '+D.exp(s.lv)+'</div></div></div><div class="msv-tabs" role="tablist">';
  tabs.forEach(function(t){ h+='<button role="tab" aria-selected="'+(ui.tab===t[0])+'" data-tab="'+t[0]+'">'+t[1]+'</button>' });
  h+='</div><div class="msv-tab">'+({go:goTab,stat:statTab,skill:skillTab,adv:advTab}[ui.tab]||goTab)(s)+'</div>'+
     '<div class="msv-row"><button class="game-btn ghost" data-act="home">回到角色選擇</button></div>';
  show(h);
}
function goTab(s){
  return Object.keys(D.STAGES).map(function(id){ var g2=D.STAGES[id], r=s.st[id];
    return '<div class="msv-line"><div><b>'+esc(g2.nm)+'</b><div class="hint">撐過 '+fmt(g2.dur)+' 通關・'+(r?'最久 '+fmt(r.best)+(r.clears?'・通關 '+r.clears+' 次':''):'尚未挑戰')+'</div></div>'+
      '<button class="game-btn" data-stage="'+id+'">出發</button></div>' }).join('')+
    '<p class="hint">帶進關卡的技能：'+(loadout(s).map(function(id){return D.SK[id].nm}).join('、')||'只有基本攻擊')+'</p>';
}
function statTab(s){
  var S=calc(s), J=D.JOBS[s.job], h='<p class="hint">剩餘 AP：<b>'+s.ap+'</b>　主屬性 '+J.main.toUpperCase()+'、副屬性 '+J.sub.toUpperCase()+'</p>';
  D.STATS.forEach(function(k){ h+='<div class="msv-line"><span>'+D.STAT_NM[k]+(k===J.main?'（主）':k===J.sub?'（副）':'')+'</span><b>'+s[k]+'</b>'+
    '<span class="msv-row"><button class="game-btn" data-stat="'+k+'" data-n="1"'+(s.ap?'':' disabled')+'>+1</button><button class="game-btn ghost" data-stat="'+k+'" data-n="5"'+(s.ap>=5?'':' disabled')+'>+5</button></span></div>' });
  var cost=D.AP_RESET(s.lv);
  return h+'<p class="hint">攻擊力 '+Math.round(S.atk)+'・最大HP '+S.maxHp+'・閃避率 '+pct(S.eva)+'・爆擊率 '+pct(S.crit)+'・減傷 '+pct(S.def)+'</p>'+
    '<div class="msv-row"><button class="game-btn ghost" data-act="ap-reset"'+(s.meso>=cost?'':' disabled')+'>重置 AP（'+cost+' 楓幣，持有 '+s.meso+'）</button></div>';
}
function skillTab(s){
  var J=D.JOBS[s.job], slots=D.SLOTS[s.adv], used=loadout(s).length;
  var h='<p class="hint">剩餘 SP：<b>'+s.sp+'</b>　技能欄 '+used+' / '+slots+'（勾選的主動技能會在關卡中自動施放）</p>';
  if(!s.adv) return h+'<p class="hint">'+J.adv[0]+'還沒有技能。Lv.'+D.ADV_LV[1]+' 時回去找'+J.npcNm+'轉職。</p>';
  Object.keys(D.SK).filter(function(id){ return D.SK[id].job===s.job })
    .sort(function(a,b){ var x=D.SK[a], y=D.SK[b]; return x.adv-y.adv || (y.act?1:0)-(x.act?1:0) })   // 依轉職階段，主動在前
    .forEach(function(id){ var d=D.SK[id];
    var lv=s.sk[id]||0, lock=d.adv>s.adv, on=s.load.indexOf(+id)>=0;
    h+='<div class="msv-line'+(lock?' off':'')+'"><div><b>'+d.nm+'</b> <span class="hint">'+(d.act?'主動':'被動')+'・Lv.'+lv+' / '+d.max+'</span><div class="hint">'+d.desc+(lock?'（'+d.adv+' 轉後解鎖）':'')+'</div></div><span class="msv-row">'+
      (d.act&&lv&&!lock?'<button class="game-btn ghost" data-load="'+id+'" aria-pressed="'+on+'">'+(on?'✓ 已帶':'帶進關卡')+'</button>':'')+
      '<button class="game-btn" data-skill="'+id+'"'+(lock||!s.sp||lv>=d.max?' disabled':'')+'>+1</button></span></div>' });
  return h;
}
function advTab(s){
  var J=D.JOBS[s.job];
  return '<div class="msv-hub"><canvas data-spr="npc:'+J.npc+'"></canvas><div><b>'+J.npcNm+'</b><p>「'+esc(s.nm)+'，你已經 Lv.'+s.lv+' 了。準備好成為<b>'+J.adv[s.adv+1]+'</b>了嗎？」</p>'+
    '<p class="hint">轉職後獲得 '+D.SP_ADV+' SP，之後每升一級 '+D.SP_LV+' SP；技能欄變成 '+D.SLOTS[s.adv+1]+' 格。</p>'+
    '<button class="game-btn" data-act="adv">轉職成為'+J.adv[s.adv+1]+'</button></div></div>';
}
function resultScreen(win,gain,up){
  var s=SV.slots[slot], h='<h3>'+(win?'通關！':'倒下了…')+'</h3><p class="hint">存活 '+fmt(Math.floor(st.t))+'・擊倒 '+P.kills+' 隻</p>'+
    '<p>經驗 +'+gain+(win?'':'<span class="hint">（死亡只結算 '+D.DEATH_EXP*100+'%，原本 '+P.exp+'）</span>')+'</p>';
  if(s) h+=(up?'<p><b>等級提升！Lv.'+(s.lv-up)+' → Lv.'+s.lv+'</b>　獲得 AP '+up*D.AP_LV+(s.adv?'、SP '+up*D.SP_LV:'')+'</p>':'')+
    (canAdv(s)?'<p><b>可以轉職了！</b>回角色畫面找'+D.JOBS[s.job].npcNm+'。</p>':'')+
    '<div class="msv-bar"><i style="width:'+Math.floor(s.exp/D.exp(s.lv)*100)+'%"></i></div><p class="hint">Lv.'+s.lv+'　EXP '+s.exp+' / '+D.exp(s.lv)+'</p>';
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
    '<div class="msv-row">'+(ui.imp?'<span class="hint">確定要覆蓋目前的存檔？</span><button class="game-btn" data-act="imp-yes">確定匯入</button><button class="game-btn ghost" data-act="imp-no">取消</button>'
      :'<button class="game-btn" data-act="imp">匯入</button><button class="game-btn ghost" data-act="home">返回</button>')+'</div>');
  $('msv-ta').value=keep;
}

panel.addEventListener('click',function(e){
  var b=e.target.closest('button'); if(!b||b.disabled) return; var d=b.dataset, s=SV.slots[ui.sel];
  if(d.slot!=null){ ui.sel=+d.slot; ui.del=false; slotsScreen() }
  else if(d.new!=null){ ui.job=null; createScreen(+d.new) }
  else if(d.job){ ui.job=d.job; createScreen(+panel.querySelector('[data-act=create]').dataset.i) }
  else if(d.tab){ ui.tab=d.tab; panel.scrollTop=0; hubScreen() }
  else if(d.stage) start(ui.sel,d.stage);
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
  else if(d.act==='adv'){ s.adv++; s.sp+=D.SP_ADV; persist(); ui.tab='skill'; msg('轉職成功！現在是'+advNm(s)+'了。'); hubScreen() }
  else if(d.act==='ap-reset'){ var cost=D.AP_RESET(s.lv), J=D.JOBS[s.job]; if(s.meso<cost) return; s.meso-=cost;
    D.STATS.forEach(function(k){ s[k]=D.START_STAT }); s[J.main]=D.START_MAIN; s.ap=(s.lv-1)*D.AP_LV; persist(); hubScreen() }
  else if(d.act==='back'||d.act==='home'||d.act==='del-no'){ ui.del=false; ui.imp=false; msg(''); slotsScreen() }
  else if(d.act==='del'){ ui.del=true; slotsScreen() }
  else if(d.act==='del-yes'){ SV.slots[ui.sel]=null; persist(); ui.sel=null; ui.del=false; slotsScreen() }
  else if(d.act==='again') start(slot,stage.id);
  else if(d.act==='export') exportScreen();
  else if(d.act==='copy'){ var ta=$('msv-ta'); ta.select(); (navigator.clipboard?navigator.clipboard.writeText(ta.value):Promise.reject()).then(function(){ msg('已複製') },function(){ msg('請手動選取複製') }) }
  else if(d.act==='import'){ ui.imp=false; importScreen() }
  else if(d.act==='imp'||d.act==='imp-no'){ if(d.act==='imp'){ try{ var o=JSON.parse($('msv-ta').value); if(!valid(o)) throw 0; ui.imp=true }catch(x){ msg('格式不對，請貼上完整的匯出文字') } } else ui.imp=false; importScreen() }
  else if(d.act==='imp-yes'){ try{ var o2=JSON.parse($('msv-ta').value); if(!valid(o2)) throw 0; o2.slots.forEach(fix); SV=o2; persist(); ui.sel=null; ui.imp=false; msg('匯入完成'); slotsScreen() }catch(x){ msg('格式不對，請貼上完整的匯出文字') } }
});

// 畫布實際像素＝CSS 尺寸 × dpr，邏輯座標固定 960×600
function resize(){ var r=cv.getBoundingClientRect(), d=window.devicePixelRatio||1; cv.width=Math.round(r.width*d); cv.height=Math.round(r.width*d*H/W); scale=cv.width/W; g.imageSmoothingEnabled=false; if(state!=='run'&&P) draw() }
addEventListener('resize',resize); resize();
if(BENCH) start(null); else slotsScreen();
requestAnimationFrame(loop);
})();
