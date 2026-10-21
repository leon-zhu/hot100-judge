'use strict';

/**
 * 输出比较策略（与 LeetCode 判定语义对齐）。
 *
 *   exact         逐元素严格比较（默认）
 *   unorderedTop  顶层数组顺序无关（如两数之和的下标顺序、全排列的排列顺序）
 *   unorderedDeep 任意层级数组顺序无关（如三数之和、字母异位词分组）
 *
 * 只收录 LeetCode 明确允许任意顺序的题；顺序语义不明确的题保持 exact。
 */
const CHECKERS = {
  1: 'unorderedTop', // 两数之和：两个下标可按任意顺序返回
  15: 'unorderedDeep', // 三数之和：三元组之间、内部顺序均不限
  17: 'unorderedTop', // 电话号码的字母组合
  22: 'unorderedTop', // 括号生成
  39: 'unorderedDeep', // 组合总和：组合内部与组合之间均与顺序无关
  46: 'unorderedTop', // 全排列：排列之间顺序不限（排列内部是序列）
  49: 'unorderedDeep', // 字母异位词分组：分组之间、组内字符串顺序均不限
  51: 'unorderedTop', // N 皇后：解之间顺序不限（棋盘行顺序有意义）
  78: 'unorderedTop', // 子集：解集顺序不限（子集内部的取法保持参考顺序）
  131: 'unorderedTop', // 分割回文串：方案之间顺序不限（单个方案是序列）
  347: 'unorderedTop', // 前 K 个高频元素
};

function checkerFor(problemId) {
  return CHECKERS[Number(problemId)] || 'exact';
}

module.exports = { CHECKERS, checkerFor };
