/* 楓之谷倖存者自檢：卷軸機率（每種跑 1 萬次）＋每隻怪物都有掉落表。在 headless 瀏覽器開遊戲頁，直接呼叫頁面裡的函式。
   node posts/maple-survivors/tools/selfcheck.mjs */
import { createRequire } from 'node:module';
const { chromium } = createRequire(new URL('../../../tools/package.json', import.meta.url))('playwright');   // ponytail: playwright 裝在 tools/node_modules
import { resolve } from 'node:path';

const page = 'file://' + resolve(import.meta.dirname, '../../maple-survivors.html');
const b = await chromium.launch({ args: ['--allow-file-access-from-files'] }), p = await b.newPage();
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(page);
const r = await p.evaluate(() => {
  const out = [], N = 10000, D = window.MSD;
  // 固定種子（mulberry32）：結果每次一樣，CI 不會因為抽樣剛好超出容許誤差而偶發紅燈
  let seed = 20261018; const rng = () => { seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  for (const sc of D.SCROLLS) {
    const c = { ok: 0, fail: 0, boom: 0 };
    for (let i = 0; i < N; i++) { const it = { id: 0, st: {}, tuc: 1, up: 0 }; c[window.__msvScroll({ job: 'warrior' }, it, sc, rng)]++; }
    const boomWant = sc.dark ? (1 - sc.pct) * .5 : 0;
    // 三個標準差內算過（N=1 萬時約 ±1.5%）
    if (Math.abs(c.ok / N - sc.pct) > .015) out.push(`${sc.k} 成功率 ${c.ok / N}，應為 ${sc.pct}`);
    if (Math.abs(c.boom / N - boomWant) > .015) out.push(`${sc.k} 爆裝率 ${c.boom / N}，應為 ${boomWant}`);
  }
  for (const id in D.MOBS) if (!window.__msvDropTable(id).eq.length) out.push(`怪物 ${id} 沒有任何掉落`);
  for (const id in D.MOBS) for (const i of D.MOBS[id].rare || []) if (!window.MSA.itm[i]) out.push(`怪物 ${id} 的稀有掉落 ${i} 不在 atlas`);
  for (const id in D.SK) if (!window.MSA.ico.skills?.a[id]) out.push(`技能 ${id} 沒有圖示：重跑 tools/build-assets.mjs`);
  for (const id in D.SK) { const d = D.SK[id]; if (d.br && !D.JOBS[d.job].br[d.br]) out.push(`技能 ${id} 的分支 ${d.br} 不在 JOBS.${d.job}.br`); }
  for (const j in D.JOBS) for (const br in D.JOBS[j].br || {}) if (!Object.values(D.SK).some(d => d.job === j && d.br === br)) out.push(`${j} 的 2 轉分支 ${br} 沒有技能`);
  // 初心者 → 1 轉 → 2 轉：SP 各階段一池，存著不點也帶不到下一轉
  const M = window.__msv, s = M.newSlot('t', 'beginner'), begMax = Object.values(D.SK).filter(d => d.job === 'beginner').reduce((a, d) => a + d.max, 0);
  if (s.job !== 'beginner' || s.adv !== 0) out.push('新角色不是初心者');
  while (s.lv < D.ADV_LV[1]) M.lvUp(s);
  if (s.sp[0] !== Math.min(begMax, (D.ADV_LV[1] - 1) * D.SP_LV[0])) out.push(`初心者 SP ${s.sp[0]}，應為 ${begMax}（點滿見習技能就不再給）`);
  M.fix(s); if (s.sp[0] !== Math.min(begMax, (D.ADV_LV[1] - 1) * D.SP_LV[0])) out.push(`讀檔把點得掉的 SP 收掉了：${s.sp[0]}`);
  M.advance(s, 'magician');
  if (s.job !== 'magician' || s.int !== D.START_MAIN || s.ap !== (s.lv - 1) * D.AP_LV) out.push('1 轉沒有重置 AP 成新職業主屬性');
  while (s.lv < D.ADV_LV[2]) M.lvUp(s);
  const sp1 = s.sp[1]; M.advance(s, 'cleric'); M.lvUp(s);
  if (s.sp[1] !== sp1 || s.sp[2] !== D.SP_ADV + D.SP_LV[2] || s.br !== 'cleric') out.push(`2 轉後 SP 混池：${JSON.stringify(s.sp)}`);
  if (M.skOk(s, 2101004) || !M.skOk(s, 2301005) || !M.skOk(s, 1000)) out.push('2 轉分支技能過濾錯誤');
  // 每個職業／分支：每一轉拿到的 SP 不超過那一轉技能點滿所需（剛好點完或不夠點，不會有多的）
  const need = (j, a, br) => Object.values(D.SK).filter(d => d.adv === a && (d.job === j) && (!d.br || d.br === br)).reduce((n, d) => n + d.max, 0);
  for (const j in D.JOBS) for (const br of Object.keys(D.JOBS[j].br || {})) {
    const c = M.newSlot('t', 'beginner'); while (c.lv < D.ADV_LV[1]) M.lvUp(c); M.advance(c, j);
    while (c.lv < D.ADV_LV[2]) M.lvUp(c); if (c.sp[1] > need(j, 1)) out.push(`${j} 1 轉 SP ${c.sp[1]} 超過技能總和 ${need(j, 1)}`);
    M.advance(c, br); while (c.lv < 120) M.lvUp(c); if (c.sp[2] > need(j, 2, br)) out.push(`${j}/${br} 2 轉 SP ${c.sp[2]} 超過技能總和 ${need(j, 2, br)}`);
  }
  // 晚轉：過門檻後的等級 SP 不進舊池，轉職時補到新池
  const late = M.newSlot('t', 'beginner'); while (late.lv < D.ADV_LV[1] + 5) M.lvUp(late);
  const sp0 = late.sp[0]; M.advance(late, 'thief');
  if (late.sp[0] !== sp0 || late.sp[1] !== D.SP_ADV + 5 * D.SP_LV[1]) out.push(`晚轉補點錯誤：${JSON.stringify(late.sp)}`);
  // 飛鏢：盜賊 1 轉送一組；要武器種類的技能，種類要在 WT 裡
  if (!window.MSA.star[D.STAR_GIFT] || !late.star[D.STAR_GIFT]) out.push('盜賊 1 轉沒送飛鏢（或 atlas 沒有飛鏢：重跑素材工具）');
  for (const id in D.SK) if (D.SK[id].wt && !D.WT[D.SK[id].wt]) out.push(`技能 ${id} 要的武器種類 ${D.SK[id].wt} 不在 WT`);
  if (late.starEq != D.STAR_GIFT) out.push('盜賊 1 轉沒把送的飛鏢裝上');
  for (const id in D.MOBS) for (const i of D.MOBS[id].stars || []) if (!window.MSA.star[i]) out.push(`怪物 ${id} 掉的飛鏢 ${i} 不在 atlas`);
  // 防呆：拳套不能帶二連擊（要短刀），換短刀就能帶
  const tw = { ...late, sk: { 4001334: 1 }, load: [4001334], eqp: { weapon: { id: 1472000, st: {} } } };
  if (M.loadout(tw).length) out.push('穿拳套還能帶二連擊');
  tw.eqp.weapon = { id: 1332000, st: {} }; if (M.loadout(tw).length !== 1) out.push('穿短刀帶不了二連擊');
  // 一鍵穿裝換上更好的；全部賣出不賣等級比自己高的
  const I0 = window.MSA.itm, w1 = +Object.keys(I0).find(k => I0[k].s === 'weapon' && I0[k].job === 'thief' && I0[k].wt === 'claw' && I0[k].req <= late.lv && !I0[k].rare && (I0[k].rq.luk || 0) <= late.luk);
  late.inv = [{ id: w1, st: { pad: 99 }, tuc: 0, up: 0, q: 1 }, { id: w1, st: {}, tuc: 0, up: 0, q: 0, req: 99 }];
  if (M.bestGear(late) !== 1 || late.eqp.weapon.st.pad !== 99) out.push('一鍵穿裝沒換上比較好的武器');
  if (M.sellList(late, 'all').some(it => it.req === 99)) out.push('全部賣出賣到了等級比自己高的裝備');
  // 武器：每個職業／分支都有教官送的武器、商店有東西可買；分支限制種類
  const I = window.MSA.itm;
  for (const j in D.JOBS) for (const br of [undefined, ...Object.keys(D.JOBS[j].br || {})]) {
    const c = { job: j, br }, w = M.starter(c), nm = j + (br ? '/' + br : '');
    if (!w || !M.jobOk(c, I[w.id])) out.push(`${nm} 沒有可用的起始武器`);
    for (const t of D.JOBS[j].br?.[br]?.wt || []) if (!Object.values(I).some(m => m.wt === t && !m.rare)) out.push(`${nm} 的武器種類 ${t} 一件都沒有`);
  }
  for (const m of Object.values(I)) if (m.s === 'weapon' && !D.WT[m.wt]) out.push(`武器 ${m.nm} 的種類 ${m.wt} 不在 WT`);
  if (M.jobOk({ job: 'warrior', br: 'spear' }, I[1302077]) || !M.jobOk({ job: 'warrior' }, I[1432015]) || !M.jobOk({ job: 'beginner' }, I[1452002])) out.push('武器的職業／分支限制錯誤');
  return out;
});
// 選單點得動：標題 → 角色選擇（面板的 click handler 壞掉時所有按鈕都會沒反應）
await p.evaluate(() => document.querySelector('.msv-title').click());   // 直接觸發：標題上的怪物在走，滑鼠點擊會等它穩定
if (!await p.locator('.msv-slot').count()) r.push('點標題畫面進不了角色選擇（選單 click handler 壞了？）');
await b.close();
const bad = [...r, ...errs];
if (bad.length) { console.log('✗ ' + bad.join('\n✗ ')); process.exit(1); }
console.log('✓ 卷軸機率、掉落表、技能圖示、轉職與 SP 分池自檢通過');
