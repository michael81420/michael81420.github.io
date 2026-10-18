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
  for (const sc of D.SCROLLS) {
    const c = { ok: 0, fail: 0, boom: 0 };
    for (let i = 0; i < N; i++) { const it = { id: 0, st: {}, tuc: 1, up: 0 }; c[window.__msvScroll({ job: 'warrior' }, it, sc)]++; }
    const boomWant = sc.dark ? (1 - sc.pct) * .5 : 0;
    // 三個標準差內算過（N=1 萬時約 ±1.5%）
    if (Math.abs(c.ok / N - sc.pct) > .015) out.push(`${sc.k} 成功率 ${c.ok / N}，應為 ${sc.pct}`);
    if (Math.abs(c.boom / N - boomWant) > .015) out.push(`${sc.k} 爆裝率 ${c.boom / N}，應為 ${boomWant}`);
  }
  for (const id in D.MOBS) if (!window.__msvDropTable(id).eq.length) out.push(`怪物 ${id} 沒有任何掉落`);
  for (const id in D.MOBS) for (const i of D.MOBS[id].rare || []) if (!window.MSA.itm[i]) out.push(`怪物 ${id} 的稀有掉落 ${i} 不在 atlas`);
  for (const id in D.SK) if (!window.MSA.ico.skills?.a[id]) out.push(`技能 ${id} 沒有圖示：重跑 tools/build-assets.mjs`);
  return out;
});
await b.close();
const bad = [...r, ...errs];
if (bad.length) { console.log('✗ ' + bad.join('\n✗ ')); process.exit(1); }
console.log('✓ 卷軸機率、掉落表、技能圖示自檢通過');
