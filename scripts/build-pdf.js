#!/usr/bin/env node
/**
 * 把 docs/HOT100-Reference.md 渲染成 A4 打印版 PDF（封面 / 章节分页 / 页脚页码）。
 *
 * 用法：
 *   node scripts/build-pdf.js [源 md] [输出 pdf]
 *   npm run build:pdf
 *
 * 依赖：Node.js + 本机 Chrome。Playwright 优先从常规依赖加载，找不到时
 * 回退到 @playwright/mcp 自带的一份（本机开发环境通常已装好）。
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

function loadPlaywright() {
  const candidates = [
    'playwright',
    'playwright-core',
    '/opt/homebrew/lib/node_modules/@playwright/mcp/node_modules/playwright',
  ];
  for (const c of candidates) {
    try { return require(c); } catch (_) { /* try next */ }
  }
  console.error('未找到 playwright，请先安装：npm i -D playwright');
  process.exit(1);
}
const { chromium } = loadPlaywright();

const SRC = process.argv[2] || 'docs/HOT100-Reference.md';
const OUT = process.argv[3] || SRC.replace(/\.md$/i, '.pdf');
const md = fs.readFileSync(SRC, 'utf8').replace(/\r\n/g, '\n');
const lines = md.split('\n');

function esc(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function inline(s) {
  // 保护 <u>...</u> 标签，避免被 esc 转义；内部 ** 仍走加粗处理
  s = s.replace(/<(\/?)u>/g, '\x01$1u\x01');
  let out = esc(s);
  const codes = [];
  out = out.replace(/`([^`]+)`/g, (m, code) => {
    const i = codes.length;
    codes.push('<code>' + code + '</code>');
    return '\u0000' + i + '\u0000';
  });
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  out = out.replace(/\u0000(\d+)\u0000/g, (m, i) => codes[+i]);
  out = out.replace(/\x01(\/?)u\x01/g, '<$1u>');
  return out;
}

function slug(s) {
  let t = s.replace(/`/g, '').replace(/\*\*/g, '').toLowerCase().trim();
  t = t.replace(/\s+/g, '-');
  t = t.replace(/[^\p{L}\p{N}-]/gu, '');
  t = t.replace(/-+/g, '-').replace(/^-|-$/g, '');
  return t;
}

// ---------- block parser ----------
const blocks = [];
let i = 0;
while (i < lines.length) {
  const line = lines[i];
  if (line.trim() === '') { i++; continue; }

  if (line.startsWith('```')) {
    const lang = line.slice(3).trim();
    const buf = [];
    i++;
    while (i < lines.length && !lines[i].startsWith('```')) { buf.push(lines[i]); i++; }
    if (i < lines.length) i++;
    blocks.push({ type: 'code', lang, text: buf.join('\n') });
    continue;
  }

  const hm = line.match(/^(#{1,6})\s+(.*)$/);
  if (hm) {
    blocks.push({ type: 'heading', level: hm[1].length, text: hm[2] });
    i++;
    continue;
  }

  if (/^\s*---+\s*$/.test(line)) {
    blocks.push({ type: 'hr' });
    i++;
    continue;
  }

  if (/^\s*\|/.test(line) && i + 1 < lines.length && /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1])) {
    const tbl = [];
    while (i < lines.length && /^\s*\|/.test(lines[i])) { tbl.push(lines[i]); i++; }
    blocks.push({ type: 'table', lines: tbl });
    continue;
  }

  if (/^\s*>/.test(line)) {
    const buf = [];
    while (i < lines.length && /^\s*>/.test(lines[i])) {
      buf.push(lines[i].replace(/^\s*>\s?/, ''));
      i++;
    }
    blocks.push({ type: 'blockquote', lines: buf });
    continue;
  }

  if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
    const items = [];
    const ordered = /^\s*\d+\.\s+/.test(line);
    while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i])) {
      let item = lines[i].replace(/^\s*([-*]|\d+\.)\s+/, '');
      let checked = null;
      if (/^\[[ xX]\]\s*/.test(item)) {
        checked = item[1].toLowerCase() === 'x';
        item = item.replace(/^\[[ xX]\]\s*/, '');
      }
      items.push({ text: item, checked });
      i++;
    }
    blocks.push({ type: 'list', ordered, items });
    continue;
  }

  const buf = [line];
  i++;
  while (i < lines.length && lines[i].trim() !== '' &&
    !/^#{1,6}\s+/.test(lines[i]) &&
    !/^\s*```/.test(lines[i]) &&
    !/^\s*\|/.test(lines[i]) &&
    !/^\s*>/.test(lines[i]) &&
    !/^\s*([-*]|\d+\.)\s+/.test(lines[i]) &&
    !/^\s*---+\s*$/.test(lines[i])) {
    buf.push(lines[i]);
    i++;
  }
  blocks.push({ type: 'paragraph', text: buf.join(' ') });
}

// ---------- renderers ----------
function renderTable(tblLines) {
  const rows = tblLines.map(l => {
    let s = l.trim();
    if (s.startsWith('|')) s = s.slice(1);
    if (s.endsWith('|')) s = s.slice(0, -1);
    return s.split('|').map(c => c.trim());
  });
  if (rows.length < 2) return '';
  const header = rows[0];
  const body = rows.slice(2);
  let h = '<table><thead><tr>';
  for (const c of header) h += '<th>' + inline(c) + '</th>';
  h += '</tr></thead><tbody>';
  for (const r of body) {
    h += '<tr>';
    for (let j = 0; j < header.length; j++) h += '<td>' + inline(r[j] || '') + '</td>';
    h += '</tr>';
  }
  h += '</tbody></table>';
  return h;
}

function renderList(b) {
  const allCheck = b.items.every(it => it.checked !== null);
  const tag = b.ordered ? 'ol' : 'ul';
  let h = '<' + tag + (allCheck ? ' class="checklist"' : '') + '>';
  for (const it of b.items) {
    if (it.checked === null) h += '<li>' + inline(it.text) + '</li>';
    else h += '<li><span class="box">' + (it.checked ? '☑' : '☐') + '</span> ' + inline(it.text) + '</li>';
  }
  h += '</' + tag + '>';
  return h;
}

function renderBlockquote(b) {
  const paras = [];
  let cur = [];
  for (const l of b.lines) {
    if (l.trim() === '') {
      if (cur.length) { paras.push(cur); cur = []; }
    } else cur.push(l);
  }
  if (cur.length) paras.push(cur);
  let h = '<blockquote>';
  for (const p of paras) h += '<p>' + p.map(inline).join('<br>') + '</p>';
  h += '</blockquote>';
  return h;
}

function renderDecisionTree() {
  return `
<div class="decision">
  <div class="decision-title">题型决策树（打印版 · 按顺序判断）</div>
  <table class="decision-table">
    <thead><tr><th style="width:9%">顺序</th><th style="width:55%">题面条件</th><th style="width:36%">第一反应</th></tr></thead>
    <tbody>
      <tr><td>1</td><td>数组 / 字符串，且<b>有序</b></td><td>二分 / 双指针</td></tr>
      <tr><td>2</td><td>数组 / 字符串，<b>连续</b>子数组 / 子串，求最长 / 最短 / 计数</td><td>滑动窗口 / 前缀和</td></tr>
      <tr><td>3</td><td>数组 / 字符串，连续，求<b>第 K / 前 K</b></td><td>堆 / 快选</td></tr>
      <tr><td>4</td><td>数组 / 字符串，以上都不是</td><td>哈希 / 排序 / 原地技巧</td></tr>
      <tr><td>5</td><td><b>链表</b></td><td>哑节点 + 快慢指针 / 反转 / 归并</td></tr>
      <tr><td>6</td><td><b>树</b></td><td>递归 DFS / BFS / BST 中序</td></tr>
      <tr><td>7</td><td><b>图</b>，存在依赖 / 先修关系</td><td>拓扑排序</td></tr>
      <tr><td>8</td><td><b>图</b>，无依赖</td><td>DFS / BFS</td></tr>
      <tr><td>9</td><td>要求<b>所有方案</b>（排列 / 组合 / 分割 / 棋盘）</td><td>回溯</td></tr>
      <tr><td>10</td><td>求<b>最值 / 方案数</b>且存在重叠子问题</td><td>动态规划</td></tr>
      <tr><td>11</td><td>其他</td><td>栈 / 单调栈 / 贪心 / 设计</td></tr>
    </tbody>
  </table>
</div>`;
}

function renderCode(b) {
  if (b.lang === 'mermaid') return renderDecisionTree();
  return '<pre><code>' + esc(b.text) + '</code></pre>';
}

// ---------- cover ----------
let coverTitle = 'Hot100 刷题攻略';
let coverSub = '18 个套路 · Java 应试版';
let coverIntro = [];
let start = 0;

if (blocks[0] && blocks[0].type === 'heading' && blocks[0].level === 1) {
  const t = blocks[0].text;
  const parts = t.split('·');
  if (parts.length > 1) {
    coverTitle = parts[0].trim();
    coverSub = parts.slice(1).join('·').trim();
  } else coverTitle = t.trim();
  start = 1;
  if (blocks[start] && blocks[start].type === 'blockquote') {
    coverIntro = blocks[start].lines;
    start++;
  }
  if (blocks[start] && blocks[start].type === 'hr') start++;
}

const today = new Date();
const dateStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');

function coverIntroHtml() {
  const paras = [];
  let cur = [];
  for (const l of coverIntro) {
    if (l.trim() === '') {
      if (cur.length) { paras.push(cur); cur = []; }
    } else cur.push(l);
  }
  if (cur.length) paras.push(cur);
  return paras.map(p => '<p>' + p.map(inline).join('<br>') + '</p>').join('');
}

// ---------- body ----------
const body = [];
let h2Count = 0;
for (let k = start; k < blocks.length; k++) {
  const b = blocks[k];
  if (b.type === 'heading') {
    const id = slug(b.text);
    if (b.level === 2) {
      h2Count++;
      const t = b.text.trim();
      // 只在大章节前强制分页，避免大量半空白页
      const forceBreak = /^3\./.test(t) || /^9\./.test(t);
      const cls = ['chapter'];
      if (!forceBreak) cls.push('no-break');
      if (t === '目录') cls.push('toc-title');
      body.push(`<h2 id="${id}" class="${cls.join(' ')}">${inline(b.text)}</h2>`);
    } else if (b.level === 1) {
      body.push(`<h1 id="${id}">${inline(b.text)}</h1>`);
    } else {
      body.push(`<h${b.level} id="${id}">${inline(b.text)}</h${b.level}>`);
    }
  } else if (b.type === 'paragraph') {
    body.push('<p>' + inline(b.text) + '</p>');
  } else if (b.type === 'list') {
    body.push(renderList(b));
  } else if (b.type === 'table') {
    body.push(renderTable(b.lines));
  } else if (b.type === 'blockquote') {
    body.push(renderBlockquote(b));
  } else if (b.type === 'code') {
    body.push(renderCode(b));
  } else if (b.type === 'hr') {
    body.push('<hr>');
  }
}

const css = `
@page { size: A4; }
* { box-sizing: border-box; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body {
  margin: 0;
  color: #1b1b1b;
  font-family: "PingFang SC", "Heiti SC", "Songti SC", -apple-system, "Helvetica Neue", Arial, sans-serif;
  font-size: 9.2pt;
  line-height: 1.52;
}
p { margin: 3.5px 0; text-align: justify; orphans: 3; widows: 3; }
strong { font-weight: 700; }
u { text-decoration: underline; text-underline-offset: 1.5px; }
em { font-style: italic; color: #444; }
a { color: #1f4e79; text-decoration: none; }

/* ---------- cover ---------- */
.cover {
  height: 258mm;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 8mm 10mm;
  break-after: page;
}
.cover .kicker {
  font-size: 9pt;
  letter-spacing: 3px;
  color: #8a5a44;
  font-weight: 700;
  margin-bottom: 8mm;
}
.cover h1 {
  font-size: 34pt;
  line-height: 1.15;
  margin: 0 0 4mm;
  color: #17324d;
  letter-spacing: 1px;
}
.cover .sub {
  font-size: 16pt;
  color: #c0392b;
  font-weight: 700;
  margin-bottom: 8mm;
}
.cover .rule {
  height: 2.2mm;
  width: 34mm;
  background: #c0392b;
  margin-bottom: 8mm;
}
.cover .intro {
  max-width: 155mm;
  font-size: 10pt;
  line-height: 1.65;
  color: #333;
}
.cover .intro p { margin: 3mm 0; text-align: left; }
.cover .intro code { font-size: 8.6pt; }
.cover .meta {
  margin-top: 14mm;
  padding-top: 4mm;
  border-top: 0.6pt solid #c9d1d9;
  display: flex;
  justify-content: space-between;
  font-size: 9pt;
  color: #666;
}
.cover .badge {
  margin-top: 10mm;
  display: inline-block;
  align-self: flex-start;
  border: 0.8pt solid #c0392b;
  color: #c0392b;
  padding: 2mm 4mm;
  font-size: 9pt;
  border-radius: 2mm;
}

/* ---------- headings ---------- */
h2.chapter {
  break-before: page;
  font-size: 15.5pt;
  line-height: 1.3;
  color: #17324d;
  border-left: 3.2mm solid #c0392b;
  padding-left: 3mm;
  margin: 0 0 4mm;
  break-after: avoid;
}
h2.chapter.no-break { break-before: auto; }
h3 {
  font-size: 12.2pt;
  color: #1f4e79;
  margin: 5mm 0 1.5mm;
  padding-bottom: 0.8mm;
  border-bottom: 0.6pt solid #d7dee5;
  break-after: avoid;
}
h4 {
  font-size: 10.2pt;
  color: #333;
  margin: 3.5mm 0 1mm;
  break-after: avoid;
}

/* ---------- toc ---------- */
h2.toc-title { margin-bottom: 6mm; }
h2.toc-title + ul {
  columns: 2;
  column-gap: 12mm;
  font-size: 10.4pt;
  line-height: 2.05;
  margin-top: 2mm;
}
h2.toc-title + ul li { break-inside: avoid; }

/* ---------- lists ---------- */
ul, ol { margin: 2.5mm 0 3mm; padding-left: 5.5mm; }
li { margin: 1mm 0; break-inside: avoid; }
ul.checklist { list-style: none; padding-left: 0; }
ul.checklist li { margin: 1.2mm 0; }
.box { font-size: 10pt; color: #1f4e79; }

/* ---------- code ---------- */
code {
  font-family: "SF Mono", "Menlo", "Courier New", monospace;
  font-size: 8.1pt;
  background: #f1f4f7;
  padding: 0 1.2px;
  border-radius: 1.5px;
}
pre {
  background: #f6f8fa;
  border-left: 2.2pt solid #b8c4d0;
  margin: 2.5mm 0 3.5mm;
  padding: 2.2mm 3mm;
  font-family: "SF Mono", "Menlo", "Courier New", monospace;
  font-size: 7.25pt;
  line-height: 1.34;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  break-inside: auto;
  -webkit-box-decoration-break: clone;
  box-decoration-break: clone;
}
pre code { background: none; padding: 0; font-size: inherit; }

/* ---------- tables ---------- */
table {
  width: 100%;
  border-collapse: collapse;
  margin: 2.5mm 0 4mm;
  font-size: 8.05pt;
  line-height: 1.42;
}
thead { display: table-header-group; }
th {
  background: #eaf0f5;
  color: #17324d;
  font-weight: 700;
  text-align: left;
}
th, td {
  border: 0.5pt solid #c7d0d9;
  padding: 1.3mm 1.8mm;
  vertical-align: top;
}
tr { break-inside: avoid; }
tbody tr:nth-child(even) { background: #fafbfc; }
td code, th code { font-size: 7.5pt; }

/* ---------- quote / rule ---------- */
blockquote {
  margin: 3mm 0;
  padding: 2.2mm 3.5mm;
  background: #f7f9fb;
  border-left: 2.6pt solid #95a5b5;
  color: #2f2f2f;
  break-inside: avoid;
}
blockquote p { margin: 1.2mm 0; text-align: left; }
hr { border: 0; border-top: 0.5pt solid #d0d7de; margin: 4mm 0; }

/* ---------- decision ---------- */
.decision { margin: 2mm 0 4mm; break-inside: avoid; }
.decision-title {
  font-weight: 700;
  color: #1f4e79;
  font-size: 9.5pt;
  margin-bottom: 1.5mm;
}
.decision-table { font-size: 8.1pt; }
.decision-table td:first-child { text-align: center; color: #666; }
`;

const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>${esc(coverTitle)} · ${esc(coverSub)}</title>
<style>${css}</style>
</head>
<body>
<section class="cover">
  <div class="kicker">LEETCODE HOT 100 · JAVA</div>
  <h1>${esc(coverTitle)}</h1>
  <div class="sub">${esc(coverSub)}</div>
  <div class="rule"></div>
  <div class="intro">${coverIntroHtml()}</div>
  <div class="badge">A4 打印版 · 18 个套路 · 100 题速查</div>
  <div class="meta">
    <span>基于 leonzhu-hot100-judge 题库与 Java 参考题解</span>
    <span>${dateStr}</span>
  </div>
</section>
<main>
${body.join('\n')}
</main>
</body>
</html>`;

const tmpHtml = path.join(os.tmpdir(), 'hot100-print.html');
fs.writeFileSync(tmpHtml, html, 'utf8');

async function launchBrowser() {
  try {
    // 优先使用本机 Chrome，排版与历史 PDF 保持一致
    return await chromium.launch({ channel: 'chrome', headless: true });
  } catch (_) {
    return await chromium.launch({ headless: true });
  }
}

(async () => {
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'load' });
  await page.pdf({
    path: OUT,
    format: 'A4',
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate: `<div style="width:100%; padding:0 13mm; font-size:8px; color:#777; font-family:-apple-system,'PingFang SC',sans-serif; display:flex; justify-content:space-between;">
      <span>Hot100 刷题攻略 · Java 应试版</span>
      <span>第 <span class="pageNumber"></span> / <span class="totalPages"></span> 页</span>
    </div>`,
    margin: { top: '12mm', bottom: '14mm', left: '13mm', right: '13mm' },
    preferCSSPageSize: false,
  });
  await browser.close();
  console.log('PDF written:', OUT);
})();
