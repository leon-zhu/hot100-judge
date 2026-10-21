'use strict';
/**
 * Java 核心代码模式驱动验证：
 *   1) 全 100 题"桩 Solution"冒烟：驱动能编译、能运行、无 ERR（覆盖全部类型通路）
 *   2) scripts/java-ref/ 下的真实题解：全部测试用例通过（验证驱动语义正确）
 */
const path = require('path');
const fs = require('fs');
const { judgeCore } = require('../judge/judge');

const ROOT = path.join(__dirname, '..');
const problems = require(path.join(ROOT, 'public/data/problems.json'));
const tests = require(path.join(ROOT, 'public/data/tests.json'));

// 类型 → [Java 类型, 零值字面量]
const STUB = {
  int: ['int', '0'], double: ['double', '0.0'], bool: ['boolean', 'false'],
  string: ['String', '""'],
  'int[]': ['int[]', 'new int[0]'], 'int[][]': ['int[][]', 'new int[0][]'],
  'string[]': ['String[]', 'new String[0]'], 'string[][]': ['String[][]', 'new String[0][]'],
  grid: ['char[][]', 'new char[0][]'],
  list: ['ListNode', 'null'], tree: ['TreeNode', 'null'], randomList: ['Node', 'null'],
  void: ['void', null],
};

function stubFor(prob) {
  const core = prob.core;
  if (core.kind === 'ops') return stubOps(core);
  const params = core.params.map((p) => `${STUB[p.type][0]} ${p.name}`).join(', ');
  const [ret, zero] = STUB[core.returns] || STUB.int;
  const isVoid = core.returns === 'void' || (core.mutates != null && core.mutates >= 0);
  const body = isVoid ? '' : `return ${zero};`;
  return `class ${core.className} {\n    public ${ret} ${core.method}(${params}) { ${body} }\n}\n`;
}

function stubOps(core) {
  const ctor = core.ops.constructor || [];
  const ctorParams = ctor.map((p) => `${STUB[p.type][0]} a${p.name}`).join(', ');
  const methods = (core.ops.methods || []).map((m) => {
    const params = m.args.map((t, i) => `${STUB[t][0]} a${i}`).join(', ');
    const [ret, zero] = STUB[m.ret] || STUB.int;
    const body = m.ret === 'void' ? '' : `return ${zero};`;
    return `    public ${ret} ${m.name}(${params}) { ${body} }`;
  }).join('\n');
  return `class ${core.className} {\n    public ${core.className}(${ctorParams}) {}\n${methods}\n}\n`;
}

async function main() {
  let pass = true;
  const only = process.argv[2]; // 可选：只验证指定题号
  const ids = problems
    .filter((p) => p.core)
    .filter((p) => !only || String(p.id) === only)
    .filter((p) => p.core.kind === 'function' || p.core.kind === 'ops');
  // part 1: 桩冒烟
  for (const prob of ids) {
    if (!tests[prob.id] || !tests[prob.id].core) continue;
    const out = await judgeCore({ language: 'java', code: stubFor(prob), core: prob.core, tests: tests[prob.id].core, problemId: prob.id });
    if (out.error) { console.error(`✗ ${prob.id} ${prob.title}: 驱动错误 ${out.error}`); pass = false; continue; }
    const errs = (out.results || []).filter((r) => r.error && String(r.error).startsWith('ERR:'));
    if (errs.length) { console.error(`✗ ${prob.id} ${prob.title}: ${errs[0].error}`); pass = false; }
    else console.log(`✓ ${prob.id} ${prob.title}: 桩冒烟通过（${out.results.length} 用例）`);
  }
  // part 2: 真实参考题解
  const dir = path.join(__dirname, 'java-ref');
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.java')) : [];
  for (const f of files) {
    const id = Number(f.replace('.java', ''));
    if (only && String(id) !== only) continue; // only 模式下只验证指定题号
    const prob = problems.find((p) => p.id === id);
    if (!prob) { console.error(`✗ 参考题解 ${id}: 题库中无此题`); pass = false; continue; }
    const code = fs.readFileSync(path.join(dir, f), 'utf8');
    const out = await judgeCore({ language: 'java', code, core: prob.core, tests: tests[id].core, problemId: id });
    if (out.error) { console.error(`✗ 参考题解 ${id}: ${out.error}`); pass = false; continue; }
    const failed = (out.results || []).filter((r) => !r.ok);
    if (failed.length) {
      console.error(`✗ 参考题解 ${id} ${prob.title}: ${failed.length}/${out.results.length} 失败`);
      console.error('   首个失败: ' + JSON.stringify(failed[0]).slice(0, 300));
      pass = false;
    } else console.log(`✓ 参考题解 ${id} ${prob.title}: ${out.results.length}/${out.results.length} 通过`);
  }
  console.log(pass ? '\n✅ Java 验证全部通过' : '\n❌ Java 验证有失败');
  process.exit(pass ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
