# Hot100 命令行刷题工具 + Java 核心模式评测 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增 `hot100` 命令行工具（list/show/search/random/init/judge/mark/progress），并为其新增 Java 核心代码模式评测能力。

**Architecture:** 单文件零依赖 Node CLI（`cli/hot100.js`），直接读取 `public/data/*.json` 并复用 `judge/judge.js` 的 `judgeCore`。Java 支持通过新增 `judge/java-driver.js`（把 C++ 驱动移植到 Java，生成 `Main.java` + 用户 `Solution.java`，`javac` 编译 + `java` 运行 cases.json）实现。

**Tech Stack:** Node.js ≥ 18（零第三方依赖）、Java 8（javac 1.8.0_441）、Python3/C++（沿用现有评测）。

**设计文档:** `docs/superpowers/specs/2026-10-09-cli-judge-tool-design.md`

**关键数据事实（已核实）：**
- `problems.json` 每题字段：`id/title/difficulty/topic/url/desc/acm/core/freq/explain`
- `core`：`{kind: 'function'|'ops', className, method, params:[{name,type,desc}], returns, mutates?, ops?:{constructor,methods}}`
- `tests.json[id].core`：function 用例 `{args:[...], expected}`；ops 用例 `{ops:[...], args:[[...],...], expected:[null,...]}`
- 记号字符串：`list:[...]`、`cycleList:[[...],pos]`、`randomList:[[val,idx],...]`、`tree:[层序]`、`grid:["11110",...]`
- 核心模式用到的参数/返回类型全集（100 题扫描）：`int, double, bool, string, int[], int[][], string[], string[][], grid, list, tree, randomList, void(+mutates)`，ops 4 题（146/155/208/295）
- 机器已装 `javac 1.8.0_441`；GitHub `ubuntu-latest` 自带 OpenJDK

---

## 文件结构

```
judge/
  java-driver.js     # 新增：Java 核心代码模式驱动生成器（buildJavaDriver）
  judge.js           # 改：judgeCore 增加 Java 分支
cli/
  hot100.js          # 新增：单文件零依赖 CLI
scripts/
  verify-java.js     # 新增：Java 驱动验证（全 100 题桩冒烟 + java-ref 真实题解）
  java-ref/          # 新增：Java 参考题解（13 份，见各任务）
package.json         # 改：加 "bin"
.gitignore           # 改：追加 work/cli-state.json
.github/workflows/ci.yml  # 改：环境检查加 java -version + 新增 verify-java 步骤
```

---

## Task 1: Java 驱动生成器（function kind）+ judgeCore Java 分支 + 验证脚本骨架

**Files:**
- Create: `judge/java-driver.js`
- Modify: `judge/judge.js`
- Create: `scripts/verify-java.js`
- Create: `scripts/java-ref/1.java`（两数之和）

- [ ] **Step 1: 写 `judge/java-driver.js`（完整实现，function kind 全部类型 + void/mutates）**

```js
'use strict';

/**
 * 核心代码模式的 Java 驱动生成器（镜像 core-driver.js 的 C++ 版）。
 *
 * 评测时生成两个源文件：
 *   - ${core.className}.java  用户代码原样（如 Solution.java / LRUCache.java）
 *   - Main.java               驱动：JSON 解析 + 辅助类 + 构建器 + Canon 比较 + 测试执行器
 * 编译：javac -encoding UTF-8 -d out Main.java ${className}.java
 * 运行：java -cp out Main cases.json
 * 输出 JSON 结果数组，与 judge.js 的 parseCoreResults 兼容。
 */

const JAVA_TYPE = {
  int: 'int', double: 'double', bool: 'boolean', string: 'String',
  'int[]': 'int[]', 'int[][]': 'int[][]',
  'string[]': 'String[]', 'string[][]': 'String[][]',
  grid: 'char[][]', list: 'ListNode', tree: 'TreeNode', randomList: 'Node',
  void: 'void',
};

const JAVA_PREAMBLE = `
import java.util.*;
import java.io.*;
import java.nio.file.*;

class ListNode {
    int val;
    ListNode next;
    ListNode() {}
    ListNode(int val) { this.val = val; }
    ListNode(int val, ListNode next) { this.val = val; this.next = next; }
}

class TreeNode {
    int val;
    TreeNode left;
    TreeNode right;
    TreeNode() {}
    TreeNode(int val) { this.val = val; }
    TreeNode(int val, TreeNode left, TreeNode right) { this.val = val; this.left = left; this.right = right; }
}

class Node {
    int val;
    Node next;
    Node random;
    public Node(int val) { this.val = val; this.next = null; this.random = null; }
}

public class Main {
    static Object g_sharedB = null;

    // ===== 最小 JSON 解析器：null / Boolean / Double / String / List / Map =====
    static void skipWs(String s, int[] i) {
        while (i[0] < s.length() && Character.isWhitespace(s.charAt(i[0]))) i[0]++;
    }

    static Object parseJson(String s, int[] i) {
        skipWs(s, i);
        char c = s.charAt(i[0]);
        if (c == 'n') { i[0] += 4; return null; }
        if (c == 't') { i[0] += 4; return Boolean.TRUE; }
        if (c == 'f') { i[0] += 5; return Boolean.FALSE; }
        if (c == '"') {
            i[0]++;
            StringBuilder out = new StringBuilder();
            while (i[0] < s.length() && s.charAt(i[0]) != '"') {
                char ch = s.charAt(i[0]);
                if (ch == '\\\\' && i[0] + 1 < s.length()) {
                    i[0]++;
                    char e = s.charAt(i[0]);
                    if (e == 'n') out.append('\\n');
                    else if (e == 't') out.append('\\t');
                    else if (e == 'r') out.append('\\r');
                    else if (e == 'u') {
                        out.append((char) Integer.parseInt(s.substring(i[0] + 1, i[0] + 5), 16));
                        i[0] += 4;
                    } else out.append(e);
                } else out.append(ch);
                i[0]++;
            }
            i[0]++;
            return out.toString();
        }
        if (c == '{') {
            i[0]++;
            Map<String, Object> m = new LinkedHashMap<>();
            while (true) {
                skipWs(s, i);
                if (i[0] < s.length() && s.charAt(i[0]) == '}') { i[0]++; break; }
                String k = (String) parseJson(s, i);
                skipWs(s, i);
                if (s.charAt(i[0]) == ':') i[0]++;
                m.put(k, parseJson(s, i));
                skipWs(s, i);
                if (i[0] < s.length() && s.charAt(i[0]) == ',') { i[0]++; continue; }
                if (i[0] < s.length() && s.charAt(i[0]) == '}') { i[0]++; break; }
            }
            return m;
        }
        if (c == '[') {
            i[0]++;
            List<Object> a = new ArrayList<>();
            while (true) {
                skipWs(s, i);
                if (i[0] < s.length() && s.charAt(i[0]) == ']') { i[0]++; break; }
                a.add(parseJson(s, i));
                skipWs(s, i);
                if (i[0] < s.length() && s.charAt(i[0]) == ',') { i[0]++; continue; }
                if (i[0] < s.length() && s.charAt(i[0]) == ']') { i[0]++; break; }
            }
            return a;
        }
        int start = i[0];
        while (i[0] < s.length() && "0123456789-+.eE".indexOf(s.charAt(i[0])) >= 0) i[0]++;
        String num = s.substring(start, i[0]);
        if (num.indexOf('.') >= 0 || num.indexOf('e') >= 0 || num.indexOf('E') >= 0) return Double.parseDouble(num);
        return (double) Long.parseLong(num);
    }

    static List<?> parseList(String json) { return (List<?>) parseJson(json, new int[] { 0 }); }

    // ===== 构建器（记号字符串 → 对象）=====
    static Object build(Object v) {
        if (v instanceof String) {
            String s = (String) v;
            if (s.startsWith("list:")) return buildChain(parseList(s.substring(5)));
            if (s.startsWith("cycleList:")) { List<?> p = parseList(s.substring(10)); return buildCycle((List<?>) p.get(0), ((Number) p.get(1)).intValue()); }
            if (s.startsWith("randomList:")) return buildRandom(parseList(s.substring(11)));
            if (s.startsWith("intersectB:")) return g_sharedB;
            if (s.startsWith("tree:")) return buildTree(parseList(s.substring(5)));
            if (s.startsWith("grid:")) return toGrid(parseList(s.substring(5)));
        }
        if (v instanceof List) {
            List<Object> out = new ArrayList<>();
            for (Object x : (List<?>) v) out.add(build(x));
            return out;
        }
        return v;
    }

    static ListNode buildChain(List<?> arr) {
        ListNode dummy = new ListNode(0);
        ListNode cur = dummy;
        for (Object x : arr) { cur.next = new ListNode(((Number) x).intValue()); cur = cur.next; }
        return dummy.next;
    }

    static ListNode buildCycle(List<?> arr, int pos) {
        ListNode head = buildChain(arr);
        if (head == null) return null;
        ListNode tail = head;
        int n = 0;
        while (tail.next != null) { tail = tail.next; n++; }
        if (pos >= 0 && pos <= n) {
            ListNode p = head;
            for (int k = 0; k < pos; k++) p = p.next;
            tail.next = p;
        }
        return head;
    }

    static Node buildRandom(List<?> data) {
        List<Node> nodes = new ArrayList<>();
        for (Object x : data) nodes.add(new Node(((Number) ((List<?>) x).get(0)).intValue()));
        for (int i = 0; i < nodes.size(); i++) {
            if (i + 1 < nodes.size()) nodes.get(i).next = nodes.get(i + 1);
            int idx = ((Number) ((List<?>) data.get(i)).get(1)).intValue();
            nodes.get(i).random = (idx >= 0 && idx < nodes.size()) ? nodes.get(idx) : null;
        }
        return nodes.isEmpty() ? null : nodes.get(0);
    }

    static TreeNode buildTree(List<?> arr) {
        if (arr.isEmpty() || arr.get(0) == null) return null;
        TreeNode root = new TreeNode(((Number) arr.get(0)).intValue());
        List<TreeNode> q = new ArrayList<>();
        q.add(root);
        int i = 1;
        while (!q.isEmpty() && i < arr.size()) {
            TreeNode cur = q.remove(0);
            if (i < arr.size() && arr.get(i) != null) { cur.left = new TreeNode(((Number) arr.get(i)).intValue()); q.add(cur.left); }
            i++;
            if (i < arr.size() && arr.get(i) != null) { cur.right = new TreeNode(((Number) arr.get(i)).intValue()); q.add(cur.right); }
            i++;
        }
        return root;
    }

    // ===== 类型转换 helpers =====
    static int[] toIntArray(Object v) {
        List<?> a = (List<?>) v;
        int[] r = new int[a.size()];
        for (int i = 0; i < a.size(); i++) r[i] = ((Number) a.get(i)).intValue();
        return r;
    }

    static int[][] toIntMatrix(Object v) {
        List<?> a = (List<?>) v;
        int[][] r = new int[a.size()][];
        for (int i = 0; i < a.size(); i++) r[i] = toIntArray(a.get(i));
        return r;
    }

    static String[] toStringArray(Object v) {
        List<?> a = (List<?>) v;
        String[] r = new String[a.size()];
        for (int i = 0; i < a.size(); i++) r[i] = (String) a.get(i);
        return r;
    }

    static String[][] toStringMatrix(Object v) {
        List<?> a = (List<?>) v;
        String[][] r = new String[a.size()][];
        for (int i = 0; i < a.size(); i++) r[i] = toStringArray(a.get(i));
        return r;
    }

    static char[][] toGrid(Object v) {
        List<?> a = (List<?>) v;
        char[][] r = new char[a.size()][];
        for (int i = 0; i < a.size(); i++) r[i] = ((String) a.get(i)).toCharArray();
        return r;
    }

    // ===== Canon 序列化 =====
    static List<Object> canonList(ListNode head) {
        List<Object> out = new ArrayList<>();
        Set<ListNode> seen = Collections.newSetFromMap(new IdentityHashMap<ListNode, Boolean>());
        while (head != null && !seen.contains(head)) { seen.add(head); out.add((double) head.val); head = head.next; }
        return out;
    }

    static List<Object> canonRandom(Node head) {
        List<Node> nodes = new ArrayList<>();
        Map<Node, Integer> idx = new IdentityHashMap<>();
        for (Node p = head; p != null && !idx.containsKey(p); p = p.next) { idx.put(p, nodes.size()); nodes.add(p); }
        List<Object> out = new ArrayList<>();
        for (Node p : nodes) {
            List<Object> pair = new ArrayList<>();
            pair.add((double) p.val);
            pair.add((double) (p.random != null && idx.containsKey(p.random) ? idx.get(p.random) : -1));
            out.add(pair);
        }
        return out;
    }

    static List<Object> canonTree(TreeNode root) {
        List<Object> out = new ArrayList<>();
        if (root == null) return out;
        List<TreeNode> q = new ArrayList<>();
        q.add(root);
        while (!q.isEmpty()) {
            TreeNode cur = q.remove(0);
            if (cur == null) { out.add(null); } else { out.add((double) cur.val); q.add(cur.left); q.add(cur.right); }
        }
        while (!out.isEmpty() && out.get(out.size() - 1) == null) out.remove(out.size() - 1);
        return out;
    }

    static List<Object> canonArray(int[] a) {
        List<Object> l = new ArrayList<>();
        for (int x : a) l.add((double) x);
        return l;
    }

    static List<Object> canonMatrix(int[][] m) {
        List<Object> l = new ArrayList<>();
        for (int[] row : m) l.add(canonArray(row));
        return l;
    }

    static List<Object> canonArray(String[] a) {
        List<Object> l = new ArrayList<>();
        for (String x : a) l.add(x);
        return l;
    }

    static List<Object> canonMatrix(String[][] m) {
        List<Object> l = new ArrayList<>();
        for (String[] row : m) l.add(canonArray(row));
        return l;
    }

    static List<Object> canonGrid(char[][] g) {
        List<Object> l = new ArrayList<>();
        for (char[] row : g) l.add(new String(row));
        return l;
    }

    static Object canon(Object v) {
        if (v == null) return null;
        if (v instanceof ListNode) return canonList((ListNode) v);
        if (v instanceof TreeNode) return canonTree((TreeNode) v);
        if (v instanceof Node) return canonRandom((Node) v);
        if (v instanceof int[]) return canonArray((int[]) v);
        if (v instanceof int[][]) return canonMatrix((int[][]) v);
        if (v instanceof String[]) return canonArray((String[]) v);
        if (v instanceof String[][]) return canonMatrix((String[][]) v);
        if (v instanceof char[][]) return canonGrid((char[][]) v);
        if (v instanceof List) {
            List<Object> out = new ArrayList<>();
            for (Object x : (List<?>) v) out.add(canon(x));
            return out;
        }
        return v;
    }

    static String toJson(Object v) {
        if (v == null) return "null";
        if (v instanceof Boolean || v instanceof Number) return v.toString();
        if (v instanceof String) {
            StringBuilder sb = new StringBuilder("\\"");
            for (char ch : ((String) v).toCharArray()) {
                if (ch == '"') sb.append("\\\\\\"");
                else if (ch == '\\\\') sb.append("\\\\\\\\");
                else if (ch == '\\n') sb.append("\\\\n");
                else if (ch == '\\t') sb.append("\\\\t");
                else if (ch == '\\r') sb.append("\\\\r");
                else sb.append(ch);
            }
            sb.append("\\"");
            return sb.toString();
        }
        if (v instanceof List) {
            StringBuilder sb = new StringBuilder("[");
            List<?> l = (List<?>) v;
            for (int i = 0; i < l.size(); i++) { if (i > 0) sb.append(","); sb.append(toJson(l.get(i))); }
            sb.append("]");
            return sb.toString();
        }
        return "null";
    }

    static String errJson(String msg) { return "{\\"ok\\":false,\\"error\\":" + toJson(msg) + "}"; }
    static String okJson() { return "{\\"ok\\":true}"; }

    public static void main(String[] args) throws Exception {
        String s = new String(Files.readAllBytes(Paths.get(args[0])), "UTF-8");
        List<?> cases = parseList(s);
        StringBuilder sb = new StringBuilder("[");
        for (int ci = 0; ci < cases.size(); ci++) {
            @SuppressWarnings("unchecked")
            Map<String, Object> c = (Map<String, Object>) cases.get(ci);
            if (ci > 0) sb.append(",");
            try {
{{MAIN_BODY}}
            } catch (Throwable e) {
                sb.append(errJson("ERR:" + e));
            }
        }
        sb.append("]");
        System.out.println(sb.toString());
    }
}
`;

// 参数（来自 cases 的 args 列表）转类型
const PARAM_CONV = {
  int: (i) => `((Number) args.get(${i})).intValue()`,
  double: (i) => `((Number) args.get(${i})).doubleValue()`,
  bool: (i) => `((Boolean) args.get(${i})).booleanValue()`,
  string: (i) => `(String) args.get(${i})`,
  'int[]': (i) => `toIntArray(args.get(${i}))`,
  'int[][]': (i) => `toIntMatrix(args.get(${i}))`,
  'string[]': (i) => `toStringArray(args.get(${i}))`,
  'string[][]': (i) => `toStringMatrix(args.get(${i}))`,
  grid: (i) => `toGrid(args.get(${i}))`,
  list: (i) => `(ListNode) build(args.get(${i}))`,
  tree: (i) => `(TreeNode) build(args.get(${i}))`,
  randomList: (i) => `(Node) build(args.get(${i}))`,
};

// 返回值转 canon（标量直接转 double/原值，复合走 canon）
const RET_CONV = {
  int: (r) => `(double) (${r})`,
  double: (r) => `${r}`,
  bool: (r) => `${r}`,
  string: (r) => `${r}`,
  'int[]': (r) => `canon(${r})`,
  'int[][]': (r) => `canon(${r})`,
  'string[]': (r) => `canon(${r})`,
  'string[][]': (r) => `canon(${r})`,
  grid: (r) => `canon(${r})`,
  list: (r) => `canon(${r})`,
  tree: (r) => `canon(${r})`,
  randomList: (r) => `canon(${r})`,
};

/** function kind：生成逐用例执行体（main 中 try 块内） */
function buildFunctionBody(core) {
  const className = core.className;
  const method = core.method;
  const mutates = Number(core.mutates ?? -1);
  const paramStmts = core.params
    .map((p, i) => `${JAVA_TYPE[p.type]} _p${i} = ${PARAM_CONV[p.type](i)};`)
    .join('\n');
  const callArgs = core.params.map((_, i) => `_p${i}`).join(', ');
  let callLine, gotExpr;
  if (mutates >= 0) {
    callLine = `${className} _sol = new ${className}();\n            _sol.${method}(${callArgs});`;
    gotExpr = `canon(_p${mutates})`;
  } else {
    const ret = JAVA_TYPE[core.returns];
    callLine = `${className} _sol = new ${className}();\n            ${ret} _r = _sol.${method}(${callArgs});`;
    gotExpr = RET_CONV[core.returns]('_r');
  }
  return [
    `List<?> args = (List<?>) c.get("args");`,
    paramStmts,
    callLine,
    `Object _got = ${gotExpr};`,
    `Object _exp = canon(build(c.get("expected")));`,
    `if (Objects.deepEquals(_got, _exp)) { sb.append(okJson()); }`,
    `else { sb.append("{\\"ok\\":false,\\"expected\\":").append(toJson(_exp)).append(",\\"got\\":").append(toJson(_got)).append("}"); }`,
  ].join('\n');
}

/** 统一入口：当前只支持 function kind（ops 在 Task 2 加入） */
function buildJavaDriver({ core, code, cases }) {
  const body = buildFunctionBody(core);
  const driver = JAVA_PREAMBLE.replace('{{MAIN_BODY}}', body);
  // cases 序列化为 cases.json 由 judge.js 写入，这里不内嵌
  return driver;
}

module.exports = { buildJavaDriver, JAVA_TYPE, PARAM_CONV, RET_CONV };
```

- [ ] **Step 2: 让 `core-driver.js` 重新导出 `buildJavaDriver`（在 judge.js require 之前，避免中途损坏）**

在 `judge/core-driver.js` 末尾（`module.exports` 行）改为：

```js
const { buildJavaDriver } = require('./java-driver');
module.exports = { buildPythonDriver, buildCppDriver, pyLiteral, buildJavaDriver };
```

- [ ] **Step 3: 在 `judge/judge.js` 增加 Java 分支**

修改 `judge/judge.js` 顶部 require（第 12 行附近）：

```js
const { buildPythonDriver, buildCppDriver, buildJavaDriver } = require('./core-driver');
```

（`buildJavaDriver` 统一从 `./core-driver` require，与现有风格一致。）

修改 `judgeCore`，在 C++ 分支之后、`return { error: '核心代码模式暂不支持该语言' };` 之前加入：

```js
    if (language === 'java') {
      const javac = await commandExists('javac');
      const java = await commandExists('java');
      if (!javac || !java) return { error: '当前系统未安装 javac/java。', phase: 'compile' };
      const source = buildJavaDriver({ core, code, cases });
      const srcMain = path.join(tmp, 'Main.java');
      const srcUser = path.join(tmp, `${core.className}.java`);
      const outDir = path.join(tmp, 'out');
      const casesFile = path.join(tmp, 'cases.json');
      fs.mkdirSync(outDir);
      fs.writeFileSync(srcMain, source, 'utf8');
      fs.writeFileSync(srcUser, code, 'utf8');
      fs.writeFileSync(casesFile, JSON.stringify(cases), 'utf8');
      const compiled = await runProcess(javac, ['-encoding', 'UTF-8', '-d', outDir, srcMain, srcUser], { cwd: tmp, phase: 'compile' });
      if (compiled.code !== 0 || compiled.timedOut) {
        return { error: '编译错误（请检查核心类/方法签名）', compileError: compiled.stderr || compiled.error, phase: 'compile' };
      }
      const run = await runProcess(java, ['-cp', outDir, 'Main', casesFile], { cwd: tmp, timeout: CORE_TIMEOUT_MS });
      if (run.timedOut) return { error: `运行超时 ${run.ms}ms`, phase: 'run' };
      if (run.code !== 0) return { error: run.stderr || run.error || `退出码 ${run.code}`, phase: 'run' };
      return parseCoreResults(run.stdout);
    }
```

- [ ] **Step 4: 写 `scripts/verify-java.js`（骨架：function kind 桩冒烟 + 读取 java-ref/）**

```js
'use strict';
/**
 * Java 核心代码模式驱动验证：
 *   1) 全 100 题"桩 Solution"冒烟：驱动能编译、能运行、无 ERR（覆盖全部类型通路）
 *   2) scripts/java-ref/ 下的真实题解：全部测试用例通过（验证驱动语义正确）
 */
const path = require('path');
const fs = require('fs');
const { judgeCore } = require('../judge/judge');

const ROOT = path.join(__dirname, '..');
const problems = require(path.join(ROOT, 'public/data/problems.json'));
const tests = require(path.join(ROOT, 'public/data/tests.json'));

// 类型 → [Java 类型, 零值字面量]
const STUB = {
  int: ['int', '0'], double: ['double', '0.0'], bool: ['boolean', 'false'],
  string: ['String', '""'],
  'int[]': ['int[]', 'new int[0]'], 'int[][]': ['int[][]', 'new int[0][]'],
  'string[]': ['String[]', 'new String[0]'], 'string[][]': ['String[][]', 'new String[0][]'],
  grid: ['char[][]', 'new char[0][]'],
  list: ['ListNode', 'null'], tree: ['TreeNode', 'null'], randomList: ['Node', 'null'],
  void: ['void', null],
};

function stubFor(prob) {
  const core = prob.core;
  if (core.kind === 'ops') return stubOps(core);
  const params = core.params.map((p) => `${STUB[p.type][0]} ${p.name}`).join(', ');
  const [ret, zero] = STUB[core.returns] || STUB.int;
  const isVoid = core.returns === 'void' || (core.mutates != null && core.mutates >= 0);
  const body = isVoid ? '' : `return ${zero};`;
  return `class ${core.className} {\n    public ${ret} ${core.method}(${params}) { ${body} }\n}\n`;
}

function stubOps(core) {
  const ctor = core.ops.constructor || [];
  const ctorParams = ctor.map((p) => `${STUB[p.type][0]} a${p.name}`).join(', ');
  const methods = (core.ops.methods || []).map((m) => {
    const params = m.args.map((t, i) => `${STUB[t][0]} a${i}`).join(', ');
    const [ret, zero] = STUB[m.ret] || STUB.int;
    const body = m.ret === 'void' ? '' : `return ${zero};`;
    return `    public ${ret} ${m.name}(${params}) { ${body} }`;
  }).join('\n');
  return `class ${core.className} {\n    public ${core.className}(${ctorParams}) {}\n${methods}\n}\n`;
}

async function main() {
  let pass = true;
  const only = process.argv[2]; // 可选：只验证指定题号
  const ids = problems
    .filter((p) => p.core)
    .filter((p) => !only || String(p.id) === only)
    .filter((p) => p.core.kind !== 'ops'); // TODO(task2): ops 驱动加入后移除该过滤
  // part 1: 桩冒烟
  for (const prob of ids) {
    if (!tests[prob.id] || !tests[prob.id].core) continue;
    const out = await judgeCore({ language: 'java', code: stubFor(prob), core: prob.core, tests: tests[prob.id].core });
    if (out.error) { console.error(`✗ ${prob.id} ${prob.title}: 驱动错误 ${out.error}`); pass = false; continue; }
    const errs = (out.results || []).filter((r) => r.error && String(r.error).startsWith('ERR:'));
    if (errs.length) { console.error(`✗ ${prob.id} ${prob.title}: ${errs[0].error}`); pass = false; }
    else console.log(`✓ ${prob.id} ${prob.title}: 桩冒烟通过（${out.results.length} 用例）`);
  }
  // part 2: 真实参考题解
  const dir = path.join(__dirname, 'java-ref');
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.java')) : [];
  for (const f of files) {
    const id = Number(f.replace('.java', ''));
    const prob = problems.find((p) => p.id === id);
    if (!prob) { console.error(`✗ 参考题解 ${id}: 题库中无此题`); pass = false; continue; }
    const code = fs.readFileSync(path.join(dir, f), 'utf8');
    const out = await judgeCore({ language: 'java', code, core: prob.core, tests: tests[id].core });
    if (out.error) { console.error(`✗ 参考题解 ${id}: ${out.error}`); pass = false; continue; }
    const failed = (out.results || []).filter((r) => !r.ok);
    if (failed.length) {
      console.error(`✗ 参考题解 ${id} ${prob.title}: ${failed.length}/${out.results.length} 失败`);
      console.error('   首个失败: ' + JSON.stringify(failed[0]).slice(0, 300));
      pass = false;
    } else console.log(`✓ 参考题解 ${id} ${prob.title}: ${out.results.length}/${out.results.length} 通过`);
  }
  console.log(pass ? '\n✅ Java 验证全部通过' : '\n❌ Java 验证有失败');
  process.exit(pass ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 5: 写 `scripts/java-ref/1.java`（两数之和，int[] 返回）**

```java
// Hot100 #1 两数之和（简单）· 数组/哈希
import java.util.*;

class Solution {
    public int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> map = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int need = target - nums[i];
            if (map.containsKey(need)) return new int[] { map.get(need), i };
            map.put(nums[i], i);
        }
        return new int[0];
    }
}
```

- [ ] **Step 6: 运行验证脚本，确认通过**

Run: `node scripts/verify-java.js 1`
Expected: 输出 `✓ 1 两数之和: 桩冒烟通过（5 用例）` 与 `✓ 参考题解 1 两数之和: 5/5 通过`，最后 `✅ Java 验证全部通过`

- [ ] **Step 7: 全量桩冒烟（function kind 96 题）**

Run: `node scripts/verify-java.js`
Expected: 96 题全部 `✓`，无任何 `✗`，退出码 0

- [ ] **Step 8: 提交**

```bash
git add judge/java-driver.js judge/core-driver.js judge/judge.js scripts/verify-java.js scripts/java-ref/1.java
git commit -m "feat: Java 核心代码模式评测（function kind）+ 验证脚本骨架"
```

---

## Task 2: Java 驱动 ops kind + 9 份参考题解 + 全量验证

**Files:**
- Modify: `judge/java-driver.js`（加 ops 分支）
- Create: `scripts/java-ref/{20,121,54,200,206,104,138,48}.java`
- Modify: `scripts/verify-java.js`（去掉 function-only 过滤）

- [ ] **Step 1: 把 `PARAM_CONV` 重构为"取参表达式"工厂（function/ops 共用）**

把 `judge/java-driver.js` 里现有的 `const PARAM_CONV = {...}` 整块替换为：

```js
function paramConvFor(exprOf) {
  return {
    int: (i) => `((Number) ${exprOf(i)}).intValue()`,
    double: (i) => `((Number) ${exprOf(i)}).doubleValue()`,
    bool: (i) => `((Boolean) ${exprOf(i)}).booleanValue()`,
    string: (i) => `(String) ${exprOf(i)}`,
    'int[]': (i) => `toIntArray(${exprOf(i)})`,
    'int[][]': (i) => `toIntMatrix(${exprOf(i)})`,
    'string[]': (i) => `toStringArray(${exprOf(i)})`,
    'string[][]': (i) => `toStringMatrix(${exprOf(i)})`,
    grid: (i) => `toGrid(${exprOf(i)})`,
    list: (i) => `(ListNode) build(${exprOf(i)})`,
    tree: (i) => `(TreeNode) build(${exprOf(i)})`,
    randomList: (i) => `(Node) build(${exprOf(i)})`,
  };
}
const PARAM_CONV = paramConvFor((i) => `args.get(${i})`);
```

`buildFunctionBody` 继续用 `PARAM_CONV`，行为不变。

- [ ] **Step 2: 在 `judge/java-driver.js` 末尾追加 ops 支持**

在 `module.exports` 之前追加：

```js
/** ops 型：LRU/最小栈/Trie/数据流中位数。按 op 字符串派发。 */
const OP_CONV = paramConvFor((j) => `_a.get(${j})`);

function buildOpsBody(core) {
  const className = core.className;
  const ctor = core.ops.constructor || [];
  const ctorCall = ctor.map((p, j) => `${OP_CONV[p.type](j)}`).join(', ');
  const methodDispatch = (core.ops.methods || []).map((m) => {
    const argExpr = m.args.map((t, j) => `${OP_CONV[t](j)}`).join(', ');
    const call = `_obj.${m.name}(${argExpr})`;
    // 注意：每个 op 都要往 _out 追加一项（与 Python/C++ 驱动一致），void 追加 null
    const retLine = m.ret === 'void'
      ? `${call}; _out.add(null);`
      : `_out.add(${RET_CONV[m.ret](call)});`;
    return `} else if (op.equals(${JSON.stringify(m.name)})) {\n            ${retLine}`;
  }).join('\n');
  const body = [
    `List<?> _ops = (List<?>) c.get("ops");`,
    `List<?> _argss = (List<?>) c.get("args");`,
    `Object _obj = null;`,
    `List<Object> _out = new ArrayList<>();`,
    `for (int i = 0; i < _ops.size(); i++) {`,
    `    String op = (String) _ops.get(i);`,
    `    List<?> _a = (List<?>) _argss.get(i);`,
    `    if (op.equals(${JSON.stringify(className)})) {`,
    `        _obj = new ${className}(${ctorCall});`,
    `        _out.add(null);`,
    methodDispatch,
    `    } else {`,
    `        throw new RuntimeException("unknown op: " + op);`,
    `    }`,
    `}`,
    `Object _exp = canon(build(c.get("expected")));`,
    `if (Objects.deepEquals(_out, _exp)) { sb.append(okJson()); }`,
    `else { sb.append("{\\"ok\\":false,\\"expected\\":").append(toJson(_exp)).append(",\\"got\\":").append(toJson(_out)).append("}"); }`,
  ].join('\n');
  return body;
}
```

> 关键点：每个 op 的构造器/method 参数取自 `_a = ((List<?>) c.get("args")).get(i)`（第 i 个 op 自己的参数列表）；构造器 op 与 void 方法都追加 `null`，保证 `_out` 长度恒等于 op 数。

- [ ] **Step 3: `buildJavaDriver` 增加 ops 分支**

把 `buildJavaDriver` 改为：

```js
function buildJavaDriver({ core, code, cases }) {
  const body = core.kind === 'ops' ? buildOpsBody(core) : buildFunctionBody(core);
  return JAVA_PREAMBLE.replace('{{MAIN_BODY}}', body);
}
```

- [ ] **Step 4: 写 9 份 function kind 参考题解**

`scripts/java-ref/20.java`（string → bool）：
```java
// Hot100 #20 有效的括号（简单）· 栈
import java.util.*;

class Solution {
    public boolean isValid(String s) {
        Deque<Character> st = new ArrayDeque<>();
        Map<Character, Character> pair = new HashMap<>();
        pair.put(')', '('); pair.put(']', '['); pair.put('}', '{');
        for (char c : s.toCharArray()) {
            if (pair.containsKey(c)) {
                if (st.isEmpty() || st.pop() != pair.get(c)) return false;
            } else st.push(c);
        }
        return st.isEmpty();
    }
}
```

`scripts/java-ref/121.java`（int[] → int）：
```java
// Hot100 #121 买卖股票的最佳时机（简单）· 动态规划
class Solution {
    public int maxProfit(int[] prices) {
        int min = Integer.MAX_VALUE, best = 0;
        for (int p : prices) { if (p < min) min = p; else best = Math.max(best, p - min); }
        return best;
    }
}
```

`scripts/java-ref/54.java`（int[][] → int[]）：
```java
// Hot100 #54 螺旋矩阵（中等）· 模拟
import java.util.*;

class Solution {
    public int[] spiralOrder(int[][] m) {
        List<Integer> r = new ArrayList<>();
        int t = 0, b = m.length - 1, l = 0, rr = m[0].length - 1;
        while (t <= b && l <= rr) {
            for (int j = l; j <= rr; j++) r.add(m[t][j]);
            for (int i = t + 1; i <= b; i++) r.add(m[i][rr]);
            if (t < b) for (int j = rr - 1; j >= l; j--) r.add(m[b][j]);
            if (l < rr) for (int i = b - 1; i > t; i--) r.add(m[i][l]);
            t++; b--; l++; rr--;
        }
        int[] out = new int[r.size()];
        for (int i = 0; i < r.size(); i++) out[i] = r.get(i);
        return out;
    }
}
```

`scripts/java-ref/200.java`（grid → int）：
```java
// Hot100 #200 岛屿数量（中等）· 深度优先
class Solution {
    public int numIslands(char[][] grid) {
        int ans = 0;
        for (int i = 0; i < grid.length; i++)
            for (int j = 0; j < grid[0].length; j++)
                if (grid[i][j] == '1') { ans++; dfs(grid, i, j); }
        return ans;
    }
    void dfs(char[][] g, int i, int j) {
        if (i < 0 || j < 0 || i >= g.length || j >= g[0].length || g[i][j] != '1') return;
        g[i][j] = '0';
        dfs(g, i + 1, j); dfs(g, i - 1, j); dfs(g, i, j + 1); dfs(g, i, j - 1);
    }
}
```

`scripts/java-ref/206.java`（list → list）：
```java
// Hot100 #206 反转链表（简单）· 链表
class Solution {
    public ListNode reverseList(ListNode head) {
        ListNode prev = null, cur = head;
        while (cur != null) { ListNode next = cur.next; cur.next = prev; prev = cur; cur = next; }
        return prev;
    }
}
```

`scripts/java-ref/104.java`（tree → int）：
```java
// Hot100 #104 二叉树的最大深度（简单）· 二叉树
class Solution {
    public int maxDepth(TreeNode root) {
        return root == null ? 0 : 1 + Math.max(maxDepth(root.left), maxDepth(root.right));
    }
}
```

`scripts/java-ref/138.java`（randomList → randomList）：
```java
// Hot100 #138 随机链表的复制（中等）· 哈希表
import java.util.*;

class Solution {
    public Node copyRandomList(Node head) {
        if (head == null) return null;
        Map<Node, Node> map = new HashMap<>();
        for (Node p = head; p != null; p = p.next) map.put(p, new Node(p.val));
        for (Node p = head; p != null; p = p.next) {
            Node c = map.get(p);
            c.next = p.next == null ? null : map.get(p.next);
            c.random = p.random == null ? null : map.get(p.random);
        }
        return map.get(head);
    }
}
```

`scripts/java-ref/48.java`（int[][] void + mutates 原地旋转）：
```java
// Hot100 #48 旋转图像（中等）· 原地矩阵
class Solution {
    public void rotate(int[][] m) {
        int n = m.length;
        for (int i = 0; i < n; i++)
            for (int j = i + 1; j < n; j++) { int t = m[i][j]; m[i][j] = m[j][i]; m[j][i] = t; }
        for (int i = 0; i < n; i++)
            for (int l = 0, r = n - 1; l < r; l++, r--) { int t = m[i][l]; m[i][l] = m[i][r]; m[i][r] = t; }
    }
}
```

- [ ] **Step 5: 去掉 `verify-java.js` 的 function-only 过滤**

把 `main()` 里：

```js
    .filter((p) => p.core.kind !== 'ops'); // TODO(task2): ops 驱动加入后移除该过滤
```

改为：

```js
    .filter((p) => p.core.kind === 'function' || p.core.kind === 'ops');
```

- [ ] **Step 6: 写 4 份 ops 参考题解**

`scripts/java-ref/146.java`（LRU 缓存）：
```java
// Hot100 #146 LRU 缓存（中等）· 哈希表 + 双向链表
import java.util.*;

class LRUCache {
    final int cap;
    final Map<Integer, Node> map = new HashMap<>();
    final Node head = new Node(0, 0), tail = new Node(0, 0);
    class Node { int k, v; Node prev, next; Node(int k, int v) { this.k = k; this.v = v; } }
    public LRUCache(int capacity) { cap = capacity; head.next = tail; tail.prev = head; }
    void remove(Node n) { n.prev.next = n.next; n.next.prev = n.prev; }
    void addFirst(Node n) { n.next = head.next; n.prev = head; head.next.prev = n; head.next = n; }
    public int get(int key) {
        if (!map.containsKey(key)) return -1;
        Node n = map.get(key); remove(n); addFirst(n);
        return n.v;
    }
    public void put(int key, int value) {
        if (map.containsKey(key)) { Node n = map.get(key); n.v = value; remove(n); addFirst(n); return; }
        Node n = new Node(key, value); map.put(key, n); addFirst(n);
        if (map.size() > cap) { map.remove(tail.prev.k); remove(tail.prev); }
    }
}
```

`scripts/java-ref/155.java`（最小栈）：
```java
// Hot100 #155 最小栈（中等）· 栈
import java.util.*;

class MinStack {
    Deque<Integer> st = new ArrayDeque<>();
    Deque<Integer> min = new ArrayDeque<>();
    public MinStack() {}
    public void push(int val) { st.push(val); min.push(min.isEmpty() ? val : Math.min(min.peek(), val)); }
    public void pop() { st.pop(); min.pop(); }
    public int top() { return st.peek(); }
    public int getMin() { return min.peek(); }
}
```

`scripts/java-ref/208.java`（实现 Trie）：
```java
// Hot100 #208 实现 Trie（中等）· 字典树
class Trie {
    Trie[] next = new Trie[26];
    boolean end = false;
    public Trie() {}
    public void insert(String word) {
        Trie cur = this;
        for (char c : word.toCharArray()) { int i = c - 'a'; if (cur.next[i] == null) cur.next[i] = new Trie(); cur = cur.next[i]; }
        cur.end = true;
    }
    public boolean search(String word) {
        Trie cur = walk(word);
        return cur != null && cur.end;
    }
    public boolean startsWith(String prefix) {
        return walk(prefix) != null;
    }
    Trie walk(String s) {
        Trie cur = this;
        for (char c : s.toCharArray()) { int i = c - 'a'; if (cur.next[i] == null) return null; cur = cur.next[i]; }
        return cur;
    }
}
```

`scripts/java-ref/295.java`（数据流的中位数）：
```java
// Hot100 #295 数据流的中位数（困难）· 对顶堆
import java.util.*;

class MedianFinder {
    PriorityQueue<Integer> lo = new PriorityQueue<>(Collections.reverseOrder()); // 大顶堆
    PriorityQueue<Integer> hi = new PriorityQueue<>(); // 小顶堆
    public MedianFinder() {}
    public void addNum(int num) {
        lo.add(num);
        hi.add(lo.poll());
        if (hi.size() > lo.size()) lo.add(hi.poll());
    }
    public double findMedian() {
        if (lo.size() > hi.size()) return lo.peek();
        return (lo.peek() + hi.peek()) / 2.0;
    }
}
```

- [ ] **Step 7: 全量验证（100 题桩 + 13 份题解）**

Run: `node scripts/verify-java.js`
Expected: 100 题桩冒烟全部 `✓`，13 份参考题解全部 `✓`，退出码 0

- [ ] **Step 8: 提交**

```bash
git add judge/java-driver.js scripts/verify-java.js scripts/java-ref/
git commit -m "feat: Java 驱动支持 ops 型 + 13 份参考题解全量验证通过"
```

---

## Task 3: CLI 骨架 + list/search/random + package.json bin

**Files:**
- Create: `cli/hot100.js`（本任务先含 list/search/random + 骨架，后续任务追加命令）
- Modify: `package.json`

- [ ] **Step 1: 写 `cli/hot100.js`（骨架 + list/search/random）**

```js
#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA = {
  problems: JSON.parse(fs.readFileSync(path.join(ROOT, 'public/data/problems.json'), 'utf8')),
  solutions: JSON.parse(fs.readFileSync(path.join(ROOT, 'public/data/solutions.json'), 'utf8')),
  tests: JSON.parse(fs.readFileSync(path.join(ROOT, 'public/data/tests.json'), 'utf8')),
};

const STATE_FILE = path.join(ROOT, 'work', 'cli-state.json');
function loadState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch { return { solved: [], starred: [], updatedAt: null }; }
}
function saveState(s) {
  s.updatedAt = new Date().toISOString();
  fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2));
}

function die(msg) { console.error(`✗ ${msg}`); process.exit(1); }

// ---- 参数解析：--flag value 与 --flag=value ----
function parseArgs(argv) {
  const flags = {};
  const positional = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const eq = a.indexOf('=');
      if (eq >= 0) flags[a.slice(2, eq)] = a.slice(eq + 1);
      else {
        const k = a.slice(2);
        const v = i + 1 < argv.length && !argv[i + 1].startsWith('--') ? argv[++i] : true;
        flags[k] = v;
      }
    } else positional.push(a);
  }
  return { flags, positional };
}

function findProblem(id) {
  const p = DATA.problems.find((x) => x.id === Number(id));
  if (!p) die(`题目不存在: ${id}`);
  return p;
}

function statusMark(p, state) {
  if (state.starred.includes(p.id)) return '★';
  if (state.solved.includes(p.id)) return '✓';
  return ' ';
}

// ---- list ----
function cmdList(flags) {
  let list = [...DATA.problems];
  if (flags.company) list = list.filter((p) => p.freq && p.freq.companies && p.freq.companies.some((c) => c.name === flags.company));
  if (flags.difficulty) list = list.filter((p) => p.difficulty === flags.difficulty);
  if (flags.topic) list = list.filter((p) => p.topic === flags.topic);
  const byRank = (a, b) => ((a.freq && a.freq.rank) || 9999) - ((b.freq && b.freq.rank) || 9999);
  list.sort(flags.sort === 'rank' ? byRank : (a, b) => a.id - b.id);
  if (flags.top) list = list.slice(0, Number(flags.top));
  const state = loadState();
  const w = (t, n, s) => (t + (s || '')).padEnd(n);
  console.log(w('ID', 5) + w('难度', 6) + w('专题', 16) + w('高频', 5) + w('标题', 40) + '状态');
  for (const p of list) {
    console.log(w(String(p.id), 5) + w(p.difficulty, 6) + w(p.topic, 16) +
      w(String((p.freq && p.freq.rank) || '-'), 5) + w(p.title, 40) + statusMark(p, state));
  }
  console.log(`\n共 ${list.length} 题`);
}

// ---- search ----
function cmdSearch(flags, positional) {
  const kw = positional[0];
  if (!kw) die('用法: hot100 search <关键词>');
  const hit = DATA.problems.filter((p) =>
    p.title.includes(kw) || p.desc.includes(kw) || p.topic.includes(kw) ||
    (p.explain || '').includes(kw));
  if (!hit.length) { console.log(`未找到包含 "${kw}" 的题目`); return; }
  for (const p of hit) console.log(`#${p.id} ${p.title}（${p.difficulty} · ${p.topic}）`);
}

// ---- random ----
function cmdRandom(flags) {
  let pool = [...DATA.problems];
  if (flags.company) pool = pool.filter((p) => p.freq && p.freq.companies && p.freq.companies.some((c) => c.name === flags.company));
  if (flags.unfinished) {
    const state = loadState();
    pool = pool.filter((p) => !state.solved.includes(p.id));
  }
  if (!pool.length) die('没有符合条件的题目');
  const p = pool[Math.floor(Math.random() * pool.length)];
  console.log(`🎲 随机一题：\n  #${p.id} ${p.title}（${p.difficulty} · ${p.topic}）\n  高频排名: ${(p.freq && p.freq.rank) || '-'}  最近被考: ${(p.freq && p.freq.lastAsked) || '-'}\n  ${p.url}`);
  console.log(`  ${p.explain ? p.explain.split('\n')[0] : ''}`);
}

function usage() {
  console.log(`Hot100 刷题命令行工具

用法:
  hot100 list [--company X] [--difficulty 简单|中等|困难] [--topic 数组] [--top 20] [--sort id|rank]
  hot100 show <id>
  hot100 search <关键词>
  hot100 random [--company X] [--unfinished]
  hot100 init <id> [--lang java|python3|cpp]
  hot100 judge <id> <file> [--lang java|python3|cpp] [--mode core|acm]
  hot100 mark <id> done|star|unstar|reset
  hot100 progress`);
  process.exit(1);
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const { flags, positional } = parseArgs(rest);
  switch (cmd) {
    case 'list': cmdList(flags); break;
    case 'search': cmdSearch(flags, positional); break;
    case 'random': cmdRandom(flags); break;
    case 'show': case 'init': case 'judge': case 'mark': case 'progress':
      die(`命令 ${cmd} 尚未实现（将在后续任务加入）`);
      break;
    default: usage();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: `package.json` 加 bin**

把 `package.json` 整体替换为：

```json
{
  "name": "hot100-judge",
  "version": "1.0.0",
  "bin": {
    "hot100": "cli/hot100.js"
  },
  "scripts": {
    "start": "node server.js",
    "dev": "node server.js"
  },
  "dependencies": {},
  "devDependencies": {}
}
```

- [ ] **Step 3: 冒烟 list/search/random**

Run: `node cli/hot100.js list --top 5`
Expected: 打印表头 + 5 行（#1 两数之和…）

Run: `node cli/hot100.js search 两数`
Expected: 命中 1-2 行包含"两数"

Run: `node cli/hot100.js list --difficulty 简单 --top 3`
Expected: 仅简单题 3 行

- [ ] **Step 4: 提交**

```bash
git add cli/hot100.js package.json
git commit -m "feat: CLI 骨架 + list/search/random + npm bin"
```

---

## Task 4: CLI show 命令

**Files:**
- Modify: `cli/hot100.js`（实现 cmdShow + 签名/格式辅助）

- [ ] **Step 1: 在 `cli/hot100.js` 加 `cmdShow` 及辅助函数（插入在 `usage` 之前）**

```js
function coreSignature(core) {
  if (core.kind === 'ops') {
    const ctor = (core.ops.constructor || []).map((p) => `${p.type} ${p.name}`).join(', ');
    const methods = (core.ops.methods || []).map((m) => `    public ${m.ret || 'void'} ${m.name}(${m.args.map((t, i) => t + ' a' + i).join(', ')})`);
    return `class ${core.className}(${ctor})\n` + methods.join('\n');
  }
  const params = core.params.map((p) => `${p.type} ${p.name}${p.desc ? '  // ' + p.desc : ''}`).join('\n      ');
  return `class ${core.className} {\n    public ${core.returns} ${core.method}(${core.params.map((p) => p.type + ' ' + p.name).join(', ')})\n}`;
}

function companyTags(p) {
  if (!p.freq || !p.freq.companies) return '-';
  return p.freq.companies.slice(0, 8).map((c) => `${c.name}(${c.value})`).join(' ');
}

function cmdShow(flags, positional) {
  const p = findProblem(positional[0]);
  console.log(`\n#${p.id} ${p.title}   ${p.difficulty} · ${p.topic}`);
  console.log(`链接: ${p.url}`);
  if (p.freq) {
    console.log(`CodeTop: 排名 #${p.freq.rank}  出现 ${p.freq.value} 次  最近被考 ${p.freq.lastAsked}`);
    console.log(`常考公司: ${companyTags(p)}`);
  }
  console.log(`\n题目描述:\n${p.desc}`);
  if (p.core) {
    console.log(`\n核心代码模式（${p.core.kind === 'ops' ? '类' : '函数'}）:`);
    console.log(coreSignature(p.core));
  }
  if (p.acm) {
    console.log(`\nACM 模式输入:`);
    console.log(p.acm.input);
    console.log(`ACM 模式输出:`);
    console.log(p.acm.output);
    if (p.acm.examples && p.acm.examples[0]) {
      console.log(`示例:\n  输入: ${p.acm.examples[0].input}\n  输出: ${p.acm.examples[0].output}`);
    }
  }
  if (p.explain) console.log(`\n解题思路:\n${p.explain}`);
  const sol = DATA.solutions[String(p.id)];
  if (sol && sol.python3 && sol.python3.core) {
    console.log(`\n参考题解 · Python3（核心代码模式）:`);
    console.log(sol.python3.core);
  }
  if (sol && sol.cpp && sol.cpp.core) {
    console.log(`\n参考题解 · C++（核心代码模式）:`);
    console.log(sol.cpp.core);
  }
}
```

- [ ] **Step 2: 在 `main()` 的 switch 中把 `show` 从"未实现"分支移出**

```js
    case 'show': cmdShow(flags, positional); break;
```

同时把"未实现"分支改为只剩 `init/judge/mark/progress`。

- [ ] **Step 3: 冒烟 show**

Run: `node cli/hot100.js show 1`
Expected: 打印 #1 两数之和 的完整详情（描述/签名/ACM/解题思路/双语言参考题解）

Run: `node cli/hot100.js show 146`
Expected: ops 类签名（class LRUCache + get/put 方法行）

- [ ] **Step 4: 提交**

```bash
git add cli/hot100.js
git commit -m "feat: CLI show 命令（题目详情/签名/解题思路/参考题解）"
```

---

## Task 5: CLI judge + init 命令

**Files:**
- Modify: `cli/hot100.js`（实现 cmdJudge + cmdInit）

- [ ] **Step 1: 加 `cmdJudge`（文件路径提交 + 评测输出）与 `cmdInit`（模板生成），插入在 `usage` 之前**

```js
const LANG_EXT = { java: 'java', python3: 'py', cpp: 'cpp' };
const EXT_LANG = { java: 'java', py: 'python3', cpp: 'cpp' };

function zeroLiteral(type) {
  const m = {
    int: '0', double: '0.0', bool: 'false', string: '""',
    'int[]': 'new int[0]', 'int[][]': 'new int[0][]',
    'string[]': 'new String[0]', 'string[][]': 'new String[0][]',
    grid: 'new char[0][]', list: 'null', tree: 'null', randomList: 'null',
  };
  return m[type] || 'null';
}

function initTemplate(p, lang) {
  const core = p.core;
  if (!core) die('该题无核心代码模式数据，无法生成模板');
  if (lang === 'java') {
    if (core.kind === 'ops') {
      const ctor = (core.ops.constructor || []).map((x) => `${x.type} ${x.name}`).join(', ');
      const methods = (core.ops.methods || []).map((m) =>
        `    public ${m.ret || 'void'} ${m.name}(${m.args.map((t, i) => t + ' a' + i).join(', ')}) {${m.ret && m.ret !== 'void' ? ' return ' + zeroLiteral(m.ret) + ';' : ''} }`).join('\n');
      return `import java.util.*;\n\n// Hot100 #${p.id} ${p.title}（${p.difficulty}）· ${p.topic}\n// ${(p.explain || '').split('\n')[0]}\nclass ${core.className} {\n    public ${core.className}(${ctor}) {}\n${methods}\n}\n`;
    }
    const params = core.params.map((x) => `${x.type} ${x.name}`).join(', ');
    const body = core.returns === 'void' || (core.mutates != null && core.mutates >= 0) ? '' : `return ${zeroLiteral(core.returns)};`;
    return `import java.util.*;\n\n// Hot100 #${p.id} ${p.title}（${p.difficulty}）· ${p.topic}\n// ${(p.explain || '').split('\n')[0]}\nclass ${core.className} {\n    public ${core.returns} ${core.method}(${params}) {\n        // TODO: 实现\n        ${body}\n    }\n}\n`;
  }
  // python3 / cpp 模板：仅核心签名注释（直接给参考题解更实用，但保证签名正确）
  if (lang === 'python3') {
    return `# Hot100 #${p.id} ${p.title}（${p.difficulty}）· ${p.topic}\n# ${(p.explain || '').split('\n')[0]}\nclass ${core.className}:\n    def ${core.method}(self${core.params.map((x) => ', ' + x.name).join('')}):\n        # TODO: 实现\n        pass\n`;
  }
  return `// Hot100 #${p.id} ${p.title}（${p.difficulty}）· ${p.topic}\n// ${(p.explain || '').split('\n')[0]}\nclass ${core.className} {\npublic:\n    ${core.returns} ${core.method}(${core.params.map((x) => x.type + ' ' + x.name).join(', ')}) {\n        // TODO: 实现\n    }\n};\n`;
}

async function cmdJudge(flags, positional) {
  const id = positional[0];
  const file = positional[1];
  if (!file) die('用法: hot100 judge <id> <文件> [--lang java|python3|cpp] [--mode core|acm]');
  const p = findProblem(id);
  let code;
  try { code = fs.readFileSync(file, 'utf8'); } catch { die(`文件不存在: ${file}`); }
  const ext = path.extname(file).slice(1).toLowerCase();
  const lang = flags.lang || EXT_LANG[ext] || 'java';
  const mode = flags.mode || 'core';
  if (lang === 'java' && mode !== 'core') die('Java 仅支持核心代码模式（--mode core）');
  const useCore = mode === 'core' || lang === 'java';
  if (useCore && !p.core) die('该题无核心代码模式数据');
  const tests = DATA.tests[String(p.id)] ? DATA.tests[String(p.id)][mode] : [];
  if (!tests || !tests.length) die(`该题无 ${mode} 测试用例`);
  const { judgeCore, judgeACM, summarize } = require(path.join(ROOT, 'judge', 'judge'));
  const outcome = useCore
    ? await judgeCore({ language: lang, code, core: p.core, tests })
    : await judgeACM({ language: lang, code, tests });
  console.log(`\n#${p.id} ${p.title}  ${p.difficulty} · ${lang} · ${mode === 'core' ? '核心代码模式' : 'ACM 模式'}`);
  if (outcome.error) {
    console.error(`✗ ${outcome.phase === 'compile' ? '编译失败' : '运行失败'}`);
    if (outcome.compileError) console.error(outcome.compileError);
    else console.error(outcome.error);
    process.exit(1);
  }
  const { passed, total } = summarize(outcome.results, mode);
  const failed = outcome.results.filter((r) => !r.ok);
  for (const r of failed.slice(0, 5)) {
    console.error(`  [用例 ${r.index}] ${r.error ? r.error.split('\n')[0] : ''}`);
    if (r.expected !== undefined && r.got !== undefined) {
      console.error(`      期望: ${r.expected}  实际: ${r.got}`);
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
}

function cmdInit(flags, positional) {
  const id = positional[0];
  if (!id) die('用法: hot100 init <id> [--lang java|python3|cpp]');
  const p = findProblem(id);
  const lang = flags.lang || 'java';
  const ext = LANG_EXT[lang];
  const file = `sol-${id}.${ext}`;
  fs.writeFileSync(file, initTemplate(p, lang));
  console.log(`已生成 ${file}（hot100 judge ${id} ${file} 即可评测）`);
}
```

- [ ] **Step 2: 在 `main()` switch 中启用 judge/init**

```js
    case 'init': cmdInit(flags, positional); break;
    case 'judge': await cmdJudge(flags, positional); break;
    case 'mark': case 'progress':
      die(`命令 ${cmd} 尚未实现（将在 Task 6 加入）`);
      break;
```

- [ ] **Step 3: 冒烟 init + judge（Java 正确/错误两个文件）**

Run: `node cli/hot100.js init 1 --lang java`
Expected: 生成 `sol-1.java`，内含 `class Solution { public int[] twoSum(int[] nums, int target)`

Run: `node cli/hot100.js judge 1 sol-1.java`
Expected: `✅ 5/5 全部通过`（模板返回零值两数必错 → 应为失败）。修正后跑真实题解：
Run: `node cli/hot100.js judge 1 scripts/java-ref/1.java`
Expected: `✅ 5/5 全部通过`

Run（故意写错）:
```bash
echo 'class Solution { public int[] twoSum(int[] nums, int target) { return new int[]{1,1}; } }' > /tmp/bad.java
node cli/hot100.js judge 1 /tmp/bad.java
```
Expected: 输出 `❌ 0/5 通过`，退出码 1

Run（python3 沿用现有评测）:
Run: `node cli/hot100.js judge 1 --lang python3 --mode core scripts/java-ref/1.java` —— 应报编译错误（Java 代码不能当 Python 跑）。改用参考题解验证 py 通路：
Run: `node cli/hot100.js judge 20 scripts/../public/data/../... ` —— 此步仅需确认 judge 对 python3 也能工作，可用任意简单 py 文件：
```bash
node -e "console.log('class Solution:\n    def isValid(self, s):\n        return True')" > /tmp/s.py
node cli/hot100.js judge 20 /tmp/s.py
```
Expected: `❌` 输出（0/5 通过）+ 退出码 1，说明 python3 通路可用

- [ ] **Step 4: 提交**

```bash
git add cli/hot100.js
git commit -m "feat: CLI judge（文件提交评测）+ init（模板生成）"
```

---

## Task 6: CLI mark/progress + 状态文件 + .gitignore

**Files:**
- Modify: `cli/hot100.js`（实现 cmdMark + cmdProgress）
- Modify: `.gitignore`

- [ ] **Step 1: 加 `cmdMark` 与 `cmdProgress`，插入在 `usage` 之前**

```js
function cmdMark(flags, positional) {
  const id = positional[0];
  const action = positional[1] || 'done';
  if (!id) die('用法: hot100 mark <id> done|star|unstar|reset');
  findProblem(id);
  const state = loadState();
  if (action === 'done') { if (!state.solved.includes(Number(id))) state.solved.push(Number(id)); }
  else if (action === 'reset') { state.solved = state.solved.filter((x) => x !== Number(id)); }
  else if (action === 'star') { if (!state.starred.includes(Number(id))) state.starred.push(Number(id)); }
  else if (action === 'unstar') { state.starred = state.starred.filter((x) => x !== Number(id)); }
  else die(`未知操作: ${action}`);
  saveState(state);
  console.log(`已标记 #${id} ${action}`);
}

function cmdProgress() {
  const state = loadState();
  const solved = new Set(state.solved);
  const total = DATA.problems.length;
  const pct = Math.round((solved.size / total) * 100);
  const byDiff = { 简单: 0, 中等: 0, 困难: 0 };
  const byTopic = new Map();
  const starList = state.starred.map((id) => DATA.problems.find((p) => p.id === id)).filter(Boolean);
  for (const p of DATA.problems) {
    if (!solved.has(p.id)) continue;
    byDiff[p.difficulty] = (byDiff[p.difficulty] || 0) + 1;
    byTopic.set(p.topic, (byTopic.get(p.topic) || 0) + 1);
  }
  console.log(`已刷 ${solved.size} / ${total}（${pct}%）`);
  console.log(`收藏 ${starList.length} 题`);
  console.log(`按难度: ${Object.entries(byDiff).map(([k, v]) => `${k} ${v}`).join('  ')}`);
  console.log(`按专题: ${[...byTopic.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => `${k} ${v}`).join('  ')}`);
  if (starList.length) console.log(`\n收藏列表:\n` + starList.map((p) => `  ★ #${p.id} ${p.title}`).join('\n'));
  const undone = DATA.problems.filter((p) => !solved.has(p.id)).slice(0, 10);
  if (undone.length) console.log(`\n推荐继续刷（未完成 ${total - solved.size} 题，前 10）:\n` + undone.map((p) => `  #${p.id} ${p.title}`).join('\n'));
}
```

- [ ] **Step 2: 在 `main()` switch 中启用 mark/progress（同时删掉整个"未实现"分支）**

```js
    case 'mark': cmdMark(flags, positional); break;
    case 'progress': cmdProgress(); break;
    default: usage();
```

- [ ] **Step 3: `.gitignore` 追加一行**

在 `.gitignore` 末尾追加：

```
work/cli-state.json
```

- [ ] **Step 4: 冒烟 mark/progress**

Run: `node cli/hot100.js mark 1 done && node cli/hot100.js mark 1 star && node cli/hot100.js progress`
Expected: 已刷 1 / 100（1%），收藏 1 题，列出 #1

Run: `node cli/hot100.js list --top 3`
Expected: 第 1 行 `#1` 带 `★` 状态标记

清理状态（避免污染仓库）:
Run: `node cli/hot100.js mark 1 reset && node cli/hot100.js mark 1 unstar && rm -f work/cli-state.json`

- [ ] **Step 5: 提交**

```bash
git add cli/hot100.js .gitignore
git commit -m "feat: CLI mark/progress 命令 + 进度状态持久化"
```

---

## Task 7: CI 接线 + 全量最终验证

**Files:**
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: CI 环境检查加 Java**

把 `.github/workflows/ci.yml` 的"环境检查"步骤改为：

```yaml
      - name: 环境检查
        run: |
          node --version
          python3 --version
          gcc --version | head -1
          g++ --version | head -1
          java -version 2>&1 | head -1
          javac -version 2>&1 | head -1
```

- [ ] **Step 2: 新增 verify-java 步骤**

在"全量题解验证"步骤之后追加：

```yaml
      - name: Java 驱动验证（100 题桩冒烟 + 13 份参考题解）
        run: node scripts/verify-java.js
```

- [ ] **Step 3: 全量验证三件套**

Run: `node scripts/verify-java.js`
Expected: `✅ Java 验证全部通过`，退出码 0

Run: `node scripts/test-judge.js`
Expected: 现有驱动自测全部通过（不回归）

Run: `node --check cli/hot100.js && node --check server.js && node --check judge/java-driver.js`
Expected: 三个文件语法检查通过，无输出

- [ ] **Step 4: 提交**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: 接入 Java 驱动验证（verify-java 100 题）"
```

---

## Task 8: 收尾 —— `npm link` 冒烟 + 进度文件 git 状态确认

**Files:** 无（纯验证）

- [ ] **Step 1: `npm link` 安装全局命令**

Run: `npm link`
Expected: 输出 `added ... package ... hot100`，之后 `hot100` 命令可用

Run: `hot100 list --top 3 && hot100 show 1 && hot100 judge 1 scripts/java-ref/1.java`
Expected: 三命令均正常输出，judge 显示 `✅ 5/5 全部通过`

- [ ] **Step 2: 确认状态文件不污染仓库**

Run: `git status`
Expected: 仅期望的改动；`work/cli-state.json` 不出现（已被 gitignore）

- [ ] **Step 3: 最终提交（若 Step 1 冒烟发现需要修改）**

如有修复，`git add` 相关文件并提交 `fix: 收尾冒烟修复`。

---

## 自检结论

- **Spec 覆盖**：命令集（list/show/search/random/init/judge/mark/progress）↔ Task 3/4/5/6；Java 核心评测 ↔ Task 1/2；状态存储 + .gitignore ↔ Task 6；测试（100 题桩冒烟 + 精选真实题解 + CLI 冒烟 + CI）↔ Task 1/2/3/5/7。
- **无占位符**：所有步骤含完整代码与命令。
- **类型一致性**：`JAVA_TYPE`/`PARAM_CONV`/`RET_CONV`/`STUB` 共享同一 13 类型清单；`buildJavaDriver` 在 Task 1 与 Task 2 的签名一致；judge.js 的 Java 分支引用 `buildJavaDriver`（经 core-driver 重导出）。
