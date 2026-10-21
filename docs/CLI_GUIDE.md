# 🔥 Hot100 命令行刷题工具 · 使用说明

本地运行的 LeetCode Hot 100 刷题 CLI（**Java-only**）：**查询、评测、云端判定、进度追踪** 一条命令搞定。
题库 100 题 / 481 组内置用例 / 100 份 Java 参考题解，纯本地离线可用；本地模板与力扣官方 Java 签名一致。

---

## 1. 安装与环境

### 1.1 依赖

| 依赖 | 用途 | 必装 |
|---|---|---|
| Node.js ≥ 18 | 运行 CLI 本体 | ✅ 必须 |
| `javac` / `java`（JDK 17+） | Java 核心代码模式评测 | ✅ 必须 |

> 已移除 Python3 / C++ / ACM 模式；`list/show/search` 等查询命令不依赖编译器。

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
hot100 init <题号>                   生成 Java 模板（sol-<id>.java）
hot100 judge <题号> <文件> [选项]     提交 Java 答案评测（核心代码模式）
hot100 login                         保存云端判定所需登录态
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
hot100 show 1                  # 题目信息：描述 / 官方 Java 签名 / CodeTop 高频
hot100 show 1 --explain        # 在上面的基础上追加：解题思路 + Java 参考题解
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

### 4.1 `init <题号>` — 生成 Java 模板

```bash
hot100 init 1     # 生成 sol-1.java（官方签名 + import）
hot100 init 146   # ops 题生成 class LRUCache 骨架
hot100 init 15    # 生成 List<List<Integer>> threeSum(int[] nums)
```

- 仅支持 Java；模板由 `judge/java-signatures.js` 按**力扣官方 Java 签名**生成
- 涉及链表/树/随机指针的题，模板顶部会以**注释形式**附上 `ListNode` / `TreeNode` / `Node` 的定义供对照。
  这些类型由评测驱动注入，**切勿取消注释**，否则会与驱动中的同名类冲突（javac：类重复）
- 模板只含**方法签名 + 一行「题号/标题/难度/专题」说明**，**不含解题思路**；需要题解用 `hot100 show <题号> --explain`
- 生成的文件名为 `sol-<题号>.java`，生成后可直接 `judge`
- **旧版简化签名文件不兼容**（如 `int[][] threeSum`），请重新 `init` 后迁移代码

### 4.2 `judge <题号> <文件> [选项]` — 提交答案评测

```bash
hot100 judge 1 sol-1.java              # 核心代码模式
hot100 judge 15 sol-15.java --cloud    # 本地通过后提交力扣官方判定
```

| 选项 | 说明 |
|---|---|
| `--cloud` | 本地判完后提交 leetcode.cn 拿官方判定（需登录态 cookie） |
| `--regenerate` | 强制重建扩展用例缓存 |
| `--no-extend` | 只用内置用例，不合并扩展用例 |

**评测流程**：读取 `.java` 代码 → `javac` 编译（注入驱动）→ 对全部测试用例执行 → 输出每个失败用例的 期望/实际 → 汇总 `✅ n/n` 或 `❌ n/m`。

对 LeetCode 允许任意顺序的题（两数之和、三数之和、全排列、字母异位词分组等），本地按**顺序无关**比较（`judge/checkers.js`），不会因返回顺序不同误判；具体规则为顶层无序或任意层级无序。

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

- 首次判题时为该题生成最多 100 个扩展用例，缓存在 `work/extended/tests-<id>.json`（已 gitignore）
- 之后判题自动复用缓存；`--regenerate` 强制重建；`--no-extend` 只用内置用例
- 失败用例会标注「内置」/「扩展」，方便定位

**全部 100 题均已支持**（含链表 / 树 / 矩阵 / ops 类设计题）。生成流程：

1. **输入生成**：按 `core.params` 类型驱动随机生成；能从内置用例自动推导取值/长度/有序/互异等约束，特殊题（#1 需保证唯一解、#105 前序中序须同源、#215 需 k≤n 等）在 `judge/gen/spec.js` 用 override 声明。
2. **期望值**：直接用题库自带 **Java 参考题解**（`scripts/java-ref/`）跑出结果作为 `expected`，无需手写 oracle；参考题解抛异常的用例（非法输入）自动丢弃。
3. **自检**：参考题解若连内置用例都过不了，则放弃该题扩展（`refUnusable`）。

校验：`node scripts/verify-extend-all.js` 会用 **Java 参考题解**跑一遍全部扩展用例，确保不会误伤正确解。

### 4.4 `--cloud` 云端判定（可选，需登录态）

本地判题通过后，可用 `--cloud` 把代码提交到 leetcode.cn 拿官方判定（覆盖隐藏全量用例，能进一步确认本地扩展用例没漏掉的边界）：

1. 执行 `hot100 login`：优先**从日常 Chrome 导入**已登录的 leetcode.cn cookie（macOS 首次会请求钥匙串授权），校验有效后直接写入 `work/leetcode-config.json`（`chmod 600`，gitignore），**不保存密码、不弹浏览器**。
   - 日常 Chrome 没有有效登录态时，才拉起独立 Chrome 窗口手动登录（扫码 / 手机验证码 / 帐号密码）
   - 独立窗口是全新 profile，风控可能要求滑块验证且易失败；建议先在**日常 Chrome** 登录 leetcode.cn，再重跑 `hot100 login`
   - `--browser` 可跳过导入，强制打开浏览器登录
   - 登录态失效时（`--cloud` 提示 `User is not authenticated`）重新执行一次即可
   - 未安装 Chrome 时可用 `CHROME_PATH=/path/to/chrome hot100 login --browser`；浏览器 profile 缓存在 `work/.chrome-profile/`（gitignore）
2. 也可手动提供登录态（二选一，敏感信息绝不提交进 git）：
   - 浏览器登录 https://leetcode.cn ，开发者工具（Application/Cookies）复制 `LEETCODE_SESSION` 和 `csrftoken`
   - 环境变量：`LEETCODE_SESSION=xxx LEETCODE_CSRF_TOKEN=yyy hot100 judge 3 sol-3.java --cloud`
   - 配置文件：`work/leetcode-config.json` 写入 `{ "session": "xxx", "csrf": "yyy" }` 并 `chmod 600`
3. 运行 `hot100 judge <题号> <文件> --cloud`，末尾输出 `✅/❌ LeetCode: Accepted / Wrong Answer` 等官方判定；失败时附最后一个用例、期望或运行错误。
   - 本地模板已使用力扣官方 Java 签名，提交时**原样提交**，不再需要签名适配层
   - 旧版简化签名文件（如 `int[][]`）请先用 `hot100 init` 生成官方模板并迁移代码

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
已刷列表:
  ✓ #3   无重复字符的最长子串（中等 · 滑动窗口）
  ✓ #20  有效的括号（简单 · 栈）
收藏列表:
  ★ #146 LRU 缓存
  ★ #20 有效的括号
推荐继续刷（未完成 88 题，前 10；★ 收藏优先，其次 CodeTop 高频）:
  ★ #146 LRU 缓存（高频 2）
    #206 反转链表（高频 3）
    #25  K 个一组翻转链表（高频 5）
  ...
```

推荐顺序：先取未刷题；**★ 收藏（错题）优先**，其余按 **CodeTop 高频排名升序**（排名越小越热门），排名相同再按题号升序。

### 5.3 数据存储

- 进度文件：`work/cli-state.json`（已 gitignore，不污染仓库）
- 内容：`{ solved: [...], starred: [...], updatedAt: ... }`
- 纯本地读写；删除该文件即清空进度

---

## 6. CLI-only

仓库已移除 Web UI 与 ACM 模式，仅保留 CLI（Java 核心代码模式）。CLI 直接读取 `data/` 下的题库/用例/题解。

---

## 7. 目录结构（CLI 相关）

```
cli/
  hot100.js          # CLI 主程序（零依赖单文件）
judge/
  extend-tests.js      # ★ 扩展用例编排（生成候选 → 求期望值 → 落缓存）
  gen/inputs.js        # ★ 类型驱动输入生成器 + 约束 flag + 从内置用例自动推导
  gen/oracle.js        # ★ Java 参考题解 oracle（取期望值 + 自检）
  gen/spec.js          # ★ 逐题 override（#1 唯一解、#105 前序中序、#146 容量等）
  java-signatures.js   # ★ 官方 Java 签名解析（21 题 override）
  java-driver.js       # ★ Java 核心代码模式驱动生成器
  official-signatures.json  # 100 题官方签名快照
  judge.js             # Java 核心代码评测
  runner.js            # 进程执行与资源限制
  leetcode-submit.js   # 云端提交（--cloud）
  leetcode-login.js    # 浏览器代登录抓 cookie
scripts/
  java-ref/            # 100 份 Java 参考题解（数据源 + 验证）
  merge-parts.js       # work/parts + java-ref → data/
  verify-java.js       # 100 题桩冒烟 + 100 份参考题解 + 官方签名
data/                  # 题库 / 用例 / Java 题解（JSON，离线）
```

---

## 8. 推荐刷题流程

```bash
# 1. 按热度选题
hot100 list --sort rank --top 20

# 2. 看题目信息（先不剧透思路）
hot100 show 15

# 3. 生成模板开始写
hot100 init 15
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

**Q2：评测失败但我的答案看起来对？**
检查：方法/类签名是否与 `show` 输出完全一致（参数类型、返回类型）；核心代码模式不要写 `main`；变量名冲突。必要时用 `hot100 show <id>` 对比签名，或 `hot100 show <id> --explain` 参考题解。

**Q3：能离线用吗？**
能。题库/用例/题解全部在本地 `data/`，评测在本地编译运行，全程无需联网；只有 `--cloud` 与抓取 CodeTop 数据需要联网。

**Q4：进度存在哪、会弄脏 git 吗？**
存在 `work/cli-state.json`，已加入 `.gitignore`，不会进入版本控制。

---

## 10. 验证与测试

```bash
node scripts/merge-parts.js        # work/parts + java-ref → data/
node scripts/verify-java.js        # 100 题桩冒烟 + 100 份参考题解 + 官方签名
node scripts/test-judge.js         # 驱动边界（List/节点语义/顺序无关）
node scripts/test-extend.js        # 扩展用例生成器测试（含 sol-3 / LRU 回归）
node scripts/verify-extend-all.js  # 全量扩展用例验证（100 题，Java 参考题解全过）
npm run verify                     # 依次执行以上验证
```

CI（GitHub Actions）在每次 push 时自动运行上述验证。
