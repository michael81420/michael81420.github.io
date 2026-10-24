/* 楓之谷倖存者：數值表。調平衡只改這支，引擎（game.js）不寫死數字。
   距離單位＝像素（素材原尺寸），時間＝秒。 */
window.MSD={
  // 職業：hp＋每級 hpLv；atk＝一直開著的基本攻擊（dmg 是攻擊力倍率，1＝100%）
  // 攻擊力＝(base＋武器攻擊) × (主×4＋副)/52 × ATK_K；法師吃魔攻。main/sub＝主副屬性；adv＝見習/1轉的稱號（見習只剩舊存檔會用到）
  // atk.k：slash 扇形近戰／shot 投射物；fx＝atlas 技能 id（特效圖），ball＝投射物圖（沒有就用 canvas 畫）
  // npc＝轉職教官（atlas npc id）；town／tag／line 只是介紹文字
  // br＝2 轉分支（照原作）：nm 稱號、line 介紹、wt 能拿的武器種類（沒填＝整個職業的武器都能拿）；atk 有填就換掉基本攻擊（俠盜拿短刀近戰）
  // 新角色一律是初心者（beginner）：只有近身攻擊＋嫩寶丟擲術，Lv10 找教官選職業。
  // 照原作：初心者能拿任何武器（只看等級／屬性需求），防具只能穿共用的；創角送一把新手劍
  JOBS:{
    beginner:{nm:'初心者', adv:['初心者'], town:'楓之島',      hp:130, hpLv:10, spd:150, main:'str', sub:'dex', base:4,
              atk:{k:'slash', cd:.7, dmg:1.2, range:110, arc:2.2}},
    warrior: {nm:'劍士',   adv:['見習劍士','劍士'],     hp:160, hpLv:14, spd:150, main:'str', sub:'dex', base:4,
              atk:{k:'slash', cd:.85, dmg:1, range:120, arc:2.2, fx:1001005},
              npc:1022000, npcNm:'武術教練', town:'勇士之村', tag:'近戰・高血量', line:'正面迎擊，揮劍掃開身邊的怪物。',
              br:{fighter:{nm:'劍客', line:'激勵提升傷害，攻擊會追擊第二下。', wt:['sw1','sw2','ax1','ax2']},
                  page:{nm:'見習騎士', line:'威嚇與反射之盾，最耐打。', wt:['sw1','sw2','bw1','bw2']},
                  spear:{nm:'槍騎兵', line:'神聖之火大幅提升最大 HP。', wt:['spear','pole']}}},
    bowman:  {nm:'弓箭手', adv:['見習弓箭手','弓箭手'], hp:105, hpLv:9,  spd:160, main:'dex', sub:'str', base:4,
              atk:{k:'shot',  cd:.6,  dmg:1, range:520, v:640, pierce:2, ball:3001004},
              npc:1012100, npcNm:'赫麗娜',   town:'弓箭手村', tag:'遠程・穿透', line:'拉開距離，一箭射穿整排怪物。',
              br:{hunter:{nm:'獵人', line:'爆擊箭命中後爆炸，一次炸一群。', wt:['bow']}, xbow:{nm:'弩弓手', line:'穿透之箭一箭貫穿整排。', wt:['xbow']}}},
    magician:{nm:'法師',   adv:['見習法師','法師'], hp:95,  hpLv:7,  spd:145, main:'int', sub:'luk', base:4,
              atk:{k:'shot',  cd:.75, dmg:1, range:460, v:520, pierce:1, ball:2001004, splash:60},
              npc:1032001, npcNm:'漢斯',     town:'魔法森林', tag:'遠程・範圍', line:'血少但魔法會爆開，一次炸一群。',
              br:{fp:{nm:'火毒巫師', line:'火焰箭爆開、毒霧持續燒。'}, il:{nm:'冰雷巫師', line:'冰凍術凍住怪物，雷電術劈開身邊。'}, cleric:{nm:'僧侶', line:'聖箭術攻擊，群體治癒邊打邊補血。'}}},
    thief:   {nm:'盜賊',   adv:['見習盜賊','盜賊'],     hp:120, hpLv:10, spd:175, main:'luk', sub:'dex', base:4,
              atk:{k:'shot',  cd:.45, dmg:1, range:420, v:720, pierce:1, n:2, star:1},   // 拳套丟飛鏢（每發用 1 顆）
              atkBy:{dagger:{k:'slash', cd:.5, dmg:1, range:115, arc:2, fx:4201005}},   // 拿短刀：近身砍
              npc:1052001, npcNm:'達克魯',   town:'墮落城市', tag:'速度・連發', line:'跑得最快，飛鏢一次丟兩顆。',
              br:{assassin:{nm:'刺客', line:'繼續丟飛鏢，爆擊率最高。', wt:['claw']},
                  bandit:{nm:'俠盜', line:'改拿短刀近身，迴旋斬一次砍好幾下。', wt:['dagger']}}}
  },
  // 武器種類（atlas 的 itm.wt）。1 轉能拿整個職業的武器，2 轉照 JOBS.br.wt 再分
  WT:{sw1:'單手劍', sw2:'雙手劍', ax1:'單手斧', ax2:'雙手斧', bw1:'單手鈍器', bw2:'雙手鈍器', spear:'槍', pole:'矛', bow:'弓', xbow:'弩', wand:'短杖', staff:'長杖', claw:'拳套', dagger:'短刀'},
  // 教官送的武器（不限等級與屬性）：創角、1 轉一定送；2 轉只有身上那把新分支不能用時才送
  START_WP:{beginner:1302077, warrior:1302077, bowman:1452002, magician:1372043, thief:1472000, spear:1432015, xbow:1462001, bandit:1332000},
  // 飛鏢：盜賊 1 轉教官送 3 組海星鏢（約一場 5 分鐘的量）；拳套的攻擊每發用 1 顆，飛鏢攻擊力加在武器攻擊上；用完拳套只能空手揍（初心者的近身攻擊）
  STAR_GIFT:2070000, STAR_SETS:3,
  ATK_K:.6,
  HIT_INV:1,                           // 被打之後的無敵秒數
  STATS:['str','dex','int','luk'], STAT_NM:{str:'STR 力量',dex:'DEX 敏捷',int:'INT 智力',luk:'LUK 幸運'},
  START_STAT:4, START_MAIN:12,         // 創角：四項 4，主屬性 12
  AP_LV:5, SP_ADV:1,                   // 每升一級 5 AP；轉職當下送 1 SP
  // SP 每個轉職階段各自一池（存檔 sp:[初心者, 1轉, 2轉]），只能點該階段的技能，不能存到下一轉用。
  // 升級時 SP 進「目前階段」那池；初心者每級 1 SP，見習技能點滿就不再給
  SP_LV:[1,2,3], SP_START:1,           // 創角就有 1 SP，可以馬上學嫩寶丟擲術。1 轉每級 2：1＋20 級×2＝41，Lv30 剛好點滿 1 轉技能（40）；多的由 spRoom 擋
  ADV_LV:[0,10,30],                    // 轉職等級：1 轉 Lv10、2 轉 Lv30（3、4 轉第二期）
  SLOTS:[1,2,3],                       // 各轉職階段能帶進關卡的主動技能數
  AP_RESET:function(lv){ return lv*300 },  // 重置 AP 的楓幣（楓幣在 M3 才會掉）
  // 迴避：迴避值＝DEX×0.5＋LUK＋技能，閃避率＝迴避/(迴避＋150)，上限 60%；爆擊基礎 5%、爆傷 150%
  EVA_K:150, EVA_MAX:.6, CRIT:.05, CRIT_DMG:1.5, DEF_MAX:.6,

  // ---- 裝備（M3）----
  // 物品本身（名字、部位、等級、原作數值、可強化次數 tuc、原價）由素材工具從 WZ 寫進 atlas（MSA.itm）
  EQ_SLOTS:[['weapon','武器'],['cap','帽子'],['coat','上衣'],['pants','褲子'],['shoes','鞋子'],['glove','手套'],['cape','披風']],
  ST_NM:{pad:'攻擊',mad:'魔攻',str:'STR',dex:'DEX',int:'INT',luk:'LUK',pdd:'防禦',mhp:'HP',eva:'迴避',spd:'移速'},
  DEF_K:250,                           // 防禦 → 減傷：防禦/(防禦＋250)，跟技能減傷相加，上限 DEF_MAX
  INV_MAX:40,
  PRICE:function(p){ return Math.max(100,p) },   // 商店售價（原價太低的拉到 100）
  SELL:.3,                             // 賣回商店拿原售價的 30%
  // 掉落：每隻怪各自擲骰。楓幣量＝怪物經驗 × 1～2
  // 掉落表：每隻怪掉「等級需求在 怪物Lv+band 之間」的裝備（圖鑑列全部職業，實際只掉本職業＋共用）；
  // 稀有裝備（只會掉落）寫在怪物的 rare 欄位，掉率 rare
  DROP:{meso:.5, eq:.015, rare:.02, scroll:.008, band:[-10,6]},
  ROLL:{stat:[-2,3], atk:[-3,3]},      // 掉落裝備的素質浮動（商店賣的是原作固定值）
  MAGNET:130, PICK:36,                 // 掉落物被吸過來／撿起的距離
  // 卷軸：w 武器（加攻擊，法師武器加魔攻）／a 防具（加主屬性與防禦）；dark＝詛咒卷軸，失敗 50% 裝備爆掉
  // 不論成功失敗都會用掉一次可強化次數（原作規則）；icon＝atlas 卷軸圖示的序號
  SCROLLS:[
    {k:'w100', t:'w', pct:1,  price:500,  fx:{atk:1},               icon:0},
    {k:'w70',  t:'w', pct:.7, price:1500, fx:{atk:2,main:1}, dark:1, icon:1},
    {k:'w60',  t:'w', pct:.6, price:1000, fx:{atk:2,main:1},        icon:2},
    {k:'w30',  t:'w', pct:.3, price:2500, fx:{atk:5,main:3}, dark:1, icon:3},
    {k:'w10',  t:'w', pct:.1, price:800,  fx:{atk:5,main:3},        icon:4},
    {k:'a100', t:'a', pct:1,  price:400,  fx:{main:1,pdd:2},        icon:5},
    {k:'a70',  t:'a', pct:.7, price:1200, fx:{main:2,pdd:4}, dark:1, icon:6},
    {k:'a60',  t:'a', pct:.6, price:800,  fx:{main:2,pdd:4},        icon:7},
    {k:'a30',  t:'a', pct:.3, price:2000, fx:{main:4,pdd:8}, dark:1, icon:8},
    {k:'a10',  t:'a', pct:.1, price:600,  fx:{main:4,pdd:8},        icon:9}
  ],
  SCROLL_DROP_W:[5,1,3,1,4,5,1,3,1,4], // 掉落時各卷軸的權重（便宜的比較常掉）

  // 技能：act＝主動（帶進技能欄才會自動施放）；數值寫 [Lv1, 滿級]，中間線性內插
  // 主動 k：slash 扇形／shot 投射物／strike 直接打目標／mist 地面持續傷害／buff 自身增益
  // 被動與 buff 的 mods：hp 最大HP% def 減傷% eva 迴避值 crit 爆擊率 dmg 傷害% cdr 冷卻縮短% spd 移速% range 射程% final 追擊機率 inv 無敵（buff 只吃 hp/def/dmg/spd/inv）
  // 2 轉技能的 br＝所屬分支；slash 的 hits＝每隻打幾下、heal＝放的時候回復最大 HP 的比例；strike 的 frz＝冰凍秒數（BOSS 不會被凍）
  SK:{
    1000:{job:'beginner', adv:0, nm:'嫩寶丟擲術', max:3, act:1, k:'shot', cd:[1.2,.8], dmg:[2.4,3.6], pierce:1, v:560, range:420, ball:1000, hit:1000, desc:'丟出嫩寶的殼攻擊遠處的怪物。'},

    1001004:{job:'warrior', adv:1, nm:'強力攻擊', max:10, act:1, k:'slash', cd:[2.2,1.5], dmg:[2.2,3.6], range:140, arc:1.3, fx:'effect', desc:'朝前方重重一擊。'},
    1001005:{job:'warrior', adv:1, nm:'群體攻擊', max:10, act:1, k:'slash', cd:[3.2,2.2], dmg:[1.2,2.0], range:170, arc:6.3, fx:'effect', desc:'揮劍橫掃身邊一圈。'},
    1000001:{job:'warrior', adv:1, nm:'增加最大HP', max:10, mods:{hp:[.05,.3]}, desc:'最大 HP 提升。'},
    1001003:{job:'warrior', adv:1, nm:'自身強化', max:10, mods:{def:[.04,.2]}, desc:'受到的傷害減少。'},
    1101006:{job:'warrior', adv:2, br:'fighter', nm:'激勵', max:10, act:1, k:'buff', cd:[25,20], dur:[8,15], mods:{dmg:[.1,.3]}, fx:'effect', desc:'一段時間內傷害提升。'},
    1100002:{job:'warrior', adv:2, br:'fighter', nm:'終極之劍', max:10, mods:{final:[.1,.4]}, fx:'hit', desc:'攻擊有機率再追擊一次。'},
    1100000:{job:'warrior', adv:2, br:'fighter', nm:'劍術精通', max:10, mods:{dmg:[.05,.2], crit:[.02,.1]}, desc:'傷害與爆擊率提升。'},
    1101004:{job:'warrior', adv:2, br:'fighter', nm:'快速之劍', max:10, mods:{cdr:[.04,.2]}, desc:'所有攻擊冷卻縮短。'},
    1201006:{job:'warrior', adv:2, br:'page', nm:'威嚇', max:10, act:1, k:'buff', cd:[20,15], dur:[8,15], mods:{def:[.1,.25]}, fx:'effect', desc:'威嚇周圍的怪物，一段時間內受到的傷害減少。'},
    1201007:{job:'warrior', adv:2, br:'page', nm:'反射之盾', max:10, mods:{def:[.04,.2], hp:[.03,.15]}, desc:'舉盾擋下攻擊：受到的傷害減少、最大 HP 提升。'},
    1200002:{job:'warrior', adv:2, br:'page', nm:'終極之劍', max:10, mods:{final:[.1,.4]}, fx:'hit', desc:'攻擊有機率再追擊一次。'},
    1200000:{job:'warrior', adv:2, br:'page', nm:'劍術精通', max:10, mods:{dmg:[.05,.2], crit:[.02,.1]}, desc:'傷害與爆擊率提升。'},
    1301007:{job:'warrior', adv:2, br:'spear', nm:'神聖之火', max:10, act:1, k:'buff', cd:[30,24], dur:[10,20], mods:{hp:[.2,.6]}, fx:'effect', desc:'一段時間內最大 HP 大幅提升。'},
    1301006:{job:'warrior', adv:2, br:'spear', nm:'禦魔陣', max:10, act:1, k:'buff', cd:[24,18], dur:[8,15], mods:{def:[.08,.2]}, fx:'effect', desc:'一段時間內受到的傷害減少。'},
    1300002:{job:'warrior', adv:2, br:'spear', nm:'終極之槍', max:10, mods:{final:[.12,.45]}, fx:'hit', desc:'攻擊有機率再追擊一次。'},
    1300000:{job:'warrior', adv:2, br:'spear', nm:'槍術精通', max:10, mods:{dmg:[.05,.2], crit:[.02,.1]}, desc:'傷害與爆擊率提升。'},

    3001004:{job:'bowman', adv:1, nm:'斷魂箭', max:10, act:1, k:'shot', cd:[1.6,1.1], dmg:[1.8,3.0], pierce:[3,6], v:700, range:560, ball:3001004, desc:'一箭射穿整排怪物。'},
    3001005:{job:'bowman', adv:1, nm:'二連箭', max:10, act:1, k:'shot', cd:[1.2,.8], dmg:[1.0,1.5], n:2, pierce:1, v:760, range:540, ball:3001004, hit:3001005, desc:'連射兩箭。'},
    3001003:{job:'bowman', adv:1, nm:'集中術', max:10, mods:{eva:[4,20]}, desc:'迴避值提升。'},
    3000001:{job:'bowman', adv:1, nm:'致命箭', max:10, mods:{crit:[.04,.2]}, desc:'爆擊率提升。'},
    3101005:{job:'bowman', adv:2, br:'hunter', nm:'爆擊箭', max:10, act:1, k:'shot', cd:[3,2], dmg:[2,3.2], pierce:1, splash:90, v:560, range:520, ball:3101005, desc:'命中後爆炸，炸到周圍一圈。'},
    3100001:{job:'bowman', adv:2, br:'hunter', nm:'終極之弓', max:10, mods:{final:[.1,.4]}, fx:'hit', desc:'攻擊有機率再追擊一次。'},
    3101002:{job:'bowman', adv:2, br:'hunter', nm:'快速之箭', max:10, mods:{cdr:[.04,.2]}, desc:'所有攻擊冷卻縮短。'},
    3100000:{job:'bowman', adv:2, br:'hunter', nm:'弓術精通', max:10, mods:{dmg:[.05,.2], crit:[.02,.1]}, desc:'傷害與爆擊率提升。'},
    3201005:{job:'bowman', adv:2, br:'xbow', nm:'穿透之箭', max:10, act:1, k:'shot', cd:[2.4,1.6], dmg:[1.8,2.8], pierce:[6,12], v:820, range:600, ball:3201005, hit:3201005, desc:'一箭貫穿一整排怪物。'},
    3200001:{job:'bowman', adv:2, br:'xbow', nm:'終極之弩', max:10, mods:{final:[.1,.4]}, fx:'hit', desc:'攻擊有機率再追擊一次。'},
    3201002:{job:'bowman', adv:2, br:'xbow', nm:'快速之弩', max:10, mods:{cdr:[.04,.2]}, desc:'所有攻擊冷卻縮短。'},
    3200000:{job:'bowman', adv:2, br:'xbow', nm:'弩術精通', max:10, mods:{dmg:[.05,.2], crit:[.02,.1]}, desc:'傷害與爆擊率提升。'},

    2001004:{job:'magician', adv:1, nm:'魔法彈', max:10, act:1, k:'shot', cd:[1.2,.8], dmg:[1.6,2.6], pierce:1, v:520, range:480, ball:2001004, desc:'射出一發魔法彈。'},
    2001005:{job:'magician', adv:1, nm:'魔力爪', max:10, act:1, k:'strike', cd:[1.8,1.2], dmg:[1.2,2.0], hits:2, n:[1,3], range:420, fx:'effect', desc:'直接抓向怪物兩次。'},
    2001002:{job:'magician', adv:1, nm:'魔心防禦', max:10, mods:{def:[.06,.3]}, desc:'受到的傷害減少。'},
    2000001:{job:'magician', adv:1, nm:'魔力強化', max:10, mods:{dmg:[.04,.2]}, desc:'魔法傷害提升。'},
    2101004:{job:'magician', adv:2, br:'fp', nm:'火焰箭', max:10, act:1, k:'shot', cd:[1.6,1.1], dmg:[2.4,3.8], pierce:1, splash:70, v:560, range:480, ball:2101004, desc:'火焰命中後燒到周圍。'},
    2101005:{job:'magician', adv:2, br:'fp', nm:'毒霧', max:10, act:1, k:'mist', cd:[6,4.5], dmg:[.4,.8], dur:4, r:[90,130], range:420, desc:'在怪物腳下留下一片毒霧，持續傷害。'},
    2101001:{job:'magician', adv:2, br:'fp', nm:'冥想', max:10, act:1, k:'buff', cd:[30,24], dur:[10,20], mods:{dmg:[.1,.35]}, fx:'effect', desc:'一段時間內魔法傷害提升。'},
    2201004:{job:'magician', adv:2, br:'il', nm:'冰凍術', max:10, act:1, k:'strike', cd:[2.4,1.6], dmg:[2,3.2], hits:1, n:[1,3], frz:[1,2], range:440, fx:'hit', desc:'冰凍光束打中最近的怪物，並把牠們凍住。'},
    2201005:{job:'magician', adv:2, br:'il', nm:'雷電術', max:10, act:1, k:'slash', cd:[3.6,2.6], dmg:[1.6,2.6], range:200, arc:6.3, fx:'effect', desc:'落雷劈向身邊一圈的怪物。'},
    2201001:{job:'magician', adv:2, br:'il', nm:'冥想', max:10, act:1, k:'buff', cd:[30,24], dur:[10,20], mods:{dmg:[.1,.35]}, fx:'effect', desc:'一段時間內魔法傷害提升。'},
    2301005:{job:'magician', adv:2, br:'cleric', nm:'聖箭術', max:10, act:1, k:'shot', cd:[1.4,1], dmg:[2.2,3.4], pierce:1, v:600, range:480, ball:2301005, hit:2301005, desc:'射出一支神聖的箭。'},
    2301002:{job:'magician', adv:2, br:'cleric', nm:'群體治癒', max:10, act:1, k:'slash', cd:[6,4], dmg:[.8,1.4], heal:[.04,.12], range:170, arc:6.3, fx:'effect', desc:'治癒之光回復自己的 HP，同時傷害身邊的怪物。'},
    2301004:{job:'magician', adv:2, br:'cleric', nm:'天使祝福', max:10, act:1, k:'buff', cd:[25,20], dur:[10,20], mods:{def:[.08,.2]}, fx:'effect', desc:'一段時間內受到的傷害減少。'},
    2301003:{job:'magician', adv:2, br:'cleric', nm:'神之保護', max:10, mods:{def:[.05,.25]}, desc:'受到的傷害減少。'},

    4001344:{job:'thief', adv:1, nm:'雙飛斬', max:10, act:1, k:'shot', wt:'claw', star:1, cd:[1,.7], dmg:[1.2,1.9], n:2, pierce:1, v:760, range:460, hit:4001344, desc:'一次丟出兩枚飛鏢。'},
    4001334:{job:'thief', adv:1, nm:'二連擊', max:10, act:1, k:'slash', wt:'dagger', cd:[.9,.6], dmg:[1.4,2.1], hits:2, range:120, arc:1.8, fx:'hit', desc:'用短刀快速刺兩下。'},
    4001003:{job:'thief', adv:1, nm:'隱身術', max:10, act:1, k:'buff', cd:[18,12], dur:[1.5,3], mods:{inv:1}, fx:'effect', desc:'短時間內不會受傷。'},
    4000000:{job:'thief', adv:1, nm:'迴避', max:10, mods:{eva:[5,25]}, desc:'迴避值提升。'},
    4000001:{job:'thief', adv:1, nm:'鷹眼', max:10, mods:{range:[.05,.25]}, desc:'射程變遠。'},
    4101004:{job:'thief', adv:2, br:'assassin', nm:'速度激發', max:10, act:1, k:'buff', cd:[20,16], dur:[8,15], mods:{spd:[.15,.35]}, fx:'effect', desc:'一段時間內移動速度提升。'},
    4100000:{job:'thief', adv:2, br:'assassin', nm:'爪術精通', max:10, mods:{dmg:[.05,.2]}, desc:'傷害提升。'},
    4100001:{job:'thief', adv:2, br:'assassin', nm:'致命攻擊', max:10, mods:{crit:[.04,.2]}, desc:'爆擊率提升。'},
    4101003:{job:'thief', adv:2, br:'assassin', nm:'快速之爪', max:10, mods:{cdr:[.04,.2]}, desc:'所有攻擊冷卻縮短。'},
    4201005:{job:'thief', adv:2, br:'bandit', nm:'迴旋斬', max:10, act:1, k:'slash', cd:[1.4,.9], dmg:[.7,1.1], hits:[3,6], range:130, arc:2.4, fx:'effect', desc:'用短刀對前方連砍好幾下。'},
    4201003:{job:'thief', adv:2, br:'bandit', nm:'速度激發', max:10, act:1, k:'buff', cd:[20,16], dur:[8,15], mods:{spd:[.15,.35]}, fx:'effect', desc:'一段時間內移動速度提升。'},
    4201002:{job:'thief', adv:2, br:'bandit', nm:'快速之刀', max:10, mods:{cdr:[.04,.2]}, desc:'所有攻擊冷卻縮短。'},
    4200000:{job:'thief', adv:2, br:'bandit', nm:'短劍精通', max:10, mods:{dmg:[.05,.2], crit:[.02,.1]}, desc:'傷害與爆擊率提升。'}
  },
  // 升到下一級要的經驗。節奏目標：2～3 場到 Lv10；在等級相當的關卡每場升 1～3 級
  exp:function(lv){ return Math.round(16*Math.pow(lv,2.2)+10) },
  DEATH_EXP:.3,
  // 怪物：lv＝原作等級（決定掉落表）；hp/atk 依原作縮放過；spd＝每秒像素；r 不填就依圖寬推
  MOBS:{
    100100:{nm:'嫩寶',   lv:1, hp:18,  atk:3,  spd:40, exp:3},
    100101:{nm:'藍寶',   lv:2, hp:26,  atk:5,  spd:46, exp:4},
    130101:{nm:'紅寶',   lv:5, hp:48,  atk:7,  spd:50, exp:7},
    120100:{nm:'菇菇仔', lv:3, hp:34,  atk:6,  spd:62, exp:5},
    210100:{nm:'綠水靈', lv:7, hp:70,  atk:9,  spd:58, exp:10},
    130100:{nm:'木妖',     lv:8,  hp:150,  atk:12, spd:35, exp:22},
    1210100:{nm:'肥肥',    lv:7,  hp:120,  atk:11, spd:60, exp:18},
    1210102:{nm:'菇菇寶貝',lv:8,  hp:140,  atk:12, spd:55, exp:20},
    1210101:{nm:'緞帶肥肥',lv:10, hp:190,  atk:14, spd:65, exp:26},
    2110200:{nm:'刺菇菇',  lv:12, hp:300,  atk:18, spd:60, exp:34},
    2220100:{nm:'藍菇菇',  lv:15, hp:420,  atk:22, spd:55, exp:42},
    2230101:{nm:'殭屍菇菇',lv:24, hp:900,  atk:32, spd:50, exp:70},
    2230102:{nm:'黑肥肥',  lv:26, hp:1100, atk:36, spd:75, exp:85},
    3210100:{nm:'火肥肥',  lv:32, hp:1600, atk:44, spd:70, exp:110},
    // BOSS：slam＝每 cd 秒舉起來砸地（atlas 的 attack1），範圍 r 內受 dmg 傷害，砸下前 warn 秒畫出預警圈
    6130101:{nm:'蘑菇王',  lv:20, hp:30000,atk:40, spd:50, exp:3000, boss:1, slam:{cd:6, r:170, dmg:60, warn:1},
             rare:[1302020,1302058,1302080,1382009,1452016,1472030]}
  },
  // 關卡（依序解鎖：通關前一關才能挑戰下一關）。waves 依時間切換怪物組；rate＝每秒生怪數，隨時間線性加到 rate2
  // rec＝建議等級；boss＝{id, t 出場秒數}：打倒 BOSS 才算通關，dur 是時限（時間到算失敗）
  STAGES:{
    s1:{nm:'嫩寶的小路', floor:'s1', rec:1, dur:300, waves:[
      {t:0,   mobs:[100100],               rate:.8,  rate2:1.5},
      {t:45,  mobs:[100100,100101],        rate:1.5, rate2:2.5},
      {t:120, mobs:[100101,130101,120100], rate:2.5, rate2:4},
      {t:210, mobs:[130101,120100,210100], rate:4,   rate2:6}
    ]},
    s2:{nm:'射手村狩獵場', floor:'s2', rec:8, dur:300, waves:[
      {t:0,   mobs:[1210100,130100],          rate:1.5, rate2:3},
      {t:60,  mobs:[1210100,1210102,130100],  rate:3,   rate2:5},
      {t:180, mobs:[1210102,1210101,130100],  rate:5,   rate2:8}
    ]},
    s3:{nm:'菇菇山丘', floor:'s3', rec:15, dur:300, waves:[
      {t:0,   mobs:[1210101,2110200],          rate:1.5, rate2:3},
      {t:90,  mobs:[2110200,2220100],          rate:3,   rate2:5.5},
      {t:200, mobs:[2110200,2220100,1210101],  rate:5.5, rate2:8}
    ]},
    boss:{nm:'蘑菇王的巢穴', floor:'s1', rec:20, dur:600, boss:{id:6130101, t:180}, waves:[
      {t:0,   mobs:[1210102,2110200],          rate:2,   rate2:3},
      {t:120, mobs:[2110200,2220100],          rate:3,   rate2:4}
    ]},
    s4:{nm:'殭屍菇菇的洞穴', floor:'s4', rec:24, dur:300, waves:[
      {t:0,   mobs:[2220100,2230101],          rate:1.5, rate2:3},
      {t:120, mobs:[2230101],                  rate:3,   rate2:6}
    ]},
    s5:{nm:'火焰之地', floor:'s5', rec:30, dur:300, waves:[
      {t:0,   mobs:[2230102],                  rate:1.5, rate2:3},
      {t:100, mobs:[2230102,3210100],          rate:3,   rate2:5.5},
      {t:220, mobs:[3210100],                  rate:5,   rate2:7}
    ]}
  },
  // BOSS 首次通關獎勵：本職業稀有武器（保底）＋楓幣＋稱號
  FIRST_CLEAR:{boss:{meso:5000, title:'蘑菇王剋星', rareOwnJob:1}},
  // 怒氣：擊倒怪物累積，集滿時三選一「本場限定增益」，離開關卡就消失。第 n 次要 need×n
  RAGE:{need:40, choices:3},
  BOONS:[   // ico＝借用的技能圖示（只為了好看）
    {k:'cdr',   nm:'攻速提升',   desc:'所有攻擊冷卻 −12%',      mods:{cdr:.12}, ico:1101004},
    {k:'dmg',   nm:'力量湧現',   desc:'傷害 +20%',              mods:{dmg:.2}, ico:1101006},
    {k:'n',     nm:'多重投射',   desc:'投射物 +1 發',           mods:{n:1}, ico:3001005},
    {k:'area',  nm:'範圍擴大',   desc:'近戰範圍、爆炸、毒霧 +25%', mods:{area:.25}, ico:1001005},
    {k:'crit',  nm:'致命一擊',   desc:'爆擊率 +10%',            mods:{crit:.1}, ico:4100001},
    {k:'spd',   nm:'疾風步',     desc:'移動速度 +15%',          mods:{spd:.15}, ico:4101004},
    {k:'hp',    nm:'強健體魄',   desc:'最大 HP +20%，並補滿',   mods:{hp:.2}, ico:1000001},
    {k:'leech', nm:'吸取生命',   desc:'每擊倒一隻怪回復 1% HP', mods:{leech:.01}, ico:1001003},
    {k:'magnet',nm:'楓幣磁鐵',   desc:'撿東西的距離 +60%',      mods:{magnet:.6}, ico:3001003},
    {k:'heal',  nm:'喝下藥水',   desc:'立刻回復 60% HP',        heal:.6, ico:2101001}
  ]
};
