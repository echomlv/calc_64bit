// 在真实 DOM（jsdom）中加载并驱动 index.html，验证 bit 切换、移位、
// 进制双向转换、位宽切换与 64 位精度。运行：npm test
import { JSDOM } from "jsdom";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");

function makeWindow() {
  return new JSDOM(html, { runScripts: "dangerously" }).window;
}

let pass = 0, fail = 0;
function eq(name, got, want) {
  const ok = got === want;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}: got=${got} want=${want}`);
  ok ? pass++ : fail++;
}

const w = makeWindow();
const doc = w.document;
const dec = doc.getElementById("decInput");
const hex = doc.getElementById("hexInput");
const bin = doc.getElementById("binValue");
const cells = () => doc.querySelectorAll(".bit-cell");
const cellByBit = (b) => [...cells()].find((c) => Number(c.dataset.bit) === b);
const click = (el) => el.dispatchEvent(new w.Event("click", { bubbles: true }));
const setInput = (el, v) => { el.value = v; el.dispatchEvent(new w.Event("blur")); };

// --- 初始状态：64bit、全 0 ---
eq("init bit count (64bit)", cells().length, 64);
eq("init dec", dec.value, "0");
eq("init hex", hex.value, "0");
eq("init bin length", bin.textContent.length, 64);

// --- 功能1：点击 bit 7/5/4/3/1 => 10111010 = 186 = BA ---
[7, 5, 4, 3, 1].forEach((b) => click(cellByBit(b)));
eq("toggle dec", dec.value, "186");
eq("toggle hex", hex.value, "BA");
eq("toggle bin tail", bin.textContent.slice(-8), "10111010");
eq("bit7 shows 1", cellByBit(7).textContent, "1");
eq("bit6 shows 0", cellByBit(6).textContent, "0");
eq("bit7 has on class", cellByBit(7).classList.contains("on"), true);

// --- 功能3：左移/右移 ---
click(doc.getElementById("btnLeft"));
eq("after <<1 dec", dec.value, "372");
click(doc.getElementById("btnRight"));
eq("after >>1 dec", dec.value, "186");
click(doc.getElementById("btnRight"));
eq("after >>1 again dec", dec.value, "93");

// --- 功能4：进制双向输入 ---
setInput(dec, "255");
eq("dec=255 -> hex", hex.value, "FF");
eq("dec=255 -> bin tail", bin.textContent.slice(-8), "11111111");
setInput(hex, "FF00");
eq("hex=FF00 -> dec", dec.value, "65280");
eq("hex=FF00 -> bin tail16", bin.textContent.slice(-16), "1111111100000000");
setInput(hex, "0x1A");
eq("hex=0x1A -> dec", dec.value, "26");
setInput(dec, "xyz");
eq("invalid dec keeps prior value", dec.classList.contains("invalid"), true);

// --- 64 位精度：2^64-1 ---
setInput(dec, "18446744073709551615");
eq("2^64-1 -> hex", hex.value, "FFFFFFFFFFFFFFFF");
eq("2^64-1 -> bin all ones", bin.textContent, "1".repeat(64));
eq("bit63 lit", cellByBit(63).classList.contains("on"), true);

// --- 字节边界加粗 ---
eq("bit0 is byte-edge", cellByBit(0).classList.contains("byte-edge"), true);
eq("bit7 is byte-edge", cellByBit(7).classList.contains("byte-edge"), true);
eq("bit8 is byte-edge", cellByBit(8).classList.contains("byte-edge"), true);
eq("bit3 NOT byte-edge", cellByBit(3).classList.contains("byte-edge"), false);

// --- 功能2：64bit 两行 / 切 32bit 截断高位 ---
click(doc.getElementById("btn32"));
eq("32bit cell count", cells().length, 32);
eq("32bit single row", doc.querySelectorAll(".bits-row").length, 1);
eq("64->32 truncate hex", hex.value, "FFFFFFFF");
eq("64->32 truncate dec", dec.value, "4294967295");
click(doc.getElementById("btn64"));
eq("back to 64bit two rows", doc.querySelectorAll(".bits-row").length, 2);
eq("64bit after switch hex", hex.value, "FFFFFFFF");

// --- 64bit 最高位左移溢出按掩码归零 ---
setInput(dec, "0");
click(cellByBit(63));
eq("bit63 set hex", hex.value, "8000000000000000");
click(doc.getElementById("btnLeft"));
eq("<<1 overflow at 64bit -> 0", dec.value, "0");

// ===== 容量换算 =====
const tabSize = doc.getElementById("tabSize");
const tabBits = doc.getElementById("tabBits");
const panelSize = doc.getElementById("panelSize");
const panelBits = doc.getElementById("panelBits");
const sByte = doc.getElementById("sizeByte");
const sKB = doc.getElementById("sizeKB");
const sMB = doc.getElementById("sizeMB");
const sGB = doc.getElementById("sizeGB");
const sTB = doc.getElementById("sizeTB");
const typeSize = (el, v) => { el.value = v; el.dispatchEvent(new w.Event("input")); };

// --- tab 切换 ---
eq("default: bits panel active", panelBits.classList.contains("active"), true);
eq("default: size panel hidden", panelSize.classList.contains("active"), false);
click(tabSize);
eq("after click: size panel active", panelSize.classList.contains("active"), true);
eq("after click: bits panel hidden", panelBits.classList.contains("active"), false);
eq("after click: size tab active", tabSize.classList.contains("active"), true);
click(tabBits);
eq("switch back: bits panel active", panelBits.classList.contains("active"), true);
eq("switch back: size panel hidden", panelSize.classList.contains("active"), false);

// --- 1 GB（1024 进位）---
typeSize(sGB, "1");
eq("1GB -> KB", sKB.value, "1048576");
eq("1GB -> MB", sMB.value, "1024");
eq("1GB -> Byte", sByte.value, "1073741824");
eq("1GB -> TB", sTB.value, "0.000977"); // 0.0009765625 -> 6 位小数

// --- 1536 MB -> 1.5 GB ---
typeSize(sMB, "1536");
eq("1536MB -> GB", sGB.value, "1.5");
eq("1536MB -> Byte", sByte.value, "1610612736");

// --- 1 TB ---
typeSize(sTB, "1");
eq("1TB -> GB", sGB.value, "1024");
eq("1TB -> Byte", sByte.value, "1099511627776");

// --- 小数 0.5 KB -> 512 Byte ---
typeSize(sKB, "0.5");
eq("0.5KB -> Byte", sByte.value, "512");

// --- 十进制输入时，各框后显示十六进制 ---
const altText = (el) => el.parentNode.querySelector(".alt").textContent;
typeSize(sKB, "1");
eq("dec input: Byte value", sByte.value, "1024");
eq("dec input: Byte alt = hex", altText(sByte), "= 0x400");
eq("dec input: KB alt = hex", altText(sKB), "= 0x1");

// --- 十六进制输入：结果也用十六进制，alt 显示十进制 ---
typeSize(sByte, "0x400");
eq("hex input: KB value in hex", sKB.value, "0x1");
eq("hex input: MB value in hex", sMB.value, "0x0.004"); // 1024/1048576 = 1/1024 = 0x0.004
eq("hex input: Byte alt = dec", altText(sByte), "= 1024");
eq("hex input: KB alt = dec", altText(sKB), "= 1");

// --- 十六进制大值：0x40000000 Byte = 1 GB ---
typeSize(sByte, "0x40000000");
eq("hex 0x40000000 -> GB hex", sGB.value, "0x1");
eq("hex 0x40000000 -> GB alt dec", altText(sGB), "= 1");

// --- 十六进制每 4 位空格隔开 ---
typeSize(sGB, "1"); // dec 1 GB -> Byte 0x40000000
eq("dec 1GB: Byte alt grouped hex", altText(sByte), "= 0x4000 0000");
typeSize(sMB, "1"); // dec 1 MB -> Byte 0x100000
eq("dec 1MB: Byte alt grouped hex", altText(sByte), "= 0x10 0000");

// --- 输入带空格自动去除用于计算 ---
typeSize(sByte, "0x4000 0000");
eq("spaced hex input -> GB", sGB.value, "0x1");

// --- 失焦后源框按每 4 位空格重新格式化 ---
sByte.value = "0x40000000";
sByte.dispatchEvent(new w.Event("input"));
sByte.dispatchEvent(new w.Event("blur"));
eq("blur regroups source hex", sByte.value, "0x4000 0000");

// --- 分组开关：默认开启，关闭后无空格，重新开启又分组 ---
const groupToggle = doc.getElementById("groupToggle");
eq("group toggle default on", groupToggle.checked, true);
typeSize(sGB, "1"); // dec 1 GB -> Byte alt = 0x4000 0000
eq("grouping on: Byte alt grouped", altText(sByte), "= 0x4000 0000");
groupToggle.checked = false;
groupToggle.dispatchEvent(new w.Event("change"));
eq("grouping off: Byte alt no space", altText(sByte), "= 0x40000000");
// 十六进制源框关闭分组后也无空格
typeSize(sByte, "0x40000000");
eq("grouping off: KB value no space (hex)", sByte.value, "0x40000000"); // 源框失焦前保持输入
eq("grouping off: GB alt dec", altText(sGB), "= 1");
groupToggle.checked = true;
groupToggle.dispatchEvent(new w.Event("change"));
eq("grouping on again: Byte value regrouped", sByte.value, "0x4000 0000");

// --- 非法十六进制 ---
typeSize(sGB, "0xZZ");
eq("invalid hex flagged", sGB.classList.contains("invalid"), true);

// 恢复十进制状态，便于后续清零测试
typeSize(sGB, "");

// --- 非法输入：标红且不覆盖其它框 ---
typeSize(sGB, "2"); // 先设一个有效值
const byteBefore = sByte.value;
typeSize(sGB, "abc");
eq("invalid size input flagged", sGB.classList.contains("invalid"), true);
eq("invalid size input keeps others", sByte.value, byteBefore);

// --- 清零 ---
click(doc.getElementById("btnSizeClear"));
eq("size clear -> Byte empty", sByte.value, "");
eq("size clear -> GB empty", sGB.value, "");

// ===== 程序员计算器（独立、表达式求值） =====
const expr = doc.getElementById("calcExpr");
const cDec = doc.getElementById("calcDec");
const cHex = doc.getElementById("calcHex");
const cBin = doc.getElementById("calcBin");
const cProc = doc.getElementById("calcProcess");
const cStatus = doc.getElementById("calcStatus");
const padDigit = (ch) => click([...doc.querySelectorAll('.calc-pad button[data-digit]')].find((b) => b.dataset.digit === ch));
const padOp = (op) => click(doc.querySelector(`.calc-pad button[data-op="${op}"]`));
const padUnary = (u) => click(doc.querySelector(`.calc-pad button[data-unary="${u}"]`));
const padIns = (s) => click(doc.querySelector(`.calc-pad button[data-ins="${s}"]`));
const padAct = (a) => click(doc.querySelector(`.calc-pad button[data-act="${a}"]`));
const calcC = () => padAct("c");
// 直接键入表达式并求值
const typeExpr = (s) => { expr.value = s; expr.dispatchEvent(new w.Event("input")); padAct("eq"); };

// 独立性：操作计算器不影响位计算器（上方 decInput/hexInput/binValue）
const bitDecBefore = dec.value, bitHexBefore = hex.value;

// 默认值
eq("calc default dec", cDec.textContent, "0");
eq("calc default hex", cHex.textContent, "0x0");

// 默认模式：32bit / Signed / Dec
eq("calc default 32bit active", doc.getElementById("calcBtn32").classList.contains("active"), true);
eq("calc default Signed active", doc.getElementById("calcSigned").classList.contains("active"), true);
eq("calc default Dec active", doc.getElementById("calcInDec").classList.contains("active"), true);
const keyA0 = [...doc.querySelectorAll('.calc-pad button[data-digit]')].find((b) => b.dataset.digit === "A");
eq("calc default Dec disables A-F", keyA0.disabled, true);

// 标准优先级：1+3/2-10 = -8（默认 Dec + Signed；3/2=1）
typeExpr("1+3/2-10");
eq("calc 1+3/2-10 dec", cDec.textContent, "-8");
eq("calc 1+3/2-10 process", cProc.textContent, "1+3/2-10 = -8");
click(doc.getElementById("calcUnsigned"));

// 括号改变优先级：(1+3)/2 = 2
typeExpr("(1+3)/2");
eq("calc (1+3)/2 = 2", cDec.textContent, "2");

// MOD 用 % 输入：17 % 5 = 2（按键 MOD 插入 %）
calcC();
padDigit("1"); padDigit("7"); padOp("%"); padDigit("5"); padAct("eq");
eq("calc MOD key inserts %", expr.value, "17%5");
eq("calc 17 % 5 = 2", cDec.textContent, "2");
// 直接键入 % 与 MOD 关键字等价
typeExpr("17 MOD 5");
eq("calc 17 MOD 5 = 2", cDec.textContent, "2");

// 十六进制输入与位运算优先级：回到 Hex
click(doc.getElementById("calcInHex"));
// FF AND 0F = 0F = 15
typeExpr("FF AND 0F");
eq("calc FF AND 0F dec", cDec.textContent, "15");
eq("calc FF AND 0F hex", cHex.textContent, "0xF");

// 移位与加法优先级：1 << 4 + 1 -> 1 << 5 = 32（+ 高于 <<）
typeExpr("1 << 4 + 1");
eq("calc 1<<(4+1) = 32", cDec.textContent, "32");

// NOT 一元（切到 64bit）：NOT 0 = 全 F
click(doc.getElementById("calcBtn64"));
calcC();
typeExpr("NOT 0");
eq("calc NOT 0 (64bit) hex", cHex.textContent, "0xFFFFFFFFFFFFFFFF");

// 32bit 位宽：NOT 0 = 0xFFFFFFFF
click(doc.getElementById("calcBtn32"));
typeExpr("NOT 0");
eq("calc NOT 0 (32bit) hex", cHex.textContent, "0xFFFFFFFF");
click(doc.getElementById("calcBtn64"));

// 除零 -> 状态栏报错，不抛出
typeExpr("5/0");
eq("calc div by zero status", /除数为 0/.test(cStatus.textContent), true);

// 括号不匹配 -> 报错
typeExpr("(1+2");
eq("calc unbalanced paren status", /括号不匹配/.test(cStatus.textContent), true);

// 按键构建：点 7 + 8 = 15（Hex 模式，7+8=0xF）
calcC();
padDigit("7"); padOp("+"); padDigit("8"); padAct("eq");
eq("calc keypad 7+8 dec", cDec.textContent, "15");

// +/- 把末尾数字包成 (-N)（Dec 模式，避免与减号歧义）
calcC();
click(doc.getElementById("calcInDec"));
expr.value = "10"; expr.dispatchEvent(new w.Event("input"));
padAct("neg");
eq("calc neg wraps to (-10)", expr.value, "(-10)");
padAct("eq");
click(doc.getElementById("calcSigned"));
eq("calc (-10) signed dec", cDec.textContent, "-10");
click(doc.getElementById("calcUnsigned"));

// Hex/Dec 切换禁用 A-F
const keyA = [...doc.querySelectorAll('.calc-pad button[data-digit]')].find((b) => b.dataset.digit === "A");
click(doc.getElementById("calcInDec"));
eq("calc Dec disables A-F", keyA.disabled, true);
click(doc.getElementById("calcInHex"));
eq("calc Hex enables A-F", keyA.disabled, false);

// 独立性确认：位计算器显示未被计算器改动
eq("bit calc dec unchanged", dec.value, bitDecBefore);
eq("bit calc hex unchanged", hex.value, bitHexBefore);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
