#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA = {
  problems: JSON.parse(fs.readFileSync(path.join(ROOT, 'public/data/problems.json'), 'utf8')),
  solutions: JSON.parse(fs.readFileSync(path.join(ROOT, 'public/data/solutions.json'), 'utf8')),
  tests: JSON.parse(fs.readFileSync(path.join(ROOT, 'public/data/tests.json'), 'utf8')),
};

const STATE_FILE = path.join(ROOT, 'work', 'cli-state.json');
function loadState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch { return { solved: [], starred: [], updatedAt: null }; }
}
function saveState(s) {
  s.updatedAt = new Date().toISOString();
  fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2));
}

function die(msg) { console.error(`✗ ${msg}`); process.exit(1); }

// ---- 参数解析：--flag value 与 --flag=value ----
function parseArgs(argv) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const eq = a.indexOf('=');
      if (eq >= 0) flags[a.slice(2, eq)] = a.slice(eq + 1);
      else {
        const k = a.slice(2);
        const v = i + 1 < argv.length && !argv[i + 1].startsWith('--') ? argv[++i] : true;
        flags[k] = v;
      }
    } else positional.push(a);
  }
  return { flags, positional };
}

function findProblem(id) {
  const p = DATA.problems.find((x) => x.id === Number(id));
  if (!p) die(`题目不存在: ${id}`);
  return p;
}

function statusMark(p, state) {
  if (state.starred.includes(p.id)) return '★';
  if (state.solved.includes(p.id)) return '✓';
  return ' ';
}

// ---- list ----
function cmdList(flags) {
  let list = [...DATA.problems];
  if (flags.company) list = list.filter((p) => p.freq && p.freq.companies && p.freq.companies.some((c) => c.name === flags.company));
  if (flags.difficulty) list = list.filter((p) => p.difficulty === flags.difficulty);
  if (flags.topic) list = list.filter((p) => p.topic === flags.topic);
  const byRank = (a, b) => ((a.freq && a.freq.rank) || 9999) - ((b.freq && b.freq.rank) || 9999);
  list.sort(flags.sort === 'rank' ? byRank : (a, b) => a.id - b.id);
  if (flags.top) list = list.slice(0, Number(flags.top));
  const state = loadState();
  const w = (t, n, s) => (t + (s || '')).padEnd(n);
  console.log(w('ID', 5) + w('难度', 6) + w('专题', 16) + w('高频', 5) + w('标题', 40) + '状态');
  for (const p of list) {
    console.log(w(String(p.id), 5) + w(p.difficulty, 6) + w(p.topic, 16) +
      w(String((p.freq && p.freq.rank) || '-'), 5) + w(p.title, 40) + statusMark(p, state));
  }
  console.log(`\n共 ${list.length} 题`);
}

// ---- search ----
function cmdSearch(flags, positional) {
  const kw = positional[0];
  if (!kw) die('用法: hot100 search <关键词>');
  const hit = DATA.problems.filter((p) =>
    p.title.includes(kw) || p.desc.includes(kw) || p.topic.includes(kw) ||
    (p.explain || '').includes(kw));
  if (!hit.length) { console.log(`未找到包含 "${kw}" 的题目`); return; }
  for (const p of hit) console.log(`#${p.id} ${p.title}（${p.difficulty} · ${p.topic}）`);
}

// ---- random ----
function cmdRandom(flags) {
  let pool = [...DATA.problems];
  if (flags.company) pool = pool.filter((p) => p.freq && p.freq.companies && p.freq.companies.some((c) => c.name === flags.company));
  if (flags.unfinished) {
    const state = loadState();
    pool = pool.filter((p) => !state.solved.includes(p.id));
  }
  if (!pool.length) die('没有符合条件的题目');
  const p = pool[Math.floor(Math.random() * pool.length)];
  console.log(`🎲 随机一题：\n  #${p.id} ${p.title}（${p.difficulty} · ${p.topic}）\n  高频排名: ${(p.freq && p.freq.rank) || '-'}  最近被考: ${(p.freq && p.freq.lastAsked) || '-'}\n  ${p.url}`);
  console.log(`  ${p.explain ? p.explain.split('\n')[0] : ''}`);
}

// ---- show ----
function coreSignature(core) {
  if (core.kind === 'ops') {
    const ctor = (core.ops.constructor || []).map((p) => `${p.type} ${p.name}`).join(', ');
    const methods = (core.ops.methods || []).map((m) => `    public ${m.ret || 'void'} ${m.name}(${m.args.map((t, i) => t + ' a' + i).join(', ')})`);
    return `class ${core.className}(${ctor})\n` + methods.join('\n');
  }
  const params = core.params.map((p) => `${p.type} ${p.name}${p.desc ? '  // ' + p.desc : ''}`).join('\n      ');
  return `class ${core.className} {\n    public ${core.returns} ${core.method}(${core.params.map((p) => p.type + ' ' + p.name).join(', ')})\n}`;
}

function companyTags(p) {
  if (!p.freq || !p.freq.companies) return '-';
  return p.freq.companies.slice(0, 8).map((c) => `${c.name}(${c.value})`).join(' ');
}

function cmdShow(flags, positional) {
  const p = findProblem(positional[0]);
  console.log(`\n#${p.id} ${p.title}   ${p.difficulty} · ${p.topic}`);
  console.log(`链接: ${p.url}`);
  if (p.freq) {
    console.log(`CodeTop: 排名 #${p.freq.rank}  出现 ${p.freq.value} 次  最近被考 ${p.freq.lastAsked}`);
    console.log(`常考公司: ${companyTags(p)}`);
  }
  console.log(`\n题目描述:\n${p.desc}`);
  if (p.core) {
    console.log(`\n核心代码模式（${p.core.kind === 'ops' ? '类' : '函数'}）:`);
    console.log(coreSignature(p.core));
  }
  if (p.acm) {
    console.log(`\nACM 模式输入:`);
    console.log(p.acm.input);
    console.log(`ACM 模式输出:`);
    console.log(p.acm.output);
    if (p.acm.examples && p.acm.examples[0]) {
      console.log(`示例:\n  输入: ${p.acm.examples[0].input}\n  输出: ${p.acm.examples[0].output}`);
    }
  }
  if (p.explain) console.log(`\n解题思路:\n${p.explain}`);
  const sol = DATA.solutions[String(p.id)];
  if (sol && sol.python3 && sol.python3.core) {
    console.log(`\n参考题解 · Python3（核心代码模式）:`);
    console.log(sol.python3.core);
  }
  if (sol && sol.cpp && sol.cpp.core) {
    console.log(`\n参考题解 · C++（核心代码模式）:`);
    console.log(sol.cpp.core);
  }
}

function usage() {
  console.log(`Hot100 刷题命令行工具

用法:
  hot100 list [--company X] [--difficulty 简单|中等|困难] [--topic 数组] [--top 20] [--sort id|rank]
  hot100 show <id>
  hot100 search <关键词>
  hot100 random [--company X] [--unfinished]
  hot100 init <id> [--lang java|python3|cpp]
  hot100 judge <id> <file> [--lang java|python3|cpp] [--mode core|acm]
  hot100 mark <id> done|star|unstar|reset
  hot100 progress`);
  process.exit(1);
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const { flags, positional } = parseArgs(rest);
  switch (cmd) {
    case 'list': cmdList(flags); break;
    case 'search': cmdSearch(flags, positional); break;
    case 'random': cmdRandom(flags); break;
    case 'show': cmdShow(flags, positional); break;
    case 'init': case 'judge': case 'mark': case 'progress':
      die(`命令 ${cmd} 尚未实现（将在后续任务加入）`);
      break;
    default: usage();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
