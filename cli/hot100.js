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

// 东亚宽字符（CJK/全角）在终端占 2 列，padEnd 按 UTF-16 码元数填充会导致中文列错位
const WIDE_RE = /[\u1100-\u115f\u2e80-\ua4cf\uac00-\ud7a3\uf900-\ufaff\ufe30-\ufe4f\uff00-\uff60\uffe0-\uffe6]/;
function dispWidth(s) {
  let w = 0;
  for (const ch of String(s)) w += WIDE_RE.test(ch) ? 2 : 1;
  return w;
}
function padW(t, n) {
  const d = n - dispWidth(t);
  return t + (d > 0 ? ' '.repeat(d) : '');
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
  console.log(padW('ID', 5) + padW('难度', 6) + padW('专题', 16) + padW('高频', 5) + padW('标题', 40) + '状态');
  for (const p of list) {
    console.log(padW(String(p.id), 5) + padW(p.difficulty, 6) + padW(p.topic, 16) +
      padW(String((p.freq && p.freq.rank) || '-'), 5) + padW(p.title, 40) + statusMark(p, state));
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
  // 解题思路与参考题解默认不展示，加 --explain 追加
  if (flags.explain) {
    if (p.explain) console.log(`\n解题思路:\n${p.explain}`);
    const sol = DATA.solutions[String(p.id)];
    if (sol && sol.python3 && sol.python3.core) {
      console.log(`\n参考题解 · Python3（核心代码模式）:`);
      console.log(sol.python3.core);
    }
    if (sol && sol.java && sol.java.core) {
      console.log(`\n参考题解 · Java（核心代码模式）:`);
      console.log(sol.java.core);
    }
  } else {
    console.log(`\n提示: 加 --explain 查看解题思路与参考题解`);
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

// 评测驱动（judge/java-driver.js 生成的 Main.java）已注入这些类型。
// 模板里以注释形式列出，仅作对照参考；不要取消注释后直接 judge，
// 否则会与驱动中的同名类冲突（javac：类重复）。
const JAVA_TYPE_DEFS = {
  ListNode: `/**
 * Definition for singly-linked list.
 * class ListNode {
 *     int val;
 *     ListNode next;
 *     ListNode() {}
 *     ListNode(int val) { this.val = val; }
 *     ListNode(int val, ListNode next) { this.val = val; this.next = next; }
 * }
 */`,
  TreeNode: `/**
 * Definition for a binary tree node.
 * class TreeNode {
 *     int val;
 *     TreeNode left;
 *     TreeNode right;
 *     TreeNode() {}
 *     TreeNode(int val) { this.val = val; }
 *     TreeNode(int val, TreeNode left, TreeNode right) {
 *         this.val = val;
 *         this.left = left;
 *         this.right = right;
 *     }
 * }
 */`,
  Node: `/**
 * Definition for a Node.
 * class Node {
 *     int val;
 *     Node next;
 *     Node random;
 *     Node(int val) { this.val = val; this.next = null; this.random = null; }
 * }
 */`,
};

function javaNeededTypes(core) {
  const found = new Set();
  const add = (t) => {
    if (t === 'list' || t === 'cycleList' || t === 'intersectList' || t === 'listArray') found.add('ListNode');
    else if (t === 'tree') found.add('TreeNode');
    else if (t === 'randomList') found.add('Node');
  };
  if (core.kind === 'ops') {
    (core.ops.constructor || []).forEach((x) => add(x.type));
    (core.ops.methods || []).forEach((m) => { (m.args || []).forEach(add); add(m.ret); });
  } else {
    (core.params || []).forEach((x) => add(x.type));
    add(core.returns);
  }
  return [...found];
}

function initTemplate(p, lang) {
  const core = p.core;
  if (!core) die('该题无核心代码模式数据，无法生成模板');
  if (lang === 'java') {
    const jtype = (t) => JAVA_TYPE[t] || t;
    // 该题依赖的、由评测环境提供的类型定义（注释形式，便于对照）
    const defs = javaNeededTypes(core).map((t) => JAVA_TYPE_DEFS[t]).join('\n\n');
    const defsBlock = defs ? defs + '\n\n' : '';
    if (core.kind === 'ops') {
      const ctor = (core.ops.constructor || []).map((x) => `${jtype(x.type)} ${x.name}`).join(', ');
      const methods = (core.ops.methods || []).map((m) =>
        `    public ${jtype(m.ret)} ${m.name}(${m.args.map((t, i) => jtype(t) + ' a' + i).join(', ')}) {${m.ret && m.ret !== 'void' ? ' return ' + zeroLiteral(m.ret) + ';' : ''} }`).join('\n');
      return `${defsBlock}import java.util.*;\n\n// Hot100 #${p.id} ${p.title}（${p.difficulty}）· ${p.topic}\nclass ${core.className} {\n    public ${core.className}(${ctor}) {}\n${methods}\n}\n`;
    }
    const params = core.params.map((x) => `${jtype(x.type)} ${x.name}`).join(', ');
    const body = core.returns === 'void' || (core.mutates != null && core.mutates >= 0) ? '' : `return ${zeroLiteral(core.returns)};`;
    return `${defsBlock}import java.util.*;\n\n// Hot100 #${p.id} ${p.title}（${p.difficulty}）· ${p.topic}\nclass ${core.className} {\n    public ${jtype(core.returns)} ${core.method}(${params}) {\n        // TODO: 实现\n        ${body}\n    }\n}\n`;
  }
  // python3 / cpp：直接用题库自带的 core.templates（含 ops 类模板），保证签名与评测驱动一致
  const tpl = core.templates && core.templates[lang];
  if (!tpl) die(`该题暂无 ${lang} 核心代码模板`);
  const cmt = lang === 'python3' ? '#' : '//';
  return `${cmt} Hot100 #${p.id} ${p.title}（${p.difficulty}）· ${p.topic}\n${tpl}`;
}

async function cmdJudge(flags, positional) {
  const id = positional[0];
  const file = positional[1];
  if (!file) die('用法: hot100 judge <id> <文件> [--lang java|python3|cpp] [--mode core|acm] [--cloud] [--regenerate] [--no-extend]');
  const p = findProblem(id);
  let code;
  try { code = fs.readFileSync(file, 'utf8'); } catch { die(`文件不存在: ${file}`); }
  const ext = path.extname(file).slice(1).toLowerCase();
  const lang = flags.lang || EXT_LANG[ext] || 'java';
  const mode = flags.mode || 'core';
  if (lang === 'java' && mode !== 'core') die('Java 仅支持核心代码模式（--mode core）');
  const useCore = mode === 'core' || lang === 'java';
  if (useCore && !p.core) die('该题无核心代码模式数据');
  const bundled = DATA.tests[String(p.id)] ? DATA.tests[String(p.id)][mode] : [];
  if (!bundled || !bundled.length) die(`该题无 ${mode} 测试用例`);

  // 扩展用例：core 模式才合并；--no-extend 跳过；--regenerate 强制重建
  let extended = [];
  let hasExt = false;
  if (useCore && !flags['no-extend']) {
    const { loadExtendedTests, generateExtendedTests } = require(path.join(ROOT, 'judge', 'extend-tests'));
    let cache = flags.regenerate ? null : loadExtendedTests(String(p.id));
    if (!cache) {
      cache = await generateExtendedTests(String(p.id));
      if ((cache.core || []).length) console.log(`已生成 ${cache.core.length} 个扩展用例（work/extended/tests-${p.id}.json）`);
      else if (cache.refUnusable) console.warn(`该题暂无扩展用例（参考题解未通过内置用例，已跳过）`);
      else console.warn(`该题暂无扩展用例（无法生成合法输入）`);
    }
    extended = cache.core || [];
    hasExt = extended.length > 0;
  }
  const tests = [...bundled, ...extended];
  const nBundled = bundled.length;

  const { judgeCore, judgeACM, summarize } = require(path.join(ROOT, 'judge', 'judge'));
  const outcome = useCore
    ? await judgeCore({ language: lang, code, core: p.core, tests, problemId: p.id })
    : await judgeACM({ language: lang, code, tests });
  console.log(`\n#${p.id} ${p.title}  ${p.difficulty} · ${lang} · ${mode === 'core' ? '核心代码模式' : 'ACM 模式'}${hasExt ? ` · 含 ${extended.length} 个扩展用例` : ''}`);
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
    const kind = r.index < nBundled ? '内置' : '扩展';
    console.error(`  [用例 ${r.index}·${kind}] ${r.error ? r.error.split('\n')[0] : ''}`);
    const t = tests[r.index];
    if (useCore) {
      const parts = [];
      if (t && t.ops) parts.push(`ops=${JSON.stringify(t.ops)}`);
      if (t && t.args) parts.push(`args=${JSON.stringify(t.args)}`);
      if (parts.length) console.error(`      输入: ${parts.join(' ')}`);
    } else if (t) {
      console.error(`      输入: ${JSON.stringify(t.input)}`);
    }
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

  // 云端判定（仅核心代码模式；失败非致命，不影响本地退出码）
  if (flags.cloud) {
    if (!useCore) {
      console.warn('  云端判定仅支持核心代码模式（--mode core），已跳过');
    } else {
      try {
        const { submitToLeetCode } = require(path.join(ROOT, 'judge', 'leetcode-submit'));
        const verdict = await submitToLeetCode({ problem: p, code, lang });
        if (verdict.error) {
          console.warn(`  ⚠ 云端判定失败: ${verdict.error}`);
        } else {
          const mark = verdict.accepted ? '✅' : '❌';
          console.log(`  ${mark} LeetCode: ${verdict.statusMsg}`);
          if (verdict.detail) console.log(`     ${verdict.detail}`);
        }
      } catch (e) {
        console.warn(`  ⚠ 云端判定不可用: ${e.message}`);
      }
    }
  }
}

async function cmdLogin(flags) {
  const { login } = require(path.join(ROOT, 'judge', 'leetcode-login'));
  await login({ browser: !!flags.browser });
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
  const solvedList = DATA.problems.filter((p) => solved.has(p.id)).sort((a, b) => a.id - b.id);
  for (const p of solvedList) {
    byDiff[p.difficulty] = (byDiff[p.difficulty] || 0) + 1;
    byTopic.set(p.topic, (byTopic.get(p.topic) || 0) + 1);
  }
  console.log(`已刷 ${solved.size} / ${total}（${pct}%）`);
  console.log(`收藏 ${starList.length} 题`);
  console.log(`按难度: ${Object.entries(byDiff).map(([k, v]) => `${k} ${v}`).join('  ')}`);
  console.log(`按专题: ${[...byTopic.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => `${k} ${v}`).join('  ')}`);
  if (solvedList.length) console.log(`\n已刷列表:\n` + solvedList.map((p) => `  ✓ #${padW(String(p.id), 4)}${p.title}（${p.difficulty} · ${p.topic}）`).join('\n'));
  if (starList.length) console.log(`\n收藏列表:\n` + starList.map((p) => `  ★ #${p.id} ${p.title}`).join('\n'));
  const undone = DATA.problems.filter((p) => !solved.has(p.id)).slice(0, 10);
  if (undone.length) console.log(`\n推荐继续刷（未完成 ${total - solved.size} 题，前 10）:\n` + undone.map((p) => `  #${p.id} ${p.title}`).join('\n'));
}

function usage(code = 1) {
  console.log(`Hot100 刷题命令行工具 —— LeetCode Hot 100 本地刷题工作台
题库 100 题 / 959 测试用例 / 400 份题解，纯本地离线可用。

用法:  hot100 <命令> [参数]

── 查询 ─────────────────────────────
  list [选项]                  题目列表（表格输出）
      选项: --company <公司>   --difficulty 简单|中等|困难   --topic <专题>
            --top <N>          --sort id|rank
      示例: hot100 list --top 20
           hot100 list --company 字节跳动 --difficulty 中等 --sort rank

  show <题号> [--explain]      题目详情（描述/核心签名/ACM/CodeTop 高频）
      加 --explain 追加解题思路与参考题解
      示例: hot100 show 1            # 只看题目信息
           hot100 show 1 --explain   # 附带解题思路与 Python3/Java 参考题解

  search <关键词>               按标题/描述/专题搜索
      示例: hot100 search 最长

  random [--company X] [--unfinished]   随机抽一题
      示例: hot100 random --unfinished   # 只从未完成的题里抽

── 刷题 ─────────────────────────────
  login [--browser]          保存 --cloud 所需登录态（不保存密码）
      默认先从日常 Chrome 导入已登录的 leetcode.cn cookie（需 macOS 钥匙串授权）；
      找不到有效登录态时才拉起独立 Chrome 窗口手动登录，成功后写入
      work/leetcode-config.json（chmod 600）。登录失效时重跑一次即可
      --browser     跳过导入，直接打开浏览器登录
      示例: hot100 login

  init <题号> [--lang java|python3|cpp]   生成模板文件（默认 Java）
      模板含正确的方法签名与 import，可直接开始写
      示例: hot100 init 1 --lang java

  judge <题号> <文件> [--lang X] [--mode core|acm]   提交答案评测
      语言按扩展名推断（.java/.py/.cpp），--mode 默认 core
      自动合并本地扩展测试用例（首次自动生成缓存，可 --regenerate 重建）
      通过输出 ✅ n/n；失败输出 ❌ 并列出期望/实际（标注内置/扩展）
      --cloud       本地判完后提交 leetcode.cn 拿官方判定（需登录态 cookie）
      --no-extend   只用内置用例
      --regenerate  强制重建扩展用例缓存
      示例: hot100 judge 1 sol-1.java
           hot100 judge 3 sol-3.java --cloud

── 进度 ─────────────────────────────
  mark <题号> done|star|unstar|reset   标记已刷 / 收藏错题 / 取消
      示例: hot100 mark 42 done       # 标记已刷
           hot100 mark 42 star        # 收藏到错题本

  progress                   刷题进度统计（已刷列表/收藏/难度与专题分布/推荐继续刷）

  -h, --help                 显示本帮助
进度数据保存在 work/cli-state.json，纯本地。`);
  process.exit(code);
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const { flags, positional } = parseArgs(rest);
  switch (cmd) {
    case 'list': cmdList(flags); break;
    case 'search': cmdSearch(flags, positional); break;
    case 'random': cmdRandom(flags); break;
    case 'show': cmdShow(flags, positional); break;
    case 'login': await cmdLogin(flags); break;
    case 'init': cmdInit(flags, positional); break;
    case 'judge': await cmdJudge(flags, positional); break;
    case 'mark': cmdMark(flags, positional); break;
    case 'progress': cmdProgress(); break;
    case '-h': case '--help': case 'help': usage(0); break;
    default: usage();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
