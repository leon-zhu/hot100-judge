# Hot100 刷题台 · 数据 Schema（Java-only）

维护题库时修改 `work/parts/` 与 `scripts/java-ref/`，然后运行 `node scripts/merge-parts.js` 生成 `data/`。

| 文件 | 内容 | 格式 |
|---|---|---|
| `work/parts/problems-gXX.json` | 10 个题目对象 | 数组 |
| `work/parts/tests-gXX.json` | 测试用例 | 对象，键为题目 id |
| `scripts/java-ref/<id>.java` | Java 参考题解（官方签名） | Java 源码 |

`data/` 下的最终文件由脚本生成，**不要手改**：

- `data/problems.json`：题目数组
- `data/tests.json`：`{ "<id>": { "core": [...] } }`
- `data/solutions.json`：`{ "<id>": { "java": { "core": "<源码>" } } }`

---

## 1. problems-gXX.json

```json
{
  "id": 15,
  "title": "三数之和",
  "difficulty": "中等",
  "topic": "双指针/排序",
  "url": "https://leetcode.cn/problems/3sum/",
  "desc": "题目描述……",
  "core": {
    "kind": "function",
    "className": "Solution",
    "method": "threeSum",
    "params": [{ "name": "nums", "type": "int[]", "desc": "整数数组" }],
    "returns": "int[][]",
    "returnsDesc": "所有不重复的三元组",
    "mutates": -1
  },
  "freq": { "rank": 3, "value": 100, "lastAsked": "2026-09-01", "companies": [] },
  "explain": "解题思路……"
}
```

- 不再包含 `acm` 字段，也不再包含 `core.templates`。
- `core.params[].type` / `core.returns` 使用**语义类型**（见下表）；Java 官方签名由 `judge/java-signatures.js` 映射。
- `mutates` 表示原地修改第几个参数（0 起）；-1 表示通过返回值比较。

### 语义类型

| 语义类型 | 含义 | 官方 Java 类型（多数题） |
|---|---|---|
| `int` / `double` / `bool` / `string` | 标量 | `int` / `double` / `boolean` / `String` |
| `int[]` / `int[][]` | 一维/二维整数数组 | `int[]` / `int[][]` |
| `string[]` / `string[][]` | 字符串数组 | `String[]` / `String[][]` |
| `grid` | 字符网格（测试数据用字符串行） | `char[][]` |
| `list` | 链表 | `ListNode` |
| `tree` | 二叉树 | `TreeNode` |
| `randomList` | 带 random 指针的链表 | `Node` |

**官方签名例外**（21 题）在 `judge/java-signatures.js` 的 `RETURN_OVERRIDES` / `PARAM_OVERRIDES` 中声明，例如：

- #15 `List<List<Integer>> threeSum(int[] nums)`
- #23 `ListNode mergeKLists(ListNode[] lists)`
- #139 `boolean wordBreak(String s, List<String> wordDict)`
- #142 `ListNode detectCycle(ListNode head)`（本地期望仍是入口节点值 / -1）
- #236 `TreeNode lowestCommonAncestor(TreeNode root, TreeNode p, TreeNode q)`（本地期望是节点值）
- #994 `int orangesRotting(int[][] grid)`

`judge/official-signatures.json` 保存 100 题官方签名快照，`scripts/verify-java.js` 会离线校验。

### ops 型（设计类）

```json
{
  "kind": "ops",
  "className": "LRUCache",
  "ops": {
    "constructor": [{ "name": "capacity", "type": "int" }],
    "methods": [
      { "name": "get", "args": ["int"], "ret": "int" },
      { "name": "put", "args": ["int", "int"], "ret": "void" }
    ]
  }
}
```

---

## 2. tests-gXX.json

```json
{
  "146": {
    "core": [
      {
        "ops": ["LRUCache", "put", "put", "get", "put", "get"],
        "args": [[2], [1, 1], [2, 2], [1], [3, 3], [2]],
        "expected": [null, null, null, 1, null, -1]
      }
    ]
  },
  "1": {
    "core": [
      { "args": [[2, 7, 11, 15], 9], "expected": [0, 1] }
    ]
  }
}
```

- 只保留 `core`，不再有 `acm`。
- `expected` 使用 JSON 规范值：数字、字符串、布尔、null、数组。
- 空链表/空树约定：期望写 `null`（Java 驱动对空 `ListNode`/`TreeNode` 的 canon 结果与之一致）。
- 顺序无关题（#1/#15/#17/#22/#39/#46/#49/#51/#78/#131/#347）在 `judge/checkers.js` 配置，期望值仍写参考题解的自然顺序即可。

### 特殊输入记号

| 记号 | 示例 | 含义 |
|---|---|---|
| `list:[...]` | `"list:[1,2,3]"` | 链表 |
| `cycleList:[[...], pos]` | `"cycleList:[[3,2,0,-4],1]"` | 带环链表 |
| `randomList:[[v,r],...]` | `"randomList:[[7,-1],[13,0]]"` | 带 random 指针 |
| `intersectList:[[...],[...],skipA,skipB]` | 两条相交链表 | 配合 `intersectB:` |
| `tree:[...]` | `"tree:[3,9,20,null,null,15,7]"` | 层序二叉树 |
| `grid:["111","101"]` | 字符网格 | #200/#994 等 |

> #23 的参数是 `ListNode[]`，测试数据仍写成 `list:` 字符串数组，驱动负责逐项构建链表。

---

## 3. Java 参考题解

- 位置：`scripts/java-ref/<id>.java`，每题一份。
- 必须使用**官方 Java 签名**（见 `hot100 show <id>` 或 `judge/java-signatures.js`）。
- 题目依赖的 `ListNode` / `TreeNode` / `Node` 由评测驱动注入，参考题解中**不要重复定义**。
- 合并时 `scripts/merge-parts.js` 会按 id 读取这些文件，写入 `data/solutions.json`；缺文件会直接报错。

---

## 4. 验证流程

```bash
node scripts/merge-parts.js        # 生成 data/
node scripts/verify-java.js        # 100 题桩冒烟 + 100 份参考题解 + 官方签名
node scripts/test-judge.js         # 驱动边界（List/节点语义/顺序无关）
node scripts/test-extend.js        # 扩展用例生成回归（Java oracle）
node scripts/verify-extend-all.js  # 100 题全量扩展用例
```

CI 会运行上述验证（Node 20 + JDK 17）。
