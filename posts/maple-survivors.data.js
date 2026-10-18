/* 楓之谷倖存者：數值表。調平衡只改這支，引擎（maple-survivors.game.js）不寫死數字。
   距離單位＝像素（素材原尺寸），時間＝秒。 */
window.MSD={
  // 職業基本值（M1：只有見習期的基本攻擊；技能樹、AP 換算在 M2）
  // atk.k：slash 扇形近戰／shot 直線投射物；fx＝atlas 技能 id（特效圖），ball＝投射物圖（沒有就用 canvas 畫）
  // npc＝建立角色畫面的轉職教官（atlas npc id）；town／stat／line 只是介紹文字
  JOBS:{
    warrior: {nm:'劍士',   hp:120, spd:150, atk:{k:'slash', cd:.85, dmg:14, range:120, arc:2.2, fx:1001005},
              npc:1022000, npcNm:'武術教練', town:'勇士之村', stat:'STR', tag:'近戰・高血量', line:'正面迎擊，揮劍掃開身邊的怪物。'},
    bowman:  {nm:'弓箭手', hp:80,  spd:160, atk:{k:'shot',  cd:.6,  dmg:10, range:520, v:640, pierce:2, ball:3001004},
              npc:1012100, npcNm:'赫麗娜',   town:'弓箭手村', stat:'DEX', tag:'遠程・穿透', line:'拉開距離，一箭射穿整排怪物。'},
    magician:{nm:'法師',   hp:70,  spd:145, atk:{k:'shot',  cd:.75, dmg:15, range:460, v:520, pierce:1, ball:2001004, splash:60},
              npc:1032001, npcNm:'漢斯',     town:'魔法森林', stat:'INT', tag:'遠程・範圍', line:'血少但魔法會爆開，一次炸一群。'},
    thief:   {nm:'盜賊',   hp:90,  spd:175, atk:{k:'shot',  cd:.45, dmg:7,  range:420, v:720, pierce:1, n:2},
              npc:1052001, npcNm:'達克魯',   town:'墮落城市', stat:'LUK', tag:'速度・連發', line:'跑得最快，飛鏢一次丟兩顆。'}
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
