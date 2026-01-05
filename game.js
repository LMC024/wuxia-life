// ===== 武侠人生：时间系统 + 中文属性面板 =====
const STORAGE_KEY = "wuxia_life_save_v4_stats";

// ---------- 工具 ----------
function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
function randInt(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }

// ---------- 季节 ----------
const SEASONS = ["春", "夏", "秋", "冬"];
function seasonName(q) { return SEASONS[(q - 1) % 4]; }

// ---------- 初始状态（出生） ----------
function newState() {
  return {
    turn: 0,
    age: 0,
    yearNo: 0,
    quarter: 1,
    alive: true,
    ended: false,

    // ===== 基础状态 =====
    base: {
      health: 80,     // 血量
      mana: 40,       // 蓝量（内力）
      money: 20,      // 银子
    },

    // ===== 属性栏 =====
    attrs: {
      // 第一列
      strength: 50,   // 臂力
      constitution: 50, // 体质
      luck: 50,       // 运气
      insight: 50,    // 悟性

      // 第二列
      fame: 0,        // 声望
      appearance: 50, // 外貌
      knowledge: 10,  // 学识
      morality: 0,    // 善恶（负=恶，正=善）
    },

    log: []
  };
}

// ---------- 规范化 ----------
function normalize(s) {
  s.base.health = clamp(s.base.health, 0, 100);
  s.base.mana   = clamp(s.base.mana, 0, 100);
  s.base.money = Math.max(0, s.base.money);

  for (const k in s.attrs) {
    s.attrs[k] = clamp(s.attrs[k], -100, 100);
  }

  if (s.base.health <= 0) s.alive = false;
}

// ---------- 日志 ----------
function pushLog(state, title, text) {
  state.log.push({
    t: state.turn,
    age: state.age,
    yearNo: state.yearNo,
    season: seasonName(state.quarter),
    title,
    text
  });
}

// ---------- 时间推进 ----------
function advanceQuarter(state) {
  if (state.ended) return;

  state.turn += 1;
  state.quarter += 1;

  if (state.quarter > 4) {
    state.quarter = 1;
    state.yearNo += 1;
    state.age += 1;

    pushLog(
      state,
      "年龄增长",
      `四季轮转，你长大了一岁。\n当前年龄：${state.age} 岁`
    );
  }

  // 自然消耗 / 恢复（占位）
  state.base.mana += randInt(2, 6);
  state.base.health += randInt(0, 3);

  normalize(state);
}

// ---------- UI ----------
const el = {
  timePill: document.getElementById("timePill"),
  statusPill: document.getElementById("statusPill"),
  eventText: document.getElementById("eventText"),
  stats: document.getElementById("stats"),
  log: document.getElementById("log"),
  btnNew: document.getElementById("btnNew"),
  btnNext: document.getElementById("btnNext"),
  btnSave: document.getElementById("btnSave"),
  btnLoad: document.getElementById("btnLoad"),
  btnReset: document.getElementById("btnReset"),
};

let STATE = null;

// ---------- 存档 ----------
function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(STATE));
}
function load() {
  const r = localStorage.getItem(STORAGE_KEY);
  return r ? JSON.parse(r) : null;
}
function clearSave() {
  localStorage.removeItem(STORAGE_KEY);
}

// ---------- 渲染 ----------
function render() {
  if (!STATE) {
    el.timePill.textContent = "未开始";
    el.statusPill.textContent = "—";
    el.eventText.textContent = "点击“新开一局”。";
    el.stats.textContent = "";
    el.log.innerHTML = "";
    return;
  }

  const s = seasonName(STATE.quarter);
  el.timePill.textContent = `T${STATE.turn} · ${STATE.age}岁 · 第${STATE.yearNo}年 · ${s}`;
  el.statusPill.textContent = STATE.alive ? "生" : "亡";

  // ===== 状态面板（中文）=====
  el.stats.textContent =
`【基础状态】
年龄：${STATE.age}
血量：${STATE.base.health}
蓝量：${STATE.base.mana}
银子：${STATE.base.money}

【属性栏】
臂力：${STATE.attrs.strength}      声望：${STATE.attrs.fame}
体质：${STATE.attrs.constitution}  外貌：${STATE.attrs.appearance}
运气：${STATE.attrs.luck}      学识：${STATE.attrs.knowledge}
悟性：${STATE.attrs.insight}    善恶：${STATE.attrs.morality}
`;

  el.eventText.textContent = "当前仅测试时间与属性系统。";

  el.log.innerHTML = STATE.log.slice().reverse().map(x =>
    `<div>
      <b>${x.age}岁 · ${x.season} · ${x.title}</b><br/>
      ${x.text}
    </div><br/>`
  ).join("");
}

// ---------- 按钮 ----------
el.btnNew.onclick = () => {
  STATE = newState();
  pushLog(STATE, "出生", "你降生于世，命运尚未书写。");
  save(); render();
};

el.btnNext.onclick = () => {
  advanceQuarter(STATE);
  save(); render();
};

el.btnSave.onclick = () => { save(); alert("已保存"); };
el.btnLoad.onclick = () => { STATE = load(); render(); };
el.btnReset.onclick = () => { clearSave(); STATE = null; render(); };

// ---------- 自动读取 ----------
(() => {
  const s = load();
  if (s) STATE = s;
  render();
})();