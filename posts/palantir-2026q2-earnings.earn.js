/* palantir-2026q2-earnings 的核心數字 —— 首頁「財報」表的單一事實來源。
   改這裡首頁自動跟著改；數字一律照抄本篇自己的核心數字表，別在這裡另算一套。
   走 <script src> 而不是 JSON + fetch，是為了跟 site.js 同一套模式，file:// 直開也讀得到。 */
(window.EARN=window.EARN||{})['palantir-2026q2-earnings']={
  tk:'PLTR', nm:{zh:'Palantir', en:'Palantir'}, q:'2026 Q2',
  rev:'+93%', t:'win',                       // t 只給營收 YoY 上色：win / lose / mid / ''
  opm:'47.1%',
  eps:'$0.41', epsN:{zh:'GAAP=Adj.', en:'GAAP=Adj.'},   // eps = 剔除一次性後的核心 EPS，epsN 是口徑
  pe:'86x'                                  // 一律 forward，不放 trailing
};
