/* 視覺檢查：真的用 headless Chromium 開每一頁，抓 SVG 文字超框/重疊、版面橫向溢出、console error。
   node tools/visual.mjs  （需先在 tools/ 跑 npm install）
   ponytail: 只跑 light 一輪 —— 文字幾何與 console 都與主題無關，唯一跟主題有關的失敗（寫死色碼）
   已由 check.mjs 靜態擋掉。真要比對 dark 截圖再加。*/
import { chromium } from 'playwright';
import { readdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const pages = [...readdirSync(join(ROOT, 'posts')).filter(f => f.endsWith('.html')).map(f => `posts/${f}`),
               'index.html', 'index.en.html', 'about.html', 'about.en.html'].filter(f => existsSync(join(ROOT, f)));

const probe = () => {
  const out = [];
  const inter = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left);
  const vinter = (a, b) => Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);

  for (const svg of document.querySelectorAll('svg')) {
    const box = svg.getBoundingClientRect();
    const texts = [...svg.querySelectorAll('text')].filter(t => t.textContent.trim());
    const rects = texts.map(t => t.getBoundingClientRect());
    texts.forEach((t, i) => {
      const r = rects[i];
      if (r.width && (r.left < box.left - 1 || r.right > box.right + 1 || r.top < box.top - 1 || r.bottom > box.bottom + 1))
        out.push(`SVG 文字超出畫布: "${t.textContent.trim().slice(0, 30)}"`);
    });
    for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) {
      // 同一個 <text> 家族（tspan 換行）不算重疊；只抓真的撞在一起的兩段字
      if (inter(rects[i], rects[j]) > 2 && vinter(rects[i], rects[j]) > 2)
        out.push(`SVG 文字重疊: "${texts[i].textContent.trim().slice(0, 20)}" × "${texts[j].textContent.trim().slice(0, 20)}"`);
    }
  }
  // .fig 有 overflow-x:auto，圖再寬也該自己捲；整頁橫向溢出代表有東西沒包好
  if (document.documentElement.scrollWidth > window.innerWidth + 1)
    out.push(`整頁橫向溢出: scrollWidth ${document.documentElement.scrollWidth} > ${window.innerWidth}`);
  return out;
};

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 800 } });
const errs = [];
let noise = [];
page.on('console', m => { if (m.type() === 'error') noise.push(`console error: ${m.text()}`); });
page.on('pageerror', e => noise.push(`JS 例外: ${e.message}`));

for (const f of pages) {
  noise = [];
  await page.goto('file://' + join(ROOT, f), { waitUntil: 'load' });
  await page.waitForTimeout(80); // 等 site.js 的 defer 腳本 render 完卡片/表格
  for (const msg of [...new Set([...await page.evaluate(probe), ...noise])]) errs.push(`${f}: ${msg}`);
}
await browser.close();

if (errs.length) { console.error(`✗ ${errs.length} 個問題：\n` + errs.map(e => '  ' + e).join('\n')); process.exit(1); }
console.log(`✓ ${pages.length} 個頁面視覺檢查通過（390px 寬）`);
