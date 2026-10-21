'use strict';

/**
 * 输入生成器：带种子 PRNG + 类型驱动生成 + 约束 flag 引擎 + 从内置用例自动推导默认规格。
 *
 * 生成出来的 args 直接对齐 Java 驱动的输入约定：
 *   - 标量 / 数组：原生 JSON 值
 *   - 链表 / 树 / 矩阵等记号类型：字符串记号（"list:[1,2,3]" / "tree:[...]" / "grid:[\"11\",\"10\"]"…）
 *   - ops 型：{ ops:[...], args:[[...],...] }
 *
 * 约束 flag 词表见 spec.js 的 override 与 deriveSpecs 的推导结果。
 */

// ---- 带种子的确定性 PRNG（mulberry32） ----
function seededRandom(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randInt(rand, lo, hi) {
  if (hi < lo) hi = lo;
  return lo + Math.floor(rand() * (hi - lo + 1));
}
function pick(rand, arr) { return arr[Math.floor(rand() * arr.length)]; }
function shuffle(rand, arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const DEFAULT_ALPHABET = 'abcdefghijklmnopqrstuvwxyz';
const DIGIT_ALPHABET = '0123456789';

// ---- 基础值生成 ----
function genInt(rand, spec) {
  let lo = spec.min != null ? spec.min : -100;
  let hi = spec.max != null ? spec.max : 100;
  if (spec.positive) lo = Math.max(1, lo);
  if (spec.nonNeg) lo = Math.max(0, lo);
  if (spec.excludeZero) { if (lo === 0) lo = 1; }
  return randInt(rand, lo, hi);
}

function genString(rand, spec) {
  const alpha = spec.alphabet || DEFAULT_ALPHABET;
  const lo = spec.nonEmpty ? Math.max(1, (spec.len && spec.len[0]) || 1) : (spec.len ? spec.len[0] : 0);
  const hi = spec.len ? spec.len[1] : 12;
  const n = randInt(rand, lo, Math.max(lo, hi));
  let s = '';
  for (let i = 0; i < n; i++) s += alpha[Math.floor(rand() * alpha.length)];
  return s;
}

function genIntArray(rand, spec) {
  let lo = spec.nonEmpty ? Math.max(1, (spec.len && spec.len[0]) || 1) : (spec.len ? spec.len[0] : 0);
  const hi = spec.len ? spec.len[1] : 12;
  const n = randInt(rand, lo, Math.max(lo, hi));
  const out = [];
  if (spec.distinct) {
    const pool = new Set();
    const vlo = spec.min != null ? spec.min : -100;
    const vhi = spec.max != null ? spec.max : 100;
    const span = vhi - vlo + 1;
    const cap = Math.max(n, Math.min(span, n * 4 + 8));
    let guard = 0;
    while (out.length < n && guard < cap * 8) {
      guard++;
      const v = genInt(rand, spec);
      if (pool.has(v)) continue;
      pool.add(v); out.push(v);
    }
    // 兜底：候选池不足时允许重复，避免死循环
    while (out.length < n) out.push(genInt(rand, spec));
  } else {
    for (let i = 0; i < n; i++) out.push(genInt(rand, spec));
  }
  if (spec.sorted) out.sort((a, b) => a - b);
  return out;
}

function genIntMatrix(rand, spec) {
  const rows = randInt(rand, (spec.rows && spec.rows[0]) || 1, (spec.rows && spec.rows[1]) || 4);
  const cols = spec.square ? rows : null;
  const out = [];
  for (let r = 0; r < rows; r++) {
    out.push(genIntArray(rand, spec.square ? { ...(spec.col || spec), len: [cols, cols] } : (spec.col || spec)));
  }
  return out;
}

function genStringArray(rand, spec) {
  const lo = spec.nonEmpty ? Math.max(1, (spec.len && spec.len[0]) || 1) : (spec.len ? spec.len[0] : 0);
  const hi = spec.len ? spec.len[1] : 8;
  const n = randInt(rand, lo, Math.max(lo, hi));
  const out = [];
  for (let i = 0; i < n; i++) out.push(genString(rand, spec.elem || spec));
  return out;
}

function genStringMatrix(rand, spec) {
  const rows = randInt(rand, (spec.rows && spec.rows[0]) || 1, (spec.rows && spec.rows[1]) || 4);
  const out = [];
  for (let r = 0; r < rows; r++) out.push(genStringArray(rand, spec.col || spec));
  return out;
}

function genGrid(rand, spec) {
  const rows = randInt(rand, (spec.rows && spec.rows[0]) || 1, (spec.rows && spec.rows[1]) || 4);
  const cols = randInt(rand, (spec.cols && spec.cols[0]) || 1, (spec.cols && spec.cols[1]) || 5);
  const alpha = spec.alphabet || '01';
  const out = [];
  for (let r = 0; r < rows; r++) {
    let s = '';
    for (let c = 0; c < cols; c++) s += alpha[Math.floor(rand() * alpha.length)];
    out.push(s);
  }
  return out;
}

// ---- 结构类型：生成 JSON，再包装成 Java 驱动记号字符串 ----
function genListToken(rand, spec) {
  return 'list:' + JSON.stringify(genIntArray(rand, spec));
}

function genTreeArr(rand, spec) {
  // 依据节点数生成「完全形态」层序数组：i 的孩子为 2i+1 / 2i+2（在 n 内），
  // 并随机把部分孩子位置 null，再用 null 行尾裁剪保持与 canon 序列化一致。
  const n = randInt(rand, (spec.len && spec.len[0]) || 1, (spec.len && spec.len[1]) || 9);
  const vlo = spec.min != null ? spec.min : -100;
  const vhi = spec.max != null ? spec.max : 100;
  const arr = [];
  for (let i = 0; i < n; i++) arr.push(randInt(rand, vlo, vhi));
  // 随机挖空：对下标 >=1 的节点以一定概率置 null（保持二叉结构合法即可）
  for (let i = 1; i < n; i++) {
    if (rand() < 0.25) arr[i] = null;
  }
  return arr;
}
function genTreeToken(rand, spec) { return 'tree:' + JSON.stringify(genTreeArr(rand, spec)); }

function genRandomListToken(rand, spec) {
  const arr = genIntArray(rand, spec);
  const n = arr.length;
  const data = arr.map((v) => [v, n ? randInt(rand, -1, n - 1) : -1]);
  return 'randomList:' + JSON.stringify(data);
}

function genListArrayToken(rand, spec) {
  const k = randInt(rand, (spec.len && spec.len[0]) || 1, (spec.len && spec.len[1]) || 3);
  const subs = [];
  for (let i = 0; i < k; i++) subs.push(genIntArray(rand, spec.elem || spec));
  return 'listArray:' + JSON.stringify(subs);
}

function genCycleListToken(rand, spec) {
  const arr = genIntArray(rand, spec);
  const pos = arr.length ? randInt(rand, -1, arr.length - 1) : -1;
  return 'cycleList:' + JSON.stringify([arr, pos]);
}

function genIntersectListToken(rand, spec) {
  // 结构：[listA, listB, skipA, skipB]，两条链表在 A 的 skipA 处开始共享尾部。
  const total = randInt(rand, 2, (spec.len && spec.len[1]) || 8);
  const shared = randInt(rand, 1, Math.max(1, total - 1));
  const preA = randInt(rand, 0, total - shared);
  const preB = randInt(rand, 0, total - shared);
  const vlo = spec.min != null ? spec.min : 0;
  const vhi = spec.max != null ? spec.max : 100;
  const mk = (len) => Array.from({ length: len }, () => randInt(rand, vlo, vhi));
  const la = mk(preA + shared);
  const lb = mk(preB + shared);
  return 'intersectList:' + JSON.stringify([la, lb, preA, preB]);
}

// ---- ops 型：按类签名生成合法操作序列 ----
// 规格来源（均可选）：opCount[lo,hi]、ctorArgs（构造器参数通用规格）、
// args（方法参数通用规格）、argsByName{方法名:[逐参规格]}
function genOps(rand, core, spec = {}) {
  const ctor = core.ops.constructor || [];
  const methods = core.ops.methods || [];
  const opCount = randInt(rand, (spec.opCount && spec.opCount[0]) || 3, (spec.opCount && spec.opCount[1]) || 12);

  const ctorArgs = ctor.map((p) => genValue(rand, { type: p.type, ...(spec.ctorArgs || {}) }));
  const ops = [core.className];
  const args = [ctorArgs];

  for (let i = 1; i < opCount; i++) {
    const m = pick(rand, methods);
    const per = (spec.argsByName && spec.argsByName[m.name]) || [];
    const a = (m.args || []).map((t, idx) => genValue(rand, { type: t, ...(spec.args || {}), ...(per[idx] || {}) }));
    ops.push(m.name);
    args.push(a);
  }
  return { ops, args };
}

// ---- 类型分派 ----
function genValue(rand, spec) {
  switch (spec.type) {
    case 'int': return genInt(rand, spec);
    case 'long': return genInt(rand, spec);
    case 'bool': return rand() < 0.5;
    case 'double': return Math.round((rand() * 200 - 100) * 100) / 100;
    case 'string': return genString(rand, spec);
    case 'char': return (spec.alphabet || DEFAULT_ALPHABET)[0];
    case 'int[]': case 'long[]': return genIntArray(rand, spec);
    case 'int[][]': return genIntMatrix(rand, spec);
    case 'string[]': return genStringArray(rand, spec);
    case 'string[][]': return genStringMatrix(rand, spec);
    case 'grid': return 'grid:' + JSON.stringify(genGrid(rand, spec));
    case 'list': return genListToken(rand, spec);
    case 'tree': return genTreeToken(rand, spec);
    case 'randomList': return genRandomListToken(rand, spec);
    case 'listArray': return genListArrayToken(rand, spec);
    case 'cycleList': return genCycleListToken(rand, spec);
    case 'intersectList': return genIntersectListToken(rand, spec);
    case 'cycleList': return genCycleListToken(rand, spec);
    case 'intersectList': return genIntersectListToken(rand, spec);
    default: return genInt(rand, spec);
  }
}

// ---- 从内置用例自动推导默认参数规格 ----
function numbersOf(v) {
  // 递归收集数值（用于推断 min/max）
  if (typeof v === 'number') return [v];
  if (Array.isArray(v)) return v.flatMap(numbersOf);
  if (typeof v === 'string' && (v.startsWith('list:') || v.startsWith('tree:'))) {
    try { return numbersOf(JSON.parse(v.slice(v.indexOf(':') + 1))); } catch { return []; }
  }
  return [];
}
function flattenArr(v) {
  if (Array.isArray(v)) return v.flatMap(flattenArr);
  return [v];
}
function isSortedNums(a) {
  if (!a.length || !a.every((x) => typeof x === 'number')) return false;
  for (let i = 1; i < a.length; i++) if (a[i] < a[i - 1]) return false;
  return true;
}
function allDistinct(a) {
  const seen = new Set();
  for (const x of a) { const k = JSON.stringify(x); if (seen.has(k)) return false; seen.add(k); }
  return true;
}

// 推导出的数值范围统一钳制在 ±INT_BOUND：避免超 int32 造成 Java 溢出
// （如 #98 的样例含 2147483647 会把范围放大到 4.3e9），又保留足够的取值多样性。
const INT_BOUND = 1000000;
function widenRange(minV, maxV) {
  // 观察值全为非负时只向上放宽，避免引入负数（数字位/下标/容量等非法输入会让部分题解死循环）
  if (minV >= 0) return [0, Math.min(INT_BOUND, Math.max(maxV * 2 + 2, maxV + 4))];
  // 存在负数：向零对称外扩
  const span = maxV - minV;
  const pad = Math.max(2, Math.abs(minV), Math.abs(maxV), span * 2);
  return [Math.max(-INT_BOUND, Math.min(minV, -pad)), Math.min(INT_BOUND, Math.max(maxV, pad))];
}

function deriveParamSpec(type, observed) {
  const spec = { type };
  const flat = observed.map(flattenArr);
  const lens = observed.map((v) => {
    if (Array.isArray(v)) return v.length;
    if (typeof v === 'string') {
      if (v.startsWith('list:')) { try { return JSON.parse(v.slice(5)).length; } catch { return 0; } }
      if (v.startsWith('tree:') || v.startsWith('grid:')) { try { return JSON.parse(v.slice(v.indexOf(':') + 1)).length; } catch { return 0; } }
      return v.length;
    }
    return 1;
  });
  const nums = observed.flatMap(numbersOf);
  if (nums.length) {
    const [lo, hi] = widenRange(Math.min(...nums), Math.max(...nums));
    if (type === 'int' || type === 'long') { spec.min = lo; spec.max = hi; }
    else { spec.min = lo; spec.max = hi; }
  }
  if (lens.length) {
    const lo = Math.min(...lens);
    const hi = Math.max(...lens);
    spec.len = [Math.max(0, lo === hi ? lo : lo), Math.min(60, Math.max(hi * 2 + 2, lo + 2))];
  }
  // string / grid 字符集
  if (type === 'string') {
    const chars = new Set();
    for (const v of observed) if (typeof v === 'string') for (const ch of v) chars.add(ch);
    if (chars.size && chars.size <= 8) spec.alphabet = [...chars].join('');
  }
  if (type === 'grid') {
    const chars = new Set();
    for (const v of observed) if (typeof v === 'string' && v.startsWith('grid:')) {
      try { for (const row of JSON.parse(v.slice(5))) for (const ch of row) chars.add(ch); } catch { /* ignore */ }
    }
    if (chars.size && chars.size <= 4) spec.alphabet = [...chars].join('');
    const rows = observed.map((v) => { try { return JSON.parse(v.slice(5)).length; } catch { return 1; } });
    spec.rows = [Math.min(...rows), Math.max(...rows) * 2 + 1];
  }
  // 有序 / 互异（仅数组与 list 记号）
  const arrays = observed.filter((v) => Array.isArray(v));
  if (arrays.length && arrays.every(isSortedNums)) spec.sorted = true;
  if (arrays.length && arrays.every(allDistinct)) spec.distinct = true;
  if (arrays.length && arrays.every((a) => a.length >= 1)) spec.nonEmpty = true;
  return spec;
}

/**
 * 从内置 core 用例推导整题默认规格。
 * @returns {{kind:'func'|'ops', params?:Array, ops?:Object}}
 */
function deriveSpecs(core, kind, bundled) {
  if (kind === 'ops') {
    return { kind: 'ops', opCount: [3, 12] };
  }
  const params = (core.params || []).map((p, i) => {
    const observed = [];
    for (const c of bundled) {
      if (c && Array.isArray(c.args) && c.args[i] !== undefined) observed.push(c.args[i]);
    }
    return deriveParamSpec(p.type, observed);
  });
  return { kind: 'func', params };
}

module.exports = {
  seededRandom, randInt, pick, shuffle,
  genValue, genInt, genString, genIntArray, genGrid,
  genOps, deriveSpecs, deriveParamSpec,
};
