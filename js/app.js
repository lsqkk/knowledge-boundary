// app.js · 入口：初始化、视图路由、键盘交互、星空背景
window.KBApp = (function () {
  function $(sel) { return document.querySelector(sel); }

  // 让页面里所有「领域数 / 题数」文案从数据派生，避免硬编码与题库脱节
  function syncCounters() {
    var total = window.TOTAL_WEIGHT || 0;
    var n = (window.KNOWLEDGE_DOMAINS || []).length;
    if (!total) return;
    var kicker = document.querySelector(".hero-kicker");
    if (kicker) kicker.textContent = n + " 大领域 · " + total + " 道题 · 探测你的知识疆域";
    var footer = document.querySelector(".footer p");
    if (footer) footer.textContent = "知识边界 · 一项以 " + total + " 道题丈量通识疆域的实验 — 题目数据保存在本机浏览器。";
    var meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "探测你的知识面边界：" + total + " 道题，覆盖 " + n + " 大知识领域，从天文地理到二次元与烘焙。");
  }

  function init() {
    window.KBQuiz.init();
    syncCounters();
    bindStarfield();
    bindBrandNav();
    bindKeyboard();

    // 题库缺失提示
    if (window.LOAD_ISSUES && window.LOAD_ISSUES.length) {
      console.warn("题库加载问题：", window.LOAD_ISSUES);
    }

    window.KBUI.updateProgressChip();
    window.KBUI.renderHome();
  }

  /* ---------------- 视图路由 ---------------- */
  function startQuiz() {
    window.KBUI.showView("quiz");
    window.KBUI.updateProgressChip();
    window.KBUI.renderQuiz();
  }
  function showResults() {
    window.KBUI.showView("results");
    window.KBResults.render();
  }

  function onStart() {
    var answered = window.KBQuiz.answeredCount();
    var finished = window.KBQuiz.finished();
    var total = window.KBQuiz.total();
    if (answered === 0) {
      window.KBQuiz.startNew();
      startQuiz();
    } else if (finished && answered >= total) {
      showResults();
    } else {
      if (window.confirm("已有答题进度，重新开始将清空当前进度，确定吗？")) {
        window.KBQuiz.startNew();
        startQuiz();
      }
    }
  }
  function onResume() { startQuiz(); }
  function onHome() {
    window.KBUI.showView("home");
    window.KBUI.renderHome();
  }

  var autoTimer = null;
  var toastTimer = null;

  // 轻提示
  function toast(msg) {
    var t = $("#toast");
    t.textContent = msg;
    t.hidden = false;
    window.clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 2600);
  }

  function scheduleNext() {
    window.clearTimeout(autoTimer);
    autoTimer = setTimeout(function () { autoTimer = null; onNext(); }, 500);
  }

  function onAnswer(choice) {
    var q = window.KBQuiz.current();
    if (!q || window.KBQuiz.isAnswered(q.id)) return; // 初次作答后不可修改
    window.KBQuiz.answer(q.id, choice);
    var correct = window.KBQuiz.isCorrect(q, window.KBQuiz.getAnswer(q.id));
    window.KBUI.renderQuiz();
    if (correct) scheduleNext(); // 答对直接进入下一题
  }
  function onForgive() {
    var q = window.KBQuiz.current();
    if (!q || !window.KBQuiz.forgive(q.id)) return;
    window.KBUI.renderQuiz();
    scheduleNext(); // 改判为会后视同答对，直接进入下一题
  }
  function onNext() {
    window.clearTimeout(autoTimer); autoTimer = null;
    if (!window.KBQuiz.current()) return;
    window.KBQuiz.next() ? startQuiz() : showResults();
  }
  function onPrev() {
    window.clearTimeout(autoTimer); autoTimer = null;
    if (window.KBQuiz.prev()) window.KBUI.renderQuiz();
  }
  function onContinue() { startQuiz(); }

  function onPeek() {
    if (window.KBQuiz.canPeek() && !window.KBQuiz.finished()) showResults();
    else toast("继续作答，答满 100 题后可随时查看当前结果");
  }

  function onReset() {
    if (window.confirm("确定清空全部进度并重新开始吗？此操作不可撤销。")) {
      window.KBStorage.clear();
      window.location.reload();
    }
  }

  /* ---------------- 顶栏 brand 导航 ---------------- */
  function bindBrandNav() {
    document.querySelectorAll("[data-nav]").forEach(function (a) {
      a.addEventListener("click", function (e) {
        e.preventDefault();
        if (window.KBApp.onHome) window.KBApp.onHome();
      });
    });
  }

  /* ---------------- 键盘 ---------------- */
  function bindKeyboard() {
    document.addEventListener("keydown", function (e) {
      var quizVisible = !$("#view-quiz").hidden;
      var q = quizVisible ? window.KBQuiz.current() : null;
      // 单字符守卫：排除 ArrowRight/Backspace/CapsLock 等多字符键名误命中
      if (quizVisible && q && !window.KBQuiz.isAnswered(q.id) && e.key.length === 1) {
        var key = e.key;
        var idx = -1;
        if (key >= "1" && key <= "4") idx = +key - 1;
        else if (key >= "A" && key <= "D") idx = key.charCodeAt(0) - 65;
        else if (key >= "a" && key <= "d") idx = key.charCodeAt(0) - 97;
        if (idx >= 0 && idx < 4) { e.preventDefault(); window.KBApp.onAnswer(idx); return; }
      }
      if (quizVisible && window.KBQuiz.isAnswered(q ? q.id : "")) {
        if (e.key === "Enter") { e.preventDefault(); window.KBApp.onNext(); }
      }
      if (quizVisible) {
        if (e.key === "ArrowRight") { e.preventDefault(); window.KBApp.onNext(); }
        if (e.key === "ArrowLeft") { e.preventDefault(); window.KBApp.onPrev(); }
      }
    });
  }

  /* ---------------- 星空背景 ---------------- */
  function bindStarfield() {
    var canvas = $("#starfield");
    if (!canvas || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      drawStaticStars(canvas);
      return;
    }
    var ctx = canvas.getContext("2d");
    var stars = [];
    var W, H;

    function resize() {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
      stars = [];
      var n = Math.min(260, Math.floor(W * H / 6000));
      for (var i = 0; i < n; i++) {
        stars.push({
          x: Math.random() * W, y: Math.random() * H,
          r: Math.random() * 1.3 + 0.2,
          base: Math.random() * Math.PI * 2,
          speed: 0.008 + Math.random() * 0.02,
          maxA: 0.25 + Math.random() * 0.65
        });
      }
    }
    resize();
    window.addEventListener("resize", resize);

    var raf;
    function tick(t) {
      ctx.clearRect(0, 0, W, H);
      stars.forEach(function (s) {
        var a = (Math.sin(t * s.speed + s.base) + 1) / 2 * s.maxA;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(226,232,255," + a + ")";
        ctx.fill();
      });
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
  }

  function drawStaticStars(canvas) {
    if (!canvas) return;
    var ctx = canvas.getContext("2d");
    var W = canvas.width = window.innerWidth;
    var H = canvas.height = window.innerHeight;
    var n = Math.min(160, Math.floor(W * H / 9000));
    for (var i = 0; i < n; i++) {
      ctx.beginPath();
      ctx.arc(Math.random() * W, Math.random() * H, Math.random() * 1.1 + 0.2, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(226,232,255,0.35)";
      ctx.fill();
    }
  }

  /* ---------------- 按钮绑定（结果页） ---------------- */
  function bindResultsButtons() {
    $("#btn-download").onclick = function () { window.KBResults.downloadResult(); };
    $("#btn-share").onclick = function () { window.KBResults.shareResult(); };
    $("#btn-home").onclick = function () { window.KBApp.onHome(); };
    $("#btn-reset").onclick = function () { window.KBApp.onReset(); };
  }

  document.addEventListener("DOMContentLoaded", function () {
    bindResultsButtons();
    init();
  });

  return {
    init: init, onStart: onStart, onResume: onResume, onHome: onHome,
    onAnswer: onAnswer, onForgive: onForgive, onNext: onNext, onPrev: onPrev, onContinue: onContinue, onPeek: onPeek,
    onReset: onReset, showResults: showResults,
    toast: toast
  };
})();
