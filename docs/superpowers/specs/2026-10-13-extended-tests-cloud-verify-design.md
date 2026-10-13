# 扩展测试用例 + 云端判定 · 设计文档

日期：2026-10-13

## 背景与问题

内置测试用例每题仅 4~6 组（README 宣称的 959 组是 100 题总和：481 core + 478 acm，摊到每题就 4~6 个）。对边界覆盖极薄。实例：`sol-3.java`（无重复字符的最长子串）用 `left = map.get(ch) + 1;` 漏了 `Math.max(left, ...)`，5 个内置用例全部通过，但在 `"abba"`/`"tmmzuxt"`/`"abcbda"` 上输出错误（已用暴力解交叉验证）。

目标：让这类"过了内置用例但答案错误"的 bug 在本地就能被抓到，并在本地通过后拿到 LeetCode 官方判题结果。

## 需求确认

- **目标**：本地扩展用例 + 云端最终确认，两者都要
- **范围**：按需——刷到哪题扩哪题（不一次性扩满 100 题）
- **云端认证**：提供 leetcode.cn 登录态（session/csrf cookie），本地存储，不进 git
- **使用方式**：自动集成进 `hot100 judge`——判题自动合并扩展用例（首次自动生成并缓存）；`--cloud` 一键追加 LeetCode 判定

## 方案（已确认：方案 A —— 独立扩展用例库）

```
judge/
  extend-tests.js      ★ 扩展用例生成器（oracle 注册表 + 生成逻辑 + 缓存读写）
  leetcode-submit.js   ★ 云端提交（cookie 读取 + slug/questionId 解析 + submit + 轮询）
cli/
  hot100.js            judge 接入扩展用例合并 + --cloud / --regenerate / --no-extend
work/
  extended/            (gitignore) 每题缓存 tests-<id>.json
  leetcode-config.json (gitignore, chmod 600) 登录态 {session, csrf}
```

**核心边界**：`judge/judge.js`（编译/判题内核）不改一行。扩展用例的合并发生在 CLI 层——先拼 `tests = 内置 + 扩展`，再照旧交给 `judgeCore/judgeACM`。云端提交是独立模块，只在 `--cloud` 时调用，任何失败不影响本地判题结果与退出码。

## 1. 扩展用例生成器（judge/extend-tests.js）

按题注册 oracle 注册表，每道被扩展的题定义：

```js
registry[3] = {
  oracle(args) { /* 暴力/可信解，返回 expected（与驱动格式一致） */ },
  genRandom() { /* 带种子的随机输入生成器，返回 args */ },
  curated: [ ["abba"], ["tmmzuxt"], ["abcbda"], ... ],  // 手写边界
  exhaustive: { alphabet: "ab", maxLen: 6 },             // 可选：穷举小空间
}
```

生成算法（确定性，固定种子存进缓存）：

1. 先收手写边界（最高价值，抓 `abba` 这类反例）
2. 再加穷举小输入（空间小才做，如字母表 `{a,b}` 长度 ≤6）
3. 最后加带种子随机输入（mulberry32，规模到几百）
4. 每个输入用 `oracle` 算 expected；oracle 抛错/无结果则跳过该例
5. 可选交叉验证：对抽样用例，用现有 python3 参考题解跑一遍，与暴力 oracle 不一致则告警（提示参考题解本身有误）
6. 上限控制（core ≤ 100（MAX_CASES）例），写入 `work/extended/tests-<id>.json`

输出 schema 与现有 core 用例逐字段一致（`{args, expected}`），判题内核零改动。

**MVP 范围**：只扩 core 模式，`acm: []`。理由：core 是默认模式，也是 sol-3 这类 bug 的所在地；ACM 需要按题写 stdin 解析，成本高。ACM 扩展作为注册表的扩展点后续加（`acmSerialize(args) → {input, output}`）。

注册表 MVP 仅纳入参数/返回类型为 `int`/`string`/`int[]`/`int[][]`/`bool`/`string[]` 的题目（驱动可直接 JSON 序列化对比）；链表 `list:`/树 `tree:`/矩阵 `grid:` 等带记号类型的题目暂不纳入，后续按需扩展。

## 2. judge 集成（cli/hot100.js 的 cmdJudge）

1. 判题前：给了 `--no-extend` → 只用内置；否则读 `work/extended/tests-<id>.json`，缺失或给了 `--regenerate` → 生成并打印 `已生成 N 个扩展用例`；最终 `tests = 内置 + 扩展`（扩展附后）
2. 判题结果：失败用例标注「内置」/「扩展」，方便定位
3. `--cloud`：本地跑完后调云端提交，打印 LeetCode 官方判定。本地全过但云端 WA → 强信号（真实隐藏用例更强，或参考题解/内置 expected 有误）；云端因认证/网络失败 → 仅告警，不改本地判题退出码

CLI 开关：

| 开关 | 作用 |
|---|---|
| `--cloud` | 追加 LeetCode 云端判定 |
| `--regenerate` | 强制重建扩展用例缓存 |
| `--no-extend` | 只用内置用例 |

## 3. 云端提交（judge/leetcode-submit.js）

- **认证**：读环境变量 `LEETCODE_SESSION`/`LEETCODE_CSRF_TOKEN`，或 `work/leetcode-config.json`（gitignore + chmod 600）。README 手把手教复制 cookie，不做登录流程（安全、简单）
- **slug**：从 `problem.url` 解析 `leetcode.cn/problems/<slug>/`
- **questionId**：调 CN GraphQL `questionData(titleSlug)` 获取
- **提交**：POST `/problems/<slug>/submit/`，body `{lang, question_id, typed_code, judge_type:"large"}`，带 csrf/session cookie 请求头；lang 映射 java→java、python3→python3、cpp→cpp。用户文件为 `class Solution {...}`，与 LeetCode 期望的 Java 提交形式一致
- **轮询**：`/submissions/detail/<id>/check` 直到终态；WA 时抓 `last_testcase`/`expected_answer` 展示
- **限流**：单次调用串行，超时 30s；401/429/网络错误一律非致命告警

## 4. 错误处理 · 安全 · 测试

- **生成器**：oracle 抛错跳过该例；穷举长度/随机数量有上限，生成有运行时间预算；种子固定 → 完全可复现
- **云端**：任何失败非致命、绝不挂起（有超时）；cookie 只出现在请求头，不落盘到 git，配置文件 0600
- **.gitignore**：新增 `work/extended/`、`work/leetcode-config.json`
- **测试**：`scripts/test-extend.js`
  - 对 #3 生成扩展用例，断言包含 `abba`/`tmmzuxt`，且参考题解全过生成用例（无假阳性）
  - 回归：喂入有 bug 的 sol-3，断言扩展用例能判它失败（证明该功能确实抓得住当初漏掉的 bug）
- `verify-parts.js` 不动（官方数据未变）

## 验收标准

1. `hot100 judge 3 sol-3.java` 在扩展用例下判为失败（能抓 `abba` 类 bug）；修复版判为通过
2. `hot100 judge 3 sol-3.java --cloud` 在本地通过后追加输出 LeetCode 官方判定
3. 本地部分纯离线、确定性、可复现
4. 无敏感信息进 git（`.gitignore` 覆盖扩展缓存与登录配置）
