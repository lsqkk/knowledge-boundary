// quiz.js · 答题引擎：数据装配、状态机、计分
// 依赖：domains.js, loader.js, storage.js
window.KBQuiz = (function () {
  var DIFF_WEIGHT = { easy: 1, medium: 1.5, hard: 2 };

  var FORGIVE_TOTAL = 5; // 用户可用的「我手滑了」总次数

  var state = {
    questions: [],   // 全部题目（来自各领域文件合并）
    byId: {},
    order: [],       // 作答顺序（题目 id）
    pos: 0,          // 当前下标
    answers: {},     // id -> { choice, ts, forgiven? }
    forgiveLeft: FORGIVE_TOTAL  // 「手滑」剩余次数
  };

  /* ---------------- 装配 ---------------- */
  function isWellFormed(q) {
    return !!q && !!q.id && !!q.category && !!q.subdomain &&
      (q.difficulty === "easy" || q.difficulty === "medium" || q.difficulty === "hard") &&
      Array.isArray(q.options) && q.options.length === 4 &&
      Number.isInteger(q.answer) && q.answer >= 0 && q.answer <= 3 &&
      !!q.question && !!q.explanation;
  }

  function loadQuestions() {
    var all = [], seen = {};
    (window.KNOWLEDGE_DOMAINS || []).forEach(function (d) {
      var arr = window["QUESTIONS_" + d.id.toUpperCase()] || [];
      arr.forEach(function (q) {
        if (!q || !q.id || seen[q.id]) return;
        seen[q.id] = true;
        if (!isWellFormed(q)) { window.LOAD_ISSUES.push("结构错误(已剔除): " + q.id); return; }
        all.push(q);
      });
    });
    state.questions = all;
    state.byId = {};
    all.forEach(function (q) { state.byId[q.id] = q; });
    return all;
  }

  /* ---------------- 洗牌 ---------------- */
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* ---------------- 持久化 ---------------- */
  function save() {
    window.KBStorage.save({
      version: 1,
      order: state.order,
      pos: state.pos,
      answers: state.answers,
      forgiveLeft: state.forgiveLeft,
      updatedAt: Date.now()
    });
  }

  function init() {
    loadQuestions();
    var saved = window.KBStorage.load();
    if (saved && saved.version === 1 && saved.order && saved.order.length) {
      // 校验：题目库更新后旧进度里的 id 可能不存在，容错过滤
      var valid = saved.order.filter(function (id) { return state.byId[id]; });
      state.order = valid;
      state.pos = Math.min(saved.pos || 0, valid.length);
      var filtered = {};
      Object.keys(saved.answers || {}).forEach(function (id) {
        if (state.byId[id] && saved.answers[id]) filtered[id] = saved.answers[id];
      });
      state.answers = filtered;
      state.forgiveLeft = typeof saved.forgiveLeft === "number" ? saved.forgiveLeft : FORGIVE_TOTAL;
    }
    return state.questions.length;
  }

  function startNew() {
    state.order = shuffle(state.questions.map(function (q) { return q.id; }));
    state.pos = 0;
    state.answers = {};
    state.forgiveLeft = FORGIVE_TOTAL;
    save();
    return state.order.length;
  }

  // 分数浮动 ±（非线性）：随已答题数增加而收窄，答满为 0。
  // 依据：随机抽题在未答满时存在抽样方差，完成度越低浮动越大。
  function scoreMargin() {
    var n = state.questions.length;
    var answered = Object.keys(state.answers).length;
    if (!n || answered >= n) return 0;
    var completion = answered / n;
    return Math.round(7 * Math.pow(1 - completion, 1.4) * 10) / 10;
  }

  /* ---------------- 状态 ---------------- */
  function current() {
    return state.order[state.pos] ? state.byId[state.order[state.pos]] : null;
  }
  function answeredCount() {
    return Object.keys(state.answers).length;
  }
  function isAnswered(id) { return !!state.answers[id]; }
  function getAnswer(id) { return state.answers[id] || null; }
  function finished() { return state.pos >= state.order.length; }
  function total() { return state.questions.length; }

  function answer(id, choice) {
    if (state.answers[id]) return; // 已作答不可修改
    state.answers[id] = { choice: choice, ts: Date.now() };
    save();
  }

  // 「我手滑了」：把某道错题改判为会（计入正确），消耗一次机会
  function forgive(id) {
    var a = state.answers[id];
    if (!a || a.forgiven) return false;
    if (state.forgiveLeft <= 0) return false;
    a.forgiven = true;
    state.forgiveLeft--;
    save();
    return true;
  }

  // 判定某题是否答对（含被改判的）
  function isCorrect(q, a) {
    if (!q || !a) return false;
    return a.forgiven === true || a.choice === q.answer;
  }

  // 答满 100 题后可随时查看结果
  function canPeek() {
    return answeredCount() >= 100;
  }

  function next() {
    if (state.pos < state.order.length - 1) { state.pos++; save(); return true; }
    return false;
  }
  function prev() {
    if (state.pos > 0) { state.pos--; save(); return true; }
    return false;
  }

  /* ---------------- 计分 ---------------- */
  function diffWeight(q) {
    return DIFF_WEIGHT[q.difficulty] || 1;
  }

  function domainStats(domainId) {
    var dom = window.getDomain(domainId);
    var qs = state.questions.filter(function (q) { return q.category === domainId; });
    var answered = 0, ptsAns = 0, ptsCor = 0;
    qs.forEach(function (q) {
      var a = state.answers[q.id];
      if (!a) return;
      var w = diffWeight(q);
      answered++; ptsAns += w;
      if (isCorrect(q, a)) ptsCor += w;
    });
    var coverage = dom && dom.weight ? Math.round(answered / dom.weight * 100) : 0;
    return {
      domainId: domainId,
      answered: answered,
      total: qs.length,
      coverage: coverage,
      confident: coverage >= 50,
      score: ptsAns ? Math.round(ptsCor / ptsAns * 100) : null
    };
  }

  function allDomainStats() {
    return (window.KNOWLEDGE_DOMAINS || []).map(function (d) { return domainStats(d.id); });
  }

  function overallStats() {
    var ptsAns = 0, ptsCor = 0, answered = 0;
    state.questions.forEach(function (q) {
      var a = state.answers[q.id];
      if (!a) return;
      var w = diffWeight(q);
      ptsAns += w; answered++;
      if (isCorrect(q, a)) ptsCor += w;
    });
    var n = state.questions.length;
    return {
      score: ptsAns ? Math.round(ptsCor / ptsAns * 100) : 0,
      answered: answered,
      total: n,
      completion: n ? Math.round(answered / n * 100) : 0
    };
  }

  function rankFor(stats) {
    var s = stats.score;
    var tier;
    if (s >= 90) tier = ["知识全图持有者", "你的疆域几乎覆盖了人类知识的每一处星域——在多数领域都能与专业人士对话。"];
    else if (s >= 80) tier = ["知识灯塔", "多领域的深度令人望尘莫及，通识之光足以照亮一整片星图。"];
    else if (s >= 65) tier = ["博学多识者", "广度与深度兼备，距知识灯塔仅一步之遥。"];
    else if (s >= 50) tier = ["通识学习者", "知识面基础扎实，仍有多片疆域等待你去开拓。"];
    else if (s >= 30) tier = ["常识探索者", "常识在线，但许多领域你才刚刚踏入边境。"];
    else tier = ["知识萌芽者", "每一道题都是一颗种子，探索才刚刚开始。"];
    return { name: tier[0], desc: tier[1] };
  }

  return {
    init: init,
    startNew: startNew,
    current: current,
    answeredCount: answeredCount,
    isAnswered: isAnswered,
    getAnswer: getAnswer,
    finished: finished,
    total: total,
    answer: answer,
    forgive: forgive,
    forgiveLeft: function () { return state.forgiveLeft; },
    isCorrect: isCorrect,
    canPeek: canPeek,
    scoreMargin: scoreMargin,
    next: next,
    prev: prev,
    allDomainStats: allDomainStats,
    overallStats: overallStats,
    rankFor: rankFor,
    _state: state
  };
})();
