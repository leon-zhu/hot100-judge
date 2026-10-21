'use strict';
/**
 * Java 核心代码模式驱动验证（Java-only）：
 *   1) 全 100 题"桩 Solution"冒烟：驱动能编译、能运行、无 ERR
 *   2) scripts/java-ref/ 下的真实题解：全部测试用例通过
 *   3) 本地解析出的官方签名与 judge/official-signatures.json 快照一致
 */
const path = require('path');
const fs = require('fs');
const { judgeCore } = require('../judge/judge');
const { resolveJavaSignature, javaZeroLiteral } = require('../judge/java-signatures');

const ROOT = path.join(__dirname, '..');
const problems = require(path.join(ROOT, 'data/problems.json'));
const tests = require(path.join(ROOT, 'data/tests.json'));
const official = require(path.join(ROOT, 'judge/official-signatures.json'));

function stubFor(prob) {
  const sig = resolveJavaSignature(prob.id, prob.core);
  if (sig.kind === 'ops') {
    const ctorParams = sig.ops.constructor.map((p) => `${p.javaType} a${p.name}`).join(', ');
    const methods = sig.ops.methods.map((m) => {
      const params = m.args.map((a, i) => `${a.javaType} a${i}`).join(', ');
      const body = m.javaRet === 'void' ? '' : `return ${javaZeroLiteral(m.javaRet)};`;
      return `    public ${m.javaRet} ${m.name}(${params}) { ${body} }`;
    }).join('\n');
    return `import java.util.*;\nclass ${sig.className} {\n    public ${sig.className}(${ctorParams}) {}\n${methods}\n}\n`;
  }
  const params = sig.params.map((p) => `${p.javaType} ${p.name}`).join(', ');
  const isVoid = sig.returns.javaType === 'void' || sig.mutates >= 0;
  const body = isVoid ? '' : `return ${javaZeroLiteral(sig.returns.javaType)};`;
  return `import java.util.*;\nclass ${sig.className} {\n    public ${sig.returns.javaType} ${sig.method}(${params}) { ${body} }\n}\n`;
}

const norm = (t) => String(t).replace(/\s+/g, ' ').replace(/\s*([<>,\[\]])\s*/g, '$1').trim();

function checkOfficialSignatures(only) {
  let pass = true;
  for (const p of problems) {
    if (only && String(p.id) !== only) continue;
    const snap = official[p.id];
    if (!snap) { console.error(`✗ #${p.id} 缺少官方签名快照`); pass = false; continue; }
    const sig = resolveJavaSignature(p.id, p.core);
    if (p.core.kind === 'ops') {
      if (snap.kind !== 'ops' || norm(sig.className) !== norm(snap.className)) {
        console.error(`✗ #${p.id} ops 类名不一致: ${sig.className} vs ${snap.className}`);
        pass = false;
      }
      continue;
    }
    const gotParams = sig.params.map((x) => norm(x.javaType));
    const gotRet = norm(sig.returns.javaType);
    const ok = gotRet === norm(snap.returns) &&
      gotParams.length === snap.params.length &&
      gotParams.every((t, i) => t === norm(snap.params[i]));
    if (!ok) {
      console.error(`✗ #${p.id} ${p.title} 官方签名不一致: ` +
        `${gotRet} (${gotParams.join(', ')}) vs ${snap.returns} (${snap.params.join(', ')})`);
      pass = false;
    }
  }
  if (pass) console.log('✓ 官方 Java 签名快照一致');
  return pass;
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
    const out = await judgeCore({ code: stubFor(prob), core: prob.core, tests: tests[prob.id].core, problemId: prob.id });
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
    if (only && String(id) !== only) continue;
    const prob = problems.find((p) => p.id === id);
    if (!prob) { console.error(`✗ 参考题解 ${id}: 题库中无此题`); pass = false; continue; }
    const code = fs.readFileSync(path.join(dir, f), 'utf8');
    const out = await judgeCore({ code, core: prob.core, tests: tests[id].core, problemId: id });
    if (out.error) { console.error(`✗ 参考题解 ${id}: ${out.error}`); pass = false; continue; }
    const failed = (out.results || []).filter((r) => !r.ok);
    if (failed.length) {
      console.error(`✗ 参考题解 ${id} ${prob.title}: ${failed.length}/${out.results.length} 失败`);
      console.error('   首个失败: ' + JSON.stringify(failed[0]).slice(0, 300));
      pass = false;
    } else console.log(`✓ 参考题解 ${id} ${prob.title}: ${out.results.length}/${out.results.length} 通过`);
  }

  // part 3: 官方签名快照
  if (!only) pass = checkOfficialSignatures(only) && pass;

  console.log(pass ? '\n✅ Java 验证全部通过' : '\n❌ Java 验证有失败');
  process.exit(pass ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
