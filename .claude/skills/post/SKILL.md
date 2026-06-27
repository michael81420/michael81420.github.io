---
name: post
description: 一鍵把一條連結（文章/影片/GitHub repo）變成本站風格的文章頁。自動依內容性質派最合適的 subagent 做深度分析，再照 CLAUDE.md 慣例排版成 posts/ 頁面並掛上首頁。使用者貼連結說「建一篇」「做成網頁」「/post <連結>」時使用。
---

# /post — 連結 → 站點文章頁

輸入：一條連結（可附指定分類或標題）。輸出：一個符合本站風格的 `posts/<slug>.html` + 首頁掛好連結。

先讀專案根目錄的 `CLAUDE.md`（站點慣例與範本），全程照它排版。

## 流程

### 1. 派 subagent 做深度分析（依內容性質判斷，不寫死類型）

看連結內容，挑**最合適**的 subagent，把連結交給它做深度分析：

- 投資 / 股票 / 財經文章或影片 → `stock-analyst`
- GitHub repo / 技術文章 / 技術影片 → `software-engineer`
- 都不貼切 → `general-purpose`，並在 prompt 裡說明要的分析深度

> 路由靠判斷，不靠固定清單。日後有新主題就挑當下最合適的 agent，**不需要改這個 skill**。

拿回 agent 的分析結果當文章內容來源。

### 2. 排成文章頁

照 `CLAUDE.md` 的「文章頁範本」寫 `posts/<slug>.html`：

- `<slug>` 用 kebab-case（例：`gooaye-ep674-stocks`）。
- 沿用既有 class 與 `var(--…)` 主題變數，不引入新框架/CSS。
- 結構多筆資料時，用頁尾 `<script>` 把陣列 render 成 `scard`/表格（參考 `posts/gooaye-ep673-stocks.html`），不要手刻幾十張卡。
- 一定要有 `topbar`（返回鈕+主題鈕）、`header`（標題+來源 badge+整理日）、`foot`（來源+免責）。

### 3. 掛上首頁

改 `index.html`，在 `#grid` 加一張 `post-card`，填好 `data-cat`/`data-title`/`data-excerpt`/`href`/日期（格式見 CLAUDE.md）。

- 若是**新分類**：在 `.toolbar` 補一顆對應的 `chip`（data-driven，加了即生效）。
- 若這篇該當主打：把 `#hero`（`.featured`）換成這篇。

### 4. 收尾

回報：建立的檔名、用了哪個 agent、分類、是否新增 chip / 換 hero。不自動 commit/push，除非使用者要求。

## 原則

- 分析內容交給 agent，排版風格交給 CLAUDE.md，這個 skill 只負責串起來。
- 保持 general：新主題＝換 agent，不是改 skill。
