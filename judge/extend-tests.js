'use strict';

/**
 * 扩展测试用例生成器：
 *   - oracle 注册表：按题号定义 暴力 oracle / 随机输入生成器 / 手写边界 / 穷举空间
 *   - 生成 → work/extended/tests-<id>.json（gitignore，可 --regenerate 重建）
 * MVP 只支持 core 模式，且参数/返回类型为 int/string/int[]/int[][]/bool/string[]
 * （驱动可直接 JSON 序列化对比）。链表/树/grid 等带记号类型暂不纳入。
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const EXT_DIR = path.join(ROOT, 'work', 'extended');
const SEED = 20261013;
const MAX_CASES = 100;

/** 带种子的确定性 PRNG（mulberry32）。 */
function seededRandom(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---- #1 两数之和：暴力 oracle + 手写边界 + 带种子随机 ----
function twoSumBrute(args) {
  // 与参考题解一致的确定性扫描：记录每个值最后一次出现的下标，
  // 遇到首个可配对下标即返回。重复值/多解时与单次扫描参考题解输出严格一致，
  // 避免生成用例的期望值出现多解歧义（无假阳性）。
  const [nums, target] = args;
  const last = new Map();
  for (let j = 0; j < nums.length; j++) {
    const comp = target - nums[j];
    if (last.has(comp)) return [last.get(comp), j];
    last.set(nums[j], j);
  }
  return []; // 无解约定返回空数组
}
function twoSumRandom(rand) {
  const n = 2 + Math.floor(rand() * 29); // 2..30
  const nums = [];
  for (let i = 0; i < n; i++) nums.push(Math.floor(rand() * 101) - 50); // -50..50
  const a = Math.floor(rand() * n);
  let b = Math.floor(rand() * n);
  while (b === a) b = Math.floor(rand() * n);
  return [nums, nums[a] + nums[b]]; // 保证有解
}

// ---- #3 无重复字符的最长子串：暴力 oracle + 手写边界 + 穷举 ----
function llsBrute(s) {
  let best = 0;
  for (let i = 0; i < s.length; i++) {
    const seen = new Set();
    for (let j = i; j < s.length; j++) {
      if (seen.has(s[j])) break;
      seen.add(s[j]);
      best = Math.max(best, j - i + 1);
    }
  }
  return best;
}
function llsRandom(rand) {
  const len = Math.floor(rand() * 121); // 0..120
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let s = '';
  for (let i = 0; i < len; i++) s += chars[Math.floor(rand() * chars.length)];
  return [s];
}

const registry = {
  1: {
    oracle: (args) => twoSumBrute(args),
    genRandom: (rand) => twoSumRandom(rand),
    curated: [
      [[2, 7, 11, 15], 9],
      [[3, 2, 4], 6],
      [[3, 3], 6],
      [[-3, 4, 3, 90], 0],
      [[1, 1, 1, 1], 2],
      [[0, 4, 3, 0], 0],
      [[-10, -1, -18, -19], -20],
    ],
    randomCount: 30,
  },
  3: {
    oracle: (args) => llsBrute(args[0]),
    genRandom: (rand) => llsRandom(rand),
    curated: [
      ['abba'], ['tmmzuxt'], ['abcbda'], ['bbtablud'], ['anviaj'], ['dvdf'],
      ['au'], [''], ['bbbbb'], ['abcabcbb'], ['pwwkew'], ['abab'],
      ['aaaaaaaaaabbbbbbbbbbcccccccccc'], ['abcd'],
      ['abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'],
    ],
    exhaustive: { alphabet: 'ab', maxLen: 6 },
  },
};

function computeExpected(id, args) {
  const entry = registry[id];
  if (!entry) return undefined;
  const r = entry.oracle(args);
  return r === undefined ? undefined : r;
}

/** 确定性顺序生成：手写边界 → 穷举小空间 → 带种子随机，总量 ≤ MAX_CASES。 */
function buildCases(id) {
  const entry = registry[id];
  if (!entry) return [];
  const cases = [];
  const push = (args) => {
    if (cases.length >= MAX_CASES) return;
    const expected = computeExpected(id, args);
    if (expected === undefined) return;
    cases.push({ args, expected });
  };
  for (const c of entry.curated || []) push(c);
  if (entry.exhaustive) {
    const { alphabet, maxLen } = entry.exhaustive;
    const rec = (prefix, len) => {
      if (len === 0) return [prefix];
      const out = [];
      for (const ch of alphabet) out.push(...rec(prefix + ch, len - 1));
      return out;
    };
    for (let len = 0; len <= maxLen && cases.length < MAX_CASES; len++) {
      for (const s of rec('', len)) push([s]);
      if (cases.length >= MAX_CASES) break;
    }
  }
  const rand = seededRandom(SEED);
  for (let i = 0; i < (entry.randomCount || 0) && cases.length < MAX_CASES; i++) {
    push(entry.genRandom(rand));
  }
  return cases;
}

function extendedCachePath(id) {
  return path.join(EXT_DIR, `tests-${id}.json`);
}

function loadExtendedTests(id) {
  try {
    return JSON.parse(fs.readFileSync(extendedCachePath(id), 'utf8'));
  } catch { return null; }
}

function generateExtendedTests(id) {
  const cases = buildCases(id);
  const data = { problemId: id, seed: SEED, generatedAt: new Date().toISOString(), core: cases, acm: [] };
  fs.mkdirSync(EXT_DIR, { recursive: true });
  fs.writeFileSync(extendedCachePath(id), JSON.stringify(data, null, 1), 'utf8');
  return data;
}

module.exports = { generateExtendedTests, loadExtendedTests, buildCases, registry, seededRandom };
