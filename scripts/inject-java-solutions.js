'use strict';

/**
 * 把 scripts/java-ref/<id>.java 的核心代码模式参考题解注入
 * work/parts/solutions-gXX.json 各题的 java.core 字段。
 *
 * 注意：顶层键为数字字符串，JSON.stringify 会按升序重排，破坏分片原有
 * 题目顺序。因此这里按"原键顺序 + 每题对象内保持 python3/cpp/java 插入序"
 * 手动序列化，保证 diff 干净。
 *
 * 用法：node scripts/inject-java-solutions.js
 * 运行前需先有 scripts/java-ref/ 下全部题号的 .java 文件；
 * 运行后执行 scripts/merge-parts.js 重建 public/data/solutions.json。
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const partsDir = path.join(ROOT, 'work', 'parts');
const refDir = path.join(ROOT, 'scripts', 'java-ref');

/**
 * 从原始文件文本提取顶层键顺序，并检测该文件自身缩进单位（空格数）。
 * JS 的 Object.keys 对数字型键（如题目 id）一律按升序返回，无法保住文件原有
 * 顺序，因此必须从原始文本按行匹配顶层的 `"<id>": {`。缩进单位各分片不一
 * （大部分 2 空格，solutions-g07 为 1 空格），需按原文件保持一致避免整文件重排。
 */
function layoutFromRaw(raw) {
  const order = [];
  let unit = '  '; // 默认 2 空格
  const re = /^(\s*)"(\d+)": \{/gm;
  let m;
  while ((m = re.exec(raw))) {
    if (!order.length) unit = m[1] || '  '; // 首个顶层键决定缩进单位
    order.push(m[2]);
  }
  return { order, unit };
}

/** 按原始顶层键顺序 + 原缩进单位序列化（每题对象用标准 JSON.stringify 保持内部键序）。 */
function stringifyOrdered(data, order, unit) {
  const lines = ['{'];
  order.forEach((k, i) => {
    const comma = i === order.length - 1 ? '' : ',';
    // 每题的 value 顶层是 { python3:..., cpp:... }，均为非数字字符串键，stringify 保持插入序。
    // 内部用 1 个缩进单位序列化，再整体前缀 unit 落到 2*unit 绝对缩进。
    const val = JSON.stringify(data[k], null, unit.length);
    const body = val.split('\n').slice(1, -1).map((l) => unit + l).join('\n');
    lines.push(`${unit}${JSON.stringify(k)}: {`);
    lines.push(body);
    lines.push(`${unit}}${comma}`);
  });
  lines.push('}');
  return lines.join('\n') + '\n'; // 与分片原文件一致，结尾保留换行
}

const files = fs.readdirSync(refDir).filter((f) => f.endsWith('.java'));
let injected = 0, missing = 0;
const groupData = new Map(); // 分片名 -> 已注入 java 的内存数据
for (const f of files) {
  const id = Number(f.replace('.java', ''));
  const code = fs.readFileSync(path.join(refDir, f), 'utf8');
  // 找到该 id 所在分片
  const group = fs.readdirSync(partsDir).find((n) => {
    const m = n.match(/^solutions-g(\d{2})\.json$/);
    if (!m) return false;
    const data = JSON.parse(fs.readFileSync(path.join(partsDir, n), 'utf8'));
    return Object.prototype.hasOwnProperty.call(data, String(id));
  });
  if (!group) { console.error(`✗ ${id}: 未在 work/parts/solutions-*.json 中找到`); missing++; continue; }
  if (!groupData.has(group)) {
    groupData.set(group, JSON.parse(fs.readFileSync(path.join(partsDir, group), 'utf8')));
  }
  groupData.get(group)[String(id)].java = { core: code };
  injected++;
}
// 统一写出：布局（顶层键顺序/缩进）取自磁盘原始文本，内容用内存中注入后的数据
for (const [group, data] of groupData) {
  const file = path.join(partsDir, group);
  const raw = fs.readFileSync(file, 'utf8');
  const { order, unit } = layoutFromRaw(raw);
  // 若某个顶层键未被识别（非数字 id），兜底追加到末尾，避免丢数据
  for (const k of Object.keys(data)) if (!order.includes(k)) order.push(k);
  fs.writeFileSync(file, stringifyOrdered(data, order, unit), 'utf8');
}
console.log(`注入完成：${injected} 题写入 java.core，缺失 ${missing} 题，涉及 ${groupData.size} 个分片`);
