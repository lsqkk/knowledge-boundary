// validate.js · 题目库质量校验（Node 运行）
// 用法：node scripts/validate.js
// 校验：各领域题量、id 连续唯一、细分名/题量匹配 domains.js、难度分布、选项结构
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
global.window = {};

function load(pathName) {
  const code = fs.readFileSync(path.join(ROOT, pathName), "utf8");
  eval(code);
}

function problems(label, list) {
  if (list.length) {
    console.log("  ✗ " + label + " (" + list.length + "):");
    list.slice(0, 25).forEach(function (p) { console.log("      - " + p); });
    if (list.length > 25) console.log("      … 另有 " + (list.length - 25) + " 条");
  } else {
    console.log("  ✓ " + label);
  }
}

function main() {
  // 加载领域与题库
  load("js/domains.js");
  const domains = window.KNOWLEDGE_DOMAINS;
  const files = fs.readdirSync(path.join(ROOT, "data/questions")).filter(function (f) {
    return /\.js$/.test(f) && f !== "loader.js";
  });
  files.forEach(function (f) { load(path.join("data/questions", f)); });

  let total = 0, all = [], issues = [];

  domains.forEach(function (d) {
    const arr = window["QUESTIONS_" + d.id.toUpperCase()] || [];
    const w = arr.length;
    total += w;

    // 题量
    if (w !== d.weight) issues.push(d.id + " 题量 " + w + " ≠ weight " + d.weight);

    // 难度分布（容忍 ±3）
    const diff = { easy: 0, medium: 0, hard: 0 };
    arr.forEach(function (q) { if (diff[q.difficulty] != null) diff[q.difficulty]++; });

    // 答案位置均衡：每索引应在 n/4 附近（容忍 ±1）
    const pos = [0, 0, 0, 0];
    arr.forEach(function (q) { pos[q.answer]++; });
    const posOk = pos.every(function (c) { return Math.abs(c - w / 4) <= 1; });
    if (!posOk) issues.push(d.id + " 答案位置不均衡: 0:" + pos[0] + " 1:" + pos[1] + " 2:" + pos[2] + " 3:" + pos[3] + "（n=" + w + "）");

    // 细分题量
    const sub = {};
    arr.forEach(function (q) { sub[q.subdomain] = (sub[q.subdomain] || 0) + 1; });
    d.subdomains.forEach(function (s) {
      if (sub[s.name] !== s.qty) issues.push(d.id + " 细分「" + s.name + "」题数 " + (sub[s.name] || 0) + " ≠ " + s.qty);
    });
    const validSubs = d.subdomains.map(function (s) { return s.name; });
    Object.keys(sub).forEach(function (k) {
      if (!validSubs.includes(k)) issues.push(d.id + " 未知细分名: " + k);
    });

    // id 连续性
    const ids = arr.map(function (q) { return q.id; });
    for (let i = 0; i < arr.length; i++) {
      const expect = d.id + "-" + String(i + 1).padStart(3, "0");
      if (ids[i] !== expect) { issues.push(d.id + " id 不连续: 期望 " + expect + " 实际 " + ids[i]); break; }
    }

    // 每道题结构
    arr.forEach(function (q) {
      const problemsHere = [];
      if (q.category !== d.id) problemsHere.push("category 错误");
      if (!validSubs.includes(q.subdomain)) problemsHere.push("subdomain 非法");
      if (!["easy", "medium", "hard"].includes(q.difficulty)) problemsHere.push("difficulty 非法");
      if (!Array.isArray(q.options) || q.options.length !== 4) problemsHere.push("options 非4项");
      if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer > 3) problemsHere.push("answer 非法");
      if (!q.question || !q.explanation) problemsHere.push("缺 question/explanation");
      if (!Array.isArray(q.options) || q.options.some(function (o) { return typeof o !== "string" || !o.trim(); })) problemsHere.push("存在空选项");
      if (problemsHere.length) issues.push(q.id + ": " + problemsHere.join("，"));
      all.push(q);
    });
  });

  // 全局唯一 id
  const seen = {};
  all.forEach(function (q) {
    if (seen[q.id]) issues.push("重复 id: " + q.id);
    seen[q.id] = true;
  });

  // 全局答案位置均衡
  const gpos = [0, 0, 0, 0];
  all.forEach(function (q) { gpos[q.answer]++; });
  const gOk = gpos.every(function (c) { return Math.abs(c - total / 4) <= 1; });
  if (!gOk) issues.push("全库答案位置不均衡: 0:" + gpos[0] + " 1:" + gpos[1] + " 2:" + gpos[2] + " 3:" + gpos[3] + "（total=" + total + "）");

  console.log("========== 知识边界 · 题库校验 ==========");
  console.log("期望总题数：" + domains.reduce(function (s, d) { return s + d.weight; }, 0));
  console.log("实际总题数：" + total);
  problems("题量与 id / 细分 / 结构问题", issues);

  // 难度分布概览
  const dsum = { easy: 0, medium: 0, hard: 0 };
  all.forEach(function (q) { dsum[q.difficulty]++; });
  console.log("全库难度分布：easy=" + dsum.easy + "(" + Math.round(dsum.easy / total * 100) + "%) medium=" + dsum.medium + "(" + Math.round(dsum.medium / total * 100) + "%) hard=" + dsum.hard + "(" + Math.round(dsum.hard / total * 100) + "%)");
  console.log("全库答案位置：0:" + gpos[0] + " 1:" + gpos[1] + " 2:" + gpos[2] + " 3:" + gpos[3] + "（各约 25%）");

  console.log("========================================");
  if (issues.length === 0 && total === domains.reduce(function (s, d) { return s + d.weight; }, 0)) {
    console.log("✅ PASS — 题库结构完整，共 " + total + " 题");
  } else {
    console.log("❌ FAIL — 存在 " + issues.length + " 个问题，请修正后重跑");
    process.exit(1);
  }
}

main();
