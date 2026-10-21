'use strict';

/**
 * 合并 work/parts/ 与 scripts/java-ref/ 为最终数据文件（Java-only）：
 *   problems-g*.json  → data/problems.json（按 id 排序的数组）
 *   tests-g*.json     → data/tests.json（id → {core}）
 *   scripts/java-ref/<id>.java → data/solutions.json（id → {java:{core}}）
 */
const fs = require('fs');
const path = require('path');

const partsDir = path.join(__dirname, '..', 'work', 'parts');
const dataDir = path.join(__dirname, '..', 'data');
const refDir = path.join(__dirname, 'java-ref');

const problemParts = fs.readdirSync(partsDir).filter((f) => /^problems-g\d{2}\.json$/.test(f)).sort();
const testParts = fs.readdirSync(partsDir).filter((f) => /^tests-g\d{2}\.json$/.test(f)).sort();

if (!problemParts.length) {
  console.error('work/parts/ 下没有数据分片，请先运行子代理生成。');
  process.exit(1);
}

const problems = [];
const tests = {};
const solutions = {};

// 保留上一次合并时由生成脚本（build-codetop-data / add-explains）写入的字段
let existing = [];
try {
  existing = JSON.parse(fs.readFileSync(path.join(dataDir, 'problems.json'), 'utf8'));
} catch (e) { /* 首次合并无旧文件 */ }
const preserveFields = (p) => {
  const old = existing.find((x) => x.id === p.id);
  if (!old) return;
  if (old.freq) p.freq = old.freq;
  if (old.explain) p.explain = old.explain;
};

for (const f of problemParts) {
  const arr = JSON.parse(fs.readFileSync(path.join(partsDir, f), 'utf8'));
  for (const p of arr) {
    if (problems.some((x) => x.id === p.id)) {
      console.error(`重复题目 id=${p.id}（${f}）`);
      process.exit(1);
    }
    if (p.acm) { console.error(`题目 #${p.id} 仍包含 acm 数据`); process.exit(1); }
    if (p.core && p.core.templates) { console.error(`题目 #${p.id} 仍包含 core.templates`); process.exit(1); }
    preserveFields(p);
    problems.push(p);
  }
}
for (const f of testParts) {
  const part = JSON.parse(fs.readFileSync(path.join(partsDir, f), 'utf8'));
  for (const id of Object.keys(part)) {
    if (part[id].acm) { console.error(`题目 #${id} 的测试仍包含 acm`); process.exit(1); }
  }
  Object.assign(tests, part);
}

problems.sort((a, b) => a.id - b.id);

for (const p of problems) {
  const refFile = path.join(refDir, `${p.id}.java`);
  if (!fs.existsSync(refFile)) {
    console.error(`缺少 Java 参考题解: scripts/java-ref/${p.id}.java`);
    process.exit(1);
  }
  solutions[String(p.id)] = { java: { core: fs.readFileSync(refFile, 'utf8') } };
}

const missingTests = problems.filter((p) => !tests[p.id] || !Array.isArray(tests[p.id].core) || !tests[p.id].core.length);
if (missingTests.length) {
  console.error('缺少 core 测试用例:', missingTests.map((p) => p.id).join(','));
  process.exit(1);
}

fs.mkdirSync(dataDir, { recursive: true });
fs.writeFileSync(path.join(dataDir, 'problems.json'), JSON.stringify(problems, null, 1), 'utf8');
fs.writeFileSync(path.join(dataDir, 'tests.json'), JSON.stringify(tests, null, 1), 'utf8');
fs.writeFileSync(path.join(dataDir, 'solutions.json'), JSON.stringify(solutions, null, 1), 'utf8');

const coreTests = problems.reduce((n, p) => n + tests[p.id].core.length, 0);
console.log(`合并完成：${problems.length} 题；core 测试用例 ${coreTests} 个；Java 参考题解 ${Object.keys(solutions).length} 份`);
