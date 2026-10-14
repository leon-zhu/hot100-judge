# 扩展测试用例全覆盖 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 Hot100 全部 100 道题都能生成扩展测试用例，期望值由题库自带 python3 参考题解计算。

**Architecture:** 新增 `judge/gen/` 三个模块（输入生成器 / oracle / 逐题配置），重构 `judge/extend-tests.js` 为编排层并保持对外 API 不变。输入用「自动从内置用例推导默认规格 + 逐题 override + 约束 flag」生成，期望值用现有 `judgeCore` 跑参考题解取 `got`，异常用例丢弃。

**Tech Stack:** Node.js（无依赖）、Python3（仅用于 oracle）、现有 `judgeCore` 驱动。

**参考 spec:** `docs/superpowers/specs/2026-10-14-extend-tests-all-problems-design.md`

---

## 文件结构

| 文件 | 职责 |
|---|---|
| `judge/gen/inputs.js` | 带种子 PRNG、类型驱动生成器、约束 flag 引擎、从内置用例自动推导规格 |
| `judge/gen/oracle.js` | 批量跑参考题解取 `got`、参考题解自检 |
| `judge/gen/spec.js` | 逐题 override 注册表（约束 flag / 自定义 build 钩子） |
| `judge/extend-tests.js` | 编排：resolveSpec → 生成候选 → oracle → 去重裁剪 → 落盘（**保持 API 不变**） |
| `cli/hot100.js` | 生成 0 条时补提示 |
| `scripts/test-extend.js` | 通用回归（扩展改写） |
| `scripts/verify-extend-all.js` | 全量覆盖报告（新增，纳入 CI） |

## 批次一：基础设施 + 标量/数组/字符串题（~65）

### Task 1: 输入生成器 —— PRNG 与标量/数组/字符串

**Files:** Create `judge/gen/inputs.js`

- [ ] 实现 `seededRandom(seed)`（mulberry32）、`randInt`、`genString`、`genIntArray`、`genIntMatrix`、`genStringArray`、`genStringMatrix`。
- [ ] 约束 flag：`len:[lo,hi]`、`min`/`max`、`sorted`、`distinct`、`positive`、`nonNeg`、`alphabet`、`nonEmpty`。
- [ ] 导出 `genValue(rand, spec)`：按 `spec.type` 分派。
- [ ] 自测：`node -e` 断言长度/范围/有序/互异 flag 生效。

### Task 2: 从内置用例自动推导默认规格

**Files:** Modify `judge/gen/inputs.js`

- [ ] `deriveSpecs(core, kind, bundled)`：扫描每参数位，推断 min/max、长度区间、sorted/distinct、字符集、可空性；长度上限温和放宽（×2~3）。
- [ ] 导出 `deriveSpecs`。自测：对 #1/#53/#121 抽样打印推导结果，人工核对合理。

### Task 3: oracle 模块

**Files:** Create `judge/gen/oracle.js`

- [ ] `runReference({core, refCode, kind, candidates})` → `{fatal, results:[{valid,got,error}]}`，复用 `judgeCore`（expected 置 null 读 got）。
- [ ] `verifyReference({core, refCode, kind, bundled})` → boolean。
- [ ] 自测：跑 #1 参考题解取 got。

### Task 4: 逐题 override 注册表

**Files:** Create `judge/gen/spec.js`

- [ ] `overrides`：把现有 #1/#3 的手写 oracle 逻辑迁移为「自定义 `build(rand)` 钩子 + `curated`」。
- [ ] 预留批次二的结构类型 override 位。
- [ ] 导出 `getOverride(id)`。

### Task 5: 重构 extend-tests.js 为编排层

**Files:** Modify `judge/extend-tests.js`

- [ ] `buildCases(id)`：`resolveSpec` → 多轮生成候选 → `runReference` → 保留 `valid` 条 → 去重 → 裁剪至 `TARGET_CASES`。
- [ ] `generateExtendedTests(id)`：先 `verifyReference`，不通过则写 `refUnusable` 且不写扩展；否则写 `{problemId,seed,generatedAt,kind,core,acm:[]}`。
- [ ] 保持 `loadExtendedTests` / 导出名不变。
- [ ] 自测：`generateExtendedTests(1/3/53/121)` 非空。

### Task 6: CLI 提示

**Files:** Modify `cli/hot100.js:227-236`

- [ ] 生成 0 条时打印 `该题暂无扩展用例`。

### Task 7: 回归测试改写

**Files:** Modify `scripts/test-extend.js`

- [ ] 抽 #1/#3 保留原回归（buggy 必失败、fixed 必过、参考全过）。
- [ ] 新增抽样题（#53/#121/#70）断言：扩展非空、参考题解全过。

### Task 8: 全量覆盖报告

**Files:** Create `scripts/verify-extend-all.js`；Modify `.github/workflows/ci.yml`

- [ ] 遍历 100 题：生成 → 断言参考题解全过 → 输出 `refUnusable`/`lowCoverage`/空报告。
- [ ] CI 增加该步骤。

### Task 9: 批次一验证与提交

- [ ] `node scripts/test-extend.js`、`node scripts/verify-extend-all.js` 全绿。
- [ ] 抽查 CLI：`hot100 judge 53 sol-53.java` 出现「含 N 个扩展用例」。
- [ ] 提交。

## 批次二：结构类型 + ops（31 + 4）

### Task 10: 结构类型生成器

**Files:** Modify `judge/gen/inputs.js`

- [ ] `list`（`"list:[...]"`）、`tree`（层序 + null）、`grid`（字符矩阵）、`randomList`、`listArray`、`cycleList`、`intersectList` 记号生成。
- [ ] 自测：生成的记号能被 `_build` 正确解析（跑参考题解验证）。

### Task 11: ops 序列生成器

**Files:** Modify `judge/gen/inputs.js`

- [ ] `genOps(rand, core, spec)`：随机构造器参数 + 随机方法序列；越界（如空栈 pop）由 oracle 丢弃并重采样。
- [ ] 自测：#146/#155/#208/#295 生成并跑参考题解。

### Task 12: 结构/ops 题 override

**Files:** Modify `judge/gen/spec.js`

- [ ] 31 道记号题 + 4 道 ops 题的约束 override（#105 前序中序构造、#141 环、#160 相交、#138 随机指针、#79/#200/#994 网格等）。

### Task 13: 端到端验证与提交

- [ ] `hot100 judge 146 sol-146.java --regenerate` 出现扩展用例。
- [ ] `node scripts/verify-extend-all.js`：100 题覆盖报告无 `refUnusable`。
- [ ] 提交。

---

## 实施结果（2026-10-14）

批次一 + 批次二已一并完成。`node scripts/verify-extend-all.js` 结果：

```
可扩展: 100/100
空用例: 无
低覆盖: #22(7)      # 单参数 n=0..6 已穷尽该参数空间，属正常
参考题解未全过: 无   # Python3/C++/Java 三份参考题解在全部扩展用例上全过
总扩展用例: 4680
```

实施中额外发现并修复（不在原计划内）：

1. **cpp 驱动空结构序列化不一致**：空链表/空树被序列化为 `[]`，而 Python/Java 为 `null` → 修正 `core-driver.js`
   的 `canonList` / `canonTree` / `canonRandomList` 返回 `null`。
2. **推导范围溢出**：内置样例含 `2147483647`（#98）会把推导范围放大到 4.3e9，C++/Java 溢出 → `widenRange`
   统一钳制到 ±1e6，并对 #70/#152/#238 等乘积/递推题单独收紧。
3. **ops 参数规格未生效**：`genOps` 未读取 override 的构造器/方法参数规格，导致 #146 容量恒为 -100~100、
   几乎不触发淘汰 → 修正 `genOps` 的规格来源（`opCount`/`ctorArgs`/`args`/`argsByName`）。
4. **结构记号缺失**：`genValue` 未处理 `cycleList` / `intersectList`，`grid` 返回数组而非记号 → 已修正。

override 清单：`judge/gen/spec.js` 共 24 条（#1/#2/#3/#17/#22/#23/#25/#46/#48/#51/#70/#78/#79/#98/#105/#141/#142/#146/#152/#155/#160/#207/#208/#215/#230/#236/#238/#239/#295/#347）。

## Self-Review

- **Spec 覆盖**：oracle（Task 3）、输入生成 + flag（Task 1/10/11）、自动推导（Task 2）、逐题 override（Task 4/12）、CLI 提示（Task 6）、测试（Task 7/8/13）、分批（批次一/二）——均有对应任务。
- **类型一致性**：`runReference` 返回 `{fatal, results:[{valid,got,error}]}`；`deriveSpecs`/`genValue` 用统一的 `spec{type,...}`；`buildCases` 输出 `{args,expected}` / `{ops,args,expected}` 与 `judgeCore` 输入形状一致。
- **占位符**：无 TBD；结构类型的具体实现代码在执行阶段补全。
