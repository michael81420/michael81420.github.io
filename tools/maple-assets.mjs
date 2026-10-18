/* 楓之谷倖存者素材產生器：抓圖 → headless Chromium 解碼拼圖 → 每個實體一張 WebP + assets/maple/atlas.js。
   本機跑一次就好，產物進 repo，線上遊戲不打第三方。
   cd tools && node maple-assets.mjs        （原始下載快取在 tools/.maple-cache，重跑不重抓）
   來源分兩家：
   - resource-static.msu.io：WZ 解包，逐幀 PNG＋原點。怪物、地板圖塊、地圖物件走這裡。
   - maplestory.io（GMS v83）：msu 是新版資料，舊版技能（強力攻擊等）已不在 → 技能走這裡；角色要整套裝備合成好的圖，也走這裡。
   ponytail: 角色是合成好的 GIF、沒有原點，錨點用「腳底那幾列像素的平均 x」推估；第二期做分層紙娃娃時改吃 msu 的 Character 部件原點。*/
import { chromium } from 'playwright';
import { mkdirSync, existsSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';

const ROOT = resolve(import.meta.dirname, '..'), OUT = join(ROOT, 'assets/maple'), CACHE = join(import.meta.dirname, '.maple-cache');
const MSU = 'https://resource-static.msu.io/data', API = 'https://maplestory.io/api', REGS = ['GMS/83', 'GMS/255', 'TWMS/256', 'KMS/389'];

// ---- 素材清單（第一期） ----
const MOBS = [100100, 100101, 130101, 120100, 210100, 130100, 1210100, 1210101, 1210102, 2110200, 2220100, 2230101, 2230102, 3210100, 6130101];
const NPCS = [1022000, 1012100, 1032001, 1052001];               // 轉職教官：武術教練、赫麗娜、漢斯、達克魯（選職業畫面）
const MOB_ACTS = ['stand', 'move', 'hit1', 'die1'], BOSS_ACTS = { 6130101: ['attack1'] };
const BASE = [2000, 12000, 20000, 30030];                    // 膚色身體、頭、臉、髮型（男）
const NOVICE = [1040002, 1060002, 1072001];                   // 見習期共用：白內衣、藍短褲、紅雨鞋
const CHARS = {                                               // 職業 → [見習, 1轉, 2轉] 的裝備
  warrior: { atk: 'swingO1', t: [[...NOVICE, 1302000], [1002002, 1040015, 1060008, 1072005, 1302077], [1002023, 1040021, 1060016, 1072003, 1302008]] },
  bowman:  { atk: 'shoot1',  t: [[...NOVICE, 1452051], [1002010, 1040008, 1062004, 1072015, 1452002], [1002161, 1040067, 1060056, 1072079, 1452005]] },
  magician:{ atk: 'swingO1', t: [[...NOVICE, 1372043], [1002017, 1040004, 1060012, 1072006, 1382000], [1002013, 1050003, 1072076, 1382017]] },
  thief:   { atk: 'swingO2', t: [[...NOVICE, 1472061], [1002122, 1040031, 1060021, 1072070, 1472000], [1002171, 1040057, 1060043, 1072032, 1472008]] },
};
const CHAR_ACTS = ['stand1', 'walk1', 'atk', 'alert'];
const SKILL_JOBS = [100, 110, 200, 210, 300, 310, 400, 410];
const SKILLS = [1001004, 1001005, 1101006, 1100002, 2001004, 2001005, 2101004, 2101005, 2101001, 2001002,
                3001004, 3001005, 3101005, 3100001, 4001344, 4001003, 4101004, 4100001]; // 有特效要畫的技能（被動多半沒圖，抓不到就略過）
// BOSS 關沿用 s1 地板。
// 關卡地板：原作沒有俯視地面 → 用該地區的 bsc（原作就設計成無縫重複的泥土填充）鋪底，再撒該地區的地圖物件
const FLOORS = {
  s1:   { tile: 'grassySoil', obj: ['acc1/grassySoil/nature'] },
  s2:   { tile: 'grassySoil', obj: ['acc1/midForest/nature'] },
  s3:   { tile: 'grassySoil', obj: ['acc1/heneFarmFD/nature'] },
  s4:   { tile: 'darkWood',   obj: ['acc1/darkWood/nature'] },
  s5:   { tile: 'dryRock',    obj: ['acc1/dryRock/nature'] },
};

// ---- 下載（多版本依序退回、重試、快取） ----
mkdirSync(CACHE, { recursive: true }); rmSync(OUT, { recursive: true, force: true }); mkdirSync(OUT, { recursive: true });
async function get(path, { regs = REGS, raw = false } = {}) {
  const key = join(CACHE, createHash('sha1').update(raw ? path : regs[0] + '/' + path).digest('hex'));  // 角色網址很長、前綴相同，截斷會撞名
  if (existsSync(key)) return readFileSync(key);
  for (let round = 0; round < 3; round++) for (const r of raw ? [''] : regs) {
    try {
      const x = await fetch(raw ? `${API}/${path}` : `${API}/${r}/${path}`, { signal: AbortSignal.timeout(45000) });
      if (x.status !== 200) continue;
      const b = Buffer.from(await x.arrayBuffer()); writeFileSync(key, b); return b;
    } catch { /* 逾時就換下一個版本 */ }
  }
  return null;
}
async function msu(path) {
  const key = join(CACHE, createHash('sha1').update('msu/' + path).digest('hex'));
  if (existsSync(key)) return readFileSync(key);
  for (let round = 0; round < 3; round++) try {
    const x = await fetch(`${MSU}/${path}`, { signal: AbortSignal.timeout(30000) });
    if (x.status === 200) { const b = Buffer.from(await x.arrayBuffer()); writeFileSync(key, b); return b; }
    if (x.status === 403 || x.status === 404) return null;   // 403 ＝ 檔案不存在（S3 行為），不用重試
  } catch { /* 逾時重試 */ }
  return null;
}
const msuJson = async p => { const b = await msu(p); return b && JSON.parse(b); };
// WZ 節點的數字子鍵依序就是幀；每幀 {_path, origin, delay} → 下載 PNG 轉成 pngs() 吃的格式
const frames = node => Object.keys(node || {}).filter(k => /^\d+$/.test(k)).sort((a, b) => a - b).map(k => node[k]).filter(f => f?._path);
const msuFrames = async list => (await Promise.all(list.map(async f => { const b = await msu(f._path); return b && { image: b.toString('base64'), origin: f.origin, delay: f.delay }; }))).filter(Boolean);
const charPath = (items, act) => `character/${encodeURIComponent(items.map(i => JSON.stringify({ itemId: i, region: 'GMS', version: '83' })).join(','))}/${act}/animated?showears=false&padding=4`;

// ---- 瀏覽器端：解碼與拼圖 ----
const browser = await chromium.launch(), page = await browser.newPage();
// ImageDecoder 只在 secure context 有，about:blank 不算 → 掛一個假的 https 頁
await page.route('https://maple.local/', r => r.fulfill({ contentType: 'text/html', body: '<body></body>' }));
await page.goto('https://maple.local/');
await page.evaluate(() => {
  const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  // GIF → 依「全部幀不透明聯集」裁切，錨點＝底部中央
  window.gif = async (s) => {
    const dec = new ImageDecoder({ data: b64(s), type: 'image/gif' }); await dec.tracks.ready;
    const n = dec.tracks.selectedTrack.frameCount, fr = [];
    for (let i = 0; i < n; i++) { const { image } = await dec.decode({ frameIndex: i }); const c = new OffscreenCanvas(image.displayWidth, image.displayHeight); c.getContext('2d').drawImage(image, 0, 0); fr.push({ c, d: Math.round((image.duration || 100000) / 1000) }); image.close(); }
    let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    for (const { c } of fr) { const p = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (p[(y * c.width + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } }
    if (x1 < 0) return null;
    // 錨點 x 取「最底下 6 列不透明像素」的平均 x（＝腳），不用範圍中心 —— 武器把範圍撐寬時人才不會左右跳
    let sum = 0, cnt = 0;
    for (const { c } of fr) { const p = c.getContext('2d').getImageData(0, y1 - 5, c.width, 6).data;
      for (let i = 0; i < p.length; i += 4) if (p[i + 3] > 8) { sum += (i / 4) % c.width; cnt++; } }
    const w = x1 - x0 + 1, h = y1 - y0 + 1;
    return fr.map(({ c, d }) => ({ c, sx: x0, sy: y0, w, h, ox: Math.round(sum / cnt) - x0, oy: h, d }));
  };
  // 技能 JSON 的幀：PNG + 原點
  window.pngs = async (list) => Promise.all(list.map(async f => { const bm = await createImageBitmap(new Blob([b64(f.image)], { type: 'image/png' }));
    return { c: bm, sx: 0, sy: 0, w: bm.width, h: bm.height, ox: f.origin?.x ?? 0, oy: f.origin?.y ?? 0, d: f.delay || 100 }; }));
  // 一個實體的所有動作 → 一張圖，每個動作一列
  window.pack = async (acts, q) => {
    const P = 1; let W = 0, H = 0;
    for (const fr of Object.values(acts)) { W = Math.max(W, fr.reduce((s, f) => s + f.w + P, 0)); H += Math.max(...fr.map(f => f.h)) + P; }
    const c = new OffscreenCanvas(W, H), g = c.getContext('2d'), meta = {}; let y = 0;
    for (const [k, fr] of Object.entries(acts)) { let x = 0; meta[k] = fr.map(f => { g.drawImage(f.c, f.sx, f.sy, f.w, f.h, x, y, f.w, f.h); const m = [x, y, f.w, f.h, f.ox, f.oy, f.d]; x += f.w + P; return m; }); y += Math.max(...fr.map(f => f.h)) + P; }
    const blob = await c.convertToBlob({ type: 'image/webp', quality: q });
    const u = new Uint8Array(await blob.arrayBuffer()); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000));
    return { meta, b64: btoa(s), W, H };
  };
});

const atlas = { mob: {}, chr: {}, skl: {}, map: {}, npc: {} }, report = [], miss = [];
let bytes = 0;
async function emit(kind, id, acts, q = 1) {           // q=1 → Chromium 走無損 WebP，像素圖邊緣不糊
  // 每個動作的幀先在頁面裡解好、存在 window.A，再一次拼圖（幀不跨回 Node）
  const r = await page.evaluate(async ({ acts, q }) => { const A = {};
    for (const [k, v] of Object.entries(acts)) { const f = v.gif ? await gif(v.gif) : await pngs(v.png); if (f && f.length) A[k] = f; }
    return Object.keys(A).length ? pack(A, q) : null; }, { acts, q });
  if (!r) return 0;
  const file = `${kind}-${id}.webp`; writeFileSync(join(OUT, file), Buffer.from(r.b64, 'base64'));
  atlas[kind][id] = { src: file, a: r.meta }; bytes += r.b64.length * 3 / 4;
  report.push(`${kind.padEnd(4)} ${String(id).padEnd(12)} ${Object.keys(r.meta).map(k => `${k}:${r.meta[k].length}`).join(' ').padEnd(56)} ${(r.b64.length * 3 / 4 / 1024).toFixed(1)}KB ${r.W}x${r.H}`);
  return Object.keys(r.meta).length;
}
const pool = async (list, n, fn) => { const it = list[Symbol.iterator](); await Promise.all(Array.from({ length: n }, async () => { for (const x of it) await fn(x); })); };

// 怪物（msu：逐幀＋原點；沒有動作的怪物會用 info.link 指到共用外觀的那隻）
const mobInfo = {};
await pool(MOBS, 4, async id => {
  let m = await msuJson(`Mob/${String(id).padStart(7, '0')}.json`);
  if (m && !m.stand && m.info?.link) m = await msuJson(`Mob/${String(m.info.link).padStart(7, '0')}.json`);
  if (!m) { miss.push(`mob ${id}（msu 沒有）`); return; }
  const acts = {};
  for (const a of [...MOB_ACTS, ...(BOSS_ACTS[id] || [])]) { const f = await msuFrames(frames(m[a])); if (f.length) acts[a] = { png: f }; else miss.push(`mob ${id} ${a}`); }
  const j = await get(`mob/${id}`, { regs: ['TWMS/256', ...REGS] }); if (j) { const t = JSON.parse(j); mobInfo[id] = { nm: t.name, lv: t.meta.level, hp: t.meta.maxHP, exp: t.meta.exp }; }  // 中文名
  await emit('mob', id, acts);
});
// NPC（msu：站立動畫）
for (const id of NPCS) {
  const n = await msuJson(`Npc/${String(id).padStart(7, '0')}.json`), f = await msuFrames(frames(n?.stand));
  if (f.length) await emit('npc', id, { stand: { png: f } }); else miss.push(`npc ${id}`);
}
// 角色：職業 × 轉職階段
await pool(Object.entries(CHARS).flatMap(([job, c]) => c.t.map((items, tier) => [job, tier, c.atk, items])), 3, async ([job, tier, atk, items]) => {
  const acts = {};
  await Promise.all(CHAR_ACTS.map(async a => { const act = a === 'atk' ? atk : a, b = await get(charPath([...BASE, ...items], act), { raw: true });
    if (b) acts[a] = { gif: b.toString('base64') }; else miss.push(`chr ${job}-${tier} ${act}`); }));
  await emit('chr', `${job}-${tier}`, acts);
});
// 技能：各職業 skillbook 一次抓，挑有特效的
const skillNm = {};
for (const job of SKILL_JOBS) {
  const b = await get(`job/${job}/skillbook`); if (!b) { miss.push(`skillbook ${job}`); continue; }
  for (const s of JSON.parse(b).skills || []) {
    skillNm[s.id] = s.description?.name;
    if (!SKILLS.includes(s.id)) continue;
    const acts = {};
    for (const k of ['effect', 'ball', 'hit', 'affected', 'prepare', 'keydown']) { const f = Array.isArray(s[k]) ? s[k][0]?.frames : s[k]?.frames; if (f?.length) acts[k] = { png: f }; }
    if (!(await emit('skl', s.id, acts))) miss.push(`skl ${s.id} ${s.description?.name}（無特效圖）`);
  }
}
for (const id of SKILLS) if (!(id in skillNm)) miss.push(`skl ${id}（skillbook 裡找不到）`);
// 關卡地板：bsc 全部變體一列、地圖物件（取第 0 幀）一列
const objCache = {};
for (const [k, f] of Object.entries(FLOORS)) {
  const t = await msuJson(`Map/Tile/${f.tile}.json`), obj = [];
  for (const g of f.obj) { const [file, ...path] = g.split('/'); objCache[file] ??= await msuJson(`Map/Obj/${file}.json`);
    const grp = path.reduce((o, p) => o?.[p], objCache[file]) || {};
    for (const key of Object.keys(grp).sort((a, b) => a - b)) { const f0 = grp[key]?.['0']; if (f0?._path) obj.push(f0); } }
  const acts = { bsc: { png: await msuFrames(frames(t?.bsc)) }, obj: { png: await msuFrames(obj) } };
  if (!acts.bsc.png.length) { miss.push(`floor ${k} ${f.tile}（沒有 bsc）`); continue; }
  if (!acts.obj.png.length) { miss.push(`floor ${k} 物件`); delete acts.obj; }
  await emit('map', k, acts, .9);
}
await browser.close();

// 幀格式：[x, y, w, h, 原點x, 原點y, 毫秒]；畫的時候把原點對到實體座標
writeFileSync(join(OUT, 'atlas.js'), `/* 由 tools/maple-assets.mjs 產生，勿手改。素材版權屬 Nexon，本站為非官方同人作品。\n   幀：[x,y,w,h,原點x,原點y,毫秒] */\nwindow.MSA=${JSON.stringify(atlas)};\n`);
writeFileSync(join(CACHE, 'names.json'), JSON.stringify({ mob: mobInfo, skill: skillNm }, null, 1));
console.log(report.sort().join('\n'));
console.log(`\n缺少 ${miss.length}：\n  ${miss.join('\n  ') || '（無）'}`);
console.log(`\n共 ${Object.values(atlas).reduce((s, o) => s + Object.keys(o).length, 0)} 張圖，${(bytes / 1024 / 1024).toFixed(2)} MB`);
