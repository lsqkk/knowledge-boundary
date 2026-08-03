// ui.js · 视图渲染：首页、答题页、顶栏
// 依赖：domains.js, quiz.js；交互回调统一走 KBApp
window.KBUI = (function () {
  function $(sel) { return document.querySelector(sel); }

  function el(tag, attrs, children) {
    var n = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v == null) return;
        if (k === "class") n.className = v;
        else if (k === "html") n.innerHTML = v;
        else if (k === "onclick") n.addEventListener("click", v);
        else if (k === "hidden") n.hidden = !!v;
        else n.setAttribute(k, v);
      });
    }
    var kids = children == null ? [] : (Array.isArray(children) ? children : [children]);
    kids.forEach(function (c) {
      if (c == null) return;
      n.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return n;
  }

  var VIEWS = ["home", "quiz", "results"];
  function showView(name) {
    VIEWS.forEach(function (v) { $("#view-" + v).hidden = (v !== name); });
    window.scrollTo(0, 0);
  }

  /* ---------------- 顶栏进度（按当前这轮作答长度） ---------------- */
  function updateProgressChip() {
    var st = window.KBQuiz._state;
    var runAnswered = st.order.filter(function (id) { return !!st.answers[id]; }).length;
    var chip = $("#topbar-progress");
    chip.hidden = runAnswered === 0;
    $("#chip-text").textContent = runAnswered + " / " + st.order.length;
  }

  /* ---------------- 首页 ---------------- */
  function renderHome() {
    var grid = $("#domain-grid");
    grid.innerHTML = "";
    (window.KNOWLEDGE_DOMAINS || []).forEach(function (d) {
      var answered = answeredIn(d.id);
      var pct = d.weight ? Math.round(answered / d.weight * 100) : 0;
      var card = el("div", { class: "domain-card", style: "--card-accent:" + d.color + ";--card-glow:" + hexA(d.color, 0.35) },
        [
          el("div", { class: "dc-top" }, [
            el("span", { class: "dc-icon", html: '<i class="' + d.icon + '" aria-hidden="true"></i>' }),
            el("span", { class: "dc-name" }, d.name)
          ]),
          el("div", { class: "dc-meta" }, [
            el("span", null, "权重 " + d.weight + " 题"),
            el("span", null, answered > 0 ? "已答 " + answered : "未探索")
          ]),
          el("div", { class: "dc-bar" }, [el("i", { style: "width:" + pct + "%" })]),
          el("div", { class: "dc-done", html: pct >= 100 ? '<i class="fa-solid fa-check" aria-hidden="true"></i> 已探索完' : (answered > 0 ? "探索中…" : "点击开始后随机遇到") })
        ]
      );
      grid.appendChild(card);
    });

    // 开始 / 继续按钮
    var answered = window.KBQuiz.answeredCount();
    var finished = window.KBQuiz.finished();
    var total = window.KBQuiz.total();
    var btnStart = $("#btn-start"), btnResume = $("#btn-resume"), note = $("#resume-note");

    if (answered === 0) {
      btnStart.textContent = "开始探索";
      btnStart.onclick = function () { window.KBApp.onStart(); };
      btnResume.hidden = true;
      note.hidden = true;
    } else if (finished) {
      // 到达本轮末尾（含重测子集结束）：一律给「查看结果」
      btnStart.textContent = "查看结果";
      btnStart.onclick = function () { window.KBApp.showResults(); };
      btnResume.hidden = true;
      note.hidden = false;
      note.textContent = answered >= total
        ? "已完成全部 " + total + " 题，进度已保存。"
        : "本轮已到末尾，已作答 " + answered + " / " + total + "（跳过的题计为未答）。";
    } else {
      btnStart.textContent = "重新开始";
      btnStart.onclick = function () { window.KBApp.onStart(); };
      btnResume.hidden = false;
      btnResume.onclick = function () { window.KBApp.onResume(); };
      note.hidden = false;
      note.textContent = "上次进行到第 " + (window.KBQuiz._state.pos + 1) + " 题 · 已作答 " + answered + " / " + total + " · 进度自动保存。";
    }

    // 答满 100 题后，首页也提供「查看当前结果」
    var peekHome = $("#btn-peek-home");
    var canPeek = window.KBQuiz.canPeek() && !finished;
    peekHome.hidden = !canPeek;
    peekHome.onclick = function () { window.KBApp.showResults(); };
  }

  function answeredIn(domainId) {
    var qs = window.ALL_QUESTIONS.filter(function (q) { return q.category === domainId; });
    return qs.filter(function (q) { return window.KBQuiz.isAnswered(q.id); }).length;
  }

  /* ---------------- 答题页 ---------------- */
  var DIFF_LABEL = { easy: "简单", medium: "中等", hard: "困难" };

  function renderQuiz() {
    var q = window.KBQuiz.current();
    if (!q) { window.KBApp.showResults(); return; }

    var dom = window.getDomain(q.category);
    var st = window.KBQuiz._state;
    var orderLen = st.order.length;
    var pos = st.pos;
    var runAnswered = st.order.filter(function (id) { return !!st.answers[id]; }).length;
    var runPct = orderLen ? Math.round(runAnswered / orderLen * 100) : 0;

    $("#quiz-count").textContent = "第 " + (pos + 1) + " / " + orderLen + " 题";
    $("#quiz-pct").textContent = runPct + "% 已探索";
    $("#quiz-progress-fill").style.width = runPct + "%";
    // 100 题里程碑刻度
    var tick = $("#progress-tick");
    if (tick) tick.style.left = (100 / window.KBQuiz.total() * 100) + "%";

    $("#q-domain").innerHTML = dom ? '<i class="' + dom.icon + '" aria-hidden="true"></i> ' + dom.name : q.category;
    $("#q-sub").textContent = q.subdomain;
    var diffEl = $("#q-diff");
    diffEl.textContent = DIFF_LABEL[q.difficulty] || q.difficulty;
    diffEl.className = "tag tag-diff tag-diff-" + q.difficulty;

    $("#q-text").textContent = q.question;

    // 选项
    var ans = window.KBQuiz.getAnswer(q.id);
    var box = $("#q-options");
    box.innerHTML = "";
    var keys = ["A", "B", "C", "D"];
    q.options.forEach(function (opt, i) {
      var cls = "opt";
      if (ans) {
        if (i === q.answer) cls += " is-correct";
        else if (i === ans.choice) cls += (ans.forgiven ? " is-forgiven" : " is-wrong");
        else cls += " is-dim";
      }
      var b = el("button", { class: cls, type: "button" }, [
        el("span", { class: "opt-key" }, keys[i]),
        el("span", { class: "opt-text" }, opt)
      ]);
      if (ans) b.disabled = true; // 初次作答后不可修改
      else b.addEventListener("click", function () { window.KBApp.onAnswer(i); });
      box.appendChild(b);
    });

    // 反馈
    var fb = $("#q-feedback"), fbText = $("#fb-text"), btnForgive = $("#btn-forgive");
    if (ans) {
      var right = window.KBQuiz.isCorrect(q, ans);
      var fbHead, fbIcon, fbCls;
      if (ans.forgiven) { fbHead = "已改判为正确"; fbIcon = "fa-check"; fbCls = "fb-head"; }
      else if (right) { fbHead = "回答正确"; fbIcon = "fa-check"; fbCls = "fb-head"; }
      else { fbHead = "回答错误"; fbIcon = "fa-xmark"; fbCls = "fb-head bad"; }
      fb.hidden = false;
      fbText.innerHTML = "";
      fbText.appendChild(el("span", { class: fbCls, html: '<i class="fa-solid ' + fbIcon + '" aria-hidden="true"></i> ' + fbHead }));
      fbText.appendChild(document.createTextNode(q.explanation || ""));
      $("#btn-skip").hidden = true;
      // 「我手滑了」：仅答错、未改判、且仍有剩余次数时出现
      if (!right && !ans.forgiven && window.KBQuiz.forgiveLeft() > 0) {
        btnForgive.hidden = false;
        $("#btn-forgive-text").textContent = "我手滑了，这题我确实会（剩 " + window.KBQuiz.forgiveLeft() + " 次）";
      } else {
        btnForgive.hidden = true;
      }
      var isLast = pos >= orderLen - 1;
      $("#btn-next").textContent = isLast ? "完成，查看结果 →" : "下一题 →";
    } else {
      fb.hidden = true;
      btnForgive.hidden = true;
      $("#btn-skip").hidden = false;
    }

    $("#btn-prev").disabled = pos === 0;
    $("#btn-prev").onclick = function () { window.KBApp.onPrev(); };
    $("#btn-next").onclick = function () { window.KBApp.onNext(); };
    $("#btn-skip").onclick = function () { window.KBApp.onNext(); };
    btnForgive.onclick = function () { window.KBApp.onForgive(); };
    // 答满 100 题后可随时查看结果；未达标时置灰，hover/点击提示
    var peek = $("#btn-peek");
    var canPeek = window.KBQuiz.canPeek() && !window.KBQuiz.finished();
    peek.classList.toggle("is-muted", !canPeek);
    peek.title = canPeek ? "" : "答满 100 题后即可查看当前结果";
    peek.onclick = function () { window.KBApp.onPeek(); };

    window.KBUI.updateProgressChip();
  }

  /* ---------------- 工具 ---------------- */
  function hexA(hex, a) {
    var h = hex.replace("#", "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
    return "rgba(" + r + "," + g + "," + b + "," + a + ")";
  }

  return {
    $: $, el: el, showView: showView,
    updateProgressChip: updateProgressChip,
    renderHome: renderHome,
    renderQuiz: renderQuiz,
    hexA: hexA
  };
})();
