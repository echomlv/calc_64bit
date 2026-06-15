# CLAUDE.md

本文件为 Claude Code（claude.ai/code）在本仓库工作时提供指引。

## 项目简介

「嵌入式小工具」——一个纯前端、零依赖的单文件网页工具集，方便配置寄存器、做进制/容量/表达式换算。
全部逻辑在 `index.html` 内（HTML + CSS + 原生 JavaScript），双击即可在浏览器打开，无需构建步骤。

顶部用标签页切换两个面板：
- **位计算器**（`panelBits`）：bit 方格点击、二/十/十六进制实时互转、32/64 位宽、左移右移。
  其下方还有**独立的程序员计算器**。
- **容量换算**（`panelSize`）：Byte/KB/MB/GB/TB 之间换算（1024 进位）。

## 运行与测试

```bash
open index.html        # macOS 浏览器打开（无需服务器/构建）
npm install            # 首次安装测试依赖（仅 jsdom，仅测试用）
npm test               # 运行全部用例（node test/test.mjs）
```

- 测试用 jsdom 加载**真实的 `index.html`**，模拟点击/输入并断言 DOM 文本，覆盖三个工具。
- 改动 `index.html` 后务必跑 `npm test` 回归（当前 100 条用例）。
- 没有 lint/build/format 工具；保持单文件、无外部运行时依赖。

## 代码结构（`index.html`）

`<script>` 内是 4 个相互独立的 IIFE，外加共享样式：

1. **位计算器 IIFE**：单一数据源 `value`(BigInt) + `width`(32n/64n) + `mask`；核心 `render()` 刷新
   bit 方格与三种进制；`setWidth()`、`applyDec()`、`applyHex()`。**无符号**整数语义。
2. **容量换算 IIFE**：以 Byte 数（double）为规范值；`fmtHex`/`fmtDec`、`group4`（十六进制每 4 位空格）、
   分组开关、各框后并列显示另一种进制。
3. **程序员计算器 IIFE**：与位计算器**完全独立**（自有 `cwidth`/`csigned`/`cbase`/`lastResult` 与
   `#calcDec`/`#calcHex`/`#calcBin` 显示）。是表达式计算器：`tokenize → toRPN(调度场) → evalRPN`，
   支持优先级与括号；运算符表 `OPS`、关键字 `KEYWORDS`。默认 **32bit / Signed / Dec**。
4. **标签页切换 IIFE**：`.panel` 显隐 + `.active` 高亮。

## 关键约定

- **整数一律用 BigInt**：64 位无符号到 `2^64-1` 不丢精度；所有位运算结果都 `& mask` 回写到位宽。
- **有符号**：内部仍存无符号位模式，仅在显示/`÷ % >>` 时用 `toSigned()` 换算（补码）。
- **进制输入**：十六进制以 `0x` 开头（位计算器的十六进制框不带 `0x`）；程序员计算器表达式里
  十六进制数字直接写（如 `FF`），取模用 `%`（亦接受 `MOD`）。
- **新增/修改功能时**：同步在 `test/test.mjs` 增补用例、更新 `README.md`，三个工具的 JS 各自独立、
  不要互相共享状态。

## 部署

静态站点，托管在 GitHub Pages（仓库 `echomlv/calc_64bit`，分支 `main`，根目录）。
`index.html` 自动作首页；push 到 `main` 后自动重新部署。详见 `README.md` 的部署小节。
