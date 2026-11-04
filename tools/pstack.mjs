import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const browser = await chromium.launch();
try {
  for (const lang of ['zh', 'en']) for (const width of [390, 1440]) for (const theme of ['light', 'dark']) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://**/*', route => route.abort());
    const url = pathToFileURL(resolve(import.meta.dirname, `../posts/pstack-agent-engineering${lang === 'en' ? '.en' : ''}.html`)).href;
    await page.goto(url);
    await page.evaluate(value => document.documentElement.dataset.theme = value, theme);
    const sources = page.locator('.article-body a[href^="https://"]');
    assert.equal(await sources.count(), 17, '保留並去重全部來源');
    assert(await sources.evaluateAll(links => links.every(link => link.closest('#sources'))), '來源集中在文末');
    await page.locator('.tldr a[href="#pstack-verify-title"]').click();
    await page.waitForFunction(() => document.querySelector('#pstack-verify-title').getBoundingClientRect().top >= document.querySelector('.sitebar').getBoundingClientRect().bottom);
    for (const [kind, failed, passed] of [['verify', 'local', 'shared'], ['arena', 'graft', 'corrected']]) {
      const lab = page.locator(`[data-experiment="${kind}"]`);
      const outcome = key => lab.locator(`[data-outcome="${key}"]`);
      const inspect = lab.locator('[data-action="inspect"]');
      assert(await outcome('initial').isVisible());
      await inspect.focus();
      await page.keyboard.press('Enter');
      assert(await outcome(failed).isVisible(), '鍵盤可操作並查看失敗原因');
      assert((await outcome(failed).innerText()).trim().length > 50);
      await lab.locator(`input[value="${passed}"]`).check();
      assert(await outcome('initial').isVisible(), '改選後清除舊證據');
      await inspect.click();
      assert(await outcome(passed).isVisible());
      assert.equal(await lab.locator('[data-outcome]:visible').count(), 1);
      await lab.locator('[type="reset"]').click();
      assert(await outcome('initial').isVisible());
      assert(await lab.locator(`input[value="${failed}"]`).isChecked());
    }
    const reports = page.locator('[data-report-group] details');
    await reports.locator('summary').click();
    assert.notEqual(await reports.getAttribute('open'), null);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    assert.deepEqual(errors, []);
    await page.close();
    console.log(`✓ pstack ${lang} ${width}px ${theme}`);
  }
  for (const suffix of ['', '.en']) {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 900 } });
    const page = await context.newPage();
    await page.route('https://**/*', route => route.abort());
    await page.goto(pathToFileURL(resolve(import.meta.dirname, `../posts/pstack-agent-engineering${suffix}.html`)).href);
    assert.equal(await page.locator('[data-experiment] form:visible').count(), 0);
    for (const kind of ['verify', 'arena']) assert.equal(await page.locator(`[data-experiment="${kind}"] [data-outcome]:visible`).count(), 3, '無腳本仍有完整說明');
    const reports = page.locator('[data-report-group] details');
    await reports.locator('summary').click();
    assert.notEqual(await reports.getAttribute('open'), null);
    await context.close();
  }
  console.log('✓ pstack 無腳本備援通過');
} finally { await browser.close(); }
