<div align="center">

# 🔥 Hot100 刷题台（Java-only）

**本地运行的 LeetCode Hot 100 刷题 CLI · 官方 Java 签名 · 可一键云端判定**

> 100 题完整题库 ｜ 481 组内置用例 + 4700+ 扩展用例 ｜ 100 份 Java 参考题解 ｜ CodeTop 高频/公司数据
> 面向秋招、春招、实习 —— 只写 Java，只对齐力扣官方签名

</div>

---

## ✨ 特性

- **Java-only**：本地模板与驱动直接使用力扣官方 Java 签名（如 `List<List<Integer>>`），本地通过后 `--cloud` 提交不会再因签名不一致编译失败。
- **真实编译运行**：`javac` + `java` 驱动注入，支持链表 / 树 / 随机链表 / 相交链表 / 矩阵 / 设计类（ops）。
- **扩展用例**：首次判题自动用 **Java 参考题解**生成最多 100 个扩展用例，缓存到 `work/extended/`。
- **顺序无关判定**：两数之和、三数之和、全排列、字母异位词分组等按 LeetCode 语义比较，不会因返回顺序不同误判。
- **云端判定**：`hot100 login` 从日常 Chrome 导入 cookie，`judge --cloud` 直接把官方签名代码提交到 leetcode.cn。
- **进度追踪**：已刷列表、错题本收藏、随机抽题、CodeTop 高频/公司筛选。
- **纯本地、零 npm 依赖**：只需要 Node.js + JDK。

---

## 🚀 快速开始

```bash
git clone https://github.com/Hubert-hwk/hot100-judge.git
cd hot100-judge

# 方式一：直接运行
node cli/hot100.js --help

# 方式二：npm link 后使用 hot100 命令
npm link
hot100 --help
```

**依赖**：Node.js ≥ 18、JDK 17+（`javac` 与 `java` 在 PATH 中）。不再需要 Python3 / gcc / g++。

---

## 📖 常用命令

```bash
hot100 list --top 20                     # 题目列表
hot100 list --company 字节跳动 --sort rank
hot100 show 15 --explain                  # 官方 Java 签名 + 参考题解
hot100 search 链表
hot100 random --unfinished                # 随机抽一题

hot100 init 15                            # 生成 sol-15.java（官方签名模板）
hot100 judge 15                          # 默认评测当前目录 sol-15.java
hot100 judge 15 custom.java              # 优先评测指定文件
hot100 judge 15 --no-extend               # 只用内置用例
hot100 judge 15 --regenerate              # 重建扩展用例
hot100 judge 15 --cloud                   # 本地通过后提交力扣官方判定

hot100 mark 15 done                       # 标记已刷
hot100 mark 15 star                       # 收藏错题
hot100 progress                           # 进度统计
```

### 云端登录

```bash
hot100 login
# 默认从日常 Chrome 导入已登录的 leetcode.cn cookie（macOS 需钥匙串授权）；
# 找不到有效登录态时才打开独立 Chrome 窗口手动登录。
# 只保存 LEETCODE_SESSION/csrftoken，不保存账号密码。
```

---

## 🧩 官方签名说明

旧版本为了跨语言统一使用简化签名；Java-only 后已全部对齐力扣官方签名，例如：

| 题号 | 官方 Java 签名 |
|---|---|
| #15 三数之和 | `List<List<Integer>> threeSum(int[] nums)` |
| #23 合并 K 个升序链表 | `ListNode mergeKLists(ListNode[] lists)` |
| #49 字母异位词分组 | `List<List<String>> groupAnagrams(String[] strs)` |
| #139 单词拆分 | `boolean wordBreak(String s, List<String> wordDict)` |
| #142 环形链表 II | `ListNode detectCycle(ListNode head)` |
| #236 最近公共祖先 | `TreeNode lowestCommonAncestor(TreeNode root, TreeNode p, TreeNode q)` |
| #994 腐烂的橘子 | `int orangesRotting(int[][] grid)` |

- `hot100 init` 生成的模板即官方签名，可直接复制到力扣提交。
- 旧的本地签名草稿（如返回 `int[][]`）不再兼容，请重新 `init` 后迁移代码。
- `judge/official-signatures.json` 保存 100 题官方签名快照，`verify-java.js` 会离线校验。

---

## 🧠 扩展用例与 oracle

- 输入由类型驱动随机生成（`judge/gen/`），期望值由 **Java 参考题解**（`scripts/java-ref/`）跑出。
- 参考题解无法通过内置用例的题会跳过扩展（`refUnusable`）。
- 缓存版本由 `GEN_VERSION` 控制，规则变更会自动失效并重建。

---

## 🏗 目录结构

```
cli/hot100.js                 CLI 入口（list/show/init/judge/mark/progress/login）
judge/
  judge.js                    Java 核心代码评测
  java-driver.js              驱动生成（参数构造 + 结果比较）
  java-signatures.js          官方签名解析（21 题 override + 模板辅助）
  official-signatures.json    100 题官方 Java 签名快照
  checkers.js                 顺序无关比较策略
  extend-tests.js             扩展用例编排 + 缓存
  gen/                        输入生成、规格、Java oracle
  runner.js                   进程执行与资源限制
  leetcode-submit.js          云端提交
  leetcode-login.js           浏览器代登录抓 cookie
data/                         题库 / 用例 / Java 题解（JSON，离线）
scripts/java-ref/<id>.java    100 份 Java 参考题解
work/parts/                   数据分片（维护时修改）
```

---

## 🔄 数据维护与验证

```bash
node scripts/merge-parts.js       # 合并 work/parts + java-ref → data/
node scripts/verify-java.js       # 100 题桩冒烟 + 100 份参考题解 + 官方签名
node scripts/test-judge.js        # 驱动边界（List/节点语义/顺序无关）
node scripts/test-extend.js       # 扩展用例生成回归
node scripts/verify-extend-all.js # 100 题全量扩展用例（Java oracle）
npm run verify                    # 依次执行以上验证
```

CI（`.github/workflows/ci.yml`）在每次 push/PR 时运行上述验证（Node 20 + JDK 17）。

---

## ⚠️ 安全提示

本地评测会在本机直接编译并运行提交的 Java 代码，仅限个人本地使用；请勿暴露到公网。云端登录只在本机保存 cookie（`work/leetcode-config.json`，chmod 600，已 gitignore）。

## 📄 License

[MIT](LICENSE) © Hubert-hwk
