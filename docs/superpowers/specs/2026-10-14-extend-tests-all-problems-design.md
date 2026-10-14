# 扩展测试用例全覆盖设计（100 题）

日期：2026-10-14
状态：已确认方向（用户授权：方向确定后自主推进至完成）

## 1. 背景与问题

现状：`judge/extend-tests.js` 的扩展用例生成器只在 registry 里硬编码了 **#1 和 #3** 两道题的手写暴力 oracle。其余 98 题执行 `hot100 judge <id> --regenerate` 时，`buildCases` 直接返回 `[]`，`work/extended/tests-<id>.json` 写出空 `core`，用户看到的总用例数始终等于内置数（4~6 个）。

内置用例总量：100 题 core 共 481 个，中位数 5 个/题。扩展空间很大但完全没被利用。

目标：让**全部 100 道题**都能生成扩展用例，且期望值正确、可复现、可 `--regenerate` 重建。

## 2. 关键事实（已验证）

- **100/100 题都有 `solutions.json[pid].python3.core`** 参考题解，且形态与用户代码一致（函数型 / ops 类）。
- 用现有 `judgeCore({language:'python3', code: refPy, core, tests})` 即可运行参考题解并拿到原始 `got`——实测 #1 返回 `[0,1]`、#206（链表记号）返回 `[5,4,3,2,1]`、#146（ops）返回 `[null,null,1]`。**无需新写运行器。**
- 参考题解跑出的 `got` 已是 canon 序列化结果；驱动对 `expected` 走 `_to_json(_build(...))`，`_build` 对纯 JSON 是恒等映射，故**直接存 `got` 为 `expected` 必然与比较逻辑一致**。
- 参考题解在越界输入上大多会抛异常 → 该用例直接丢弃，天然过滤无效输入。
- CI (`scripts/verify-parts.js all`) 已保证 100 份参考题解能过内置用例，参考题解可信度有底。
- 类型词汇有限：`int / string / bool / double / void / int[] / int[][] / string[] / string[][] / grid / list / tree / randomList / listArray`，另有 ops 型（构造器 + 方法集）。
- 题型分布：函数型 96 题（其中 31 题含链表/树/图记号类型）、ops 型 4 题（#146/#155/#208/#295）。

## 3. 决策记录（用户已确认）

| 决策点 | 结论 |
|---|---|
| oracle 来源 | **跑题库自带 python3 参考题解**，不手写 oracle |
| 输入生成 | **通用类型驱动生成器 + 约束 flag 词表 + 逐题钩子** |
| 落地节奏 | **分两批**：批次一 = 基础设施 + 标量/数组/字符串题（~65）；批次二 = 31 道链表/树/图 + 4 道 ops |
| 执行方式 | 方向确定后自主推进至完成，不逐步询问 |

## 4. 架构

### 4.1 模块划分（保持 `judge/` 扁平风格）

```
judge/extend-tests.js     # 编排层：对外 API 不变（generateExtendedTests / loadExtendedTests / buildCases）
judge/gen/spec.js         # 逐题配置注册表（自动推导默认值 + 手写 override）
judge/gen/inputs.js       # 类型驱动输入生成器 + 约束 flag 引擎
judge/gen/oracle.js       # 参考题解 oracle：批量跑 python3 取 got、丢弃异常、去重、上限裁剪
```

`cli/hot100.js` 的调用面不动（仍旧 `loadExtendedTests` / `generateExtendedTests`），仅在生成 0 条时补一句提示。

### 4.2 数据流 `generateExtendedTests(id)`

```
spec = resolveSpec(id)                        # 自动推导 + override 合并
if (!spec) return empty                        # 无配置（理论上不再出现）
candidates = []
rounds: 生成 M 条候选 → oracle 批量求 got → 收集有效条 → 去重
        直到达到目标条数 N 或尝试预算耗尽
若有效条数 == 0 → 不写扩展，标注 refUnusable
写 work/extended/tests-<id>.json { problemId, seed, generatedAt, kind, core, acm:[] }
```

### 4.3 oracle（`judge/gen/oracle.js`）

- 输入：`{ core, refPyCode, candidates }`；输出：与 candidates 等长的 `{valid, got, error}`。
- 实现：复用 `judgeCore`，把 candidates 的 `expected` 置为 `null`，读每条结果的 `got`；有 `error` 字段即视为无效（异常）→ 丢弃。
- **参考题解自检**：生成前先用内置用例跑一次参考题解，任一不过 → 放弃该题扩展并返回 `refUnusable=true`（CI 已保证，此处为运行时双保险）。
- 批量：一道题一个 python 进程（一次 `judgeCore` 调用跑完该题全部候选），控制进程开销。

### 4.4 输入生成器（`judge/gen/inputs.js`）

**类型驱动生成器**覆盖全部类型词汇：
- 标量：`int / bool / double / string`
- 数组：`int[] / int[][] / string[] / string[][]`
- 结构（批次二）：`list`（生成 `"list:[...]"` 记号）、`tree`（层序生成 + null 占位）、`grid`（字符矩阵，默认 `0/1`）、`randomList`、`listArray`
- ops（批次二）：按 `core.ops` 的构造器/方法签名随机生成合法操作序列

**约束 flag 词表**（每题声明，约 1 行/题）：

| flag | 作用于 | 含义 |
|---|---|---|
| `len:[lo,hi]` | 数组/字符串/ops 序列 | 长度范围 |
| `min` / `max` | 数值 | 取值下界/上界 |
| `sorted` | 数组 | 生成后排序 |
| `distinct` | 数组 | 元素互异 |
| `positive` / `nonNeg` | 数值 | 正数 / 非负 |
| `alphabet:"abc"` | 字符串/grid | 字符集 |
| `nonEmpty` | 数组/字符串 | 非空 |
| `derive:"..."/fn` | 任意参数 | 由其他参数派生（如 #1 的 target 由两个下标求和） |

**逐题钩子 `build(rand)`**：完全接管参数生成（约定有解、结构约束等复杂情形）。

### 4.5 自动推导默认配置（覆盖 100 题的关键）

手写 100 题配置不现实。`resolveSpec` 对**没有手写 override 的题**，从内置 core 用例自动推导默认参数规格：
- 扫描每个参数位：推断类型形态、数值 min/max、数组长度区间、是否有序/互异、字符串字符集、是否可空。
- 采样面窄（4~6 条）时对长度/范围做**温和放宽**（长度上限 ×2~3，数值范围向零对称外扩）。
- 越界输入靠 oracle 的「抛异常即丢弃」兜底；若某题有效条数过低（< 下限阈值），该题标注 `lowCoverage` 并由 CLI 提示。

### 4.6 存储与确定性

- 存储：`work/extended/tests-<id>.json`（gitignored，可 `--regenerate` 重建）。新增字段 `kind`、`refUnusable`、`lowCoverage`。
- 确定性：沿用 `mulberry32` 带种子 PRNG，`SEED` 固定；每题种子 = `SEED ^ id` 以避免跨题序列相关。
- 上限：`MAX_CASES`（沿用 100），单题目标条数 `TARGET_CASES`（默认 40）。

## 5. CLI 变更（最小）

- 生成 0 条扩展用例时明确提示：`该题暂无扩展用例（无可用配置）`。
- `--regenerate` 语义不变。
- 失败用例已能标注「内置/扩展」，无需改动。

## 6. 测试策略

沿用 `scripts/` 脚本式自测（无测试框架）：

- `scripts/test-extend.js` 扩展为通用回归：
  - 抽样题目：扩展用例非空、不超上限。
  - **参考题解在生成用例上全过**（防止 oracle 自造矛盾 → 假失败）。
  - **已知错误解必须被判失败**（回归保护，如 #3 的 buggy 版本、#146 的一个常见 LRU 错误实现）。
  - 结构类型题（批次二）：链表/树/ops 各抽 1 题验证。
- 新增 `scripts/verify-extend-all.js`：遍历 100 题生成扩展用例 → 断言「参考题解全过」→ 汇总覆盖率报告（哪些题 `refUnusable` / `lowCoverage`）。纳入 CI。

## 7. 风险与缓解

| 风险 | 缓解 |
|---|---|
| 参考题解本身错 → 期望值错 | 生成前自检（跑内置用例）；CI `verify-parts` 已双重保证 |
| 越界输入 → 假失败 | 约束 flag + 自动推导 + 抛异常丢弃；`lowCoverage` 标注 |
| 结构生成无效（如前序中序构不出树） | 逐题钩子接管（#105 等）；批次二集中处理 |
| ops 序列非法（如空栈 pop） | oracle 丢弃该 case 并重采样；必要时逐题 state 守卫钩子 |
| 生成耗时 | 一题一次进程；结果落缓存，仅首次/`--regenerate` 触发 |
| `--regenerate` 破坏已有质量 | 新配置下重建，`test-extend` 回归保障 |

## 8. 分批交付

**批次一**：`gen/inputs.js`（标量/数组/字符串）、`gen/oracle.js`、`gen/spec.js`（自动推导 + 少量 override）、`extend-tests.js` 重构、CLI 提示、测试。覆盖 ~65 道标量/数组/字符串题。

**批次二**：`gen/inputs.js` 扩展结构类型（list/tree/grid/randomList/listArray）与 ops 生成器；31 道记号类型题 + 4 道 ops 题的 override。`verify-extend-all.js` 纳入 CI。
