// audit.js · 题目质量审计
// 输出：长度失衡题（|正确项长度 − 其他项平均长度| > 1）数量与清单；各文件 easy 题数
// 用法：node scripts/audit.js
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "..");
global.window = {};

function len(s) { return Array.from(s || "").length; } // 按 Unicode 码点计长

eval(fs.readFileSync(path.join(ROOT, "js/domains.js"), "utf8"));

let total = 0, imbalancedTotal = 0;
const allImbalanced = [];

window.KNOWLEDGE_DOMAINS.forEach((d) => {
  eval(fs.readFileSync(path.join(ROOT, "data/questions", d.id + ".js"), "utf8"));
  const arr = window["QUESTIONS_" + d.id.toUpperCase()];
  let im = [];
  arr.forEach((q) => {
    const correct = len(q.options[q.answer]);
    const others = q.options.filter((_, i) => i !== q.answer).map(len);
    const avgOthers = others.reduce((a, b) => a + b, 0) / others.length;
    const diff = Math.abs(correct - avgOthers);
    if (diff > 1) im.push({ id: q.id, correct, avg: +avgOthers.toFixed(1), diff: +diff.toFixed(1) });
  });
  imbalancedTotal += im.length;
  total += arr.length;
  const easy = arr.filter((q) => q.difficulty === "easy").length;
  console.log(d.id.padEnd(10) + " n=" + String(arr.length).padEnd(3) + " easy=" + String(easy).padEnd(3) + " 长度失衡=" + im.length);
  im.forEach((x) => allImbalanced.push({ file: d.id, ...x }));
});

console.log("\n===== 汇总 =====");
console.log("总题数 " + total + "，长度失衡题总数 " + imbalancedTotal + "（占比 " + (imbalancedTotal / total * 100).toFixed(1) + "%），目标保留 " + Math.ceil(imbalancedTotal / 4) + " 题");
console.log("\n按文件长度失衡清单（id | 正确项长 | 其他平均 | 差值）：");
allImbalanced.forEach((x) => console.log("  " + x.file + "  " + x.id + "  正确=" + x.correct + "  其他均=" + x.avg + "  差=" + x.diff));
