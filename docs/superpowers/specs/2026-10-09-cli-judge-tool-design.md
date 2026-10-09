# Hot100 命令行刷题工具设计

日期：2026-10-09
状态：已批准

## 背景与目标

在 `hot100-judge` 仓库内新增一个零依赖的 Node.js 命令行工具，用于本地刷 Hot100 题：
- 查询：`list` / `show` / `search` / `random` / `init`
- 评测：`judge` —— 文件路径提交答案，复用现有 `judge/` 模块真实编译运行
- 进度：`mark` / `progress` —— 本地持久化已刷与收藏

**本次新增能力：Java 核心代码模式评测。** 现有 judge 只支持 python3/c/cpp（ACM + 核心代码），
用户希望用 Java 刷题，且仅需要 LeetCode 风格的核心代码模式（写 `class Solution` 函数）。

已确认的用户决策：
1. 定位：带评测的刷题工具
2. 提交方式：文件路径提交（`hot100 judge 1 sol.java`）
3. 语言：Java（本机 javac 1.8.0_441）
4. Java 评测：仅核心代码模式
5. 架构：方案 A —— 单文件零依赖 Node CLI

## 功能需求

### CLI 命令集（子命令风格）

| 命令 | 作用 |
|---|---|
| `hot100 list [--company X] [--difficulty 简单\|中等\|困难] [--topic 数组] [--top 20] [--sort id\|rank]` | 题目列表，表格输出 id/标题/难度/专题/高频排名 |
| `hot100 show <id>` | 详情：题目描述、核心代码签名、ACM 输入输出示例、CodeTop 排名/最近被考/常考公司、解题思路、参考题解(py/cpp) |
| `hot100 judge <id> <file> [--lang java]` | 提交文件评测，逐用例显示 通过/期望/实际，最后汇总 |
| `hot100 search <关键词>` | 按标题/描述搜索 |
| `hot100 random [--company X] [--unfinished]` | 随机一题 |
| `hot100 init <id> [--lang java]` | 生成带正确方法签名的模板文件 |
| `hot100 mark <id> done\|star\|unstar\|reset` | 标记已刷 / 收藏错题 |
| `hot100 progress` | 进度统计：已刷/未刷/收藏，按难度与专题分布 |

- `--lang` 不传时按扩展名推断：`.java`→java、`.py`→python3、`.cpp`→cpp
- 语言支持矩阵：Java 仅核心代码模式（新增）；python3/cpp 沿用现有 ACM + 核心两模式
- 无子命令时打印帮助

### 评测流程（`judge` 命令）

1. 解析题目 id、语言、文件路径
2. 校验：题目存在且该题有 core 数据；文件存在
3. 读文件内容作为 `code`
4. 调 `judge/judge.js` 的 `judgeCore({ language, code, core, tests })`（Java 走新增分支）
5. 按 `outcome` 输出：编译失败透出 javac 报错；运行失败透出 stderr/超时；成功则逐用例输出结果 + 汇总
6. 可选：提示是否 `mark done`

## 架构设计

### 文件结构

```
cli/
  hot100.js          # 单文件 CLI（#!/usr/bin/env node，零依赖）
judge/
  java-driver.js     # 新增：Java 核心代码模式驱动生成器
  judge.js           # 改：judgeCore 增加 Java 分支
  runner.js          # 不改（编译/运行/资源限制复用 runProcess）
scripts/
  verify-java.js     # 新增：Java 驱动验证（全 100 题冒烟 + 精选真实题解）
  java-ref/          # 新增：约 12 份 Java 参考题解（覆盖全部类型）
package.json         # 改：加 "bin": {"hot100": "cli/hot100.js"}
.gitignore           # 改：追加 work/cli-state.json
.github/workflows/ci.yml  # 改：环境检查加 java -version + 新增 verify-java 步骤
```

### CLI 实现要点

- 零依赖：只用 Node 内置 `fs`/`path`/`child_process`，数据直接读 `public/data/problems.json` / `solutions.json` / `tests.json`
- 表格输出对齐用固定宽度 + padEnd，不使用外部库
- 进度状态读写 `work/cli-state.json`：`{ solved: [id], starred: [id], updatedAt }`
- `init` 模板：Java 模板带 `import java.util.*;` + 正确类/方法签名 + 参数注释；python3/cpp 模板同样生成签名骨架

### Java 核心代码模式评测

新增 `judge/java-driver.js`，结构镜像现有 C++ 驱动（`judge/core-driver.js` 的
`buildCppDriver` / `CPP_PREAMBLE` / `CPP_TYPE_CONV`）：

1. **最小 JSON 解析器**：cases 写入 `cases.json`，驱动运行时解析为通用结构
   （null/Boolean/Double/String/List）。不引入第三方库。
2. **辅助类**：`ListNode` / `TreeNode` / `Node`
3. **构建器**：把记号字符串还原成对象 —— `list:[...]`、`tree:[...]`、
   `grid:[...]`、`randomList:[...]`
4. **Canon 序列化 + 比较器**：`canonList` / `canonTree` / `canonRandomList`，
   输出 `[{"ok":true}, {"ok":false,"expected":..,"got":..,"error":..}]`，
   与 `judge.js` 的 `parseCoreResults` 兼容
5. **类型覆盖**：int / double / bool / string / int[] / int[][] / string[] /
   string[][] / grid / list / tree / randomList + void 返回 + `mutates`（原地修改题）
6. **ops 型**：为 LRU / 最小栈 / Trie / 数据流中位数 生成 `new ${className}(...)` +
   `obj.method(...)` 的 if/else 派发

**Java 单 public 类约束的处理**（关键）：
- 用户代码原样写入 `${core.className}.java`（如 `Solution.java`、`LRUCache.java`），
  支持 `public class X`；驱动写 `Main.java`，同包引用用户类，无需 import
- 编译：`javac -encoding UTF-8 -d out Main.java ${className}.java`
- 运行：`java -cp out Main cases.json`

**Java 8 约束**：全部用传统语法（if/else、标准集合、无 switch 表达式、无 var）。

`judge/judge.js` 的 `judgeCore` 新增分支：

```
if (language === 'java') {
  检查 javac/java 存在（commandExists）
  const source = buildJavaDriver({ core, code, cases });
  写 Main.java / ${className}.java / cases.json 到临时目录
  javac 编译（runProcess, phase:'compile'）→ 失败返回 compileError
  java 运行（runProcess, timeout: CORE_TIMEOUT_MS）→ 失败返回 error
  parseCoreResults(run.stdout)
}
```

## 测试

### 1. 全 100 题驱动冒烟（`scripts/verify-java.js` 第一段）

对每题用"桩 Solution"（签名正确、返回零值）生成驱动，断言：
- 能编译（javac 无错）
- 能运行（结果数组合法，无 `ERR:` 条目）

覆盖全部 13 种类型 × 4 个 ops 题的驱动生成路径。桩签名从 `core.params`/`core.returns`
生成，不验证语义正确性，只验证"驱动 + 签名 + 类型通路"无误。

### 2. 精选真实题解（`scripts/java-ref/`，约 12 份）

手写正确 Java 参考题解，覆盖：
- 纯数值：int 返回（两数之和）、int[] 返回、string 返回
- 复杂参数：list（反转链表）、tree（二叉树最大深度）、grid（岛屿数量）、
  randomList（随机链表的复制）
- 原地修改 + void：旋转图像（mutates）
- 4 个 ops 题：LRU / 最小栈 / Trie / 数据流中位数

断言全部测试用例通过。验证驱动**语义正确**而非仅编译通过。

### 3. CLI 冒烟

- `judge` 对一个正确样例文件跑通一次
- 一个错误文件能给出"编译失败 + javac 行号"，进程退出码非 0，不崩栈

### 4. CI 接线（`.github/workflows/ci.yml`）

- 环境检查加 `java -version`
- 新增一步 `node scripts/verify-java.js`（ubuntu-latest 自带 OpenJDK）

## 错误处理

| 场景 | 行为 |
|---|---|
| 文件不存在 | 明确报错，退出码 1 |
| 题目 id 无效 / 该题无 core 数据 | 明确报错，退出码 1 |
| 语言不支持核心模式 | 明确报错（仅 python3/cpp 支持 core，java 本次新增） |
| javac 编译失败 | 透出 javac 报错 + 行号，退出码 1 |
| 运行超时 / 资源超限 | 透出 runner 的 killedByLimit 信息 |
| 未装 javac/java | 明确报错"当前系统未安装 javac" |

## 非目标（YAGNI）

- 不新增 Java ACM 模式
- 不为 Java 写全 100 份参考题解（无此需求，题库 solutions.json 维持 py/cpp）
- 不做交互式 REPL
- 不引入任何第三方 npm 依赖
