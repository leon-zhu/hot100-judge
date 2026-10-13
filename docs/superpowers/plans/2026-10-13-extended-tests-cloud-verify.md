# 扩展测试用例 + 云端判定 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 `hot100 judge` 自动并入按需生成的扩展测试用例（抓 `sol-3` 那种"过内置用例但答案错误"的 bug），并支持 `--cloud` 提交 leetcode.cn 拿官方判定。

**Architecture:** 三个独立模块，判题内核 `judge/judge.js` 不改一行。`judge/extend-tests.js` 按题生成扩展用例（oracle 注册表 + 手写边界/穷举/带种子随机），缓存到 gitignore 的 `work/extended/tests-<id>.json`；`cli/hot100.js` 的 `cmdJudge` 在 CLI 层把内置+扩展用例拼好再交给内核；`judge/leetcode-submit.js` 用登录态 cookie 调 CN 非官方 API 提交并轮询判定，任何失败非致命。

**Tech Stack:** Node.js ≥18（全局 `fetch`，零新依赖）、本地 `javac/java`/`python3`/`g++`（判题用，已有）、LeetCode CN 登录态 cookie。

**Spec:** `docs/superpowers/specs/2026-10-13-extended-tests-cloud-verify-design.md`

---

### Task 1: 扩展用例生成器 + 测试（含回归）

**Files:**
- Modify: `.gitignore`
- Create: `judge/extend-tests.js`
- Create: `scripts/test-extend.js`

- [ ] **Step 1: 更新 .gitignore**

在 `.gitignore` 末尾追加：

```gitignore
# 扩展测试用例生成缓存 + 云端登录态（绝不提交）
work/extended/
work/leetcode-config.json
```

- [ ] **Step 2: 写生成器 `judge/extend-tests.js`**

完整文件内容：

```js
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
```

- [ ] **Step 3: 写测试 `scripts/test-extend.js`**

完整文件内容：

```js
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
```

- [ ] **Step 4: 跑测试，确认先失败再通过**

Run: `node scripts/test-extend.js`

第一次跑（生成器刚写完）预期：生成相关的断言与回归断言通过，输出 `✅ 全部通过`。若发现任何 `❌`，按报错修 `judge/extend-tests.js`（如 oracle 期望值不对）后重跑，直到 `✅ 全部通过`。

确认通过后，确认缓存已生成：

Run: `ls work/extended/ && node -e "const t=require('./work/extended/tests-3.json'); console.log('core cases:', t.core.length); console.log('has abba:', t.core.some(c=>c.args[0]==='abba'));"`

Expected: `core cases: 100`、`has abba: true`。

- [ ] **Step 5: Commit**

```bash
git add .gitignore judge/extend-tests.js scripts/test-extend.js
git commit -m "feat: 扩展测试用例生成器（oracle 注册表 + 手写边界/穷举/随机），#1/#3 回归测试"
```

---

### Task 2: CLI 集成（合并扩展用例 + 标注来源 + 开关）

**Files:**
- Modify: `cli/hot100.js`（`cmdJudge` 函数体 208-260 行、`usage` 函数）

- [ ] **Step 1: 重写 `cmdJudge` 合并扩展用例**

把 `cmdJudge` 整个函数替换为（注意 `--no-extend` 在 `parseArgs` 里解析为 `flags['no-extend']`）：

```js
async function cmdJudge(flags, positional) {
  const id = positional[0];
  const file = positional[1];
  if (!file) die('用法: hot100 judge <id> <文件> [--lang java|python3|cpp] [--mode core|acm] [--cloud] [--regenerate] [--no-extend]');
  const p = findProblem(id);
  let code;
  try { code = fs.readFileSync(file, 'utf8'); } catch { die(`文件不存在: ${file}`); }
  const ext = path.extname(file).slice(1).toLowerCase();
  const lang = flags.lang || EXT_LANG[ext] || 'java';
  const mode = flags.mode || 'core';
  if (lang === 'java' && mode !== 'core') die('Java 仅支持核心代码模式（--mode core）');
  const useCore = mode === 'core' || lang === 'java';
  if (useCore && !p.core) die('该题无核心代码模式数据');
  const bundled = DATA.tests[String(p.id)] ? DATA.tests[String(p.id)][mode] : [];
  if (!bundled || !bundled.length) die(`该题无 ${mode} 测试用例`);

  // 扩展用例：core 模式才合并；--no-extend 跳过；--regenerate 强制重建
  let extended = [];
  let hasExt = false;
  if (useCore && !flags['no-extend']) {
    const { loadExtendedTests, generateExtendedTests } = require(path.join(ROOT, 'judge', 'extend-tests'));
    let cache = flags.regenerate ? null : loadExtendedTests(String(p.id));
    if (!cache) {
      cache = generateExtendedTests(String(p.id));
      if (cache.core.length) console.log(`已生成 ${cache.core.length} 个扩展用例（work/extended/tests-${p.id}.json）`);
    }
    extended = cache.core || [];
    hasExt = extended.length > 0;
  }
  const tests = [...bundled, ...extended];
  const nBundled = bundled.length;

  const { judgeCore, judgeACM, summarize } = require(path.join(ROOT, 'judge', 'judge'));
  const outcome = useCore
    ? await judgeCore({ language: lang, code, core: p.core, tests })
    : await judgeACM({ language: lang, code, tests });
  console.log(`\n#${p.id} ${p.title}  ${p.difficulty} · ${lang} · ${mode === 'core' ? '核心代码模式' : 'ACM 模式'}${hasExt ? ` · 含 ${extended.length} 个扩展用例` : ''}`);
  if (outcome.error) {
    console.error(`✗ ${outcome.phase === 'compile' ? '编译失败' : '运行失败'}`);
    if (outcome.compileError) console.error(outcome.compileError);
    else console.error(outcome.error);
    process.exitCode = 1;
    return;
  }
  const { passed, total } = summarize(outcome.results, mode);
  const failed = outcome.results.filter((r) => !r.ok);
  for (const r of failed.slice(0, 5)) {
    const kind = r.index < nBundled ? '内置' : '扩展';
    console.error(`  [用例 ${r.index}·${kind}] ${r.error ? r.error.split('\n')[0] : ''}`);
    const t = tests[r.index];
    if (useCore) {
      const parts = [];
      if (t && t.ops) parts.push(`ops=${JSON.stringify(t.ops)}`);
      if (t && t.args) parts.push(`args=${JSON.stringify(t.args)}`);
      if (parts.length) console.error(`      输入: ${parts.join(' ')}`);
    } else if (t) {
      console.error(`      输入: ${JSON.stringify(t.input)}`);
    }
    if (r.expected !== undefined && r.got !== undefined) {
      console.error(`      期望: ${JSON.stringify(r.expected)}  实际: ${JSON.stringify(r.got)}`);
    }
  }
  if (failed.length > 5) console.error(`  … 其余 ${failed.length - 5} 个失败用例省略`);
  if (passed === total) {
    console.log(`✅ ${passed}/${total} 全部通过`);
    console.log(`  提示: 已通过可执行 hot100 mark ${p.id} done 记录已刷`);
  } else {
    console.log(`❌ ${passed}/${total} 通过`);
    process.exitCode = 1;
  }

  // 云端判定（仅核心代码模式；失败非致命，不影响本地退出码）
  if (flags.cloud) {
    if (!useCore) {
      console.warn('  云端判定仅支持核心代码模式（--mode core），已跳过');
    } else {
      const { submitToLeetCode } = require(path.join(ROOT, 'judge', 'leetcode-submit'));
      const verdict = await submitToLeetCode({ problem: p, code, lang });
      if (verdict.error) {
        console.warn(`  ⚠ 云端判定失败: ${verdict.error}`);
      } else {
        const mark = verdict.accepted ? '✅' : '❌';
        console.log(`  ${mark} LeetCode: ${verdict.statusMsg}`);
        if (verdict.detail) console.log(`     ${verdict.detail}`);
      }
    }
  }
}
```

> 注：`--cloud` 分支在本任务已接好，但 `judge/leetcode-submit.js` 在 Task 3 才创建。Task 3 之前先不要手动跑 `--cloud`。

- [ ] **Step 2: 更新 `usage` 帮助文本**

把 `usage` 里 judge 的示例行替换为：

```js
  judge <题号> <文件> [--lang X] [--mode core|acm]   提交答案评测
      语言按扩展名推断（.java/.py/.cpp），--mode 默认 core
      自动合并本地扩展测试用例（首次自动生成缓存，可 --regenerate 重建）
      通过输出 ✅ n/n；失败输出 ❌ 并列出期望/实际（标注内置/扩展）
      --cloud       本地判完后提交 leetcode.cn 拿官方判定（需登录态 cookie）
      --no-extend   只用内置用例
      示例: hot100 judge 1 sol-1.java
           hot100 judge 3 sol-3.java --cloud
```

- [ ] **Step 3: 手动验证 CLI 合并**

先造一个 buggy 的 sol-3（即当前 `sol-3.java` 的 `left = map.get(ch) + 1;` 版本，已在 Task 1 测试里定义），跑：

Run: `node cli/hot100.js judge 3 sol-3.java`

Expected：
- 第一行打印 `#3 无重复字符的最长子串  中等 · java · 核心代码模式 · 含 100 个扩展用例`
- 失败用例标注 `[用例 N·扩展]`，其中包含 `abba`/`tmmzuxt`/`abcbda` 的输入
- 结尾 `❌ <n>/105 通过`（100 扩展 + 5 内置）

再跑一次验证缓存复用（不再打印"已生成"）：

Run: `node cli/hot100.js judge 3 sol-3.java`

Expected: 不再出现 `已生成 N 个扩展用例`，其余输出一致。

验证 `--no-extend`：

Run: `node cli/hot100.js judge 3 sol-3.java --no-extend`

Expected: 头行无 `含 100 个扩展用例`，输出 `✅ 5/5 全部通过`（buggy 版本被内置用例放过——这正是本功能要补的漏洞）。

- [ ] **Step 4: Commit**

```bash
git add cli/hot100.js
git commit -m "feat: judge 自动合并扩展用例，失败标注内置/扩展，支持 --no-extend/--regenerate"
```

---

### Task 3: 云端提交模块 `judge/leetcode-submit.js`

**Files:**
- Create: `judge/leetcode-submit.js`
- Modify: `scripts/test-extend.js`（追加云端非致命分支测试）

- [ ] **Step 1: 写云端提交模块**

完整文件内容：

```js
'use strict';

/**
 * LeetCode CN 云端提交：本地判题通过后，把核心代码提交到 leetcode.cn 拿官方判定。
 * 认证：环境变量 LEETCODE_SESSION / LEETCODE_CSRF_TOKEN，或 work/leetcode-config.json
 *      {session, csrf}（gitignore，chmod 600）。
 * 契约：任何失败返回 { error }，绝不抛异常；调用方非致命处理。
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CONFIG = path.join(ROOT, 'work', 'leetcode-config.json');
const BASE = 'https://leetcode.cn';
const POLL_TIMEOUT_MS = 30000;
const POLL_INTERVAL_MS = 1000;

function getAuth() {
  if (process.env.LEETCODE_SESSION && process.env.LEETCODE_CSRF_TOKEN) {
    return { session: process.env.LEETCODE_SESSION, csrf: process.env.LEETCODE_CSRF_TOKEN };
  }
  try {
    const cfg = JSON.parse(fs.readFileSync(CONFIG, 'utf8'));
    if (cfg && cfg.session && cfg.csrf) return { session: cfg.session, csrf: cfg.csrf };
  } catch { /* 未配置 */ }
  return null;
}

function slugFromUrl(url) {
  const m = /problems\/([^/?#]+)/.exec(url || '');
  return m ? m[1] : null;
}

async function graphql(auth, titleSlug) {
  const res = await fetch(`${BASE}/graphql/`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-csrftoken': auth.csrf,
      cookie: `csrftoken=${auth.csrf}; LEETCODE_SESSION=${auth.session}`,
    },
    body: JSON.stringify({
      operationName: 'questionData',
      query: 'query questionData($titleSlug: String!) { question(titleSlug: $titleSlug) { questionId titleSlug } }',
      variables: { titleSlug },
    }),
  });
  const data = await res.json();
  return data && data.data && data.data.question;
}

async function submit(auth, slug, qid, lang, code) {
  const res = await fetch(`${BASE}/problems/${slug}/submit/`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-csrftoken': auth.csrf,
      cookie: `csrftoken=${auth.csrf}; LEETCODE_SESSION=${auth.session}`,
      referer: `${BASE}/problems/${slug}/`,
    },
    body: JSON.stringify({ lang, question_id: Number(qid), typed_code: code, judge_type: 'large' }),
  });
  const data = await res.json();
  if (!data || !data.submission_id) {
    return { error: (data && data.error) || '提交失败（无 submission_id，登录态可能失效）' };
  }
  return { submissionId: data.submission_id };
}

async function check(auth, submissionId) {
  const res = await fetch(`${BASE}/submissions/detail/${submissionId}/check/`, {
    headers: { cookie: `csrftoken=${auth.csrf}; LEETCODE_SESSION=${auth.session}` },
  });
  return res.json();
}

async function submitToLeetCode({ problem, code, lang }) {
  const auth = getAuth();
  if (!auth) {
    return { error: '未配置登录态：设置环境变量 LEETCODE_SESSION/LEETCODE_CSRF_TOKEN，或写入 work/leetcode-config.json（见 docs/CLI_GUIDE.md）' };
  }
  const slug = slugFromUrl(problem.url);
  if (!slug) return { error: `无法从题目 url 解析 slug: ${problem.url}` };
  try {
    const q = await graphql(auth, slug);
    if (!q || !q.questionId) return { error: '获取 questionId 失败（登录态可能失效）' };
    const s = await submit(auth, slug, q.questionId, lang, code);
    if (s.error) return s;
    const deadline = Date.now() + POLL_TIMEOUT_MS;
    let r = null;
    do {
      await new Promise((res) => setTimeout(res, POLL_INTERVAL_MS));
      r = await check(auth, s.submissionId);
      if (r && r.state === 'SUCCESS') break;
    } while (Date.now() < deadline);
    if (!r || r.state !== 'SUCCESS') return { error: '云端判定超时' };
    const accepted = r.status_code === 10;
    let detail = null;
    if (r.status_code === 11 && r.last_testcase) {
      detail = `最后一个用例: ${r.last_testcase}${r.expected_output !== undefined ? '  期望: ' + r.expected_output : ''}`;
    } else if (r.status_code === 20 && r.compile_error) {
      detail = `编译错误: ${String(r.compile_error).slice(0, 300)}`;
    } else if (r.status_code === 14) {
      detail = '超时（Time Limit Exceeded）';
    } else if (r.status_code === 12) {
      detail = '内存超限（Memory Limit Exceeded）';
    }
    return { accepted, statusMsg: r.status_msg || (accepted ? 'Accepted' : '失败'), detail };
  } catch (e) {
    return { error: `云端提交异常: ${e.message}` };
  }
}

module.exports = { submitToLeetCode, getAuth, slugFromUrl };
```

- [ ] **Step 2: 在 `scripts/test-extend.js` 追加云端非致命分支测试**

在 `main()` 的 `console.log('缓存读写'); ...` 之后、`console.log(\`\n...\`)` 之前插入：

```js
  console.log('云端：未配置登录态 → 非致命 error');
  const { submitToLeetCode, getAuth } = require('../judge/leetcode-submit');
  if (getAuth()) {
    console.log('  已配置登录态，跳过未配置分支测试');
  } else {
    const verdict = await submitToLeetCode({ problem: p3, code: FIXED_SOL3, lang: 'java' });
    check('未配置登录态 → 返回 error 而非抛异常', !!(verdict && verdict.error));
  }
```

- [ ] **Step 3: 跑测试**

Run: `node scripts/test-extend.js`

Expected：原有断言全过，新增 `✅ 未配置登录态 → 返回 error 而非抛异常`（当前未配置登录态时）或 `已配置登录态，跳过未配置分支测试`。

- [ ] **Step 4: Commit**

```bash
git add judge/leetcode-submit.js scripts/test-extend.js
git commit -m "feat: leetcode.cn 云端提交模块（认证/提交/轮询，任何失败非致命）"
```

---

### Task 4: CLI `--cloud` 端到端验证

**Files:**
- Modify: 无（`cmdJudge` 已在 Task 2 接好 `--cloud` 分支）

- [ ] **Step 1: 未配置登录态时 `--cloud` 非致命**

Run: `node cli/hot100.js judge 3 sol-3.java --cloud`（此时未配置 cookie）

Expected：
- 本地判题输出照旧（`❌ <n>/105 通过`）
- 末尾追加 `⚠ 云端判定失败: 未配置登录态：设置环境变量 ...` 
- 进程退出码保持非零（本地未通过所致），不因云端失败额外改变

- [ ] **Step 2: （可选，需登录态）真实云端提交**

先在 `work/leetcode-config.json` 写入：

```json
{
  "session": "<你的 LEETCODE_SESSION cookie>",
  "csrf": "<你的 csrftoken cookie>"
}
```

`chmod 600 work/leetcode-config.json`

再用修复版 sol-3 跑：

Run: `node cli/hot100.js judge 3 sol-3.java --cloud`（把 `sol-3.java` 改成修复版后再跑）

Expected：末尾追加 `✅ LeetCode: Accepted` 或 `❌ LeetCode: Wrong Answer`（附最后一个用例）。若返回 `获取 questionId 失败`/`提交失败`，说明 cookie 过期，重新复制。

> 若本机不方便配置登录态，此步骤可跳过——验收以 Step 1 的非致命行为为准。

- [ ] **Step 3: Commit**

（若 Step 1 通过即可提交；无需改代码）

```bash
git add -A
git commit -m "chore: 验证 --cloud 非致命行为" || echo "无改动可提交"
```

---

### Task 5: 文档 + sol-3.java 修复

**Files:**
- Modify: `docs/CLI_GUIDE.md`
- Modify: `sol-3.java`

- [ ] **Step 1: 更新 `docs/CLI_GUIDE.md`**

在 judge 命令的说明里补充扩展用例与云端判定小节（照抄以下内容，若该文件结构不同则并入对应段落）：

```markdown
### 扩展测试用例（自动）

内置用例每题仅 4~6 组，覆盖很薄。`hot100 judge` 会**自动合并本地扩展用例**：
- 首次判题时为该题生成最多 100 个扩展用例（手写边界 + 穷举小空间 + 带种子随机），缓存在 `work/extended/tests-<id>.json`（gitignore）
- 之后判题自动复用缓存；`--regenerate` 强制重建；`--no-extend` 只用内置用例
- 失败用例会标注「内置」/「扩展」，方便定位

支持扩展用例的题目当前：#1 两数之和、#3 无重复字符的最长子串。想扩更多题，在 `judge/extend-tests.js` 的 `registry` 里加 oracle/curated/genRandom 即可。

### 云端判定（--cloud，可选）

本地判题通过后，可用 `--cloud` 提交 leetcode.cn 拿官方判定（覆盖隐藏全量用例）：

1. 浏览器登录 https://leetcode.cn ，打开开发者工具取两个 cookie：
   - `LEETCODE_SESSION`
   - `csrftoken`
2. 二选一提供登录态：
   - 环境变量：`LEETCODE_SESSION=xxx LEETCODE_CSRF_TOKEN=yyy hot100 judge 3 sol-3.java --cloud`
   - 配置文件：`work/leetcode-config.json` 写 `{ "session": "xxx", "csrf": "yyy" }` 并 `chmod 600`
3. 运行 `hot100 judge <id> <文件> --cloud`，输出 `✅/❌ LeetCode: Accepted/Wrong Answer` 等官方判定。

云端失败（未配置登录态/网络/超时）只会告警，不影响本地判题结果与退出码。cookie 为敏感信息，绝不提交进 git。
```

- [ ] **Step 2: 修复 `sol-3.java`**

把 `sol-3.java` 第 14 行：

```java
            if (map.containsKey(ch)) {
                left = map.get(ch) + 1;
            }
```

改为：

```java
            if (map.containsKey(ch)) {
                left = Math.max(left, map.get(ch) + 1);
            }
```

- [ ] **Step 3: 验证修复后全过**

Run: `node cli/hot100.js judge 3 sol-3.java`

Expected：`✅ 105/105 全部通过`（100 扩展 + 5 内置），失败列表为空。

- [ ] **Step 4: Commit**

```bash
git add docs/CLI_GUIDE.md sol-3.java
git commit -m "fix: sol-3 滑动窗口左边界用 Math.max 防回退；docs: 扩展用例与 --cloud 使用说明"
```

---

### Task 6: 最终验收

**Files:**
- 无

- [ ] **Step 1: 全量回归脚本**

Run: `node scripts/test-extend.js`
Expected: `✅ 全部通过`

- [ ] **Step 2: 确认 gitignore 生效**

Run: `git status`
Expected：`work/extended/` 与 `work/leetcode-config.json` 不出现在未跟踪列表（若配置过 cookie，确认它被忽略）。

- [ ] **Step 3: 确认内置数据未被改动**

Run: `git status --short public/data/`
Expected: 无输出（官方 tests.json/problems.json/solutions.json 未被改）。

- [ ] **Step 4: 对照验收标准**

| 标准 | 验证 |
|---|---|
| `judge 3 sol-3.java` 扩展用例下抓出 abba 类 bug | ✅ Task 2 Step 3（❌ n/105） |
| 修复版全过 | ✅ Task 5 Step 3（✅ 105/105） |
| `--cloud` 非致命 + 可选官方判定 | ✅ Task 4 |
| 本地部分纯离线、确定性 | ✅ 固定种子 `SEED=20261013`，缓存复用 |
| 无敏感信息进 git | ✅ Task 6 Step 2 |
