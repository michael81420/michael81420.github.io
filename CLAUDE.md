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
- `#hero`（`.featured`）精選位**自動選最新一篇**（依卡片 `.pc-date` 日期），不用手改；把新卡片放 `#grid` 最前面即可。

### 站是雙語的，一篇要掛四處

每篇文章有中英兩檔（`posts/<slug>.html` + `posts/<slug>.en.html`），首頁也有兩份（`index.html` + `index.en.html`）。掛一篇新文章要同步：

1. `posts/<slug>.html` — 中文頁（body 加 `data-slug="<slug>"`，topbar 需 `lang-toggle` 按鈕）。
2. `posts/<slug>.en.html` — 英文頁（`<html lang="en">`、back 鈕指 `../index.en.html`、`lang-toggle` 文字為「中」）。兩檔 `data-slug` 必須一致，lang-toggle 才切得過去。
3. `index.html` 與 `index.en.html` 各加一張 `post-card`（各自語言的 title/excerpt，`href` 指對應語言檔；`data-cat` 兩邊都用**中文**正規值）。
4. **`site.js` 最上面的 `POSTS` 陣列加一筆**（`slug`/`cat`/`zh`/`en`）—— 這是左側全文章樹的唯一事實來源，漏了進頁時左欄選不到當前文章。順序新→舊。

## 不要做的事

- 不要加建置工具、npm、框架、CSS 預處理器。
- 不要新增第二份 CSS；擴充就加到 `site.css`。
- 不要寫死色碼或字型，一律走 CSS 變數。
