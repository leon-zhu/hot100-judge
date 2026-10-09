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
// Java 类型词汇与评测驱动共用同一来源（bool→boolean、list→ListNode、grid→char[][]…）
const { JAVA_TYPE } = require(path.join(ROOT, 'judge', 'java-driver'));

const STATE_FILE = path.join(ROOT, 'work', 'cli-state.json');
function loadState() {
  try {
    const s = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    if (s && Array.isArray(s.solved) && Array.isArray(s.starred)) return s;
  } catch { /* 解析失败或结构非法，回退到空状态 */ }
  return { solved: [], starred: [], updatedAt: null };
}
function saveState(s) {
  s.updatedAt = new Date().toISOString();
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
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

const LANG_EXT = { java: 'java', python3: 'py', cpp: 'cpp' };
const EXT_LANG = { java: 'java', py: 'python3', cpp: 'cpp' };

function zeroLiteral(type) {
  const m = {
    int: '0', double: '0.0', bool: 'false', string: '""',
    'int[]': 'new int[0]', 'int[][]': 'new int[0][]',
    'string[]': 'new String[0]', 'string[][]': 'new String[0][]',
    grid: 'new char[0][]', list: 'null', tree: 'null', randomList: 'null',
  };
  return m[type] || 'null';
}

function initTemplate(p, lang) {
  const core = p.core;
  if (!core) die('该题无核心代码模式数据，无法生成模板');
  if (lang === 'java') {
    const jtype = (t) => JAVA_TYPE[t] || t;
    if (core.kind === 'ops') {
      const ctor = (core.ops.constructor || []).map((x) => `${jtype(x.type)} ${x.name}`).join(', ');
      const methods = (core.ops.methods || []).map((m) =>
        `    public ${jtype(m.ret)} ${m.name}(${m.args.map((t, i) => jtype(t) + ' a' + i).join(', ')}) {${m.ret && m.ret !== 'void' ? ' return ' + zeroLiteral(m.ret) + ';' : ''} }`).join('\n');
      return `import java.util.*;\n\n// Hot100 #${p.id} ${p.title}（${p.difficulty}）· ${p.topic}\n// ${(p.explain || '').split('\n')[0]}\nclass ${core.className} {\n    public ${core.className}(${ctor}) {}\n${methods}\n}\n`;
    }
    const params = core.params.map((x) => `${jtype(x.type)} ${x.name}`).join(', ');
    const body = core.returns === 'void' || (core.mutates != null && core.mutates >= 0) ? '' : `return ${zeroLiteral(core.returns)};`;
    return `import java.util.*;\n\n// Hot100 #${p.id} ${p.title}（${p.difficulty}）· ${p.topic}\n// ${(p.explain || '').split('\n')[0]}\nclass ${core.className} {\n    public ${jtype(core.returns)} ${core.method}(${params}) {\n        // TODO: 实现\n        ${body}\n    }\n}\n`;
  }
  // python3 / cpp：直接用题库自带的 core.templates（含 ops 类模板），保证签名与评测驱动一致
  const tpl = core.templates && core.templates[lang];
  if (!tpl) die(`该题暂无 ${lang} 核心代码模板`);
  const cmt = lang === 'python3' ? '#' : '//';
  return `${cmt} Hot100 #${p.id} ${p.title}（${p.difficulty}）· ${p.topic}\n${cmt} ${(p.explain || '').split('\n')[0]}\n${tpl}`;
}

async function cmdJudge(flags, positional) {
  const id = positional[0];
  const file = positional[1];
  if (!file) die('用法: hot100 judge <id> <文件> [--lang java|python3|cpp] [--mode core|acm]');
  const p = findProblem(id);
  let code;
  try { code = fs.readFileSync(file, 'utf8'); } catch { die(`文件不存在: ${file}`); }
  const ext = path.extname(file).slice(1).toLowerCase();
  const lang = flags.lang || EXT_LANG[ext] || 'java';
  const mode = flags.mode || 'core';
  if (lang === 'java' && mode !== 'core') die('Java 仅支持核心代码模式（--mode core）');
  const useCore = mode === 'core' || lang === 'java';
  if (useCore && !p.core) die('该题无核心代码模式数据');
  const tests = DATA.tests[String(p.id)] ? DATA.tests[String(p.id)][mode] : [];
  if (!tests || !tests.length) die(`该题无 ${mode} 测试用例`);
  const { judgeCore, judgeACM, summarize } = require(path.join(ROOT, 'judge', 'judge'));
  const outcome = useCore
    ? await judgeCore({ language: lang, code, core: p.core, tests })
    : await judgeACM({ language: lang, code, tests });
  console.log(`\n#${p.id} ${p.title}  ${p.difficulty} · ${lang} · ${mode === 'core' ? '核心代码模式' : 'ACM 模式'}`);
  if (outcome.error) {
    console.error(`✗ ${outcome.phase === 'compile' ? '编译失败' : '运行失败'}`);
    if (outcome.compileError) console.error(outcome.compileError);
    else console.error(outcome.error);
    process.exitCode = 1;
    return;
  }
  const { passed, total } = summarize(outcome.results, mode);
  const failed = outcome.results.filter((r) => !r.ok);
  for (const r of failed.slice(0, 5)) {
    console.error(`  [用例 ${r.index}] ${r.error ? r.error.split('\n')[0] : ''}`);
    if (r.expected !== undefined && r.got !== undefined) {
      console.error(`      期望: ${JSON.stringify(r.expected)}  实际: ${JSON.stringify(r.got)}`);
    }
  }
  if (failed.length > 5) console.error(`  … 其余 ${failed.length - 5} 个失败用例省略`);
  if (passed === total) {
    console.log(`✅ ${passed}/${total} 全部通过`);
    console.log(`  提示: 已通过可执行 hot100 mark ${p.id} done 记录已刷`);
  } else {
    console.log(`❌ ${passed}/${total} 通过`);
    process.exitCode = 1;
  }
}

function cmdInit(flags, positional) {
  const id = positional[0];
  if (!id) die('用法: hot100 init <id> [--lang java|python3|cpp]');
  const p = findProblem(id);
  const lang = flags.lang || 'java';
  const ext = LANG_EXT[lang];
  const file = `sol-${id}.${ext}`;
  fs.writeFileSync(file, initTemplate(p, lang));
  console.log(`已生成 ${file}（hot100 judge ${id} ${file} 即可评测）`);
}

function cmdMark(flags, positional) {
  const id = positional[0];
  const action = positional[1] || 'done';
  if (!id) die('用法: hot100 mark <id> done|star|unstar|reset');
  findProblem(id);
  const state = loadState();
  if (action === 'done') { if (!state.solved.includes(Number(id))) state.solved.push(Number(id)); }
  else if (action === 'reset') { state.solved = state.solved.filter((x) => x !== Number(id)); }
  else if (action === 'star') { if (!state.starred.includes(Number(id))) state.starred.push(Number(id)); }
  else if (action === 'unstar') { state.starred = state.starred.filter((x) => x !== Number(id)); }
  else die(`未知操作: ${action}`);
  saveState(state);
  console.log(`已标记 #${id} ${action}`);
}

function cmdProgress() {
  const state = loadState();
  const solved = new Set(state.solved);
  const total = DATA.problems.length;
  const pct = Math.round((solved.size / total) * 100);
  const byDiff = { 简单: 0, 中等: 0, 困难: 0 };
  const byTopic = new Map();
  const starList = state.starred.map((id) => DATA.problems.find((p) => p.id === id)).filter(Boolean);
  for (const p of DATA.problems) {
    if (!solved.has(p.id)) continue;
    byDiff[p.difficulty] = (byDiff[p.difficulty] || 0) + 1;
    byTopic.set(p.topic, (byTopic.get(p.topic) || 0) + 1);
  }
  console.log(`已刷 ${solved.size} / ${total}（${pct}%）`);
  console.log(`收藏 ${starList.length} 题`);
  console.log(`按难度: ${Object.entries(byDiff).map(([k, v]) => `${k} ${v}`).join('  ')}`);
  console.log(`按专题: ${[...byTopic.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => `${k} ${v}`).join('  ')}`);
  if (starList.length) console.log(`\n收藏列表:\n` + starList.map((p) => `  ★ #${p.id} ${p.title}`).join('\n'));
  const undone = DATA.problems.filter((p) => !solved.has(p.id)).slice(0, 10);
  if (undone.length) console.log(`\n推荐继续刷（未完成 ${total - solved.size} 题，前 10）:\n` + undone.map((p) => `  #${p.id} ${p.title}`).join('\n'));
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
    case 'init': cmdInit(flags, positional); break;
    case 'judge': await cmdJudge(flags, positional); break;
    case 'mark': cmdMark(flags, positional); break;
    case 'progress': cmdProgress(); break;
    default: usage();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
