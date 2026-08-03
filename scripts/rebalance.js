// rebalance.js · 答案位置均衡
// 用途：把每道题正确选项的位置（answer 索引）重新均衡到 0/1/2/3 约各占 25%。
// 方法：仅交换 options 中正确项与目标位项并更新 answer，不改变任何题目内容与顺序。
// 用法：node scripts/rebalance.js
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
global.window = {};

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 全局均衡：先给每个文件每索引 floor(n/4)，再把各文件的余数按全局轮转分配，
// 保证「每个索引」在全局拿到恰好等量的余数份额（全库精确 25%）。
function computeTargets(sizes) {
  // sizes: 每文件题目数
  const per = sizes.map((n) => Math.floor(n / 4));
  const targets = per.map((p) => [p, p, p, p]);
  let rot = 0; // 全局轮转位
  sizes.forEach((n, fi) => {
    const rem = n - per[fi] * 4;
    for (let k = 0; k < rem; k++) {
      targets[fi][rot % 4]++;
      rot++;
    }
  });
  return targets;
}

function rebalanceArray(arr, target) {
  let list = [];
  target.forEach((c, i) => { for (let k = 0; k < c; k++) list.push(i); });
  list = shuffle(list);
  arr.forEach((q, i) => {
    const t = list[i];
    if (q.answer === t) return;
    // 交换正确项与目标位项，并更新 answer
    const tmp = q.options[q.answer];
    q.options[q.answer] = q.options[t];
    q.options[t] = tmp;
    q.answer = t;
  });
}

function main() {
  eval(fs.readFileSync(path.join(ROOT, "js/domains.js"), "utf8"));
  const domains = window.KNOWLEDGE_DOMAINS;
  const sizes = domains.map((d) => d.weight);
  const allTargets = computeTargets(sizes);

  let global = [0, 0, 0, 0], total = 0;

  domains.forEach((d, fi) => {
    const file = path.join(ROOT, "data/questions", d.id + ".js");
    let code = fs.readFileSync(file, "utf8");
    const marker = code.indexOf("window.QUESTIONS_");
    const header = marker > 0 ? code.slice(0, marker).replace(/\s+$/, "") + "\n" : "";

    global.window = {}; // 重新构造 window 以免跨文件污染
    eval(code);
    const arr = window["QUESTIONS_" + d.id.toUpperCase()];
    rebalanceArray(arr, allTargets[fi]);
    arr.forEach((q) => { global[q.answer]++; total++; });

    fs.writeFileSync(file, header + "window.QUESTIONS_" + d.id.toUpperCase() + " = " + JSON.stringify(arr, null, 2) + ";\n");
    const c = [0, 0, 0, 0];
    arr.forEach((q) => c[q.answer]++);
    console.log(d.id.padEnd(10) + c.join("/") + "  目标 " + allTargets[fi].join("/"));
  });

  console.log("---- 全库 ----");
  console.log("total=" + total + " 分布 0:" + global[0] + " 1:" + global[1] + " 2:" + global[2] + " 3:" + global[3]);
  const ideal = total / 4;
  const ok = global.every((c) => Math.abs(c - ideal) <= 1);
  console.log(ok ? "✅ 全库答案位置已精确均衡" : "⚠️ 仍有偏差");
}

main();
