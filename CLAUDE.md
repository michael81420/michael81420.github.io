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
<meta name="description" content="…150 字內摘要，內文不可有半形 &quot;…">
<link rel="canonical" href="https://michael81420.github.io/posts/<slug>.html">
<link rel="alternate" hreflang="zh-Hant" href="https://michael81420.github.io/posts/<slug>.html">
<link rel="alternate" hreflang="en" href="https://michael81420.github.io/posts/<slug>.en.html">
<link rel="alternate" hreflang="x-default" href="https://michael81420.github.io/posts/<slug>.html">
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
  <div class="pc-date"></div>
</a>
```

- `pc-date` **留空**：日期唯一來源是 `site.js` 的 `POSTS[].d`，由 JS 填入並依此排序，HTML 不要再寫一份。

- `data-cat` / `data-title` / `data-excerpt` 餵給 `site.js` 的分類+搜尋，務必填。
- **若是新分類**：在 `.toolbar` 加一顆 `<button class="chip" data-cat="分類名">分類名</button>`。chip 是 data-driven，加了就能用，不用改 JS。同時在 `site.js` 的 `CATL` 補上該分類的中英標籤。
- **若要再分一層（子分類）**：只在 `site.js` 的 `POSTS` 那筆加 `sub:'名稱'`，其他都不用動。首頁選到該分類時會自動長出第二排子分類 chip（`#subbar`，沒有子分類的分類整排隱藏），側欄該分類底下也自動多一層可展開的群組。子分類清單由 `POSTS[].sub` 推導，**不必登記到 `CATL`、也不必改 HTML**（中英同字，如 `Alphabet`、`NVIDIA`）。同分類內沒填 `sub` 的文章照樣直接列在分類底下，互不影響。
- `#hero`（`.featured`）精選位**自動選最新一篇**（依卡片 `.pc-date` 日期），不用手改。
- 首頁卡片顯示順序由 `site.js` 依 `.pc-date` **自動新→舊排序**（rule-based，見 `initHome()`），新卡片加進 `#grid` 時位置不影響顯示順序，放哪裡都可以。

### 站是雙語的，一篇要掛四處

每篇文章有中英兩檔（`posts/<slug>.html` + `posts/<slug>.en.html`），首頁也有兩份（`index.html` + `index.en.html`）。掛一篇新文章要同步五處：

1. `posts/<slug>.html` — 中文頁（body 加 `data-slug="<slug>"`，topbar 需 `lang-toggle` 按鈕）。
2. `posts/<slug>.en.html` — 英文頁（`<html lang="en">`、back 鈕指 `../index.en.html`、`lang-toggle` 文字為「中」）。兩檔 `data-slug` 必須一致，lang-toggle 才切得過去。
3. `index.html` 與 `index.en.html` 各加一張 `post-card`（各自語言的 title/excerpt，`href` 指對應語言檔；`data-cat` 兩邊都用**中文**正規值）。
4. **`site.js` 最上面的 `POSTS` 陣列加一筆**（`slug`/`d`/`cat`/`zh`/`en`，選填 `sub`）—— 這是左側全文章樹的唯一事實來源，漏了進頁時左欄選不到當前文章。`d` 填首頁卡片同一個日期（`YYYY-MM-DD`）；排序依 `d` 自動新→舊（分類展開順序也跟著走），陣列擺放位置隨意。
5. **`sitemap.xml` 加兩行**（中英各一 `<url><loc>…</loc><lastmod>YYYY-MM-DD</lastmod></url>`，`lastmod` 填 `d`，之後大改內容再更新）—— 漏了搜尋引擎收錄不到新頁。`robots.txt` 只指 sitemap、不列個別頁，不用動。

SEO 三件套 `description`／`canonical`（指自己）／`hreflang`（中英互指，`x-default` 指中文）每頁 `<head>` 都要有，英文頁 canonical 指 `.en.html`，其餘同上範本。缺了 `check.mjs` 會擋。

### 財報分析是例外：不掛首頁卡片，改掛資料表

`cat:'財報分析'` 的文章**不進 `#grid`**（第 3 處不用做）。站徽列（`site.js` 的 `initSitebar`
注入）左側是「文章／財報」兩個主分頁：點「財報」→ `index.html#earnings`，首頁藏掉精選、分類列、搜尋，整塊換成資料表
（站內任一頁都能直達；財報文章頁會亮「財報」、其他文章頁亮「文章」）—— 財報是拿來橫向比較的，密集表格比敘事卡片好掃，
也讓兩種內容永遠不會混在同一個清單裡。左側文章樹同理：財報頁只列財報、文章頁不列財報（`site.js` 依當前文章 `cat` 過濾）。所以財報文章要同步的是：1、2、4、5 **加上**：

**新建一支 `posts/<slug>.earn.js`**（中英共用一支，不用兩支）—— 首頁那張表的數字只存在這裡一份，
`site.js` 切到財報才依 `POSTS` 的 slug 動態插 `<script src>` 把它們載進來排表。
**`site.js` 沒有財報陣列，不用改；兩份 index 也不用改**：

```js
(window.EARN=window.EARN||{})['foo-2026q3-earnings']={
  tk:'FOO', g:['雲端','軟體'], nm:{zh:'Foo', en:'Foo'}, q:'2026 Q3',
  rev:'+12.3%', t:'win', opm:'28%',
  eps:'$1.23', eg:'non-GAAP', fcf:'−$1.2B', fcfm:'−4.1%', pe:'21.4x',
  tone:'neu', gd:1,
  v:{zh:'本季一句話結論', en:'One-line takeaway'},
  o:{zh:'指引重點', en:'Guidance highlights'},
  watch:[{s:'hit', zh:'上季待觀察 → 本季結果', en:'…'}],   // 首季留 []
  next:{zh:['下季要看的事'], en:['What to watch next']}
};
```

- 檔名**必須**是 `<slug>.earn.js`、key **必須**等於 slug，首頁靠這個對回文章；改 slug 記得一起改。
- 數字與文字**一律照抄本篇自己的內容**，不要另算一套；查不到就填 `—`（如 Tesla 的營收 YoY）。
- `eps` 放**剔除一次性後的核心 EPS**（本站主張看核心不看頭條），`eg` 只能填 `GAAP`／`non-GAAP`，顯示成數字後的括號。
- `fcf` 放**單季**自由現金流（只有全年數字就填 `—`），負號用 `−`，負值自動標紅。
- `q` 一律寫**日曆季度** `2026 Q2`，表格才能跨公司比同一期。財年跟日曆年不同的公司（標題寫 `FY2027 Q2`）依頁首「財報期」換算：三個月有兩個月以上落在哪一季就填哪一季（如 NVIDIA FY2027 Q2＝5–7 月 → `2026 Q2`、Oracle FY2027 Q1＝6–8 月 → `2026 Q3`）。
- `fcfm` FCF 利潤率 = 單季 FCF ÷ 單季營收（本篇自己的數字），一位小數加 `%`；`fcf` 是 `—` 就填 `—`。顯示在 FCF 下一行，FCF 欄排序也依它（絕對金額跨規模不可比）。
- `pe` 一律 forward，不放 trailing —— trailing 會被一次性利得灌壞。
- `t` 只給營收 YoY 上色（`win`/`lose`/`mid`，空字串不上色）。
- `g` 產業類別（陣列，一家可多類，如 Amazon `['雲端','電商','廣告']`）：填 `site.js` 的 `EGRP` key（中文正規值），表格上方的類別 chip 由此自動長出、依家數排序；新類別先在 `EGRP` 補英文標籤，否則 `check.mjs` 擋。
- `tone` 評等 pill：`bull` 看多／`neu` 中性／`bear` 偏淡／`turn` 轉機。
- `gd` 營收/EPS 指引方向：`1` 上修／`0` 維持／`-1` 下修／`null` 沒給或無從比較（不顯示箭頭）。
- `v` 取自 TL;DR、`o` 取自 Guidance 段、`next` 取自「下季待觀察」、`watch` 取自「回頭追認」（`s`：`hit` 應驗／`fail` 證偽觸發／`mid` 中性）。
- `nm`／`v`／`o`／`watch`／`next` 分中英，其餘共用。欄位漏填或值不合法 `check.mjs` 會擋。
- 同一 `tk` 的多篇自動收成一組：列上顯示最新季（營收/營益率帶跟上季比的 ▲▼），點開看逐季表、折線、待觀察。
- 預設順序吃 `POSTS[].d` 新→舊，跟 script 誰先載完無關；點表頭可改排序。表格右上的「最後更新」取財報 `POSTS[].d` 最新一筆，不用手填。
- 表頭與頁尾說明的中英文字在 `site.js` 的 `ETXT`。
- 走 `<script src>` 而不是 fetch JSON，是為了跟 `site.js` 送 `POSTS`／`CATL` 同一套模式，`file://` 直開也讀得到。

### 草稿（寫好但先不公開）

做 1、2、3、4 四處（首頁卡片照常寫），第 4 處那筆加 `draft:1`；**只有 sitemap 不加**。
`site.js` 會依 `draft:1` 把首頁卡片線上移除、側欄也只在自己頁面列出，讀者從首頁、側欄、搜尋引擎都看不到，
只有直接打網址進得去（純靜態站無法真正上鎖，別放機密）。本機預覽（`file://`／localhost）草稿卡片仍會顯示並標「草稿」，方便發佈前看版。
確認要發佈時：**刪掉 `draft:1`**，再補第 5 處 sitemap 兩行。

```js
{slug:'foo', d:'2026-07-27', cat:'前端開發', zh:'…', en:'…', draft:1},
```

## 每次修改都要看 CI 是否要跟著改

CI（`.github/workflows/ci.yml`）跑 `tools/check.mjs`（檔案一致性）與 `tools/visual.mjs`（headless 瀏覽器量版面），紅燈就不部署。
**每次改動結束前問一次：這次有沒有新增／改掉「要記得做 X」的規則？** 有就同步改 `check.mjs`，並故意弄壞一次確認它抓得到。常見觸發點：

- 改了本檔的慣例（新增同步處、改檔名／slug 規則、改分類機制、改標題格式…）
- 改了 `site.js` 的 `POSTS`／`CATL` 結構或 `index.html` 的 chip／卡片格式 —— `check.mjs` 是用字串比對讀這些的，格式一變就可能靜默失效
- 新增頂層頁面（`check.mjs`／`visual.mjs` 的頁面清單是寫死的）

改完本機跑 `node tools/check.mjs`（視覺檢查：`cd tools && node visual.mjs`）；push 後等 CI 綠才算完成。

## 不要做的事

- 不要加建置工具、npm、框架、CSS 預處理器。
- 不要新增第二份 CSS；擴充就加到 `site.css`。
- 不要寫死色碼或字型，一律走 CSS 變數。
