// results.js · 结果页渲染 + 18 轴雷达图（Canvas 手绘，零依赖）+ 下载/分享
// 依赖：domains.js, quiz.js, ui.js
window.KBResults = (function () {
  var $ = document.querySelector.bind(document);

  // 各领域「参考平均分」（作为虚线基准），id 顺序与 KNOWLEDGE_DOMAINS 无关，按名称映射
  var REFERENCE = {
    math: 85, natural: 85, tech: 83, medicine: 75, history: 80, geocult: 73,
    polilaw: 77, military: 70, econ: 70, education: 75, psychsoc: 70, philrel: 73,
    langlit: 78, art: 68, popcult: 73, sports: 73, lifestyle: 72, media: 80
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

    var dpr = 2, W = 960, H = 1280;
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

    // 总分
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#e8edf8";
    ctx.font = "700 118px 'PingFang SC','Microsoft YaHei',sans-serif";
    ctx.fillText(stats.score + "%", W / 2, 216);
    ctx.fillStyle = "#93a2c0";
    ctx.font = "20px 'PingFang SC','Microsoft YaHei',sans-serif";
    ctx.fillText("加权正确率 · 综合等级「" + rank.name + "」", W / 2, 256);
    ctx.fillStyle = diff >= 0 ? "#34d399" : "#fb7185";
    ctx.fillText("平均参考 " + avg.toFixed(1) + "% · 你" + cmp + " " + Math.abs(diff).toFixed(1) + " 分", W / 2, 290);

    // 雷达
    var rsize = 620, rdpr = 2;
    var rCanvas = document.createElement("canvas");
    rCanvas.width = rsize * rdpr; rCanvas.height = rsize * rdpr;
    var rctx = rCanvas.getContext("2d");
    rctx.scale(rdpr, rdpr);
    paintRadar(rctx, rsize);
    ctx.drawImage(rCanvas, (W - rsize) / 2, 320, rsize, rsize);

    // 底部项目链接
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
