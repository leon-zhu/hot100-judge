'use strict';

/**
 * 全量扩展用例验证（Java-only）：
 *   遍历 100 题生成扩展用例，再用题库自带 Java 参考题解跑一遍，
 *   断言「参考题解全过」——参考题解都过不了说明生成的用例有歧义/非法（会误伤正确解）。
 *
 *   node scripts/verify-extend-all.js
 */
const fs = require('fs');
const path = require('path');
const { generateExtendedTests } = require('../judge/extend-tests');
const { judgeCore } = require('../judge/judge');

const ROOT = path.join(__dirname, '..');
const problems = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/problems.json'), 'utf8'));
const solutions = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/solutions.json'), 'utf8'));

async function main() {
  const report = [];
  let fatal = 0;
  for (const p of problems) {
    const ext = await generateExtendedTests(p.id);
    const cases = ext.core || [];
    const row = { id: p.id, title: p.title, n: cases.length, refUnusable: ext.refUnusable, low: ext.lowCoverage, fails: {} };
    if (!cases.length) { report.push(row); continue; }
    const code = solutions[String(p.id)] && solutions[String(p.id)].java && solutions[String(p.id)].java.core;
    if (!code) { row.fails.java = 'NO_REF'; }
    else {
      const r = await judgeCore({ code, core: p.core, tests: cases, problemId: p.id });
      if (r.error) row.fails.java = 'RUN:' + String(r.error).slice(0, 80);
      else {
        const bad = r.results.filter((x) => !x.ok);
        if (bad.length) row.fails.java = `${bad.length}/${r.results.length}`;
      }
    }
    report.push(row);
    const mark = Object.keys(row.fails).length ? '❌' : '✅';
    process.stdout.write(`${mark} #${p.id} ${p.title} (${cases.length}) ${JSON.stringify(row.fails)}\n`);
    if (Object.keys(row.fails).length) fatal++;
  }

  console.log('\n===== 汇总 =====');
  const empty = report.filter((r) => !r.n);
  const low = report.filter((r) => r.n && r.low);
  const bad = report.filter((r) => Object.keys(r.fails).length);
  console.log(`可扩展: ${report.filter((r) => r.n > 0).length}/${report.length}`);
  console.log(`空用例: ${empty.length ? empty.map((r) => '#' + r.id).join(' ') : '无'}`);
  console.log(`低覆盖: ${low.length ? low.map((r) => '#' + r.id + '(' + r.n + ')').join(' ') : '无'}`);
  console.log(`参考题解未全过: ${bad.length ? bad.map((r) => '#' + r.id + JSON.stringify(r.fails)).join(' ') : '无'}`);
  console.log(`总扩展用例: ${report.reduce((a, b) => a + b.n, 0)}`);
  process.exit(fatal || empty.length ? 1 : 0);
}

main().catch((e) => { console.error(e); process.exit(1); });
