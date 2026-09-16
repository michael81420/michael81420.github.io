/* oracle-fy2027q1-earnings 的核心數字 —— 首頁「財報」表的單一事實來源。
   改這裡首頁自動跟著改；數字一律照抄本篇自己的核心數字表，別在這裡另算一套。
   走 <script src> 而不是 JSON + fetch，是為了跟 site.js 同一套模式，file:// 直開也讀得到。 */
(window.EARN=window.EARN||{})['oracle-fy2027q1-earnings']={
  tk:'ORCL', nm:{zh:'Oracle', en:'Oracle'}, q:'FY27 Q1',
  rev:'+30%', t:'win',                       // t 只給營收 YoY 上色：win / lose / mid / ''
  opm:'42%',
  eps:'$1.92', epsN:{zh:'non-GAAP', en:'non-GAAP'},   // 本季無揭露一次性利得，直接用 non-GAAP
  pe:'19.6x'                                  // 一律 forward，不放 trailing
};
