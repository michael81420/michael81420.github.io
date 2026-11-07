# 網站架構與驗證

本站直接提供 HTML、CSS 與原生 JavaScript，沒有建置步驟。`assets/site.js` 的 `POSTS` 登記文章日期、分類、語言標題與草稿狀態。中英文 HTML 各自保存文章內容與首頁卡片，`tools/check.mjs` 檢查這些副本是否一致。

`initHome()` 管理文章、財報與遊戲模式。`initArticle()` 建立文章側欄與內文欄。`initSitebar()` 建立全站導覽。財報模式進入 `#earnings` 時才載入各篇的 `.earn.js`，再依 ticker 合併季度。手機隱藏文章側欄，讀者經返回列表切換文章。

## 執行驗證

在專案根目錄執行。

```sh
node tools/check.mjs
node tools/visual.mjs
node tools/journeys.mjs
node posts/maple-survivors/tools/selfcheck.mjs
```

瀏覽器檢查沿用 `tools/package-lock.json` 的 Playwright。初次使用時，在 `tools` 目錄執行 `npm ci` 與 `npx playwright install chromium`。這些依賴只供驗證使用。

| 檢查 | 驗證範圍 |
| --- | --- |
| `check.mjs` | 全站中英頁、文章登記、首頁卡片、sitemap、SEO、財報欄位與主題規則。 |
| `visual.mjs` | 全部 HTML 在 390px 下的 SVG 文字超框、重疊、整頁橫向溢出與執行錯誤。 |
| `journeys.mjs` | 中英文、390px 與 1440px、淺色與深色下的代表性讀者操作。 |
| 遊戲 `selfcheck.mjs` | 遊戲卷軸機率與掉落表。 |

互動檢查補足逐頁開啟無法覆蓋的行為。檢查透過點擊、輸入及導覽驗證文章內容、跨文章切換、語言與主題、財報載入、篩選、排序、展開與返回列表。等待具體畫面狀態，不以固定延遲判定完成。頁面使用測試網域讀取本機檔案，讓草稿隱藏規則與公開站一致。

CI 在部署前執行上述檢查。新增互動或改導覽流程時，更新 `journeys.mjs`，並暫時破壞對應行為，確認檢查失敗後還原。新增檔案格式或文章登記規則時，更新 `check.mjs`。

## 邊界

互動檢查使用代表文章，不逐篇點擊所有連結。全頁幾何檢查目前只跑手機寬度，沒有逐頁桌機截圖比較。瀏覽器使用 Chromium，尚未涵蓋 Safari 與 Firefox。外部網站、字型服務、財報事實正確性與完整遊戲操作仍需另行驗證。
