/* tsmc-2026q3-earnings 的核心數字 —— 首頁「財報」表的單一事實來源。
   數字與文字一律照抄本篇自己的內容，別在這裡另算一套；欄位說明見 CLAUDE.md「財報分析是例外」。
   匯率：TSMC 以 US$ 與 NT$ 同時公布營收，本季隱含匯率 31.98（IR 營收 NT$1,494.24B ÷ US$46.72B）；Q4 指引假設 US$1 = NT$31.8。
   eps = IR 公布的每 ADR 稀釋 EPS US$4.60（NT$29.43），本季未識別出一次性項目可剔除，故頭條即核心。
   fcf = 營運現金流約 NT$920B − capex NT$443B = NT$477B ÷ 31.98 ≈ $14.9B（近似）；fcfm = 477 ÷ 1,494.24 ≈ 31.9%。
   pe = Futu forward PE 19.35x（2026-10-16）。 */
(window.EARN=window.EARN||{})['tsmc-2026q3-earnings']={
  tk:"2330.TW",
  g:["半導體"],
  nm:{"zh": "台積電", "en": "TSMC"},
  q:"2026 Q3",
  rev:"+41.2%",
  t:"win",
  opm:"58.7%",
  eps:"$4.60/ADR",
  eg:"GAAP",
  fcf:"$14.9B",
  fcfm:"31.9%",
  pe:"19.4x",
  tone:"bull",
  gd:1,
  v:{"zh": "營收$46.72B超出指引上緣約2%、營益率58.7%超指引，但毛利率QoQ −1.3pp、EPS(NT$)僅QoQ +8%；capex反降至$13.8B，Q4隱含$19.5–23.5B", "en": "Revenue $46.72B beat the top of guidance by ~2% and operating margin 58.7% beat guide, but gross margin fell 1.3pp QoQ and EPS (NT$) rose only 8% QoQ; capex dipped to $13.8B with Q4 implying $19.5–23.5B"},
  o:{"zh": "Q4營收指引$52.3–54.3B、毛利率65–67%；FY26美元營收成長上修至約44%，capex維持$60–64B", "en": "Q4 revenue guide $52.3–54.3B, gross margin 65–67%; FY26 USD growth raised to ~44%, capex held at $60–64B"},
  watch:[{"s": "hit", "zh": "Q3營收是否觸及/超過指引上緣$44.6–45.8B → 實際$46.72B，高出上緣約2.0%", "en": "Does Q3 revenue touch or exceed the top of the $44.6–45.8B guide? → Actual $46.72B, about 2.0% above the top"}, {"s": "hit", "zh": "毛利率是否跌破65% → 實際66.4%，QoQ −1.3pp但在指引內", "en": "Does gross margin fall below 65%? → Actual 66.4%, −1.3pp QoQ but inside guidance"}, {"s": "mid", "zh": "FY26 capex是否再上修 → 維持$60–64B，但Q4隱含$19.5–23.5B且2026–28更高", "en": "Is FY26 capex raised again? → Held at $60–64B, but Q4 implies $19.5–23.5B and 2026–28 is higher"}],
  next:{"zh": ["Q4營收≥$54.3B（指引$52.3–54.3B，中位數$53.3B）", "Q4毛利率≥65%（指引65–67%，Q3實際66.4%）", "Q4 capex單季≥$19.5B使全年落在$60–64B；明年1月若給2027 capex是否>$64B"], "en": ["Q4 revenue ≥ $54.3B (guide $52.3–54.3B, midpoint $53.3B)", "Q4 gross margin ≥ 65% (guide 65–67%, Q3 actual 66.4%)", "Q4 capex ≥ $19.5B to land FY26 in $60–64B; does January's 2027 capex figure exceed $64B"]}
};
