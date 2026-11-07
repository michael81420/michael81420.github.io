import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, realpath, mkdtemp } from 'node:fs/promises';
import { resolve, extname, sep, join } from 'node:path';
import { tmpdir } from 'node:os';
import { chromium } from 'playwright';

const ROOT = await realpath(resolve(import.meta.dirname, '..'));
const siteJs = await readFile(join(ROOT, 'assets/site.js'), 'utf8');
const postsStart = siteJs.indexOf('var POSTS=[');
const postsEnd = siteJs.indexOf('\n];', postsStart);
assert(postsStart >= 0 && postsEnd >= 0, '找得到文章登錄資料');
const drafts = eval(siteJs.slice(postsStart + 'var POSTS='.length, postsEnd + 2)).filter(post => post.draft);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
const server = createServer(async (req, res) => {
  try {
    if (req.method !== 'GET') { res.writeHead(405).end(); return; }
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = await realpath(resolve(ROOT, '.' + (pathname === '/' ? '/index.html' : pathname)));
    if (!file.startsWith(ROOT + sep) || !types[extname(file)]) { res.writeHead(403).end(); return; }
    res.writeHead(200, { 'Content-Type': types[extname(file)] });
    res.end(await readFile(file));
  } catch { res.writeHead(404).end(); }
});
await new Promise((done, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', done); });
const serverOrigin = `http://127.0.0.1:${server.address().port}`;
const origin = 'http://site.test';
const screenshots = await mkdtemp(join(tmpdir(), 'site-journeys-'));
const scenarios = ['zh', 'en'].flatMap(lang => [390, 1440].flatMap(width => ['light', 'dark'].map(theme => ({ lang, width, theme }))));
let browser;
try {
  browser = await chromium.launch();
  for (const scenario of scenarios) {
    const { lang, width, theme } = scenario;
    const label = `${lang}-${width}-${theme}`;
    const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme });
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    const errors = [];
    let step = '進入首頁';
    await context.route('**/*', async route => {
      if (new URL(route.request().url()).origin !== origin) { await route.abort(); return; }
      const response = await route.fetch({ url: route.request().url().replace(origin, serverOrigin) });
      await route.fulfill({ response });
    });
    page.on('pageerror', error => errors.push(`${step}: ${error.message}`));
    page.on('response', response => { if (response.url().startsWith(origin) && response.status() >= 400) errors.push(`${step}: HTTP ${response.status()} ${response.url()}`); });
    page.on('requestfailed', request => { if (request.url().startsWith(origin) && request.failure()?.errorText !== 'net::ERR_ABORTED') errors.push(`${step}: ${request.failure()?.errorText} ${request.url()}`); });
    const ext = lang === 'en' ? '.en.html' : '.html';
    const home = `${origin}/index${ext}`;
    const visibleCards = () => page.locator('#grid .post-card:visible');
    const visibleRows = () => page.locator('#earnWrap .etable > details:visible');
    const checkArticle = async (slug, title) => {
      await page.locator(`body[data-slug="${slug}"]`).waitFor();
      assert.match(await page.locator('h1').innerText(), title);
      const tldr = page.locator('.article-body .tldr');
      await tldr.waitFor({ state: 'visible' });
      assert((await tldr.innerText()).trim().length > 50, '摘要有實際內容');
      const section = page.locator('.article-body > h2').first();
      await section.scrollIntoViewIfNeeded();
      assert(await section.isVisible(), '文章章節可讀');
      const content = page.locator('.article-body .card:not(.tldr)').first();
      await content.scrollIntoViewIfNeeded();
      assert(await content.isVisible() && (await content.innerText()).trim().length > 50, '文章正文可見且非空');
      assert.equal(await page.locator('.rail-item.active').count(), 1, '側欄標示當前文章');
      for (const post of drafts) assert.equal(await page.locator(`.rail a[href="${post.slug}${ext}"]`).count(), 0, '公開站側欄隱藏草稿');
    };
    try {
      await page.goto(home);
      await page.locator('.nav-mode[data-mode="posts"].active').waitFor();
      assert(await page.locator('#hero').isVisible(), '首頁顯示精選');
      assert(await visibleCards().count() > 0, '首頁顯示文章');
      assert.equal(await page.locator('#grid .post-card[data-cat="遊戲"]:visible').count(), 0, '文章模式不混入遊戲');
      assert.equal(await page.locator('#grid .post-card[data-cat="財報分析"]').count(), 0, '財報不混入文章卡片');
      for (const post of drafts) assert.equal(await page.locator(`#grid a[href="posts/${post.slug}${ext}"]`).count(), 0, '公開站首頁隱藏草稿');

      step = '分類與搜尋文章';
      await page.locator('.toolbar .chip[data-cat="軟體開發"]').click();
      assert(await visibleCards().count() > 0);
      assert((await visibleCards().evaluateAll(cards => cards.map(c => c.dataset.cat))).every(cat => cat === '軟體開發'));
      await page.locator('#search').fill('no-such-post-918273');
      assert.equal(await visibleCards().count(), 0, '無搜尋結果時藏掉文章');
      assert(await page.locator('#empty').isVisible(), '顯示搜尋無結果');
      await page.locator('#search').fill('JavaScript');
      const card = page.locator(`#grid a[href="posts/javascript-learn-guide${ext}"]`);
      await card.waitFor({ state: 'visible' });

      step = '開啟文章並閱讀';
      await card.click();
      await checkArticle('javascript-learn-guide', /JavaScript/);
      const initialTheme = await page.locator('html').getAttribute('data-theme');
      await page.locator('.sitebar .theme-toggle').click();
      assert.equal(await page.locator('html').getAttribute('data-theme'), initialTheme === 'dark' ? 'light' : 'dark', '主題按鈕切換明暗');
      if (await page.locator('html').getAttribute('data-theme') !== theme) await page.locator('.sitebar .theme-toggle').click();
      assert.equal(await page.locator('html').getAttribute('data-theme'), theme);
      await page.screenshot({ path: join(screenshots, `${label}-article.png`) });

      step = '切換另一篇文章';
      if (width > 680) {
        await page.locator(`.rail a[href="react-learn-guide${ext}"]`).click();
      } else {
        await page.locator('.btn-back').click();
        await page.locator('#search').fill('React');
        await page.locator(`#grid a[href="posts/react-learn-guide${ext}"]`).click();
      }
      await checkArticle('react-learn-guide', /React/);
      assert.equal(await page.locator('html').getAttribute('data-theme'), theme, '跨文章保留主題');

      step = '切換文章語言';
      await page.locator('.sitebar .lang-toggle').click();
      await page.waitForURL(`**/react-learn-guide${lang === 'en' ? '.html' : '.en.html'}`);
      assert.equal(await page.locator('html').getAttribute('lang'), lang === 'en' ? 'zh-Hant' : 'en');
      await checkArticle('react-learn-guide', /React/);
      await page.locator('.sitebar .lang-toggle').click();
      await page.waitForURL(`**/react-learn-guide${ext}`);

      step = '進入財報並載入數字';
      await page.locator('.nav-mode[data-mode="earn"]').click();
      await page.waitForURL('**#earnings');
      await visibleRows().first().waitFor();
      const total = await visibleRows().count();
      assert(total > 10, '載入多家公司財報');
      for (const post of drafts.filter(post => post.cat === '財報分析')) assert.equal(await page.locator(`#earnWrap a[href="posts/${post.slug}${ext}"]`).count(), 0, '公開站財報隱藏草稿季度');
      assert.equal(await page.locator('#grid').isVisible(), false);
      assert.equal(await page.locator('#hero').isVisible(), false);
      assert.equal(await page.locator('.toolbar').isVisible(), false);

      step = '財報類別與公司搜尋';
      await page.locator('#earnWrap .chip[data-g="廣告"]').click();
      assert(await visibleRows().count() > 0 && await visibleRows().count() < total, '類別篩選縮小公司清單');
      assert(await page.locator('#earnWrap details[data-q^="meta "]').isVisible());
      await page.locator('#earnWrap .chip[data-g=""]').click();
      const search = page.locator('#earnWrap input[type="search"]');
      await search.fill('no-such-company-918273');
      assert.equal(await visibleRows().count(), 0);
      await search.fill('META');
      assert.equal(await visibleRows().count(), 1, '搜尋只留 Meta');
      const meta = page.locator('#earnWrap details[data-q^="meta "]');
      await search.fill('');

      step = '依財報數字排序';
      for (const ascending of [false, true]) {
        await page.locator('#earnWrap .eh [data-k="rev"]').click();
        const numbers = await visibleRows().locator('summary > :nth-child(3)').allTextContents();
        const values = numbers.map(text => parseFloat(text.replace(/−/g, '-'))).filter(Number.isFinite);
        assert(values.length > 10);
        assert(values.every((value, i) => i === 0 || (ascending ? values[i - 1] <= value : values[i - 1] >= value)), '營收成長依數值排序');
      }

      step = '展開財報歷史與待觀察';
      await search.fill('META');
      await meta.locator('summary .nmc').click();
      assert(await meta.getAttribute('open') !== null);
      assert(await meta.locator('.ex table tr').count() >= 3, '顯示多季比較');
      const quarterLink = meta.locator(`.ex table a[href="posts/meta-2026q3-earnings${ext}"]`);
      assert.match(await quarterLink.locator('..').locator('..').innerText(), /2026 Q3.*\+26\.1%/s);
      assert((await meta.locator('.ex ul').last().innerText()).trim().length > 10, '顯示下季待觀察');
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), '財報表自行橫捲，整頁不溢出');
      await page.screenshot({ path: join(screenshots, `${label}-earnings.png`) });

      step = '從財報表閱讀分析與返回';
      await quarterLink.click();
      await checkArticle('meta-2026q3-earnings', /Meta/);
      assert(await page.locator('.nav-mode[data-mode="earn"].active').isVisible());
      assert.equal(await page.locator('.rail a[href*="javascript-learn-guide"]').count(), 0, '財報側欄隔離一般文章');
      await page.locator('.btn-back').click();
      await page.waitForURL('**#earnings');
      await visibleRows().first().waitFor();
      await page.reload();
      await visibleRows().first().waitFor();
      assert(await page.locator('.nav-mode[data-mode="earn"].active').isVisible(), '重載保留財報模式');

      step = '遊戲與文章模式切換';
      await page.locator('.nav-mode[data-mode="games"]').click();
      await page.locator('.nav-mode[data-mode="games"].active').waitFor();
      assert(await visibleCards().count() > 0);
      assert((await visibleCards().evaluateAll(cards => cards.map(c => c.dataset.cat))).every(cat => cat === '遊戲'));
      assert.equal(await page.locator('#earnWrap').isVisible(), false);
      await page.locator('.nav-mode[data-mode="posts"]').click();
      assert.equal(new URL(page.url()).hash, '');
      assert(await page.locator('.toolbar').isVisible());
      assert.equal(await page.locator('#grid .post-card[data-cat="遊戲"]:visible').count(), 0);

      assert.deepEqual(errors, [], '沒有頁面例外或本地資源失敗');
      console.log(`✓ ${label} 讀者操作通過`);
    } catch (error) {
      await page.screenshot({ path: join(screenshots, `${label}-failure.png`) }).catch(() => {});
      throw new Error(`${label} / ${step} / ${page.url()}\n${error.message}\n${errors.join('\n')}\n截圖 ${screenshots}`, { cause: error });
    } finally { await context.close(); }
  }
  console.log(`✓ ${scenarios.length} 組中英、寬窄、明暗流程通過。截圖 ${screenshots}`);
} finally {
  await browser?.close();
  await new Promise(done => server.close(done));
}
