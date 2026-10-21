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
            if (s.startsWith("intersectList:")) return buildIntersect(parseList(s.substring(14)));
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

    static ListNode buildIntersect(List<?> p) {
        List<?> la = (List<?>) p.get(0);
        List<?> lb = (List<?>) p.get(1);
        int skipA = ((Number) p.get(2)).intValue();
        List<ListNode> nodesA = new ArrayList<>();
        for (Object x : la) nodesA.add(new ListNode(((Number) x).intValue()));
        for (int i = 0; i + 1 < nodesA.size(); i++) nodesA.get(i).next = nodesA.get(i + 1);
        if (nodesA.isEmpty()) return null;
        List<ListNode> prefix = new ArrayList<>();
        for (Object x : lb) prefix.add(new ListNode(((Number) x).intValue()));
        for (int i = 0; i + 1 < prefix.size(); i++) prefix.get(i).next = prefix.get(i + 1);
        ListNode headB = prefix.isEmpty() ? null : prefix.get(0);
        if (!prefix.isEmpty()) {
            prefix.get(prefix.size() - 1).next = (skipA >= 0 && skipA < nodesA.size()) ? nodesA.get(skipA) : null;
            g_sharedB = headB;
        } else {
            g_sharedB = null;
        }
        return nodesA.get(0);
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

    // 顺序无关比较：deep=false 只排序顶层，deep=true 递归排序所有数组
    static Object norm(Object v, boolean deep) {
        if (!(v instanceof List)) return v;
        List<Object> out = new ArrayList<>();
        for (Object e : (List<?>) v) out.add(deep ? norm(e, true) : e);
        out.sort((a, b) -> toJson(a).compareTo(toJson(b)));
        return out;
    }

    static String errJson(String msg) { return "{\\"ok\\":false,\\"error\\":" + toJson(msg) + "}"; }
    static String okJson() { return "{\\"ok\\":true}"; }

    public static void main(String[] argv) throws Exception {
        String s = new String(Files.readAllBytes(Paths.get(argv[0])), "UTF-8");
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

// 参数转换工厂：exprOf(i) 生成取第 i 个参数的表达式。
// function 型用 args.get(i)，ops 型用 _a.get(j)。
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
    grid: (i) => `(char[][]) build(${exprOf(i)})`,
    list: (i) => `(ListNode) build(${exprOf(i)})`,
    tree: (i) => `(TreeNode) build(${exprOf(i)})`,
    randomList: (i) => `(Node) build(${exprOf(i)})`,
  };
}

// 参数（来自 cases 的 args 列表）转类型
const PARAM_CONV = paramConvFor((i) => `args.get(${i})`);

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

function compareExpr(checker, a, b) {
  if (checker === 'unorderedTop') return `Objects.deepEquals(norm(${a}, false), norm(${b}, false))`;
  if (checker === 'unorderedDeep') return `Objects.deepEquals(norm(${a}, true), norm(${b}, true))`;
  return `Objects.deepEquals(${a}, ${b})`;
}

/** function kind：生成逐用例执行体（main 中 try 块内） */
function buildFunctionBody(core, checker) {
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
    `if (${compareExpr(checker, '_got', '_exp')}) { sb.append(okJson()); }`,
    `else { sb.append("{\\"ok\\":false,\\"expected\\":").append(toJson(_exp)).append(",\\"got\\":").append(toJson(_got)).append("}"); }`,
  ].join('\n');
}

/** ops 型：LRU/最小栈/Trie/数据流中位数。按 op 字符串派发。 */
const OP_CONV = paramConvFor((j) => `_a.get(${j})`);

function buildOpsBody(core, checker) {
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
    `${className} _obj = null;`,
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
    `if (${compareExpr(checker, '_out', '_exp')}) { sb.append(okJson()); }`,
    `else { sb.append("{\\"ok\\":false,\\"expected\\":").append(toJson(_exp)).append(",\\"got\\":").append(toJson(_out)).append("}"); }`,
  ].join('\n');
  return body;
}

/** 统一入口：function / ops 两种核心代码模式 */
function buildJavaDriver({ core, code, cases, checker = 'exact' }) {
  const body = core.kind === 'ops' ? buildOpsBody(core, checker) : buildFunctionBody(core, checker);
  const driver = JAVA_PREAMBLE.replace('{{MAIN_BODY}}', body);
  // cases 序列化为 cases.json 由 judge.js 写入，这里不内嵌
  return driver;
}

module.exports = { buildJavaDriver, JAVA_TYPE, PARAM_CONV, RET_CONV };
