// results.js · 结果页渲染 + 18 轴雷达图（Canvas 手绘，零依赖）
// 依赖：domains.js, quiz.js, ui.js
window.KBResults = (function () {
  var $ = document.querySelector.bind(document);

  function render() {
    var stats = window.KBQuiz.overallStats();
    var rank = window.KBQuiz.rankFor(stats);

    $("#result-title").textContent = rank.name;
    $("#rank-name").textContent = rank.name;
    $("#score-desc").textContent = rank.desc;
    $("#score-answered").textContent = "已作答 " + stats.answered + " / " + stats.total + " · 覆盖 " + stats.completion + "%";

    // 环形分数
    var ring = $("#score-ring");
    var color = stats.score >= 80 ? "#34d399" : stats.score >= 50 ? "#fbbf24" : "#fb7185";
    ring.style.setProperty("--ring-color", color);
    ring.style.setProperty("--ring-pct", stats.score + "%");
    $("#score-num").textContent = stats.score + "%";

    drawRadar();
    renderRankList();

    // 未完成时提供「继续作答」返回当前进度
    var continueBtn = $("#btn-continue");
    var finished = window.KBQuiz.finished();
    continueBtn.hidden = finished;
    continueBtn.onclick = function () { window.KBApp.onContinue(); };
  }

  /* ---------------- 领域排名列表 ---------------- */
  function renderRankList() {
    var list = $("#rank-list");
    list.innerHTML = "";
    var stats = window.KBQuiz.allDomainStats()
      .map(function (s, i) { s.domain = window.KNOWLEDGE_DOMAINS[i]; return s; })
      .sort(function (a, b) {
        if (a.score == null && b.score == null) return 0;
        if (a.score == null) return 1;
        if (b.score == null) return -1;
        return b.score - a.score;
      });

    stats.forEach(function (s, idx) {
      var dom = s.domain;
      var row = window.KBUI.el("div", { class: "rank-row" + (s.confident ? "" : " low") }, [
        window.KBUI.el("span", { class: "rank-idx" }, String(idx + 1).padStart(2, "0")),
        window.KBUI.el("div", { class: "rank-main" }, [
          window.KBUI.el("div", { class: "rank-name" }, [
            window.KBUI.el("span", { class: "ic", html: '<i class="' + dom.icon + '" aria-hidden="true"></i>' }),
            document.createTextNode(dom.name + " "),
            s.confident ? null : window.KBUI.el("small", null, "样本不足")
          ]),
          window.KBUI.el("div", { class: "rank-bar" }, [
            window.KBUI.el("i", { style: "width:" + (s.score || 0) + "%;--row-color:" + dom.color })
          ])
        ]),
        s.score == null
          ? window.KBUI.el("span", { class: "rank-num low", html: "—<small>未作答</small>" })
          : window.KBUI.el("span", { class: "rank-num" + (s.confident ? "" : " low"), html: s.score + "<small>%</small>" })
      ]);
      list.appendChild(row);
    });

    // 图例
    var legend = $("#radar-legend");
    legend.innerHTML = "";
    window.KNOWLEDGE_DOMAINS.forEach(function (d) {
      legend.appendChild(window.KBUI.el("span", { class: "legend-item" }, [
        window.KBUI.el("span", { class: "legend-swatch", style: "background:" + d.color }),
        document.createTextNode(d.name)
      ]));
    });
  }

  /* ---------------- 雷达图 ---------------- */
  function drawRadar() {
    var canvas = $("#radar");
    var dpr = window.devicePixelRatio || 1;
    var W = 560, H = 560; // 逻辑坐标系
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    var ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, W, H);

    var cx = W / 2, cy = H / 2;
    var R = Math.min(W, H) / 2 - 58;
    var domains = window.KNOWLEDGE_DOMAINS;
    var stats = window.KBQuiz.allDomainStats();
    var N = domains.length;
    var labelR = R + 30;

    function angle(i) { return -Math.PI / 2 + i * 2 * Math.PI / N; }
    function pt(i, r) { return { x: cx + r * Math.cos(angle(i)), y: cy + r * Math.sin(angle(i)) }; }

    // 网格环 25/50/75/100
    [25, 50, 75, 100].forEach(function (p) {
      var r = R * p / 100;
      ctx.beginPath();
      for (var i = 0; i <= N; i++) {
        var pnt = pt(i % N, r);
        i === 0 ? ctx.moveTo(pnt.x, pnt.y) : ctx.lineTo(pnt.x, pnt.y);
      }
      ctx.closePath();
      ctx.strokeStyle = "rgba(148,163,184,0.10)";
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // 轴线
    for (var j = 0; j < N; j++) {
      var p0 = pt(j, R);
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(p0.x, p0.y);
      ctx.strokeStyle = "rgba(148,163,184,0.08)";
      ctx.stroke();
    }

    // 数据多边形
    var pts = [];
    for (var k = 0; k < N; k++) {
      var val = stats[k].score == null ? 0 : stats[k].score;
      pts.push({ x: pt(k, R * val / 100).x, y: pt(k, R * val / 100).y, stat: stats[k], idx: k });
    }
    ctx.beginPath();
    pts.forEach(function (p, i) { i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y); });
    ctx.closePath();
    var grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
    grad.addColorStop(0, "rgba(56,189,248,0.35)");
    grad.addColorStop(1, "rgba(167,139,250,0.18)");
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = "rgba(125,211,252,0.85)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // 顶点（样本不足的为空心）
    pts.forEach(function (p) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
      if (p.stat.confident) { ctx.fillStyle = domains[p.idx].color; ctx.fill(); }
      else { ctx.strokeStyle = domains[p.idx].color; ctx.lineWidth = 1.5; ctx.stroke(); }
    });

    // 标签
    ctx.font = "600 13px 'PingFang SC','Microsoft YaHei',sans-serif";
    for (var m = 0; m < N; m++) {
      var lp = pt(m, labelR);
      var a = angle(m);
      ctx.textAlign = Math.cos(a) > 0.25 ? "left" : (Math.cos(a) < -0.25 ? "right" : "center");
      ctx.textBaseline = "middle";
      var label = domains[m].name.slice(0, 2);
      if (!stats[m].confident) label += "·";
      ctx.fillStyle = stats[m].confident ? "rgba(232,237,248,0.85)" : "rgba(147,162,192,0.6)";
      ctx.fillText(label, lp.x, lp.y);
    }

    // 中心「样本不足」说明
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(92,107,143,0.7)";
    ctx.font = "11px 'PingFang SC','Microsoft YaHei',sans-serif";
    ctx.fillText("虚线点 = 样本不足", cx, cy + R + 42);
  }

  return { render: render, drawRadar: drawRadar };
})();
