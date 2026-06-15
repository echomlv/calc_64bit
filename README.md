# 寄存器配置 & 容量换算计算器

一个纯前端的小工具集，单个 HTML 文件、无需安装依赖、双击即可在浏览器打开。
顶部用标签页切换两个工具：

- **位计算器**：逐位点亮/熄灭 bit，在二进制 / 十进制 / 十六进制间实时互转。
- **容量换算**：在 Byte / KB / MB / GB / TB 之间换算（1024 进位）。

## 功能

### 位计算器

- **逐位切换**：点击 bit 方格切换 0/1，实时更新二进制、十进制、十六进制结果。
- **位宽切换**：支持 32bit / 64bit；64bit 分两行显示（`63~32` 与 `31~0`），切到
  32bit 自动截断高位。
- **左移 / 右移**：左移按位宽掩码处理溢出，右移为逻辑右移（高位补 0）。
- **进制双向输入**：在十进制或十六进制输入框输入数值（回车或失焦生效），反向更新
  所有 bit 位与另一种进制；非法输入会标红且保留原值。
- **字节边界加粗**：每个字节两端的 bit（如 bit 0 与 bit 7）加粗显示，便于按字节阅读。
- **64 位精度**：内部使用 `BigInt`，64bit 模式下 `2^64-1` 也不丢精度。

### 容量换算

- **多单位联动**：Byte / KB / MB / GB / TB 五个输入框，在任意一个框输入数值，其余
  单位实时自动换算。
- **1024 进位**：1 KB = 1024 Byte、1 MB = 1024 KB …，与位计算器风格一致。
- **十进制 / 十六进制输入**：十进制直接输入；十六进制以 `0x` 开头（如 `0x400`）。
  输入什么进制，各框结果就用什么进制显示。
- **并列显示另一种进制**：每个输入框后面同时显示对应的另一种进制（如十进制框后显示
  `= 0x400`，十六进制框后显示 `= 1024`）。
- **十六进制每 4 位空格分组**：显示时整数部分自动每 4 位用空格隔开（如
  `0x4000 0000`）；输入时空格会被自动忽略再参与计算，失焦后按分组格式重新显示。
  可用「十六进制每 4 位空格隔开」复选框开启/关闭该分组（默认开启）。
- **支持小数**：如 1.5 GB、0.5 KB；非法或负数输入会标红且不影响其它框；一键清零。

## 使用

直接用浏览器打开 `index.html` 即可：

```bash
open index.html        # macOS
```

## 测试

测试用 [jsdom](https://github.com/jsdom/jsdom) 在真实 DOM 中加载并驱动
`index.html`，验证 bit 切换、移位、进制转换、位宽切换与 64 位精度。

```bash
npm install   # 首次安装开发依赖（jsdom）
npm test      # 运行全部用例
```

## 部署到 GitHub Pages

本项目是纯静态单文件，适合用 GitHub Pages 免费托管。

> 说明：GitHub Pages 有「用户主站」(`用户名.github.io`) 和「项目站」两种，二者独立。
> 本项目作为项目站部署，地址形如 `https://用户名.github.io/calc_64bit/`，不会影响你已有的主站。

1. **新建空仓库**：打开 <https://github.com/new>，仓库名填 `calc_64bit`，选 **Public**，
   不要勾选 README/.gitignore（保持空），点 Create。

2. **推送代码**（把 URL 换成你的仓库地址）：

   ```bash
   git remote add origin https://github.com/你的用户名/calc_64bit.git
   git push -u origin main
   ```

3. **开启 Pages**：进仓库 **Settings → Pages**，Source 选 **Deploy from a branch**，
   Branch 选 **main**、目录选 **/ (root)**，Save。

4. 等 1~2 分钟，访问 `https://你的用户名.github.io/calc_64bit/` 即可使用。
   Pages 会自动把根目录的 `index.html` 当作首页（`README.md` 仅作仓库说明页，不影响部署）。

之后每次 `git push` 到 `main`，Pages 会自动重新部署。

## 项目结构

```
calc_64bit/
├── index.html       # 计算器主程序（HTML + CSS + JS，自包含）
├── package.json     # npm test 脚本与开发依赖
├── test/
│   └── test.mjs     # 基于 jsdom 的测试用例
└── README.md
```
