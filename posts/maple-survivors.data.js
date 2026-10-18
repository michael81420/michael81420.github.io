/* 楓之谷倖存者：數值表。調平衡只改這支，引擎（maple-survivors.game.js）不寫死數字。
   距離單位＝像素（素材原尺寸），時間＝秒。 */
window.MSD={
  // 職業：hp＋每級 hpLv；atk＝一直開著的基本攻擊（dmg 是攻擊力倍率，1＝100%）
  // main/sub＝主副屬性（攻擊力＝基礎 × (主×4＋副)/52，創角時剛好 1 倍）；adv＝見習/1轉/2轉的稱號
  // atk.k：slash 扇形近戰／shot 投射物；fx＝atlas 技能 id（特效圖），ball＝投射物圖（沒有就用 canvas 畫）
  // npc＝轉職教官（atlas npc id）；town／tag／line 只是介紹文字
  JOBS:{
    warrior: {nm:'劍士',   adv:['見習劍士','劍士','劍客'],     hp:120, hpLv:14, spd:150, main:'str', sub:'dex', base:14,
              atk:{k:'slash', cd:.85, dmg:1, range:120, arc:2.2, fx:1001005},
              npc:1022000, npcNm:'武術教練', town:'勇士之村', tag:'近戰・高血量', line:'正面迎擊，揮劍掃開身邊的怪物。'},
    bowman:  {nm:'弓箭手', adv:['見習弓箭手','弓箭手','獵人'], hp:80,  hpLv:9,  spd:160, main:'dex', sub:'str', base:10,
              atk:{k:'shot',  cd:.6,  dmg:1, range:520, v:640, pierce:2, ball:3001004},
              npc:1012100, npcNm:'赫麗娜',   town:'弓箭手村', tag:'遠程・穿透', line:'拉開距離，一箭射穿整排怪物。'},
    magician:{nm:'法師',   adv:['見習法師','法師','火毒巫師'], hp:70,  hpLv:7,  spd:145, main:'int', sub:'luk', base:15,
              atk:{k:'shot',  cd:.75, dmg:1, range:460, v:520, pierce:1, ball:2001004, splash:60},
              npc:1032001, npcNm:'漢斯',     town:'魔法森林', tag:'遠程・範圍', line:'血少但魔法會爆開，一次炸一群。'},
    thief:   {nm:'盜賊',   adv:['見習盜賊','盜賊','刺客'],     hp:90,  hpLv:10, spd:175, main:'luk', sub:'dex', base:7,
              atk:{k:'shot',  cd:.45, dmg:1, range:420, v:720, pierce:1, n:2},
              npc:1052001, npcNm:'達克魯',   town:'墮落城市', tag:'速度・連發', line:'跑得最快，飛鏢一次丟兩顆。'}
  },
  STATS:['str','dex','int','luk'], STAT_NM:{str:'STR 力量',dex:'DEX 敏捷',int:'INT 智力',luk:'LUK 幸運'},
  START_STAT:4, START_MAIN:12,         // 創角：四項 4，主屬性 12
  AP_LV:5, SP_LV:3, SP_ADV:1,          // 每升一級 5 AP；轉職後每級 3 SP；轉職當下送 1 SP
  ADV_LV:[0,10,30],                    // 轉職等級：1 轉 Lv10、2 轉 Lv30（3、4 轉第二期）
  SLOTS:[0,2,3],                       // 各轉職階段能帶進關卡的主動技能數
  AP_RESET:function(lv){ return lv*300 },  // 重置 AP 的楓幣（楓幣在 M3 才會掉）
  // 迴避：迴避值＝DEX×0.5＋LUK＋技能，閃避率＝迴避/(迴避＋150)，上限 60%；爆擊基礎 5%、爆傷 150%
  EVA_K:150, EVA_MAX:.6, CRIT:.05, CRIT_DMG:1.5, DEF_MAX:.6,

  // 技能：act＝主動（帶進技能欄才會自動施放）；數值寫 [Lv1, 滿級]，中間線性內插
  // 主動 k：slash 扇形／shot 投射物／strike 直接打目標／mist 地面持續傷害／buff 自身增益
  // 被動與 buff 的 mods：hp 最大HP% def 減傷% eva 迴避值 crit 爆擊率 dmg 傷害% cdr 冷卻縮短% spd 移速% range 射程% final 追擊機率 inv 無敵
  SK:{
    1001004:{job:'warrior', adv:1, nm:'強力攻擊', max:10, act:1, k:'slash', cd:[2.2,1.5], dmg:[2.2,3.6], range:140, arc:1.3, fx:'effect', desc:'朝前方重重一擊。'},
    1001005:{job:'warrior', adv:1, nm:'群體攻擊', max:10, act:1, k:'slash', cd:[3.2,2.2], dmg:[1.2,2.0], range:170, arc:6.3, fx:'effect', desc:'揮劍橫掃身邊一圈。'},
    1000001:{job:'warrior', adv:1, nm:'增加最大HP', max:10, mods:{hp:[.05,.3]}, desc:'最大 HP 提升。'},
    1001003:{job:'warrior', adv:1, nm:'自身強化', max:10, mods:{def:[.04,.2]}, desc:'受到的傷害減少。'},
    1101006:{job:'warrior', adv:2, nm:'激勵', max:10, act:1, k:'buff', cd:[25,20], dur:[8,15], mods:{dmg:[.1,.3]}, fx:'effect', desc:'一段時間內傷害提升。'},
    1100002:{job:'warrior', adv:2, nm:'終極之劍', max:10, mods:{final:[.1,.4]}, fx:'hit', desc:'攻擊有機率再追擊一次。'},
    1100000:{job:'warrior', adv:2, nm:'劍術精通', max:10, mods:{dmg:[.05,.2], crit:[.02,.1]}, desc:'傷害與爆擊率提升。'},
    1101004:{job:'warrior', adv:2, nm:'快速之劍', max:10, mods:{cdr:[.04,.2]}, desc:'所有攻擊冷卻縮短。'},

    3001004:{job:'bowman', adv:1, nm:'斷魂箭', max:10, act:1, k:'shot', cd:[1.6,1.1], dmg:[1.8,3.0], pierce:[3,6], v:700, range:560, ball:3001004, desc:'一箭射穿整排怪物。'},
    3001005:{job:'bowman', adv:1, nm:'二連箭', max:10, act:1, k:'shot', cd:[1.2,.8], dmg:[1.0,1.5], n:2, pierce:1, v:760, range:540, ball:3001004, hit:3001005, desc:'連射兩箭。'},
    3001003:{job:'bowman', adv:1, nm:'集中術', max:10, mods:{eva:[4,20]}, desc:'迴避值提升。'},
    3000001:{job:'bowman', adv:1, nm:'致命箭', max:10, mods:{crit:[.04,.2]}, desc:'爆擊率提升。'},
    3101005:{job:'bowman', adv:2, nm:'爆擊箭', max:10, act:1, k:'shot', cd:[3,2], dmg:[2,3.2], pierce:1, splash:90, v:560, range:520, ball:3101005, desc:'命中後爆炸，炸到周圍一圈。'},
    3100001:{job:'bowman', adv:2, nm:'終極之弓', max:10, mods:{final:[.1,.4]}, fx:'hit', desc:'攻擊有機率再追擊一次。'},
    3101002:{job:'bowman', adv:2, nm:'快速之箭', max:10, mods:{cdr:[.04,.2]}, desc:'所有攻擊冷卻縮短。'},
    3100000:{job:'bowman', adv:2, nm:'弓術精通', max:10, mods:{dmg:[.05,.2], crit:[.02,.1]}, desc:'傷害與爆擊率提升。'},

    2001004:{job:'magician', adv:1, nm:'魔法彈', max:10, act:1, k:'shot', cd:[1.2,.8], dmg:[1.6,2.6], pierce:1, v:520, range:480, ball:2001004, desc:'射出一發魔法彈。'},
    2001005:{job:'magician', adv:1, nm:'魔力爪', max:10, act:1, k:'strike', cd:[1.8,1.2], dmg:[1.2,2.0], hits:2, n:[1,3], range:420, fx:'effect', desc:'直接抓向怪物兩次。'},
    2001002:{job:'magician', adv:1, nm:'魔心防禦', max:10, mods:{def:[.06,.3]}, desc:'受到的傷害減少。'},
    2000001:{job:'magician', adv:1, nm:'魔力強化', max:10, mods:{dmg:[.04,.2]}, desc:'魔法傷害提升。'},
    2101004:{job:'magician', adv:2, nm:'火焰箭', max:10, act:1, k:'shot', cd:[1.6,1.1], dmg:[2.4,3.8], pierce:1, splash:70, v:560, range:480, ball:2101004, desc:'火焰命中後燒到周圍。'},
    2101005:{job:'magician', adv:2, nm:'毒霧', max:10, act:1, k:'mist', cd:[6,4.5], dmg:[.4,.8], dur:4, r:[90,130], range:420, desc:'在怪物腳下留下一片毒霧，持續傷害。'},
    2101001:{job:'magician', adv:2, nm:'冥想', max:10, act:1, k:'buff', cd:[30,24], dur:[10,20], mods:{dmg:[.1,.35]}, fx:'effect', desc:'一段時間內魔法傷害提升。'},

    4001344:{job:'thief', adv:1, nm:'雙飛斬', max:10, act:1, k:'shot', cd:[1,.7], dmg:[1.2,1.9], n:2, pierce:1, v:760, range:460, hit:4001344, desc:'一次丟出兩枚飛鏢。'},
    4001003:{job:'thief', adv:1, nm:'隱身術', max:10, act:1, k:'buff', cd:[18,12], dur:[1.5,3], mods:{inv:1}, fx:'effect', desc:'短時間內不會受傷。'},
    4000000:{job:'thief', adv:1, nm:'迴避', max:10, mods:{eva:[5,25]}, desc:'迴避值提升。'},
    4000001:{job:'thief', adv:1, nm:'鷹眼', max:10, mods:{range:[.05,.25]}, desc:'射程變遠。'},
    4101004:{job:'thief', adv:2, nm:'速度激發', max:10, act:1, k:'buff', cd:[20,16], dur:[8,15], mods:{spd:[.15,.35]}, fx:'effect', desc:'一段時間內移動速度提升。'},
    4100000:{job:'thief', adv:2, nm:'爪術精通', max:10, mods:{dmg:[.05,.2]}, desc:'傷害提升。'},
    4100001:{job:'thief', adv:2, nm:'致命攻擊', max:10, mods:{crit:[.04,.2]}, desc:'爆擊率提升。'},
    4101003:{job:'thief', adv:2, nm:'快速之爪', max:10, mods:{cdr:[.04,.2]}, desc:'所有攻擊冷卻縮短。'}
  },
  // 升到下一級要的經驗（暫定，M4 依實際一場拿多少再調）
  exp:function(lv){ return Math.round(12*Math.pow(lv,1.9)+8) },
  DEATH_EXP:.3,
  // 怪物：hp/atk 依原作 Lv 縮放過；spd＝每秒像素；r 不填就依圖寬推
  MOBS:{
    100100:{nm:'嫩寶',   hp:18,  atk:4,  spd:40, exp:3},
    100101:{nm:'藍寶',   hp:26,  atk:5,  spd:46, exp:4},
    130101:{nm:'紅寶',   hp:48,  atk:7,  spd:50, exp:7},
    120100:{nm:'菇菇仔', hp:34,  atk:6,  spd:62, exp:5},
    210100:{nm:'綠水靈', hp:70,  atk:9,  spd:58, exp:10},
    6130101:{nm:'蘑菇王',hp:9000,atk:30, spd:55, exp:1500, boss:1}
  },
  // 關卡：waves 依時間切換怪物組；rate＝每秒生怪數，隨時間線性加到 rate2
  STAGES:{
    s1:{nm:'嫩寶的小路', floor:'s1', dur:300, waves:[
      {t:0,   mobs:[100100],               rate:1.2, rate2:2.5},
      {t:45,  mobs:[100100,100101],        rate:2.5, rate2:4},
      {t:120, mobs:[100101,130101,120100], rate:4,   rate2:6},
      {t:210, mobs:[130101,120100,210100], rate:6,   rate2:9}
    ]}
  }
};
