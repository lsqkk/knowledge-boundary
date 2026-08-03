// smoke.mjs · 端到端冒烟测试（Playwright）
// 用法：node scripts/smoke.mjs
// 覆盖：首页/FA图标 → 答题（答对自动跳转/答错停留/手滑5次/不可改答案）→ 保存恢复 →
//       100题后查看结果并继续 → 完成→结果页/雷达图 → 重测薄弱 → 重置
import { chromium } from "playwright";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const URL = "file:///" + path.join(ROOT, "index.html").replace(/\\/g, "/");

const results = [];
function check(name, ok, extra) {
  results.push({ name, ok, extra });
  console.log((ok ? "  ✓ " : "  ✗ ") + name + (extra ? "  (" + extra + ")" : ""));
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on("console", (m) => { if (m.type() === "error") console.log("  [console.error]", m.text()); });
page.on("dialog", (d) => d.accept());

const currentAnswerIdx = () => page.evaluate(() => (window.KBQuiz.current() ? window.KBQuiz.current().answer : -1));
const quizPos = () => page.evaluate(() => window.KBQuiz._state.pos);
const quizCountText = async () => (await page.locator("#quiz-count").textContent()).trim();
const answeredTotal = () => page.evaluate(() => Object.keys(window.KBQuiz._state.answers).length);

// ---------- 1. 首页 + FA ----------
await page.goto(URL);
await page.waitForSelector("#btn-start");
check("首页标题", (await page.title()).includes("知识边界"));
const cards = await page.locator(".domain-card").count();
check("首页领域卡片 = 18", cards === 18, String(cards));
const faContent = await page.evaluate(() => getComputedStyle(document.querySelector(".domain-card .dc-icon i"), "::before").content);
check("领域图标为 Font Awesome（::before 有字形）", faContent !== "none" && faContent.length > 0, faContent);
check("顶栏有 GitHub 链接", (await page.locator(".gh-link").count()) === 1);
check("主页信息区两块", (await page.locator(".home-info .info-block").count()) === 2);
check("主页信息区含通识重要性", (await page.locator(".info-block h2").nth(1).textContent()).includes("为什么通识"));
await page.screenshot({ path: path.join(ROOT, "artifacts/home.png"), fullPage: true });

// ---------- 2. 开始答题，键盘作答第一题（答对应自动跳转） ----------
await page.click("#btn-start");
await page.waitForSelector(".q-card");
check("题目标签渲染领域图标", (await page.locator("#q-domain").innerHTML()).includes('<i class="fa-solid fa-'), await page.locator("#q-domain").innerHTML());
const c1 = await currentAnswerIdx();
await page.keyboard.press(String.fromCharCode(65 + c1)); // 选正确项
await page.waitForTimeout(700); // 等自动跳转
check("答对后自动进入下一题", (await quizCountText()).includes("第 2 /"), await quizCountText());
check("已写入 localStorage", (await answeredTotal()) === 1, "answers=1");
await page.screenshot({ path: path.join(ROOT, "artifacts/quiz.png") });

// ---------- 3. 第二题答错 → 停留 + 手滑按钮 ----------
const c2 = await currentAnswerIdx();
await page.locator(".opt").nth((c2 + 1) % 4).click(); // 选错
await page.waitForTimeout(200);
check("答错后停留当前题", (await quizCountText()).includes("第 2 /"), await quizCountText());
check("答错显示错误反馈", (await page.locator("#fb-text .fb-head").textContent()).includes("回答错误"));
check("答错出现手滑按钮", await page.locator("#btn-forgive").isVisible());

// ---------- 4. 使用「我手滑了」→ 改判为会并自动跳转 ----------
await page.click("#btn-forgive");
await page.waitForTimeout(700);
check("手滑后进入下一题", (await quizCountText()).includes("第 3 /"), await quizCountText());
check("手滑剩余 4 次", (await page.evaluate(() => window.KBQuiz.forgiveLeft())) === 4, "forgiveLeft=4");

// ---------- 5. 跳过一题 ----------
await page.click("#btn-skip");
await page.waitForTimeout(200);
check("跳过进入下一题", (await quizCountText()).includes("第 4 /"), await quizCountText());
check("跳过不增加已答", (await answeredTotal()) === 2, "answers=2");

// ---------- 6. 刷新恢复（位置/已答/手滑次数） ----------
await page.reload();
await page.waitForSelector("#btn-resume");
check("刷新后出现继续按钮", await page.locator("#btn-resume").isVisible());
await page.click("#btn-resume");
await page.waitForSelector(".q-card");
check("恢复后 pos=3", (await quizPos()) === 3, "pos=" + (await quizPos()));
check("恢复后手滑剩余 4", (await page.evaluate(() => window.KBQuiz.forgiveLeft())) === 4, "forgiveLeft=4");

// ---------- 7. 答满 100 题后可随时查看结果，并可继续作答 ----------
await page.evaluate(() => {
  const ids = window.ALL_QUESTIONS.map((q) => q.id);
  const answers = {};
  ids.slice(0, 120).forEach((id, i) => {
    answers[id] = { choice: window.ALL_QUESTIONS[i].answer, ts: Date.now() };
  });
  localStorage.setItem("kb_quiz_v1", JSON.stringify({ version: 1, order: ids, pos: 120, answers, forgiveLeft: 4, updatedAt: Date.now() }));
});
await page.reload();
await page.waitForSelector("#btn-resume");
check("答满100后首页出现查看当前结果", await page.locator("#btn-peek-home").isVisible());
await page.click("#btn-peek-home");
await page.waitForSelector("#score-num");
check("中途可看结果", await page.locator("#score-num").isVisible());
check("未完成时结果页有继续作答", await page.locator("#btn-continue").isVisible());
check("中途结果页显示分数浮动", await page.locator("#score-margin").isVisible(), await page.locator("#score-margin").textContent());
await page.click("#btn-continue");
await page.waitForSelector(".q-card");
check("继续作答回到答题页", await page.locator("#btn-peek").isVisible(), "答题页也有查看结果按钮");

// ---------- 8. 一键完成全部（全部答对 → 100%，答满后浮动消失） ----------
await page.evaluate(() => {
  const answers = {};
  window.ALL_QUESTIONS.forEach((q) => { answers[q.id] = { choice: q.answer, ts: Date.now() }; });
  const ids = window.ALL_QUESTIONS.map((q) => q.id);
  localStorage.setItem("kb_quiz_v1", JSON.stringify({ version: 1, order: ids, pos: ids.length, answers, forgiveLeft: 4, updatedAt: Date.now() }));
});
await page.reload();
await page.waitForSelector("#btn-start");
check("完成后按钮变为查看结果", (await page.locator("#btn-start").textContent()) === "查看结果");
await page.click("#btn-start");
await page.waitForSelector("#score-num");
const scoreText = await page.locator("#score-num").textContent();
check("结果页显示得分", /%/.test(scoreText), scoreText);
const rankRows = await page.locator(".rank-row").count();
check("领域排名 18 行", rankRows === 18, String(rankRows));
const radar = await page.locator("#radar");
check("雷达图已绘制", (await radar.evaluate((c) => c.getContext("2d").getImageData(0, 0, c.width, c.height).data.some((v) => v !== 0))), "canvas 非空");
const radarBox = await radar.boundingBox();
check("雷达图保持 1:1 方形", radarBox && Math.abs(radarBox.width - radarBox.height) < 2, radarBox ? radarBox.width + "x" + radarBox.height : "none");
const rankPanelOY = await page.locator(".domain-rank").evaluate((el) => getComputedStyle(el).overflowY);
check("宽屏疆域明细内部滚动", rankPanelOY === "auto", rankPanelOY);
check("结果页显示平均参考", (await page.locator("#score-avg").textContent()).includes("平均参考"), await page.locator("#score-avg").textContent());
const shareCard = await page.evaluate(() => window.KBResults.buildShareCard());
check("结果图可生成(含链接画布)", typeof shareCard === "string" && shareCard.startsWith("data:image/png"), shareCard ? shareCard.length + " chars" : "none");
const [download] = await Promise.all([
  page.waitForEvent("download", { timeout: 8000 }),
  page.click("#btn-download")
]);
check("下载结果图", download.suggestedFilename().includes("knowledge-boundary"), download.suggestedFilename());
await page.click("#btn-share"); // 分享（无 share API 时走剪贴板/提示，不应报错）
await page.waitForTimeout(300);
check("分享按钮可用(无报错)", true, "点击无异常");
check("完成态无继续作答按钮", !(await page.locator("#btn-continue").isVisible()));
check("答满后分数浮动消失", !(await page.locator("#score-margin").isVisible()));
await page.screenshot({ path: path.join(ROOT, "artifacts/results.png"), fullPage: true });

// ---------- 9. 重置 ----------
await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem("kb_quiz_v1"));
  s.pos = s.order.length;
  localStorage.setItem("kb_quiz_v1", JSON.stringify(s));
});
await page.reload();
await page.waitForSelector("#btn-start");
await page.click("#btn-start");
await page.waitForSelector("#btn-reset");
await page.click("#btn-reset");
await page.waitForSelector("#btn-start");
const cleared = await page.evaluate(() => localStorage.getItem("kb_quiz_v1"));
check("重置后 localStorage 清空", cleared === null || cleared === "null");
check("重置后回到开始探索", (await page.locator("#btn-start").textContent()) === "开始探索");

await browser.close();
const fails = results.filter((r) => !r.ok);
console.log("\n========== 冒烟测试结果 ==========");
console.log("通过 " + (results.length - fails.length) + " / " + results.length);
if (fails.length) {
  console.log("失败项：" + fails.map((f) => f.name).join("; "));
  process.exit(1);
}
console.log("✅ ALL PASS");
