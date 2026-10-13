# 🔥 Hot100 命令行刷题工具 · 使用说明

本地运行的 LeetCode Hot 100 刷题 CLI：**查询、评测（含 Java）、进度追踪** 一条命令搞定。
题库 100 题 / 959 测试用例 / 400 份题解，纯本地离线可用。

---

## 1. 安装与环境

### 1.1 依赖

| 依赖 | 用途 | 必装 |
|---|---|---|
| Node.js ≥ 18 | 运行 CLI 本体 | ✅ 必须 |
| `javac` / `java` | **Java** 核心代码模式评测 | 想用 Java 刷题则必须 |
| `python3` | Python3 评测 | 想用 Python 刷题则必须 |
| `gcc` / `g++` | C 语言 / C++ 评测 | 想用 C/C++ 刷题则必须 |

> 注：本仓库所有语言共用一套用例与题解；只装你用的语言即可，其余命令（list/show/search 等）不依赖编译器。

### 1.2 安装全局命令

```bash
cd hot100-judge            # 仓库根目录
npm link                  # 注册全局 hot100 命令
hot100 --help             # 验证
```

不装全局命令也能用：`node cli/hot100.js list --top 10` 等价于 `hot100 list --top 10`。

---

## 2. 命令总览

```
hot100 list [选项]                    题目列表（表格）
hot100 show <题号> [--explain]        题目详情
hot100 search <关键词>                搜索题目
hot100 random [--company X] [--unfinished]  随机抽一题
hot100 init <题号> [--lang X]         生成模板文件
hot100 judge <题号> <文件> [选项]     提交答案评测
hot100 mark <题号> <操作>             标记已刷 / 收藏
hot100 progress                       进度统计
hot100 -h | --help | help             帮助
```

---

## 3. 查询

### 3.1 `list` — 题目列表

```bash
hot100 list                          # 全部 100 题，按题号排序
hot100 list --top 20                 # 只看前 20 题
hot100 list --sort rank --top 10     # 按 CodeTop 高频排名，最热的在前
hot100 list --difficulty 简单        # 只列简单题
hot100 list --topic 数组             # 只列数组专题
hot100 list --company 字节跳动       # 只列字节跳动常考
hot100 list --sort rank --company 腾讯 --difficulty 中等 --top 20
```

选项说明：

| 选项 | 说明 |
|---|---|
| `--company <公司>` | 按常考公司筛选（如 `字节跳动` / `腾讯` / `美团`） |
| `--difficulty` | `简单` / `中等` / `困难` |
| `--topic` | 专题名，如 `数组` / `链表` / `动态规划` / `滑动窗口` |
| `--top <N>` | 只输出前 N 条 |
| `--sort id` | 按题号升序（默认） |
| `--sort rank` | 按 CodeTop 高频排名升序（**rank 越小越热门，即高频在前**） |

输出表格列：`ID | 难度 | 专题 | 高频 | 标题 | 状态`，状态列显示 `★`（收藏）/ `✓`（已刷）。

### 3.2 `show <题号> [--explain]` — 题目详情

```bash
hot100 show 1                  # 题目信息：描述 / 核心签名 / ACM 输入输出 / CodeTop 高频
hot100 show 1 --explain        # 在上面的基础上追加：解题思路 + Python3/Java 参考题解
hot100 show 146                # ops 型题（LRU）显示类签名
```

默认只输出题目本身信息，末尾会提示 `加 --explain 查看解题思路与参考题解`。

### 3.3 `search <关键词>` — 搜索

```bash
hot100 search 两数        # 命中 两数之和 / 两数相加 / 三数之和 / 杨辉三角（描述含"两数"）
hot100 search 滑动窗口
```

按 标题 / 题目描述 / 专题 / 解题思路 四字段做包含匹配。

### 3.4 `random [选项]` — 随机一题

```bash
hot100 random                        # 从全部题里随机
hot100 random --unfinished           # 只从未完成（未标记 done）的题里抽
hot100 random --company 美团         # 只从美团常考题里抽
```

---

## 4. 刷题（评测）

### 4.1 `init <题号> [--lang java|python3|cpp]` — 生成模板

```bash
hot100 init 1 --lang java     # 生成 sol-1.java（含正确方法签名 + import）
hot100 init 146 --lang java   # ops 题生成 class LRUCache 骨架
hot100 init 20 --lang python3 # 生成 sol-20.py（顶层函数签名）
hot100 init 20 --lang cpp     # 生成 sol-20.cpp（复用题库自带模板）
```

- 默认语言 **Java**
- Java 模板由题库 core 数据生成，类型映射与评测驱动一致（`list→ListNode`、`grid→char[][]`、`bool→boolean` 等）
- Python3 / C++ 模板直接复用题库 `core.templates`，签名与评测驱动严格一致
- 生成的文件名为 `sol-<题号>.<扩展名>`，生成后可直接 `judge`

### 4.2 `judge <题号> <文件> [选项]` — 提交答案评测

```bash
hot100 judge 1 sol-1.java              # Java，核心代码模式
hot100 judge 20 sol.py                 # 按扩展名自动识别 python3
hot100 judge 1 sol-1.cpp --lang cpp    # 显式指定语言
hot100 judge 20 sol.py --mode acm      # ACM 模式（完整程序，读 stdin 写 stdout）
```

| 选项 | 说明 |
|---|---|
| `--lang <语言>` | `java` / `python3` / `cpp`；默认按扩展名推断（`.java`→java、`.py`→python3、`.cpp`→cpp） |
| `--mode core` | 核心代码模式（默认）——只写函数/类 |
| `--mode acm` | ACM 模式——写完整程序 |
| `--cloud` | 本地判完后提交 leetcode.cn 拿官方判定（需登录态 cookie） |
| `--regenerate` | 强制重建扩展用例缓存 |
| `--no-extend` | 只用内置用例，不合并扩展用例 |

**语言支持矩阵**

| 语言 | 核心代码模式 | ACM 模式 |
|---|---|---|
| Java | ✅（重点支持） | ❌ |
| Python3 | ✅ | ✅ |
| C++ | ✅ | ✅ |

**评测流程**：读取你的代码 → 编译（真实 javac/gcc/python3）→ 对全部测试用例逐条执行 → 输出每个失败用例的 期望/实际 → 汇总 `✅ n/n` 或 `❌ n/m`。

```text
$ hot100 judge 1 scripts/java-ref/1.java
#1 两数之和  简单 · java · 核心代码模式
✅ 5/5 全部通过
  提示: 已通过可执行 hot100 mark 1 done 记录已刷
```

失败时的输出（退出码 1）：

```text
#20 有效的括号  简单 · java · 核心代码模式
  [用例 3] 期望与实际不一致
      期望: true  实际: false
❌ 5/6 通过
```

**常见报错**：
- `✗ 编译失败` + javac 报错：签名与模板不一致，或类型名写错（如 `bool`/`string` 应为 `boolean`/`String`）
- `✗ 运行超时`：算法复杂度过高（CPU 5s / 内存 512MB 限制）
- `✗ 文件不存在: xxx`：路径写错
- `✗ 题目不存在: 999`：题号超范围（1-100）

### 4.3 扩展测试用例（judge 自动合并）

内置用例每题仅 4~6 组，覆盖很薄。`hot100 judge` 会**自动合并本地扩展用例**：

- 首次判题时为该题生成最多 100 个扩展用例（手写边界 + 穷举小空间 + 带种子随机），缓存在 `work/extended/tests-<id>.json`（已 gitignore）
- 之后判题自动复用缓存；`--regenerate` 强制重建；`--no-extend` 只用内置用例
- 失败用例会标注「内置」/「扩展」，方便定位

当前已支持扩展用例的题目：#1 两数之和、#3 无重复字符的最长子串。想扩更多题，在 `judge/extend-tests.js` 的 `registry` 里加 oracle / curated / genRandom 即可。

### 4.4 `--cloud` 云端判定（可选，需登录态）

本地判题通过后，可用 `--cloud` 把代码提交到 leetcode.cn 拿官方判定（覆盖隐藏全量用例，能进一步确认本地扩展用例没漏掉的边界）：

1. 浏览器登录 https://leetcode.cn ，打开开发者工具（Network 或 Application/Cookies）取两个 cookie：
   - `LEETCODE_SESSION`
   - `csrftoken`
2. 二选一提供登录态（敏感信息，绝不提交进 git）：
   - 环境变量：`LEETCODE_SESSION=xxx LEETCODE_CSRF_TOKEN=yyy hot100 judge 3 sol-3.java --cloud`
   - 配置文件：`work/leetcode-config.json` 写入 `{ "session": "xxx", "csrf": "yyy" }` 并 `chmod 600`
3. 运行 `hot100 judge <题号> <文件> --cloud`，末尾输出 `✅/❌ LeetCode: Accepted / Wrong Answer` 等官方判定；失败时附最后一个用例与期望。

云端任何失败（未配置登录态 / 登录态失效 / 网络 / 超时）只会打印 `⚠` 告警，**不影响本地判题结果与退出码**。

---

## 5. 进度追踪

### 5.1 `mark <题号> <操作>`

```bash
hot100 mark 42 done        # 标记已刷
hot100 mark 42 reset       # 取消已刷
hot100 mark 42 star        # 收藏到错题本
hot100 mark 42 unstar      # 取消收藏
```

### 5.2 `progress` — 进度统计

```bash
hot100 progress
```

输出示例：

```text
已刷 12 / 100（12%）
收藏 3 题
按难度: 简单 4  中等 7  困难 1
按专题: 数组/哈希 3  链表 2  动态规划 2  ...
收藏列表:
  ★ #146 LRU 缓存
  ★ #20 有效的括号
推荐继续刷（未完成 88 题，前 10）:
  #3 无重复字符的最长子串
  ...
```

### 5.3 数据存储

- 进度文件：`work/cli-state.json`（已 gitignore，不污染仓库）
- 内容：`{ solved: [...], starred: [...], updatedAt: ... }`
- 纯本地读写；删除该文件即清空进度

---

## 6. 与 Web 端的关系

- 仓库同时提供浏览器端（`npm start` → `http://localhost:5173`）与本 CLI
- **数据完全同源**：都读取 `public/data/` 下同一份 题库/用例/题解
- CLI 的 `judge` 与 Web 端 `/api/judge` 共用同一套 `judge/` 评测模块，结论一致

---

## 7. 目录结构（CLI 相关）

```
cli/
  hot100.js          # CLI 主程序（零依赖单文件）
judge/
  extend-tests.js      # ★ 扩展测试用例生成器（oracle 注册表）
  leetcode-submit.js   # 云端提交（--cloud，需登录态 cookie）
  java-driver.js     # ★ Java 核心代码模式驱动生成器
  core-driver.js     # Python/C++ 驱动生成器 + 导出 Java 驱动
  judge.js           # 评测逻辑（ACM / 核心代码）
  runner.js          # 进程执行与资源限制
scripts/
  verify-java.js     # Java 驱动验证（100 题桩冒烟 + 100 份参考题解）
  java-ref/          # Java 参考题解（驱动正确性验证用，全 100 题）
  ...                # 数据构建 / 抓取 / 端到端测试等脚本
public/data/         # 题库 / 用例 / 题解（JSON，离线）
```

---

## 8. 推荐刷题流程

```bash
# 1. 按热度选题
hot100 list --sort rank --top 20

# 2. 看题目信息（先不剧透思路）
hot100 show 15

# 3. 生成模板开始写
hot100 init 15 --lang java
#    …在你自己的编辑器里实现…

# 4. 提交评测
hot100 judge 15 sol-15.java

# 5. 通过后标记；卡住再看思路
hot100 mark 15 done
hot100 show 15 --explain        # 解题思路 + 参考题解

# 6. 随时看进度 / 抽未完成的题
hot100 progress
hot100 random --unfinished
```

---

## 9. 常见问题（FAQ）

**Q1：`judge` 报"未安装 javac/java"？**
Java 评测需要本机有 JDK：`brew install openjdk`（macOS）或 `apt install default-jdk`（Debian/Ubuntu）。

**Q2：C++ 评测在本机编译报 `bits/stdc++.h` 找不到？**
本仓库 C++ 驱动使用 `bits/stdc++.h`，部分 macOS 的 clang 环境缺 libstdc++ 头。评测器会自动优先使用 Homebrew 安装的真实 GNU g++（`g++-16`→`g++-11`，如 `brew install gcc`），找不到时才回退到系统默认 `g++`；GitHub Actions 的 g++ 环境可正常跑。

**Q3：评测失败但我的答案看起来对？**
检查：方法/类签名是否与 `show` 输出完全一致（参数类型、返回类型）；核心代码模式不要写 `main`；变量名冲突。必要时用 `hot100 show <id>` 对比签名，或 `hot100 show <id> --explain` 参考题解。

**Q4：能离线用吗？**
能。题库/用例/题解全部在本地 `public/data/`，评测在本地编译运行，全程无需联网（只有抓取 CodeTop 数据才需要联网，非必须）。

**Q5：进度存在哪、会弄脏 git 吗？**
存在 `work/cli-state.json`，已加入 `.gitignore`，不会进入版本控制。

---

## 10. 验证与测试

```bash
node scripts/verify-java.js        # Java 驱动验证：100 题桩冒烟 + 100 份参考题解（全绿）
node scripts/test-judge.js         # 驱动生成自测
node scripts/verify-parts.js all   # 全量题解验证（100 题 × ACM/核心 × Python3/C++/Java）
node scripts/test-extend.js        # 扩展用例生成器测试（含 sol-3 回归）
```

CI（GitHub Actions）在每次 push 时自动运行上述验证。
