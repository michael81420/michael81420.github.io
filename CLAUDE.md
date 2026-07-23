# michael 投資筆記 — 站點慣例

純靜態 GitHub Pages 站。無框架、無建置步驟，直接寫 HTML/CSS/JS。
新增頁面時**沿用既有 class 與主題變數**，不要引入新框架、新 CSS 檔或新依賴。

## 檔案結構

```
index.html              首頁（精選 + 分類 chip + 搜尋 + 文章卡片列表）
assets/site.css         唯一樣式表（warm paper 主題，light/dark）
assets/site.js          主題切換 + 首頁分類/搜尋過濾（原生 JS）
posts/<slug>.html       每篇文章一檔，slug 用 kebab-case
```

## 主題

- 色彩、字型全在 `site.css` 的 `:root` / `[data-theme="dark"]` CSS 變數。**永遠用 `var(--…)`，不要寫死色碼。**
- 常用：`--bg --surface --surface2 --border --ink --ink2 --ink3 --accent`
- 語氣色（看多/中性/偏淡/轉機）：`--win --mid --lose --turn`，各有 `*bg`/`*bd` 變體。
- 深色模式自動跟著變數走，寫死色碼會在 dark 下爆掉。

## 文章頁範本

### 標題一律 `主體．本次說明`

分隔符用**全形句點 `．`**，不是 `·` 也不是 `:`。前面是這篇在講的主體（工具／框架／語言／節目名），後面是這次要說明什麼。

```
JavaScript．從零到會用          React．完全上手：什麼時候用、怎麼用
JavaScript．From Zero          React．Properly: When to Use What, and How
```

每篇 `posts/<slug>.html` 的骨架（路徑用 `../` 因為在子目錄）：

```html
<!DOCTYPE html>
<html lang="zh-Hant"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>…完整標題…</title>
<script>try{var t=localStorage.getItem("theme");if(t)document.documentElement.setAttribute("data-theme",t);}catch(e){}</script>
<link rel="stylesheet" href="../assets/site.css">
<script src="../assets/site.js" defer></script>
</head><body><div class="wrap">
<div class="topbar"><a class="btn-back" href="../index.html">← 回到列表</a><button class="theme-toggle" onclick="toggleTheme()">☾</button></div>

<header>
  <h1>…標題…</h1>
  <div class="sub">…一兩句副標…</div>
  <div style="margin-top:10px">
    <span class="badge new">來源:…</span>
    <span class="badge">整理日:YYYY-MM-DD</span>
  </div>
</header>

<div class="card tldr"><h2>TL;DR</h2>…重點…</div>

<h2>段落標題</h2>
<div class="card">…內容…</div>

<div class="foot"><b>資料來源</b>:… <br><b>免責聲明</b>:本頁為個人研究筆記,不構成投資建議。</div>
</div></body></html>
```

可用 class（都在 site.css）：
- 區塊：`card`、`card tldr`（重點框）、`quote`（引言）、`foot`（頁尾來源/免責）
- 標題：`h2`（左邊框線）、`h3`（accent 色）
- 標籤：`badge` / `badge new`、`pill`（`p-bull/p-turn/p-neu/p-bear`）
- 卡片群：`cards` > `scard`（個股卡，見 gooaye-ep673 用 JS 動態 render）
- 重點框群：`kbox` > `kcard`（kt/kd/ke）
- 表格：直接 `<table>` 即套主題
- 強調字：`win`/`mid`/`lose`

資料多時用頁尾 `<script>` 把陣列 render 成卡片/表格（見 `gooaye-ep673-stocks.html`），不要手刻幾十張卡片。

## 能畫圖就畫圖

**能用圖說明的就畫圖**，方便讀者理解。流程、架構、循環、A vs B 的對比，圖一定比一段文字好讀。
一篇文章通常值得 2–3 張圖，放在對應段落 `card` 的最前面（圖先，表格/文字在後）。

畫法：**直接手寫 inline `<svg>`**，包在 `<div class="fig" style="overflow-x:auto;margin:2px 0 18px">` 裡。
不要用 excalidraw / mermaid / 任何繪圖庫或圖檔——那些跟不了主題變數，dark mode 會爆掉，也違反「不加依賴」。

```html
<div class="fig" style="overflow-x:auto;margin:2px 0 18px">
<svg viewBox="0 0 760 320" style="width:100%;min-width:600px;height:auto"
     xmlns="http://www.w3.org/2000/svg" role="img" aria-label="…一句話講完這張圖的結論…">
  <defs><marker id="ah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7"
    orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" style="fill:var(--ink3)"/></marker></defs>
  <rect x="20" y="60" width="120" height="34" rx="8" style="fill:var(--surface2);stroke:var(--border)"/>
  <text x="80" y="82" text-anchor="middle" style="fill:var(--ink);font:600 12px sans-serif">框</text>
  <line x1="142" y1="77" x2="180" y2="77" style="stroke:var(--ink3)" marker-end="url(#ah)"/>
</svg>
</div>
```

規則：
- 顏色一律 `var(--…)`，跟文字同一套：`--surface2/--border/--ink/--ink2/--ink3`；語氣用 `--win/--lose/--mid/--turn` + `*bg`/`*bd`（例：貴的步驟用 lose、便宜的用 win）。
- `viewBox` 固定 `0 0 760 <h>`，配 `width:100%;min-width:600px;height:auto` → 桌機自適應、手機橫向捲動。
- `role="img"` + `aria-label` 用**一句話寫出這張圖的結論**，不是「流程圖」。
- **同一頁多張圖，`marker` 的 id 必須不同**（`ah`/`ah2`/`ah3`），否則會互相蓋掉。
- 中英兩版都要有圖；**英文字串較長，容易撞版或超出 viewBox**，英文版常需要自己的座標，不能照抄中文版。

畫完一定要在瀏覽器實看（中英 × light/dark × 寬窄），別只靠座標腦補。可用這段抓文字超框/重疊：

```js
document.querySelectorAll('.fig svg').forEach(svg => {
  const vb = svg.viewBox.baseVal;
  svg.querySelectorAll('text').forEach(t => { const b = t.getBBox();
    if (b.x < vb.x || b.x + b.width > vb.x + vb.width) console.log('超出 viewBox:', t.textContent); });
});
```

範例見 `posts/karpathy-llm-wiki.html`（RAG vs Wiki 對比、三層架構閉環、三操作循環）。

## 寫個股要帶族群

寫個股筆記時不要只講單一支，對它所屬的**同族群概念股**（同一題材／概念下的其他個股）也要展開，**廣度要夠**——把該族群裡值得一提的都帶到，不是只點兩三支。主標的分析完後、頁尾之前，固定插一段「同族群概念股掃描」：

1. 一句話定義族群——這支歸在哪個題材／概念（如 CoWoS、矽光子、重電），範圍畫清楚。
2. 一張族群表——同題材下值得提的個股逐一列，欄位固定：`代號/名稱 · 族群裡的定位 · 相對強弱（龍頭/跟漲/落後）· forward PE 或估值差異 · 一句話看法`。資料多就照本檔慣例用頁尾 `<script>` render 成 `<table>` 或 `cards>scard`，不手刻。
3. （可選）族群關係圖——族群內若有分工／強弱結構，補一張 inline `<svg>` 放該段 `card` 最前面。

估值走 invest-playbook：forward PE 不用 trailing，先判族群循環烈度。範圍只做同族群概念股；上下游／競爭同業／跨市場對標不強制，除非另外指示。

## 把新文章掛上首頁

改 `index.html`，在 `#grid` 加一張卡片：

```html
<a class="post-card" data-cat="分類名"
   data-title="標題 + 可搜尋關鍵字"
   data-excerpt="逗號分隔的可搜尋關鍵字"
   href="posts/<slug>.html">
  <span class="pc-cat">分類名</span>
  <div class="pc-title">標題</div>
  <div class="pc-excerpt">一句話摘要</div>
  <div class="pc-date">YYYY · M · D</div>
</a>
```

- `data-cat` / `data-title` / `data-excerpt` 餵給 `site.js` 的分類+搜尋，務必填。
- **若是新分類**：在 `.toolbar` 加一顆 `<button class="chip" data-cat="分類名">分類名</button>`。chip 是 data-driven，加了就能用，不用改 JS。同時在 `site.js` 的 `CATL` 補上該分類的中英標籤。
- `#hero`（`.featured`）精選位**自動選最新一篇**（依卡片 `.pc-date` 日期），不用手改。
- 首頁卡片顯示順序由 `site.js` 依 `.pc-date` **自動新→舊排序**（rule-based，見 `initHome()`），新卡片加進 `#grid` 時位置不影響顯示順序，放哪裡都可以。

### 站是雙語的，一篇要掛四處

每篇文章有中英兩檔（`posts/<slug>.html` + `posts/<slug>.en.html`），首頁也有兩份（`index.html` + `index.en.html`）。掛一篇新文章要同步五處：

1. `posts/<slug>.html` — 中文頁（body 加 `data-slug="<slug>"`，topbar 需 `lang-toggle` 按鈕）。
2. `posts/<slug>.en.html` — 英文頁（`<html lang="en">`、back 鈕指 `../index.en.html`、`lang-toggle` 文字為「中」）。兩檔 `data-slug` 必須一致，lang-toggle 才切得過去。
3. `index.html` 與 `index.en.html` 各加一張 `post-card`（各自語言的 title/excerpt，`href` 指對應語言檔；`data-cat` 兩邊都用**中文**正規值）。
4. **`site.js` 最上面的 `POSTS` 陣列加一筆**（`slug`/`cat`/`zh`/`en`）—— 這是左側全文章樹的唯一事實來源，漏了進頁時左欄選不到當前文章。順序新→舊。
5. **`sitemap.xml` 加兩行**（中英各一 `<url><loc>…</loc></url>`）—— 漏了搜尋引擎收錄不到新頁。`robots.txt` 只指 sitemap、不列個別頁，不用動。

## 不要做的事

- 不要加建置工具、npm、框架、CSS 預處理器。
- 不要新增第二份 CSS；擴充就加到 `site.css`。
- 不要寫死色碼或字型，一律走 CSS 變數。
