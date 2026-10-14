'use strict';

/**
 * 扩展测试用例编排层：
 *   resolveSpec(自动推导 + 手写 override) → 生成候选输入 → 参考题解 oracle 求期望值
 *   → 丢弃非法用例 / 去重 / 裁剪 → work/extended/tests-<id>.json（gitignore，可 --regenerate 重建）
 *
 * 期望值来源：题库自带 python3 参考题解（见 judge/gen/oracle.js）。参考题解抛异常的用例被丢弃。
 */
const fs = require('fs');
const path = require('path');
const { resolveSpec } = require('./gen/spec');
const { seededRandom, genValue, genOps } = require('./gen/inputs');
const { runReference, verifyReference } = require('./gen/oracle');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'public', 'data');
const EXT_DIR = path.join(ROOT, 'work', 'extended');
const SEED = 20261013;
const MAX_CASES = 100;
const TARGET_CASES = 40;
const MAX_ROUNDS = 12;

let _data = null;
function data() {
  if (!_data) {
    _data = {
      problems: JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'problems.json'), 'utf8')),
      solutions: JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'solutions.json'), 'utf8')),
      tests: JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'tests.json'), 'utf8')),
    };
  }
  return _data;
}

/** 每题独立种子，避免跨题序列相关。 */
function seedFor(id) { return (SEED ^ (Number(id) * 2654435761)) >>> 0; }

/**
 * 批量跑参考题解；整批失败（如某用例死循环触发 CPU 限）时二分重试，
 * 避免单个坏用例拖垮整批。返回与 batch 等长、按序对齐的结果。
 */
async function runBatchRobust(core, ref, kind, batch) {
  if (!batch.length) return [];
  const { fatal, results } = await runReference({ core, refCode: ref, kind, candidates: batch });
  if (!fatal) return results;
  if (batch.length === 1) return [{ valid: false }];
  const mid = Math.floor(batch.length / 2);
  const a = await runBatchRobust(core, ref, kind, batch.slice(0, mid));
  const b = await runBatchRobust(core, ref, kind, batch.slice(mid));
  return [...a, ...b];
}

function exhaustiveStrings(alphabet, maxLen) {
  const out = [];
  const rec = (prefix, len) => {
    if (len === 0) { out.push(prefix); return; }
    for (const ch of alphabet) rec(prefix + ch, len - 1);
  };
  for (let len = 0; len <= maxLen; len++) rec('', len);
  return out;
}

/**
 * 生成某题的扩展用例（不含落盘）。
 * @returns {Promise<{kind:string, core:Array, refUnusable:boolean, lowCoverage:boolean}>}
 */
async function buildCases(id) {
  id = String(id);
  const d = data();
  const p = d.problems.find((x) => x.id === Number(id));
  if (!p || !p.core) return { kind: 'func', core: [], refUnusable: false, lowCoverage: true };
  const kind = p.core.kind === 'ops' ? 'ops' : 'func';
  const bundled = (d.tests[id] && d.tests[id].core) || [];
  const sol = d.solutions[id];
  const ref = sol && sol.python3 && sol.python3.core;
  if (!ref) return { kind, core: [], refUnusable: true, lowCoverage: true };

  const spec = resolveSpec(id, p.core, kind, bundled);

  // 参考题解自检：不过则其输出不可信，放弃本题扩展
  const ok = await verifyReference({ core: p.core, refCode: ref, kind, bundled });
  if (!ok) return { kind, core: [], refUnusable: true, lowCoverage: true };

  const rand = seededRandom(seedFor(id));
  const seen = new Set();
  const cases = [];
  const keyOf = (c) => JSON.stringify(c.ops ? { ops: c.ops, args: c.args } : c.args);
  const addCase = (c, expected) => {
    if (cases.length >= MAX_CASES) return;
    const key = keyOf(c);
    if (seen.has(key)) return;
    seen.add(key);
    cases.push(kind === 'ops' ? { ops: c.ops, args: c.args, expected } : { args: c.args, expected });
  };

  // round 0 注入手写边界 + 穷举空间；后续轮次随机生成
  const curated = (spec.curated || []).map((c) => (kind === 'ops' ? { ops: c.ops, args: c.args } : { args: c }));
  const exhausted = [];
  if (spec.exhaustive) {
    for (const s of exhaustiveStrings(spec.exhaustive.alphabet, spec.exhaustive.maxLen)) exhausted.push({ args: [s] });
  }

  let round = 0;
  while (cases.length < TARGET_CASES && round < MAX_ROUNDS) {
    const batch = [];
    if (round === 0) batch.push(...curated, ...exhausted);
    const want = TARGET_CASES - cases.length + 10;
    for (let i = 0; i < want && batch.length < MAX_CASES; i++) {
      if (kind === 'ops') batch.push(genOps(rand, p.core, spec));
      else {
        const args = spec.build ? spec.build(rand) : (spec.params || []).map((x) => genValue(rand, x));
        if (args) batch.push({ args });
      }
    }
    const results = await runBatchRobust(p.core, ref, kind, batch);
    for (let i = 0; i < batch.length; i++) {
      const r = results[i];
      if (r && r.valid && r.got !== undefined) addCase(batch[i], r.got);
    }
    round++;
  }

  // 注意：单参数小值域题（如 #22 括号生成，n=0..8 即全部可能输入）用例数天然偏少，不算低覆盖
  const lowCoverage = cases.length < Math.min(8, TARGET_CASES);
  return { kind, core: cases, refUnusable: false, lowCoverage };
}

function extendedCachePath(id) {
  id = String(id);
  return path.join(EXT_DIR, `tests-${id}.json`);
}

function loadExtendedTests(id) {
  id = String(id);
  try {
    return JSON.parse(fs.readFileSync(extendedCachePath(id), 'utf8'));
  } catch { return null; }
}

async function generateExtendedTests(id) {
  id = String(id);
  const out = await buildCases(id);
  const payload = {
    problemId: id,
    seed: SEED,
    generatedAt: new Date().toISOString(),
    kind: out.kind,
    refUnusable: out.refUnusable,
    lowCoverage: out.lowCoverage,
    core: out.core,
    acm: [],
  };
  fs.mkdirSync(EXT_DIR, { recursive: true });
  fs.writeFileSync(extendedCachePath(id), JSON.stringify(payload, null, 1), 'utf8');
  return payload;
}

module.exports = { generateExtendedTests, loadExtendedTests, buildCases, seededRandom, MAX_CASES, TARGET_CASES };
