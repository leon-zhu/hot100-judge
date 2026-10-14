'use strict';

/**
 * 逐题 override 注册表。
 *
 * 大部分题目无需条目——`resolveSpec` 会从内置用例自动推导规格。
 * 仅在「自动推导会产生非法/低质输入」或「需要手写边界用例」时登记：
 *   - params   ：显式参数规格（覆盖自动推导）
 *   - build    ：完全接管参数生成（如 #1 需保证唯一解）
 *   - curated  ：补充的手写输入（仍由参考题解计算期望值）
 *   - exhaustive：穷举小空间（如 #3 的 a/b 串）
 *   - ops      ：ops 题的构造器/方法约束
 */
const { deriveSpecs, randInt, shuffle } = require('./inputs');

function sortedArray(rand, n, lo, hi) {
  const arr = Array.from({ length: n }, () => randInt(rand, lo, hi));
  arr.sort((a, b) => a - b);
  return arr;
}

// 互异取值；完整二叉树的层序即数组顺序（无 null，合法且连通）
function treeArr(rand, n, lo, hi, sorted) {
  const set = new Set();
  let guard = 0;
  while (set.size < n && guard < n * 30) { set.add(randInt(rand, lo, hi)); guard++; }
  const vals = [...set];
  return sorted ? vals.sort((a, b) => a - b) : shuffle(rand, vals);
}
function preorderOf(arr) {
  const out = [];
  const rec = (i) => { if (i >= arr.length || arr[i] == null) return; out.push(arr[i]); rec(2 * i + 1); rec(2 * i + 2); };
  rec(0); return out;
}
function inorderOf(arr) {
  const out = [];
  const rec = (i) => { if (i >= arr.length || arr[i] == null) return; rec(2 * i + 1); out.push(arr[i]); rec(2 * i + 2); };
  rec(0); return out;
}

// #1 两数之和：必须保证唯一解，否则「正确但返回不同合法对」的解会被误判
function twoSumBuild(rand) {
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
        if (nums[i] + nums[j] === target) { cnt++; if (cnt > 1) break outer; }
      }
    }
    if (cnt === 1) return [nums, target];
  }
  return [[-7, 5, 2, 10], -2];
}

const overrides = {
  1: {
    build: twoSumBuild,
    curated: [
      [[2, 7, 11, 15], 9], [[3, 2, 4], 6], [[3, 3], 6], [[-3, 4, 3, 90], 0],
      [[1, 1], 2], [[0, 4, 3, 0], 0], [[-10, -1, -18, -19], -20],
    ],
  },
  3: {
    params: [{ type: 'string', len: [0, 40], alphabet: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789' }],
    curated: [
      ['abba'], ['tmmzuxt'], ['abcbda'], ['bbtablud'], ['anviaj'], ['dvdf'],
      ['au'], [''], ['bbbbb'], ['abcabcbb'], ['pwwkew'], ['abab'],
      ['aaaaaaaaaabbbbbbbbbbcccccccccc'], ['abcd'],
    ],
    exhaustive: { alphabet: 'ab', maxLen: 5 },
  },
  // #2 两数相加：数字位必须为 0~9，负数会让参考题解进位死循环
  2: {
    params: [
      { type: 'list', min: 0, max: 9, len: [0, 8] },
      { type: 'list', min: 0, max: 9, len: [0, 8] },
    ],
  },
  // #17 电话号码：数字仅 2~9；限制长度避免组合结果撑爆输出上限
  17: {
    params: [{ type: 'string', len: [0, 4], alphabet: '23456789' }],
  },
  // #23 合并 K 个升序链表：参数是「链表描述字符串」数组（非普通 string[]）
  23: {
    build: (rand) => {
      const k = randInt(rand, 0, 4);
      const lists = [];
      for (let i = 0; i < k; i++) {
        lists.push('list:' + JSON.stringify(sortedArray(rand, randInt(rand, 0, 6), -10, 10)));
      }
      return [lists];
    },
  },
  // #25 K 个一组翻转：k 必须 ≥ 1，k ≤ 0 会让参考题解死循环
  25: {
    params: [
      { type: 'list', min: -8, max: 8, len: [0, 12] },
      { type: 'int', min: 1, max: 6 },
    ],
  },
  // #46 全排列：n 过大会让单用例输出（n! 个排列）撑爆输出上限
  46: {
    params: [{ type: 'int[]', min: -5, max: 5, len: [1, 5], distinct: true }],
  },
  // #207 课程表：先修关系每项必须恰好两个课程编号
  207: {
    build: (rand) => {
      const n = randInt(rand, 1, 7);
      const m = randInt(rand, 0, 8);
      const edges = [];
      for (let i = 0; i < m; i++) edges.push([randInt(rand, 0, n - 1), randInt(rand, 0, n - 1)]);
      return [n, edges];
    },
  },
  // ---- 输出量与 int32 溢出约束 ----
  // #22 括号生成：输出随 n 指数增长，n 过大会撑爆评测进程输出上限
  22: { params: [{ type: 'int', min: 0, max: 6 }] },
  // #51 N 皇后：解数随 n 增长
  51: { params: [{ type: 'int', min: 1, max: 8 }] },
  // #78 子集：2^n 个子集
  78: { params: [{ type: 'int[]', min: -9, max: 9, len: [0, 7], distinct: true }] },
  // #70 爬楼梯：n>45 时结果超出 int32，C++/Java 会溢出
  70: { params: [{ type: 'int', min: 1, max: 45 }] },
  // #152 乘积最大子数组 / #238 除自身以外数组的乘积：乘积需落在 int32 内
  152: { params: [{ type: 'int[]', min: -5, max: 5, len: [1, 10] }] },
  238: { params: [{ type: 'int[]', min: -9, max: 9, len: [0, 8] }] },
  // #48 旋转图像：必须 N×N 方阵
  48: { params: [{ type: 'int[][]', square: true, rows: [1, 5], min: -9, max: 9 }] },
  // ---- 参数相关性 ----
  // #215 第 K 个最大元素 / #239 滑动窗口最大值：k 必须落在 [1, n]
  215: {
    build: (rand) => {
      const n = randInt(rand, 1, 12);
      const nums = Array.from({ length: n }, () => randInt(rand, -50, 50));
      return [nums, randInt(rand, 1, n)];
    },
  },
  239: {
    build: (rand) => {
      const n = randInt(rand, 1, 12);
      const nums = Array.from({ length: n }, () => randInt(rand, -50, 50));
      return [nums, randInt(rand, 1, n)];
    },
  },
  // #347 前 K 个高频元素：令各元素频次互异，避免 top-k 选择歧义
  347: {
    build: (rand) => {
      const m = randInt(rand, 1, 4);
      const counts = shuffle(rand, [1, 2, 3, 4, 5, 6]).slice(0, m);
      const nums = [];
      counts.forEach((c, i) => { for (let j = 0; j < c; j++) nums.push(i); });
      return [shuffle(rand, nums), randInt(rand, 1, m)];
    },
  },
  // #98 验证 BST：一半为合法 BST（升序赋值），一半为非法
  98: {
    build: (rand) => ['tree:' + JSON.stringify(treeArr(rand, randInt(rand, 1, 9), -50, 50, rand() < 0.5))],
  },
  // #105 从前序与中序构造二叉树：必须由同一棵树导出，否则无解（退化）
  105: {
    build: (rand) => {
      const t = treeArr(rand, randInt(rand, 1, 9), -50, 50, false);
      return [preorderOf(t), inorderOf(t)];
    },
  },
  // #141/#142 环形链表：必须用 cycleList 记号，否则永远无环（退化）
  141: { params: [{ type: 'cycleList', min: -9, max: 9, len: [0, 8] }] },
  142: { params: [{ type: 'cycleList', min: -9, max: 9, len: [0, 8] }] },
  // #79 单词搜索：棋盘与单词同用小字符集，保证有「可命中」的搜索路径
  79: {
    params: [
      { type: 'grid', alphabet: 'AB', rows: [1, 4], cols: [1, 4] },
      { type: 'string', len: [1, 5], alphabet: 'AB' },
    ],
  },
  // #160 相交链表：用 intersectList + intersectB 记号描述两条相交链表
  160: {
    build: (rand) => {
      const shared = randInt(rand, 1, 5);
      const preA = randInt(rand, 0, 4);
      const preB = randInt(rand, 0, 4);
      const mk = (k) => Array.from({ length: k }, () => randInt(rand, -50, 50));
      return ['intersectList:' + JSON.stringify([mk(preA + shared), mk(preB + shared), preA, preB]), 'intersectB:'];
    },
  },
  // #230 BST 第 K 小：k 必须 ≤ 节点数
  230: {
    build: (rand) => {
      const m = randInt(rand, 1, 10);
      return ['tree:' + JSON.stringify(treeArr(rand, m, -50, 50, false)), randInt(rand, 1, m)];
    },
  },
  // #236 最近公共祖先：p、q 必须是树中存在的两个不同节点值
  236: {
    build: (rand) => {
      const m = randInt(rand, 2, 10);
      const t = treeArr(rand, m, -50, 50, false);
      const p = t[randInt(rand, 0, m - 1)];
      let q = t[randInt(rand, 0, m - 1)];
      while (q === p) q = t[randInt(rand, 0, m - 1)];
      return ['tree:' + JSON.stringify(t), p, q];
    },
  },
  // ---- ops 型：约束参数使操作序列能真正触发淘汰/查找等关键行为 ----
  // #146 LRU 缓存：容量取小值并让 key 复用，才能触发「淘汰顺序」相关 bug
  146: { opCount: [4, 16], ctorArgs: { min: 1, max: 3 }, args: { min: 1, max: 4 } },
  // #155 最小栈：随机单值入栈
  155: { opCount: [4, 16], args: { min: -9, max: 9 } },
  // #208 Trie：短词、小字符集，保证插入与查询有交集
  208: {
    opCount: [4, 16],
    argsByName: {
      insert: [{ type: 'string', len: [1, 3], alphabet: 'ab' }],
      search: [{ type: 'string', len: [1, 3], alphabet: 'ab' }],
      startsWith: [{ type: 'string', len: [1, 2], alphabet: 'ab' }],
    },
  },
  // #295 数据流的中位数：随机整数
  295: { opCount: [3, 14], args: { min: -20, max: 20 } },
};

function getOverride(id) { return overrides[String(id)] || null; }

/** 合并「自动推导」与「手写 override」，得到最终规格。 */
function resolveSpec(id, core, kind, bundled) {
  const base = deriveSpecs(core, kind, bundled);
  const ov = getOverride(id);
  if (!ov) return base;
  return {
    ...base,
    ...ov,
    kind,
    params: ov.params || base.params,
    ops: ov.ops || base.ops,
  };
}

module.exports = { overrides, getOverride, resolveSpec };
