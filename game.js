// ===== 武侠人生：时间 + 属性 + 内功 + 自动装备系统 =====
const STORAGE_KEY = "wuxia_life_save_v7_caps_autoequip";

// ---------- 工具 ----------
function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
function randInt(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }

// ---------- 常量 ----------
const MAX_HP = 10000;
const MAX_INNER = 10000;

const SEASONS = ["春", "夏", "秋", "冬"];
function seasonName(q) { return SEASONS[(q - 1) % 4]; }

// ---------- 内功库 ----------
const GONG_METHODS = {
  tunatu: {
    name: "吐纳心法",
    capHealth: 120,
    capInner: 160,
    gainHealthPerQuarter: [1, 1, 1, 1],
    gainInnerPerQuarter:  [3, 3, 2, 2],
  },
};

// ---------- 装备结构（无背包，直接比较） ----------
function makeEquip({ id, name, slot, score, bonus = {} }) {
  return { id, name, slot, score, bonus };
}

// ---------- 武学 ----------
function makeMartial({ id, name, kind, rank, level = 1 }) {
  return { id, name, kind, rank, level };
}

// ---------- 初始状态 ----------
function newState() {
  return {
    turn: 0,
    age: 0,
    yearNo: 0,
    quarter: 1,
    alive: true,

    base: {
      health: 100,
      inner: 100,
      money: 20,
    },

    attrs: {
      strength: 50,
      constitution: 50,
      luck: 50,
      insight: 50,
      fame: 0,
      appearance: 50,
      knowledge: 10,
      morality: 0,
    },

    gong: {
      methodId: "tunatu",
      practicedQuarters: 0,
    },

    // 装备槽：只保留最强
    equipment: {
      weapon: null,
      armor: null,
      accessory: null,
    },

    martial: [],
    log: [],
  };
}

// ---------- 规范化 ----------
function normalize(s) {
  s.base.health = clamp(s.base.health, 0, MAX_HP);
  s.base.inner  = clamp(s.base.inner, 0, MAX_INNER);
  s.base.money  = Math.max(0, s.base.money);

  for (const k in s.attrs) {
    s.attrs[k] = clamp(s.attrs[k], -100, 100);
  }

  if (s.base.health <= 0) s.alive = false;
}

// ---------- 日志 ----------
function pushLog(s, title, text) {
  s.log.push({
    age: s.age,
    season: seasonName(s.quarter),
    title,
    text,
  });
}

// ---------- 自动装备逻辑 ----------
function autoEquip(state, newItem) {
  const slot = newItem.slot;
  const cur = state.equipment[slot];

  if (!cur) {
    state.equipment[slot] = newItem;
    pushLog(state, "获得装备", `你获得并装备了【${newItem.name}】。`);
    return;
  }

  if (newItem.score > cur.score) {
    state.equipment[slot] = newItem;
    pushLog(
      state,
      "更换装备",
      `你以【${newItem.name}】替换了【${cur.name}】。`
    );
  } else {
    pushLog(
      state,
      "装备淘汰",
      `你得到【${newItem.name}】，但不如现有装备，被舍弃了。`
    );
  }
}

// ---------- 内功修炼 ----------
function applyGongTraining(state) {
  const m = GONG_METHODS[state.gong.methodId];
  if (!m) return;

  const i = state.quarter - 1;

  let dh = m.gainHealthPerQuarter[i];
  let di = m.gainInnerPerQuarter[i];

  const constiBonus  = (state.attrs.constitution - 50) / 100;
  const insightBonus = (state.attrs.insight - 50) / 100;

  dh = Math.max(0, Math.round(dh * (1 + 0.4 * constiBonus)));
  di = Math.max(0, Math.round(di * (1 + 0.4 * insightBonus)));

  const beforeH = state.base.health;
  const beforeI = state.base.inner;

  state.base.health = Math.min(m.capHealth, state.base.health + dh);
  state.base.inner  = Math.min(m.capInner,  state.base.inner + di);

  state.gong.practicedQuarters++;

  if (state.base.health > beforeH || state.base.inner > beforeI) {
    pushLog(
      state,
      "修炼内功",
      `修炼《${m.name}》，血量 ${beforeH}→${state.base.health}，内力 ${beforeI}→${state.base.inner}`
    );
  }
}

// ---------- 时间推进 ----------
function advanceQuarter(state) {
  state.turn++;
  state.quarter++;

  if (state.quarter > 4) {
    state.quarter = 1;
    state.yearNo++;
    state.age++;
    pushLog(state, "年龄增长", `你长大了一岁，${state.age} 岁。`);
  }

  applyGongTraining(state);
  normalize(state);
}

// ---------- UI ----------
const el = {
  timePill: document.getElementById("timePill"),
  statusPill: document.getElementById("statusPill"),
  stats: document.getElementById("stats"),
  eventText: document.getElementById("eventText"),
  log: document.getElementById("log"),
  btnNew: document.getElementById("btnNew"),
  btnNext: document.getElementById("btnNext"),
  btnSave: document.getElementById("btnSave"),
  btnLoad: document.getElementById("btnLoad"),
  btnReset: document.getElementById("btnReset"),
};

let STATE = null;

// ---------- 存档 ----------
function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(STATE)); }
function load() {
  const r = localStorage.getItem(STORAGE_KEY);
  return r ? JSON.parse(r) : null;
}
function clearSave() { localStorage.removeItem(STORAGE_KEY); }

// ---------- 渲染 ----------
function render() {
  if (!STATE) {
    el.timePill.textContent = "未开始";
    el.stats.textContent = "";
    el.log.innerHTML = "";
    return;
  }

  const s = seasonName(STATE.quarter);
  el.timePill.textContent = `${STATE.age}岁 · 第${STATE.yearNo}年 · ${s}`;
  el.statusPill.textContent = STATE.alive ? "生" : "亡";

  el.stats.textContent =
`【基础】
血量：${STATE.base.health}/${MAX_HP}
内力：${STATE.base.inner}/${MAX_INNER}
银子：${STATE.base.money}

【装备】
武器：${STATE.equipment.weapon?.name || "无"}
护甲：${STATE.equipment.armor?.name || "无"}
饰品：${STATE.equipment.accessory?.name || "无"}
`;

  el.eventText.textContent = "当前为系统测试阶段（自动装备 + 内功成长）。";

  el.log.innerHTML = STATE.log.slice().reverse().map(x =>
    `<div><b>${x.age}岁·${x.season}·${x.title}</b><br/>${x.text}</div><br/>`
  ).join("");
}

// ---------- 按钮 ----------
el.btnNew.onclick = () => {
  STATE = newState();

  // 示例：自动装备测试
  autoEquip(STATE, makeEquip({
    id: "wood_sword",
    name: "木剑",
    slot: "weapon",
    score: 5,
  }));

  autoEquip(STATE, makeEquip({
    id: "iron_sword",
    name: "铁剑",
    slot: "weapon",
    score: 10,
  }));

  pushLog(STATE, "出生", "你来到世上。");
  save(); render();
};

el.btnNext.onclick = () => { advanceQuarter(STATE); save(); render(); };
el.btnSave.onclick = () => save();
el.btnLoad.onclick = () => { STATE = load(); render(); };
el.btnReset.onclick = () => { clearSave(); STATE = null; render(); };

// ---------- 自动读取 ----------
(() => {
  const s = load();
  if (s) STATE = s;
  render();
})();