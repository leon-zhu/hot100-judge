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
  const [nums, target] = args;
  for (let i = 0; i < nums.length; i++) {
    for (let j = i + 1; j < nums.length; j++) {
      if (nums[i] + nums[j] === target) return [i, j];
    }
  }
  return []; // 无解约定返回空数组
}
function twoSumRandom(rand) {
  // 保证唯一解：多解输入会让"正确但返回不同合法对"的解法被判错（假失败）
  for (let attempt = 0; attempt < 100; attempt++) {
    const n = 2 + Math.floor(rand() * 29); // 2..30
    const nums = [];
    for (let i = 0; i < n; i++) nums.push(Math.floor(rand() * 101) - 50); // -50..50
    const a = Math.floor(rand() * n);
    let b = Math.floor(rand() * n);
    for (let k = 0; k < 8 && b === a; k++) b = Math.floor(rand() * n);
    const target = nums[a] + nums[b];
    let cnt = 0;
    outer:
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (nums[i] + nums[j] === target) {
          cnt++;
          if (cnt > 1) break outer;
        }
      }
    }
    if (cnt === 1) return [nums, target];
  }
  // 兜底（几乎不可达）：返回一个已知唯一解用例
  return [[-7, 5, 2, 10], -2];
}

// ---- #3 无重复字符的最长子串：暴力 oracle + 手写边界 + 穷举 ----
function lswrcBrute(s) {
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
function lswrcRandom(rand) {
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
      [[1, 1], 2],
      [[0, 4, 3, 0], 0],
      [[-10, -1, -18, -19], -20],
    ],
    randomCount: 30,
  },
  3: {
    oracle: (args) => lswrcBrute(args[0]),
    genRandom: (rand) => lswrcRandom(rand),
    curated: [
      ['abba'], ['tmmzuxt'], ['abcbda'], ['bbtablud'], ['anviaj'], ['dvdf'],
      ['au'], [''], ['bbbbb'], ['abcabcbb'], ['pwwkew'], ['abab'],
      ['aaaaaaaaaabbbbbbbbbbcccccccccc'], ['abcd'],
      ['abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'],
    ],
    exhaustive: { alphabet: 'ab', maxLen: 5 },
    randomCount: 30,
  },
};

function computeExpected(id, args) {
  const entry = registry[id];
  if (!entry) return undefined;
  return entry.oracle(args);
}

/** 确定性顺序生成：手写边界 → 穷举小空间 → 带种子随机，总量 ≤ MAX_CASES。 */
function buildCases(id) {
  id = String(id);
  const entry = registry[id];
  if (!entry) return [];
  const cases = [];
  const seen = new Set();
  const push = (args) => {
    if (cases.length >= MAX_CASES) return;
    const key = JSON.stringify(args);
    if (seen.has(key)) return;
    seen.add(key);
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
  id = String(id);
  return path.join(EXT_DIR, `tests-${id}.json`);
}

function loadExtendedTests(id) {
  id = String(id);
  try {
    return JSON.parse(fs.readFileSync(extendedCachePath(id), 'utf8'));
  } catch { return null; }
}

function generateExtendedTests(id) {
  id = String(id);
  const cases = buildCases(id);
  const data = { problemId: id, seed: SEED, generatedAt: new Date().toISOString(), core: cases, acm: [] };
  fs.mkdirSync(EXT_DIR, { recursive: true });
  fs.writeFileSync(extendedCachePath(id), JSON.stringify(data, null, 1), 'utf8');
  return data;
}

module.exports = { generateExtendedTests, loadExtendedTests, buildCases, registry, seededRandom };
