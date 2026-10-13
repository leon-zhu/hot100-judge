'use strict';

/**
 * 扩展用例生成器测试（含 sol-3 回归）：
 *   node scripts/test-extend.js
 */
const fs = require('fs');
const path = require('path');
const { generateExtendedTests, loadExtendedTests } = require('../judge/extend-tests');
const { judgeCore } = require('../judge/judge');

const ROOT = path.join(__dirname, '..');
const problems = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/data/problems.json'), 'utf8'));
const solutions = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/data/solutions.json'), 'utf8'));

function problem(id) { return problems.find((p) => p.id === id); }
function refPy(id) { const s = solutions[String(id)]; return s && s.python3 && s.python3.core; }

const BUGGY_SOL3 = `import java.util.*;

class Solution {
    public int lengthOfLongestSubstring(String s) {
        Map<Character, Integer> map = new HashMap<>();
        int left = 0, ans = 0;
        for (int right = 0; right < s.length(); right++) {
            char ch = s.charAt(right);
            if (map.containsKey(ch)) left = map.get(ch) + 1;
            ans = Math.max(ans, right - left + 1);
            map.put(ch, right);
        }
        return ans;
    }
}
`;
const FIXED_SOL3 = BUGGY_SOL3.replace('left = map.get(ch) + 1;', 'left = Math.max(left, map.get(ch) + 1);');

async function main() {
  let failures = 0;
  const check = (name, cond, extra = '') => {
    if (cond) console.log(`  ✅ ${name}`);
    else { failures++; console.error(`  ❌ ${name} ${extra}`); }
  };

  console.log('#3 扩展用例生成');
  const p3 = problem(3);
  const cases3 = generateExtendedTests(3).core;
  check('生成非空', cases3.length > 0, `(${cases3.length})`);
  const argOf = (s) => cases3.filter((c) => c.args[0] === s);
  check('含 abba', argOf('abba').length > 0);
  check('含 tmmzuxt', argOf('tmmzuxt').length > 0);
  check('含 abcbda', argOf('abcbda').length > 0);
  check('abba 期望 2', (argOf('abba')[0] || {}).expected === 2);
  check('tmmzuxt 期望 5', (argOf('tmmzuxt')[0] || {}).expected === 5);

  console.log('#3 参考题解全过生成用例（无假阳性）');
  const r3 = await judgeCore({ language: 'python3', code: refPy(3), core: p3.core, tests: cases3 });
  check('python3 参考全过', !r3.error && r3.results.every((x) => x.ok), r3.error || '');

  console.log('#3 回归：buggy / fixed');
  const rBug = await judgeCore({ language: 'java', code: BUGGY_SOL3, core: p3.core, tests: cases3 });
  check('buggy sol-3 必须失败', !rBug.error && rBug.results.some((x) => !x.ok), rBug.error || '');
  const rFix = await judgeCore({ language: 'java', code: FIXED_SOL3, core: p3.core, tests: cases3 });
  check('fixed sol-3 必须全过', !rFix.error && rFix.results.every((x) => x.ok), rFix.error || '');

  console.log('#1 随机生成 + 参考题解全过');
  const p1 = problem(1);
  const cases1 = generateExtendedTests(1).core;
  check('生成非空', cases1.length > 0, `(${cases1.length})`);
  const r1 = await judgeCore({ language: 'python3', code: refPy(1), core: p1.core, tests: cases1 });
  check('python3 参考全过', !r1.error && r1.results.every((x) => x.ok), r1.error || '');

  console.log('缓存读写');
  const cached = loadExtendedTests(3);
  check('缓存可读且 core 数一致', !!cached && cached.core.length === cases3.length);

  console.log(`\n${failures === 0 ? '✅ 全部通过' : `❌ ${failures} 项失败`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
