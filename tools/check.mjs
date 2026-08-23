/* 靜態一致性檢查：把 CLAUDE.md 的「一篇要掛五處」變成可執行的規則。零依賴，node tools/check.mjs */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const read = p => readFileSync(join(ROOT, p), 'utf8');
const errs = [];
const bad = (where, msg) => { const e = `${where}: ${msg}`; if (!errs.includes(e)) errs.push(e); };

/* site.js 的 POSTS 是全站唯一事實來源，直接把陣列字面值 eval 出來 */
const siteJs = read('assets/site.js');
const start = siteJs.indexOf('var POSTS=[');
const end = siteJs.indexOf('\n];', start);
if (start < 0 || end < 0) { console.error('site.js: 找不到 POSTS 陣列'); process.exit(1); }
const POSTS = eval(siteJs.slice(start + 'var POSTS='.length, end + 2));

const idxZh = read('index.html'), idxEn = read('index.en.html');
const sitemap = read('sitemap.xml');

for (const p of POSTS) {
  const zh = `posts/${p.slug}.html`, en = `posts/${p.slug}.en.html`;
  if (!existsSync(join(ROOT, zh))) { bad(zh, '缺中文頁'); continue; }
  if (!existsSync(join(ROOT, en))) { bad(en, '缺英文頁'); continue; }
  const [z, e] = [read(zh), read(en)];

  /* 中英兩檔 data-slug 必須一致且等於 slug，否則 lang-toggle 切不過去 */
  for (const [f, s] of [[zh, z], [en, e]]) {
    if (!s.includes(`data-slug="${p.slug}"`)) bad(f, `body 缺 data-slug="${p.slug}"`);
    if (!s.includes('lang-toggle')) bad(f, '缺 lang-toggle 按鈕');
  }
  if (!e.includes('<html lang="en"')) bad(en, '英文頁 <html lang> 不是 en');
  if (!z.includes('href="../index.html"')) bad(zh, '返回鍵沒指向 ../index.html');
  if (!e.includes('href="../index.en.html"')) bad(en, '返回鍵沒指向 ../index.en.html');

  /* 財報分析走資料表，不進 #grid；其餘兩份 index 各要一張卡 */
  const earn = p.cat === '財報分析';
  for (const [name, idx, href] of [['index.html', idxZh, `posts/${p.slug}.html`],
                                   ['index.en.html', idxEn, `posts/${p.slug}.en.html`]]) {
    const has = idx.includes(`href="${href}"`);
    if (earn && has) bad(name, `${p.slug} 是財報分析，不該有首頁卡片`);
    if (!earn && !has) bad(name, `缺 ${p.slug} 的 post-card`);
  }
  if (earn) {
    const js = `posts/${p.slug}.earn.js`;
    if (!existsSync(join(ROOT, js))) bad(js, '財報分析缺 earn.js');
    else if (!read(js).includes(`['${p.slug}']`)) bad(js, `key 不等於 slug '${p.slug}'`);
  }

  /* 草稿不進 sitemap，其餘中英各一行 */
  for (const f of [zh, en]) {
    const inMap = sitemap.includes(`/${f}<`);
    if (p.draft && inMap) bad('sitemap.xml', `${f} 是草稿，不該收錄`);
    if (!p.draft && !inMap) bad('sitemap.xml', `缺 ${f}`);
  }
}

/* 反向：posts/ 底下不該有沒登記進 POSTS 的孤兒頁 */
const slugs = new Set(POSTS.map(p => p.slug));
for (const f of readdirSync(join(ROOT, 'posts'))) {
  if (!f.endsWith('.html')) continue;
  const slug = f.replace(/\.en\.html$|\.html$/, '');
  if (!slugs.has(slug)) bad(`posts/${f}`, 'site.js 的 POSTS 沒有這筆');
}
for (const loc of sitemap.matchAll(/<loc>https:\/\/michael81420\.github\.io\/([^<]+)<\/loc>/g))
  if (!existsSync(join(ROOT, loc[1]))) bad('sitemap.xml', `${loc[1]} 檔案不存在`);

/* 全站頁面：寫死色碼、重複 marker id、連結指到不存在的檔案 */
const pages = [...readdirSync(join(ROOT, 'posts')).filter(f => f.endsWith('.html')).map(f => `posts/${f}`),
               'index.html', 'index.en.html', 'about.html', 'about.en.html'];
for (const f of pages) {
  // <pre> 裡是程式碼範例，不是真的樣式或連結，掃之前先拿掉
  const s = read(f).replace(/<pre[\s\S]*?<\/pre>/g, '');
  for (const m of s.matchAll(/(fill|stroke|color|background(?:-color)?|border(?:-[a-z]+)?)\s*[:=]\s*"?\s*(#[0-9a-fA-F]{3,8})\b/g))
    bad(f, `寫死色碼 ${m[2]}（要用 var(--…)，否則 dark mode 會爆）`);

  const ids = [...s.matchAll(/<marker[^>]*\sid="([^"]+)"/g)].map(m => m[1]);
  for (const id of new Set(ids.filter((v, i) => ids.indexOf(v) !== i)))
    bad(f, `marker id "${id}" 同頁重複，箭頭會互相蓋掉`);

  for (const m of s.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const url = m[1].split(/[#?]/)[0];
    if (!url || /^(https?:|mailto:|data:|\/\/)/.test(url)) continue;
    if (!existsSync(resolve(ROOT, dirname(f), url))) bad(f, `連結指到不存在的檔案: ${m[1]}`);
  }
}

if (errs.length) { console.error(`✗ ${errs.length} 個問題：\n` + errs.map(e => '  ' + e).join('\n')); process.exit(1); }
console.log(`✓ ${POSTS.length} 篇文章、${pages.length} 個頁面，全部檢查通過`);
