// ===== 武侠人生：时间系统 + 中文属性面板 + 内功修炼引擎（季度增长/上限）=====
const STORAGE_KEY = "wuxia_life_save_v5_gong";

// ---------- 工具 ----------
function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
function randInt(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }

// ---------- 季节 ----------
const SEASONS = ["春", "夏", "秋", "冬"];
function seasonName(q) { return SEASONS[(q - 1) % 4]; }

// ---------- 内功库（你以后就在这里加更多内功） ----------
const GONG_METHODS = {
  // 示例：基础内功（偏均衡）
  tunatu: {
    name: "吐纳心法",
    capHealth: 120,              // 血量上限可突破
    capInner: 160,               // 内力上限可突破
    gainHealthPerQuarter: [1, 1, 1, 1],  // 春夏秋冬每季的血量增量
    gainInnerPerQuarter:  [3, 3, 2, 2],  // 每季内力增量（比如春夏更适合吐纳）
  },

  // 你可以后面再启用：偏肉（血量上限高）
  // iron: {
  //   name: "铁布衫内功",
  //   capHealth: 180,
  //   capInner: 120,
  //   gainHealthPerQuarter: [3, 2, 2, 3],
  //   gainInnerPerQuarter:  [1, 1, 1, 1],
  // },
};

// ---------- 初始状态（出生） ----------
function newState() {
  return {
    turn: 0,
    age: 0,
    yearNo: 0,
    quarter: 1,
    alive: true,
    ended: false,

    // ===== 基础状态：你要求默认 100 =====
    base: {
      health: 100,      // 血量
      inner: 100,       // 内力（原蓝量）
      money: 20,        // 银子
    },

    // ===== 属性栏 =====
    attrs: {
      // 第一列
      strength: 50,        // 臂力
      constitution: 50,    // 体质
      luck: 50,            // 运气
      insight: 50,         // 悟性

      // 第二列
      fame: 0,             // 声望
      appearance: 50,      // 外貌
      knowledge: 10,       // 学识
      morality: 0,         // 善恶（负=恶，正=善）
    },

    // ===== 修炼状态 =====
    gong: {
      methodId: "tunatu",  // 当前修炼内功（暂时默认给你一门，便于测试）
      practicedQuarters: 0 // 已修炼季度数（将来用于解锁层级/瓶颈）
    },

    log: []
  };
}

// ---------- 规范化 ----------
function normalize(s) {
  // 血量/内力/银子先不按100封顶，因为内功会定义更高cap
  s.base.health = Math.max(0, s.base.health);
  s.base.inner  = Math.max(0, s.base.inner);
  s.base.money  = Math.max(0, s.base.money);

  // 属性：这里我保持 -100..100（善恶/声望可能需要负值）
  for (const k in s.attrs) s.attrs[k] = clamp(s.attrs[k], -100, 100);

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

// ---------- 内功修炼：每季度生效（按季节增量 + 上限） ----------
function applyGongTraining(state) {
  const id = state.gong?.methodId;
  if (!id) return;

  const m = GONG_METHODS[id];
  if (!m) return;

  const qi = state.quarter; // 1..4
  const idx = qi - 1;

  // 本季度增量（可按季节不同）
  let dh = m.gainHealthPerQuarter[idx] ?? 0;
  let di = m.gainInnerPerQuarter[idx] ?? 0;

  // 你还可以让“悟性/体质”影响效率（先给你一个很温和的版本）
  // 悟性高 -> 内力涨得更快；体质高 -> 血量涨得更快
  const insightBonus = (state.attrs.insight - 50) / 100;      // -0.5..+0.5
  const constiBonus  = (state.attrs.constitution - 50) / 100; // -0.5..+0.5

  dh = Math.round(dh * (1 + 0.4 * constiBonus));
  di = Math.round(di * (1 + 0.4 * insightBonus));

  // 至少不为负
  dh = Math.max(0, dh);
  di = Math.max(0, di);

  // 上限控制：只涨到 cap
  const beforeH = state.base.health;
  const beforeI = state.base.inner;

  const capH = m.capHealth;
  const capI = m.capInner;

  state.base.health = Math.min(capH, state.base.health + dh);
  state.base.inner  = Math.min(capI, state.base.inner + di);

  // 记录修炼进度
  state.gong.practicedQuarters += 1;

  // 如果本季度确实有提升，就写一条很短日志（避免刷屏）
  const gainedH = state.base.health - beforeH;
  const gainedI = state.base.inner - beforeI;

  if (gainedH > 0 || gainedI > 0) {
    pushLog(
      state,
      "修炼内功",
      `你修炼《${m.name}》。` +
      `${gainedH > 0 ? `\n血量 +${gainedH}（${state.base.health}/${capH}）` : ""}` +
      `${gainedI > 0 ? `\n内力 +${gainedI}（${state.base.inner}/${capI}）` : ""}`
    );
  }
}

// ---------- 时间推进：每季度换季；冬->春过一年；并触发内功增长 ----------
function advanceQuarter(state) {
  if (state.ended) return;

  state.turn += 1;
  state.quarter += 1;

  // 四季一年
  if (state.quarter > 4) {
    state.quarter = 1;
    state.yearNo += 1;
    state.age += 1;

    pushLog(state, "年龄增长", `四季轮转，你长大了一岁。\n当前年龄：${state.age} 岁`);
  }

  // 本季度内功修炼收益（你想要的核心）
  applyGongTraining(state);

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
    el.statusPill.textContent = "—";
    el.eventText.textContent = "点击“新开一局”。";
    el.stats.textContent = "";
    el.log.innerHTML = "";
    return;
  }

  const s = seasonName(STATE.quarter);
  el.timePill.textContent = `T${STATE.turn} · ${STATE.age}岁 · 第${STATE.yearNo}年 · ${s}`;
  el.statusPill.textContent = STATE.alive ? "生" : "亡";

  const m = GONG_METHODS[STATE.gong.methodId];
  const gongLine = m ? `当前内功：${m.name}（血量上限${m.capHealth} / 内力上限${m.capInner}）` : "当前内功：无";

  el.stats.textContent =
`【基础状态】
年龄：${STATE.age}
血量：${STATE.base.health}
内力：${STATE.base.inner}
银子：${STATE.base.money}

【属性栏】
臂力：${STATE.attrs.strength}      声望：${STATE.attrs.fame}
体质：${STATE.attrs.constitution}  外貌：${STATE.attrs.appearance}
运气：${STATE.attrs.luck}          学识：${STATE.attrs.knowledge}
悟性：${STATE.attrs.insight}        善恶：${STATE.attrs.morality}

【修炼】
${gongLine}
已修炼季度：${STATE.gong.practicedQuarters}
`;

  el.eventText.textContent =
`当前阶段：只测试“时间 + 属性 + 内功季度增长”。\n` +
`点“进入下一季度”观察血量/内力是否按季节逐步逼近上限。`;

  el.log.innerHTML = STATE.log.slice().reverse().map(x =>
    `<div>
      <b>${x.age}岁 · ${x.season} · ${x.title}</b><br/>
      <div style="white-space:pre-wrap">${x.text}</div>
    </div><br/>`
  ).join("");
}

// ---------- 按钮 ----------
el.btnNew.onclick = () => {
  STATE = newState();
  pushLog(STATE, "出生", "你降生于世，命运尚未书写。");
  save(); render();
};
el.btnNext.onclick = () => { advanceQuarter(STATE); save(); render(); };
el.btnSave.onclick = () => { save(); alert("已保存"); };
el.btnLoad.onclick = () => { STATE = load(); render(); };
el.btnReset.onclick = () => { clearSave(); STATE = null; render(); };

// ---------- 自动读取 ----------
(() => {
  const s = load();
  if (s) STATE = s;
  render();
})();