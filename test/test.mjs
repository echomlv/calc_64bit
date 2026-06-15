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

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
