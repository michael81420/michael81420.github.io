# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two audiences, weighted equally:

- **The author (michael)**: a MediaTek camera-ISP software engineer who invests on the side. Uses the site as a personal knowledge base to look back at past calls, earnings notes, and life records.
- **Public readers**: Taiwanese retail investors, plus engineers and investors in the author's LinkedIn network. They come to quickly absorb podcast takeaways (股癌), single-company earnings conclusions, and technical write-ups.

Reading happens on both devices: phones in spare moments (scanning the TL;DR, tables, and stock cards) and desktops for deep reading (comparing companies in the earnings table, reading long-form technical posts).

## Product Purpose

A bilingual (zh-Hant / en) personal notebook. Each post turns one source (a podcast episode, earnings report, article, GitHub repo, or trip) into a structured, scannable page with a clear conclusion.

Success means:
- building a readership and the author's personal brand (search traffic, LinkedIn sharing);
- working as a portfolio of engineering work (bilingual pages, data-driven rendering, CI-checked consistency);
- serving as a life record to look back on (travel itineraries, past investment calls).

## Positioning

Notes from an engineer-investor. The angle comes from that background:
- conclusions first, every claim tied to a source;
- forward PE, never trailing; core EPS over headline EPS;
- earnings tracked quarter over quarter, with a "回頭追認" section that grades whether last quarter's watch items came true.

## Operating Context

- Categories: 股癌podcast分析 (~33 posts), 財報分析 (~28, shown as a sortable cross-company table rather than cards), AI 技術分享, 軟體開發, 旅遊, 物聯網.
- Every post exists in zh and en; the homepage has category chips, search, a featured post, and a sidebar tree of all articles.
- Posts are drafted with Claude Code agents (stock-analyst, earnings-analyst, software-engineer), then laid out by hand following CLAUDE.md.

## Capabilities and Constraints

- Pure static GitHub Pages: hand-written HTML/CSS/JS, no framework, no build step, no npm on the site, and no new dependencies.
- One stylesheet (`assets/site.css`) with a "warm paper" theme in light and dark. All colors and fonts come from CSS variables.
- Diagrams are hand-written inline SVG that uses the theme variables. No diagram libraries or image files.
- CI (`tools/check.mjs`, `tools/visual.mjs`) blocks deployment on inconsistencies. Full conventions are in `CLAUDE.md`, which takes precedence.
- Footer disclaimer: personal research notes, not investment advice.

## Brand Commitments

- Name: "michael · 投資筆記".
- Voice: direct and conclusion-first, with sentiment marked as 看多 / 中性 / 偏淡 / 轉機 (win / mid / lose / turn tones).
- Title format `主體．本次說明`, using the full-width separator `．`.
- The incumbent warm paper look is the visual authority. Refinements preserve it.

## Evidence on Hand

- About 175 post files under `posts/`; earnings data in `posts/*.earn.js`.
- About page (`about.html`): MediaTek R&D engineer (Dimensity 9400/9600), M.S. CS at NYCU, published paper.
- No testimonials, reader metrics, or press. Do not fabricate any.

## Product Principles

1. Conclusion first: a reader should get the takeaway from the TL;DR, a pill, or a table row without reading the whole page.
2. Scannable on a phone, comparable on a desktop.
3. Every number traceable to its source; no invented data.
4. Static and dependency-free is a feature, not a limitation.
5. Consistency is enforced by CI, not memory.
