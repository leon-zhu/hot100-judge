'use strict';

/**
 * 核心代码模式评测（Java-only）：
 * 生成驱动源文件，一次编译/运行跑完全部用例，输出每个用例的通过情况。
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { runProcess, commandExists } = require('./runner');
const { buildJavaDriver } = require('./java-driver');
const { checkerFor } = require('./checkers');

const CORE_TIMEOUT_MS = 8000;

/** 核心代码模式评测：一次编译 + 一次运行，跑完全部用例。 */
async function judgeCore({ code, core, tests, problemId }) {
  const checker = checkerFor(problemId);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hot100-judge-'));
  try {
    const cases = core.kind === 'ops'
      ? tests.map((t) => ({ ops: t.ops, args: t.args, expected: t.expected }))
      : tests.map((t) => ({ args: t.args, expected: t.expected }));

    const javac = await commandExists('javac');
    const java = await commandExists('java');
    if (!javac || !java) return { error: '当前系统未安装 javac/java。', phase: 'compile' };

    const source = buildJavaDriver({ core, code, cases, checker, problemId });
    const srcMain = path.join(tmp, 'Main.java');
    const srcUser = path.join(tmp, `${core.className}.java`);
    const outDir = path.join(tmp, 'out');
    const casesFile = path.join(tmp, 'cases.json');
    fs.mkdirSync(outDir);
    fs.writeFileSync(srcMain, source, 'utf8');
    fs.writeFileSync(srcUser, code, 'utf8');
    fs.writeFileSync(casesFile, JSON.stringify(cases), 'utf8');

    const compiled = await runProcess(javac, ['-encoding', 'UTF-8', '-d', outDir, srcMain, srcUser], { cwd: tmp, phase: 'compile' });
    if (compiled.code !== 0 || compiled.timedOut) {
      return { error: '编译错误（请检查核心类/方法签名）', compileError: compiled.stderr || compiled.error, phase: 'compile' };
    }

    const run = await runProcess(java, [
      '-Xmx256m',
      '-XX:ReservedCodeCacheSize=48m',
      '-XX:MaxMetaspaceSize=96m',
      '-Dfile.encoding=UTF-8',
      '-cp', outDir,
      'Main', casesFile,
    ], { cwd: tmp, timeout: CORE_TIMEOUT_MS });
    if (run.timedOut) return { error: `运行超时 ${run.ms}ms`, phase: 'run' };
    if (run.code !== 0) return { error: run.stderr || run.error || `退出码 ${run.code}`, phase: 'run' };
    return parseCoreResults(run.stdout);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

/**
 * 解析驱动输出。驱动对每个用例输出 {"ok":true} 或 {"ok":false,"expected":..,"got":..,"error":..}。
 * expected/got 为 JSON 值。
 */
function parseCoreResults(stdout) {
  let arr;
  try {
    arr = JSON.parse(stdout);
  } catch (e) {
    return { error: '评测驱动输出异常', phase: 'run', raw: stdout.slice(0, 2000) };
  }
  if (!Array.isArray(arr)) return { error: '评测驱动输出异常', phase: 'run' };
  return { results: arr.map((r, i) => ({ index: i, ...r })) };
}

/** 汇总为前端展示结构。 */
function summarize(results) {
  let passed = 0;
  for (const r of results) if (r.ok) passed++;
  return { passed, total: results.length, allPassed: passed === results.length };
}

module.exports = { judgeCore, summarize };
