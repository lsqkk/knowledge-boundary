// loader.js · 汇总各领域题库并做基本结构校验
window.ALL_QUESTIONS = [];
window.LOAD_ISSUES = [];

(function () {
  var seen = {};
  (window.KNOWLEDGE_DOMAINS || []).forEach(function (d) {
    var arr = window["QUESTIONS_" + d.id.toUpperCase()] || [];
    if (!arr.length) window.LOAD_ISSUES.push("缺少题库文件: " + d.id);
    arr.forEach(function (q) {
      if (!q || !q.id) return;
      if (seen[q.id]) { window.LOAD_ISSUES.push("重复题目 id: " + q.id); return; }
      seen[q.id] = true;
      var ok = !!q.category && !!q.subdomain &&
        Array.isArray(q.options) && q.options.length === 4 &&
        Number.isInteger(q.answer) && q.answer >= 0 && q.answer <= 3 &&
        !!q.question && !!q.explanation &&
        (q.difficulty === "easy" || q.difficulty === "medium" || q.difficulty === "hard");
      if (!ok) window.LOAD_ISSUES.push("结构错误: " + q.id);
      window.ALL_QUESTIONS.push(q);
    });
  });
  // 稳定排序，便于核对
  window.ALL_QUESTIONS.sort(function (a, b) { return a.id.localeCompare(b.id); });
})();
