/* oracle-fy2026q4-earnings 的核心數字 —— 首頁「財報」表的單一事實來源。
   改這裡首頁自動跟著改；數字一律照抄本篇自己的核心數字表，別在這裡另算一套。
   走 <script src> 而不是 JSON + fetch，是為了跟 site.js 同一套模式，file:// 直開也讀得到。 */
(window.EARN=window.EARN||{})['oracle-fy2026q4-earnings']={
  tk:'ORCL', nm:{zh:'Oracle', en:'Oracle'}, q:'FY26 Q4',
  rev:'+21%', t:'win',                       // t 只給營收 YoY 上色：win / lose / mid / ''
  opm:'45%',
  eps:'$2.03', epsN:{zh:'剔一次性', en:'Ex one-offs'},   // eps = 剔除一次性後的核心 EPS，epsN 是口徑
  pe:'19.5x'                                  // 一律 forward，不放 trailing
};
