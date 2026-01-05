// ====== 武侠人生：时间系统（春夏秋冬 + 年龄增长） ======
const STORAGE_KEY = "wuxia_life_save_v3_time";

// ---- 小工具 ----
function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
function randInt(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }

const SEASONS = ["春", "夏", "秋", "冬"];
function seasonName(quarter) { // quarter: 1..4
  return SEASONS[(quarter - 1) % 4];
}

// ---- 初始状态：从出生开始 ----
function newState() {
  return {
    turn: 0,      // 已过的季度数（回合数）
    age: 0,       // 年龄，从 0 岁开始
    yearNo: 0,    // 第几年（0=出生当年）
    quarter: 1,   // 1..4 -> 春夏秋冬（默认从春开始）
    alive: true,
    ended: false,

    // 先保留一套属性（后面事件系统会用到）
    stats: {
      health: 80,
      stamina: 70,
      money: 30,
      skill: 10,
      innerPower: 10,
      fame: 0,
      morality: 10,
      grudge: 0,
    },
    flags: {
      wanted: false,
      secretManual: false,
    },

    // 日志：用于记录“过一年/过一岁”等关键节点
    log: []
  };
}

// ---- 规范化（防止属性越界）----
function normalize(s) {
  const st = s.stats;
  st.health = clamp(st.health, 0, 100);
  st.stamina = clamp(st.stamina, 0, 100);
  st.money = Math.max(0, st.money);
  st.skill = clamp(st.skill, 0, 999);
  st.innerPower = clamp(st.innerPower, 0, 999);
  st.fame = clamp(st.fame, -100, 100);
  st.morality = clamp(st.morality, -100, 100);
  st.grudge = clamp(st.grudge, 0, 100);

  if (st.health <= 0) s.alive = false;
}

// ---- 日志写入 ----
function pushLog(state, title, text, eventId = "") {
  state.log.push({
    t: state.turn,
    age: state.age,
    yearNo: state.yearNo,
    quarter: state.quarter,
    season: seasonName(state.quarter),
    title,
    text,
    eventId
  });
}

// ---- 结局检查（先保留最简单的）----
function checkEnding(state) {
  if (!state.alive) {
    state.ended = true;
    pushLog(state, "结局：身死江湖", "伤势积重，终究倒在风里。", "ending_dead");
    return;
  }
  // 先留一个很软的“阶段结束”条件：过 5 年就算阶段结局（方便你测试时间系统）
  if (state.yearNo >= 5) {
    state.ended = true;
    pushLog(state, "阶段结局：五年已过", "你已从襁褓走到少年，江湖的大门缓缓打开。", "ending_5y");
  }
}

// ---- 核心：推进一季度（换季；四季一年；年龄+1）----
function advanceQuarter(state) {
  if (state.ended) return;

  // 进入下一季度
  state.turn += 1;
  state.quarter += 1;

  // 从冬到春：过一年 + 年龄+1
  if (state.quarter > 4) {
    state.quarter = 1;
    state.yearNo += 1;
    state.age += 1;

    pushLog(
      state,
      "年龄增长",
      `四季轮转，你长大了一岁。\n当前年龄：${state.age} 岁（第 ${state.yearNo} 年）`,
      "age_up"
    );
  }

  // 自然结算（占位：先保留，后面事件会更丰富）
  state.stats.stamina += randInt(6, 14);
  state.stats.health += randInt(0, 4);
  state.stats.grudge -= randInt(0, 2);

  normalize(state);
  checkEnding(state);
}

// ===== UI 绑定（兼容你现在的 index.html）=====
const el = {
  timePill: document.getElementById("timePill"),
  statusPill: document.getElementById("statusPill"),
  eventText: document.getElementById("eventText"),
  choices: document.getElementById("choices"),
  resultText: document.getElementById("resultText"),
  stats: document.getElementById("stats"),
  log: document.getElementById("log"),
  btnNew: document.getElementById("btnNew"),
  btnNext: document.getElementById("btnNext"),
  btnSave: document.getElementById("btnSave"),
  btnLoad: document.getElementById("btnLoad"),
  btnReset: document.getElementById("btnReset"),
};

let STATE = null;

// ---- 存档 ----
function save() {
  if (!STATE) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(STATE));
}
function load() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}
function clearSave() {
  localStorage.removeItem(STORAGE_KEY);
}

// ---- 渲染 ----
function render() {
  if (!STATE) {
    el.timePill.textContent = "未开始";
    el.statusPill.textContent = "—";
    el.eventText.textContent = "点击“新开一局”。";
    el.choices.innerHTML = "";
    el.resultText.textContent = "";
    el.stats.textContent = "";
    el.log.innerHTML = "";
    el.btnNext.disabled = true;
    return;
  }

  el.btnNext.disabled = STATE.ended;

  const sname = seasonName(STATE.quarter);
  el.timePill.textContent = `T${STATE.turn} · ${STATE.age}岁 · 第${STATE.yearNo}年 · ${sname}`;
  el.statusPill.textContent = STATE.ended ? "结局已定" : (STATE.alive ? "生" : "亡");

  // 状态面板（先保留基础属性）
  const st = STATE.stats;
  el.stats.textContent =
`age        ${STATE.age}
yearNo     ${STATE.yearNo}
season     ${sname}

health     ${st.health}
stamina    ${st.stamina}
money      ${st.money}
skill      ${st.skill}
innerPower ${st.innerPower}
fame       ${st.fame}
morality   ${st.morality}
grudge     ${st.grudge}

wanted     ${STATE.flags.wanted}
manual     ${STATE.flags.secretManual}`;

  // 事件区（这一轮先做时间系统，所以这里给占位提示）
  if (STATE.ended) {
    el.eventText.textContent = "这一局已经结束。你可以“新开一局”。";
    el.choices.innerHTML = "";
    el.resultText.textContent = "";
  } else {
    el.eventText.textContent = `当前：第${STATE.yearNo}年 · ${sname}。\n（下一步我们再把“随机事件系统”接回来。）`;
    el.choices.innerHTML = "";
    el.resultText.textContent = "";
  }

  // 日志区（最近在上）
  el.log.innerHTML = STATE.log.slice().reverse().map(x => {
    const head = `T${x.t} · ${x.age}岁 · 第${x.yearNo}年${x.season} · ${x.title}`;
    const body = (x.text || "").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
    return `<div style="margin-bottom:10px">
      <div class="muted"><strong>${head}</strong></div>
      <div style="white-space:pre-wrap">${body}</div>
    </div>`;
  }).join("");
}

// ---- 按钮行为 ----
el.btnNew.onclick = () => {
  STATE = newState();
  // 可选：出生即记一条日志（便于你确认从 0 岁开始）
  pushLog(STATE, "出生", "你来到世上，哭声很响。", "born");
  save();
  render();
};

el.btnNext.onclick = () => {
  if (!STATE || STATE.ended) return;
  advanceQuarter(STATE);
  save();
  render();
};

el.btnSave.onclick = () => {
  save();
  alert("已保存（localStorage）。");
};

el.btnLoad.onclick = () => {
  const s = load();
  if (!s) { alert("没有找到存档。"); return; }
  STATE = s;
  alert("已读取存档。");
  render();
};

el.btnReset.onclick = () => {
  clearSave();
  STATE = null;
  alert("存档已清空。");
  render();
};

// ---- 自动读取 ----
(() => {
  const s = load();
  if (s) STATE = s;
  render();
})();