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

/* 財報類別清單：.earn.js 的 g 只能填這裡有的 key */
const gStart = siteJs.indexOf('var EGRP={');
const EGRP = gStart < 0 ? {} : eval('(' + siteJs.slice(gStart + 'var EGRP='.length, siteJs.indexOf('};', gStart) + 1) + ')');

const idxZh = read('index.html'), idxEn = read('index.en.html');
const sitemap = read('sitemap.xml');
const BASE = 'https://michael81420.github.io/';

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
    else {
      /* 首頁財報表直接吃這些欄位，漏一個就整列壞掉；跑一次把物件拿出來逐欄查 */
      const window = {};
      try { new Function('window', read(js))(window); } catch (e) { bad(js, `語法錯誤：${e.message}`); }
      const r = window.EARN?.[p.slug];
      if (r) {
        for (const k of ['tk', 'q', 'rev', 'opm', 'eps', 'fcf', 'pe']) if (typeof r[k] !== 'string' || !r[k]) bad(js, `缺 ${k}`);
        for (const k of ['nm', 'v', 'o']) if (!r[k]?.zh || !r[k]?.en) bad(js, `${k} 要有 zh/en`);
        if (!Array.isArray(r.g) || !r.g.length) bad(js, `g 要是非空陣列（產業類別，可多個）`);
        else for (const g of r.g) if (!EGRP[g]) bad(js, `類別「${g}」不在 site.js 的 EGRP，要先在那裡補英文標籤`);
        if (!['GAAP', 'non-GAAP'].includes(r.eg)) bad(js, `eg 只能是 GAAP / non-GAAP`);
        if (!['bull', 'neu', 'bear', 'turn'].includes(r.tone)) bad(js, `tone 只能是 bull/neu/bear/turn`);
        if (![1, 0, -1, null].includes(r.gd)) bad(js, `gd 只能是 1/0/-1/null`);
        if (!Array.isArray(r.watch) || r.watch.some(w => !['hit', 'fail', 'mid'].includes(w.s) || !w.zh || !w.en)) bad(js, `watch 每項要有 s(hit/fail/mid)/zh/en`);
        if (!r.next?.zh?.length || r.next.zh.length !== r.next.en?.length) bad(js, `next.zh / next.en 要有且條數相同`);
      }
    }
  }

  /* 草稿不進 sitemap，其餘中英各一行 */
  for (const f of [zh, en]) {
    const inMap = sitemap.includes(`/${f}<`);
    if (p.draft && inMap) bad('sitemap.xml', `${f} 是草稿，不該收錄`);
    if (!p.draft && !inMap) bad('sitemap.xml', `缺 ${f}`);
  }
}

/* 標題一律「主體．本次說明」（全形句點）
   ponytail: 只管 2026-09-26 之後的新文章，舊的 33 篇沒照規則，要補再把日期往前推 */
for (const p of POSTS.filter(p => p.d >= '2026-09-26'))
  for (const f of [`posts/${p.slug}.html`, `posts/${p.slug}.en.html`])
    if (existsSync(join(ROOT, f)) && !/<title>[^<]*．/.test(read(f))) bad(f, '<title> 缺全形分隔符「．」');

/* 分類要登記：CATL 有中英標籤、兩份首頁有 chip（財報分析走資料表，不用 chip） */
const catl = siteJs.slice(siteJs.indexOf('var CATL={'), siteJs.indexOf('};', siteJs.indexOf('var CATL={')));
for (const cat of new Set(POSTS.map(p => p.cat))) {
  if (!catl.includes(`'${cat}':`)) bad('assets/site.js', `CATL 缺分類「${cat}」的中英標籤`);
  if (cat === '財報分析') continue;
  for (const [name, idx] of [['index.html', idxZh], ['index.en.html', idxEn]])
    if (!idx.includes(`class="chip" data-cat="${cat}"`)) bad(name, `.toolbar 缺分類「${cat}」的 chip`);
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
for (const u of sitemap.match(/<url>.*?<\/url>/g))
  if (!/<lastmod>\d{4}-\d\d-\d\d<\/lastmod>/.test(u)) bad('sitemap.xml', `缺 <lastmod>: ${u}`);
if (sitemap.includes(`${BASE}index.html<`)) bad('sitemap.xml', `首頁要寫 ${BASE}，不是 index.html`);

/* 全站頁面：寫死色碼、重複 marker id、連結指到不存在的檔案 */
const pages = [...readdirSync(join(ROOT, 'posts')).filter(f => f.endsWith('.html')).map(f => `posts/${f}`),
               'index.html', 'index.en.html', 'about.html', 'about.en.html'];
const abs = f => BASE + (f === 'index.html' ? '' : f);
for (const f of pages) {
  /* SEO：description、canonical 指自己、hreflang 中英互指（缺了 Google 會把中英當重複頁） */
  const head = read(f).split('</head>')[0];
  const zh = f.replace(/\.en\.html$/, '.html'), en = zh.replace(/\.html$/, '.en.html');
  if (!/<meta name="description" content="[^"]+">/.test(head)) bad(f, '缺 <meta name="description">');
  if (!head.includes(`<link rel="canonical" href="${abs(f)}">`)) bad(f, `canonical 要指向 ${abs(f)}`);
  for (const [lang, t] of [['zh-Hant', zh], ['en', en], ['x-default', zh]])
    if (!head.includes(`hreflang="${lang}" href="${abs(t)}"`)) bad(f, `缺 hreflang="${lang}" → ${abs(t)}`);

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
