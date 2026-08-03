# CLAUDE.md — 知识边界（Knowledge Boundary）

> 一个测试人知识面覆盖程度的静态选择题网页。零依赖、无构建，双击 `index.html` 或任意静态服务器即可运行。

## 技术栈
- 纯原生 HTML / CSS / JS，无框架、无外部 CDN、无打包器。
- Canvas 手绘 18 轴雷达图（结果页）。
- 图标用本地 vendor 的 Font Awesome（`vendor/fontawesome/`），领域图标存于 `domains.js` 的 `icon` 字段（`fa-solid fa-*`）。
- 进度实时存入 `localStorage`（key: `kb_quiz_v1`），含 `answers`（含可选 `forgiven` 标记）、`forgiveLeft`（「我手滑了」剩余次数，初始 5）、`order/pos`。

## 作答交互
- 初次作答即锁定，不可修改；答对自动进下一题，答错停留手动点「下一题」。
- 答错时可点「我手滑了，这题我确实会」改判为正确（消耗 1 次，全局限 5 次）。
- 答满 100 题后可随时查看结果（首页/答题页均有入口），结果页「继续作答」返回当前进度。

## 目录结构
```
index.html            # 单页入口（含全部 <script> 引用）
css/styles.css        # 视觉：知识星图 / 暗色天文志
js/
  domains.js          # 领域分类体系（18 领域、权重、细分、qty）
  storage.js          # localStorage 读写
  quiz.js             # 答题引擎：状态机、洗牌、难度加权计分
  ui.js               # 渲染层：首页 / 答题页 / 顶栏
  results.js          # 结果页 + 雷达图
  app.js              # 入口 / 路由 / 键盘 / 星空背景
data/
  taxonomy.md         # 领域分类设计文档（含跨域归属规则）
  question-spec.md    # 出题规范（schema + 质量红线）
  questions/
    <id>.js           # 每领域一个题库文件：window.QUESTIONS_<ID>
    loader.js         # 汇总各领域题库并做结构校验 → window.ALL_QUESTIONS
scripts/validate.js   # Node 校验脚本（题量/id/细分/难度/结构/答案位置均衡）
scripts/audit.js      # 审计脚本（长度失衡题检测）
scripts/rebalance.js  # 答案位置均衡脚本（0/1/2/3 各约 25%）
scripts/smoke.mjs     # Playwright 端到端冒烟测试
```

## 数据模型
题目对象：
```js
{ id: "natural-001", category: "natural", subdomain: "物理学",
  difficulty: "easy|medium|hard", question: "...", options: ["A","B","C","D"],
  answer: 0, explanation: "..." }
```
- `category` 必须等于 `domains.js` 中的领域 id；`subdomain` 必须等于该领域 `subdomains[].name`。
- 每领域题数 = `weight`；各细分题数 = 各 `subdomains[].qty`。
- 难度分布：约 26% easy / 55% medium / 19% hard（只允许 easy→medium 单向提升）。
- 计分：难度加权 易1× / 中1.5× / 难2×；领域得分 = 答对加权分/已答加权分 ×100；被「手滑」改判的题计为正确。

## 常用命令
- 校验题库：`npm test`（= validate + smoke）
- 校验题库（仅结构）：`node scripts/validate.js`
- 审计长度失衡：`node scripts/audit.js`
- 答案位置均衡：`node scripts/rebalance.js`（改完选项后必须跑，保证 0/1/2/3 各约 25%）
- 运行：直接打开 `index.html`，或 `python -m http.server` 后访问。

## 约定
- 改题库文件后必须跑 `scripts/validate.js` 确认 PASS。
- 新增领域：改 `js/domains.js` + `data/taxonomy.md` + 新建 `data/questions/<id>.js` + 在 `index.html` 加 `<script>`。
- 保持零外部依赖（不引入 CDN / 框架 / 构建工具），保证可离线双击运行。
