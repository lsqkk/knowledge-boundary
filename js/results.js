// results.js · 结果页渲染 + 18 轴雷达图（Canvas 手绘，零依赖）+ 下载/分享
// 依赖：domains.js, quiz.js, ui.js
window.KBResults = (function () {
  var $ = document.querySelector.bind(document);

  // 各领域「参考平均分」（作为虚线基准），id 顺序与 KNOWLEDGE_DOMAINS 无关，按名称映射
  var REFERENCE = {
    math: 80, natural: 80, tech: 78, medicine: 70, history: 75, geocult: 68,
    polilaw: 72, military: 65, econ: 65, education: 70, psychsoc: 65, philrel: 68,
    langlit: 73, art: 63, popcult: 68, sports: 68, lifestyle: 67, media: 75
  };

  var SITE_URL = "https://kn-bo.130923.xyz";
  var GH_URL = "github.com/lsqkk/knowledge-boundary";

  // 参考平均总分（按领域权重加权）
  function referenceOverall() {
    var sum = 0, wsum = 0;
    window.KNOWLEDGE_DOMAINS.forEach(function (d) {
      wsum += d.weight;
      sum += (REFERENCE[d.id] || 0) * d.weight;
    });
    return wsum ? sum / wsum : 0;
  }

  function render() {
    var stats = window.KBQuiz.overallStats();
    var rank = window.KBQuiz.rankFor(stats);

    $("#result-title").textContent = rank.name;
    $("#rank-name").textContent = rank.name;
    $("#score-desc").textContent = rank.desc;
    $("#score-answered").textContent = "已作答 " + stats.answered + " / " + stats.total + " · 覆盖 " + stats.completion + "%";

    // 平均参考对比
    var avg = referenceOverall();
    var diff = stats.score - avg;
    var cmp = diff >= 0 ? "高于" : "低于";
    $("#score-avg").textContent = "平均参考 " + avg.toFixed(1) + "% · 你" + cmp + " " + Math.abs(diff).toFixed(1) + " 分";

    // 环形分数
    var ring = $("#score-ring");
    var color = stats.score >= 80 ? "#34d399" : stats.score >= 50 ? "#fbbf24" : "#fb7185";
    ring.style.setProperty("--ring-color", color);
    ring.style.setProperty("--ring-pct", stats.score + "%");
    $("#score-num").textContent = stats.score + "%";

    // 分数浮动 ±（未答满时抽样方差所致）
    var margin = window.KBQuiz.scoreMargin();
    var marginEl = $("#score-margin");
    if (margin >= 0.2) {
      marginEl.hidden = false;
      marginEl.textContent = "±" + margin.toFixed(1);
    } else {
      marginEl.hidden = true;
    }

    drawRadar();
    renderRankList();
    fitRankPanel();

    // 未完成时提供「继续作答」返回当前进度
    var continueBtn = $("#btn-continue");
    var finished = window.KBQuiz.finished();
    continueBtn.hidden = finished;
    continueBtn.onclick = function () { window.KBApp.onContinue(); };
  }

  // 宽屏下让右侧「疆域明细」与左侧雷达等高、内部滚动，避免左侧留白
  function fitRankPanel() {
    var radarPanel = document.querySelector(".radar-panel");
    var rankPanel = document.querySelector(".domain-rank");
    if (!radarPanel || !rankPanel) return;
    if (window.matchMedia("(min-width: 1024px)").matches) {
      rankPanel.style.maxHeight = radarPanel.offsetHeight + "px";
      rankPanel.style.overflowY = "auto";
    } else {
      rankPanel.style.maxHeight = "";
      rankPanel.style.overflowY = "";
    }
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

  /* ---------------- 雷达图（可复用，size 为逻辑边长） ---------------- */
  function paintRadar(ctx, size) {
    var cx = size / 2, cy = size / 2;
    var R = size / 2 - 58;
    var domains = window.KNOWLEDGE_DOMAINS;
    var stats = window.KBQuiz.allDomainStats();
    var N = domains.length;
    var labelR = R + 30;
    var fs = size / 560; // 字体缩放

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

    // 参考平均虚线（在各轴取 REFERENCE 值）
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    for (var a = 0; a <= N; a++) {
      var av = REFERENCE[domains[a % N].id] || 0;
      var ap = pt(a % N, R * av / 100);
      a === 0 ? ctx.moveTo(ap.x, ap.y) : ctx.lineTo(ap.x, ap.y);
    }
    ctx.closePath();
    ctx.strokeStyle = "rgba(148,163,184,0.8)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.setLineDash([]);

    // 顶点（样本不足的为空心）
    pts.forEach(function (p) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
      if (p.stat.confident) { ctx.fillStyle = domains[p.idx].color; ctx.fill(); }
      else { ctx.strokeStyle = domains[p.idx].color; ctx.lineWidth = 1.5; ctx.stroke(); }
    });

    // 标签
    ctx.font = "600 " + Math.round(13 * fs) + "px 'PingFang SC','Microsoft YaHei',sans-serif";
    for (var m = 0; m < N; m++) {
      var lp = pt(m, labelR);
      var an = angle(m);
      ctx.textAlign = Math.cos(an) > 0.25 ? "left" : (Math.cos(an) < -0.25 ? "right" : "center");
      ctx.textBaseline = "middle";
      var label = domains[m].name.slice(0, 2);
      if (!stats[m].confident) label += "·";
      ctx.fillStyle = stats[m].confident ? "rgba(232,237,248,0.85)" : "rgba(147,162,192,0.6)";
      ctx.fillText(label, lp.x, lp.y);
    }

    // 底部说明
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = Math.round(11 * fs) + "px 'PingFang SC','Microsoft YaHei',sans-serif";
    ctx.fillStyle = "rgba(92,107,143,0.7)";
    ctx.fillText("虚线点 = 样本不足", cx, cy + R + 42 * fs);
    ctx.fillText("— 虚线 = 参考平均", cx, cy + R + 58 * fs);
  }

  // 可见雷达图（DPR 高清，比例交给 CSS aspect-ratio，不变形）
  function drawRadar() {
    var canvas = $("#radar");
    var dpr = window.devicePixelRatio || 1;
    var S = 560;
    canvas.width = S * dpr;
    canvas.height = S * dpr;
    var ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, S, S);
    paintRadar(ctx, S);
  }

  /* ---------------- 下载 / 分享 ---------------- */
  function buildShareCard() {
    var stats = window.KBQuiz.overallStats();
    var rank = window.KBQuiz.rankFor(stats);
    var avg = referenceOverall();
    var diff = stats.score - avg;
    var cmp = diff >= 0 ? "高于" : "低于";
    var margin = window.KBQuiz.scoreMargin();

    var dpr = 2, W = 960, H = 1720;
    var canvas = document.createElement("canvas");
    canvas.width = W * dpr; canvas.height = H * dpr;
    var ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);

    // 背景
    var bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#0a0f1f");
    bg.addColorStop(1, "#0d1326");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // 标题
    ctx.textAlign = "center";
    ctx.fillStyle = "#7dd3fc";
    ctx.font = "600 26px 'PingFang SC','Microsoft YaHei',sans-serif";
    ctx.fillText("知识边界 · 你的知识星图", W / 2, 84);

    // 总分 + 浮动
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#e8edf8";
    ctx.font = "700 108px 'PingFang SC','Microsoft YaHei',sans-serif";
    ctx.fillText(stats.score + "%", W / 2 - 40, 208);
    if (margin >= 0.2) {
      ctx.fillStyle = "#93a2c0";
      ctx.font = "500 28px 'PingFang SC','Microsoft YaHei',sans-serif";
      ctx.textAlign = "left";
      ctx.fillText("±" + margin.toFixed(1), W / 2 + 46, 196);
      ctx.textAlign = "center";
    }
    ctx.fillStyle = "#93a2c0";
    ctx.font = "20px 'PingFang SC','Microsoft YaHei',sans-serif";
    ctx.fillText("加权正确率 · 综合等级「" + rank.name + "」", W / 2, 248);
    ctx.fillStyle = diff >= 0 ? "#34d399" : "#fb7185";
    ctx.fillText("平均参考 " + avg.toFixed(1) + "% · 你" + cmp + " " + Math.abs(diff).toFixed(1) + " 分", W / 2, 282);

    // 雷达
    var rsize = 540, rdpr = 2;
    var rCanvas = document.createElement("canvas");
    rCanvas.width = rsize * rdpr; rCanvas.height = rsize * rdpr;
    var rctx = rCanvas.getContext("2d");
    rctx.scale(rdpr, rdpr);
    paintRadar(rctx, rsize);
    ctx.drawImage(rCanvas, (W - rsize) / 2, 318, rsize, rsize);

    // 分隔线
    ctx.strokeStyle = "rgba(148,163,184,0.25)";
    ctx.beginPath(); ctx.moveTo(70, 902); ctx.lineTo(W - 70, 902); ctx.stroke();

    // 疆域明细
    ctx.fillStyle = "#7dd3fc";
    ctx.font = "600 22px 'PingFang SC','Microsoft YaHei',sans-serif";
    ctx.fillText("疆域明细 · 各领域掌握度", W / 2, 952);

    var domainStats = window.KBQuiz.allDomainStats();
    var rowStart = 1000, step = 56;
    for (var i = 0; i < domainStats.length; i++) {
      var col = i < 9 ? 0 : 1;
      var r = i % 9;
      var y = rowStart + r * step;
      var d = window.KNOWLEDGE_DOMAINS[i];
      var s = domainStats[i];
      var val = s.score == null ? 0 : s.score;
      var xName = col === 0 ? 120 : 545;
      var xBar = col === 0 ? 250 : 675;
      var xScore = col === 0 ? 438 : 863;
      // 名称
      ctx.textAlign = "left";
      ctx.fillStyle = "#c9d4ee";
      ctx.font = "18px 'PingFang SC','Microsoft YaHei',sans-serif";
      ctx.fillText(d.name, xName, y);
      // 迷你条
      ctx.fillStyle = "rgba(148,163,184,0.18)";
      ctx.fillRect(xBar, y - 10, 160, 7);
      ctx.fillStyle = d.color;
      ctx.fillRect(xBar, y - 10, Math.max(2, 160 * val / 100), 7);
      // 分数（>=均分绿，<均分红）
      ctx.textAlign = "right";
      ctx.fillStyle = val >= REFERENCE[d.id] ? "#34d399" : "#fb7185";
      ctx.font = "700 19px 'PingFang SC','Microsoft YaHei',sans-serif";
      ctx.fillText(s.score == null ? "—" : val + "%", xScore, y);
      // 平均参考小字
      ctx.fillStyle = "rgba(147,162,192,0.75)";
      ctx.font = "13px 'PingFang SC','Microsoft YaHei',sans-serif";
      ctx.fillText("均 " + REFERENCE[d.id], xBar, y + 18);
    }

    // 底部项目链接
    ctx.textAlign = "center";
    ctx.fillStyle = "#5c6b8f";
    ctx.font = "16px 'PingFang SC','Microsoft YaHei',sans-serif";
    ctx.fillText("知识边界 · Knowledge Boundary · 18 大领域 · 596 道题", W / 2, H - 78);
    ctx.fillText(SITE_URL + " · " + GH_URL, W / 2, H - 46);

    return canvas.toDataURL("image/png");
  }

  function downloadResult() {
    var url = buildShareCard();
    var a = document.createElement("a");
    a.href = url;
    a.download = "knowledge-boundary-result.png";
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.KBApp.toast("结果图已下载，图片里带了项目链接");
  }

  function shareResult() {
    var stats = window.KBQuiz.overallStats();
    var text = "我在「知识边界」知识面测试中得分 " + stats.score + "%！18 大领域 596 道题，测测你的知识边界 → " + SITE_URL;
    if (navigator.share) {
      navigator.share({ title: "知识边界 · 我的知识星图", text: text, url: SITE_URL }).catch(function () { /* 用户取消 */ });
    } else if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () { window.KBApp.toast("结果文案已复制，去粘贴分享吧"); },
        function () { window.KBApp.toast("复制失败，请长按手动复制"); }
      );
    } else {
      window.KBApp.toast("你的浏览器不支持分享");
    }
  }

  return {
    render: render, drawRadar: drawRadar,
    downloadResult: downloadResult, shareResult: shareResult,
    buildShareCard: buildShareCard, referenceOverall: referenceOverall
  };
})();
