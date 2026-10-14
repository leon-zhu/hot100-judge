'use strict';

/**
 * 扩展用例生成器回归（含 sol-3 / LRU 反例）：
 *   node scripts/test-extend.js
 *
 * 断言基准：
 *   1) 抽样的题能生成非空扩展用例，且不超上限；
 *   2) 参考题解在生成用例上「全过」（oracle 自洽，不产生假失败）；
 *   3) 已知错误解必须被判失败（防止用例退化到测不出 bug）。
 */
const fs = require('fs');
const path = require('path');
const { generateExtendedTests, loadExtendedTests, MAX_CASES } = require('../judge/extend-tests');
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
            if (map.containsKey(ch)) left = map.get(ch) + 1;   // BUG: 未取 max，左边界会回退
            ans = Math.max(ans, right - left + 1);
            map.put(ch, right);
        }
        return ans;
    }
}`;
const FIXED_SOL3 = BUGGY_SOL3.replace('left = map.get(ch) + 1;', 'left = Math.max(left, map.get(ch) + 1);');

// #146 LRUCache：get 不刷新最近使用 → 淘汰顺序错误
const BUGGY_LRU = `import java.util.*;
class LRUCache {
    private final int cap;
    private final LinkedHashMap<Integer, Integer> m = new LinkedHashMap<>();
    public LRUCache(int capacity) { this.cap = capacity; }
    public int get(int key) { return m.getOrDefault(key, -1); }   // BUG: 不刷新最近使用
    public void put(int key, int value) {
        m.remove(key);
        m.put(key, value);
        if (m.size() > cap) m.remove(m.keySet().iterator().next());
    }
}`;
const FIXED_LRU = `import java.util.*;
class LRUCache {
    private final int cap;
    private final LinkedHashMap<Integer, Integer> m = new LinkedHashMap<>();
    public LRUCache(int capacity) { this.cap = capacity; }
    public int get(int key) {
        if (!m.containsKey(key)) return -1;
        int v = m.remove(key); m.put(key, v); return v;
    }
    public void put(int key, int value) {
        m.remove(key);
        m.put(key, value);
        if (m.size() > cap) m.remove(m.keySet().iterator().next());
    }
}`;

async function main() {
  let failures = 0;
  const check = (name, cond, extra = '') => {
    if (cond) console.log(`  ✅ ${name}`);
    else { failures++; console.error(`  ❌ ${name} ${extra}`); }
  };

  console.log('#3 扩展用例生成 + 回归');
  const p3 = problem(3);
  const cases3 = (await generateExtendedTests(3)).core;
  check('生成非空', cases3.length > 0, `(${cases3.length})`);
  check('不超上限', cases3.length <= MAX_CASES, `(${cases3.length})`);
  const argOf = (s) => cases3.filter((c) => c.args[0] === s);
  check('含手写边界 abba', argOf('abba').length > 0);
  check('abba 期望 2', (argOf('abba')[0] || {}).expected === 2);
  const r3 = await judgeCore({ language: 'python3', code: refPy(3), core: p3.core, tests: cases3 });
  check('#3 参考题解全过', !r3.error && r3.results.every((x) => x.ok), r3.error || '');
  const rBug = await judgeCore({ language: 'java', code: BUGGY_SOL3, core: p3.core, tests: cases3 });
  check('#3 buggy 解必须被判失败', !rBug.error && rBug.results.some((x) => !x.ok), rBug.error || '');
  const rFix = await judgeCore({ language: 'java', code: FIXED_SOL3, core: p3.core, tests: cases3 });
  check('#3 fixed 解必须全过', !rFix.error && rFix.results.every((x) => x.ok), rFix.error || '');

  console.log('#146 LRU 缓存（ops 型）回归');
  const p146 = problem(146);
  const cases146 = (await generateExtendedTests(146)).core;
  check('生成非空', cases146.length > 0, `(${cases146.length})`);
  const r146ref = await judgeCore({ language: 'python3', code: refPy(146), core: p146.core, tests: cases146 });
  check('#146 参考题解全过', !r146ref.error && r146ref.results.every((x) => x.ok), r146ref.error || '');
  const rBadLru = await judgeCore({ language: 'java', code: BUGGY_LRU, core: p146.core, tests: cases146 });
  check('#146 buggy LRU 必须被判失败', !rBadLru.error && rBadLru.results.some((x) => !x.ok), rBadLru.error || '');
  const rFixLru = await judgeCore({ language: 'java', code: FIXED_LRU, core: p146.core, tests: cases146 });
  check('#146 正确 LRU 必须全过', !rFixLru.error && rFixLru.results.every((x) => x.ok), rFixLru.error || '');

  console.log('抽样函数题：参考题解全过');
  for (const id of [1, 53, 121, 70, 200, 207]) {
    const p = problem(id);
    const cases = (await generateExtendedTests(id)).core;
    check(`#${id} 非空`, cases.length > 0, `(${cases.length})`);
    const r = await judgeCore({ language: 'python3', code: refPy(id), core: p.core, tests: cases });
    check(`#${id} 参考全过`, !r.error && r.results.every((x) => x.ok), r.error || '');
  }

  console.log('缓存读写');
  const cached = loadExtendedTests(3);
  check('缓存可读且 core 数一致', !!cached && cached.core.length === cases3.length);

  console.log('云端：未配置登录态 → 非致命 error');
  const { submitToLeetCode, getAuth } = require('../judge/leetcode-submit');
  if (getAuth()) {
    console.log('  已配置登录态，跳过未配置分支测试');
  } else {
    const verdict = await submitToLeetCode({ problem: p3, code: FIXED_SOL3, lang: 'java' });
    check('未配置登录态 → 返回 error 而非抛异常', !!(verdict && verdict.error));
  }

  console.log(`\n${failures === 0 ? '✅ 全部通过' : `❌ ${failures} 项失败`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
