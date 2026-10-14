'use strict';

/**
 * 参考题解 oracle：
 *   - runReference：把候选用例的 expected 置空，跑一遍题库自带 python3 题解，读取原始 got 作为期望值。
 *   - verifyReference：参考题解自检（必须能过该题内置用例），不过则放弃该题扩展。
 *
 * 复用现有 judgeCore，无需另写运行器。参考题解抛异常的用例会被标记 valid=false 并丢弃。
 */
const path = require('path');
const { judgeCore } = require(path.join(__dirname, '..', 'judge'));

function toTests(kind, candidates) {
  return candidates.map((c) => (kind === 'ops'
    ? { ops: c.ops, args: c.args, expected: null }
    : { args: c.args, expected: null }));
}

/**
 * @returns {Promise<{fatal:?string, results:Array<{valid:boolean, got:*, error:?string}>}>}
 */
async function runReference({ core, refCode, kind, candidates }) {
  if (!candidates.length) return { fatal: null, results: [] };
  const out = await judgeCore({ language: 'python3', code: refCode, core, tests: toTests(kind, candidates) });
  if (out.error) return { fatal: out.error, results: [] };
  return {
    fatal: null,
    results: out.results.map((r) => ({ valid: !r.error, got: r.got, error: r.error })),
  };
}

/** 参考题解必须能通过该题内置用例，否则其输出不可信。 */
async function verifyReference({ core, refCode, kind, bundled }) {
  if (!bundled || !bundled.length) return false;
  const out = await judgeCore({ language: 'python3', code: refCode, core, tests: bundled });
  if (out.error) return false;
  return out.results.every((r) => r.ok);
}

module.exports = { runReference, verifyReference };
