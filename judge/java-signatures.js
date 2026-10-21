'use strict';

/**
 * Java 官方签名解析层（Java-only 架构的唯一签名来源）。
 *
 * 题库 core 里的 params/returns 是跨语言语义类型（int[]、int[][]、string[]、
 * grid、list、tree…）。本地 Java 模板/驱动直接对齐 leetcode.cn 官方 Java 签名：
 * 多数题语义类型与官方一致，少数题需要 List 包装或节点语义适配，集中在这里声明。
 */
const BASE_JAVA_TYPE = {
  int: 'int',
  double: 'double',
  bool: 'boolean',
  string: 'String',
  'int[]': 'int[]',
  'int[][]': 'int[][]',
  'string[]': 'String[]',
  'string[][]': 'String[][]',
  grid: 'char[][]',
  list: 'ListNode',
  tree: 'TreeNode',
  randomList: 'Node',
  void: 'void',
};

// 官方 Java 返回类型覆盖（未列出的题与语义类型映射一致）
const RETURN_OVERRIDES = {
  15: 'List<List<Integer>>',
  17: 'List<String>',
  22: 'List<String>',
  39: 'List<List<Integer>>',
  46: 'List<List<Integer>>',
  49: 'List<List<String>>',
  51: 'List<List<String>>',
  54: 'List<Integer>',
  78: 'List<List<Integer>>',
  94: 'List<Integer>',
  102: 'List<List<Integer>>',
  118: 'List<List<Integer>>',
  131: 'List<List<String>>',
  142: 'ListNode',
  199: 'List<Integer>',
  236: 'TreeNode',
  438: 'List<Integer>',
  763: 'List<Integer>',
};

// 官方 Java 参数类型覆盖
const PARAM_OVERRIDES = {
  23: ['ListNode[]'],
  139: ['String', 'List<String>'],
  236: ['TreeNode', 'TreeNode', 'TreeNode'],
  994: ['int[][]'],
};

// 与官方语义不一致、需要自定义比较值的题
const SPECIAL_RETURN_ADAPTERS = {
  142: 'cycleEntryValue', // 本地期望：环入口节点的值，无环为 -1
  236: 'nodeValue', // 本地期望：最近公共祖先节点的值
};

const SPECIAL_PARAM_ADAPTERS = {
  236: { 1: 'nodeByValue', 2: 'nodeByValue' },
};

const baseType = (semantic) => BASE_JAVA_TYPE[semantic] || semantic;

function inferConv(semantic, javaType) {
  if (semantic === 'string[]' && javaType === 'List<String>') return 'stringList';
  if (semantic === 'string[]' && javaType === 'ListNode[]') return 'listNodeArray';
  if (semantic === 'grid' && javaType === 'int[][]') return 'intGrid';
  return 'unsupported';
}

function baseConv(semantic) {
  return BASE_JAVA_TYPE[semantic] ? semantic : 'unsupported';
}

function baseReturnAdapter(semantic) {
  if (semantic === 'int' || semantic === 'double' || semantic === 'bool' || semantic === 'string') return semantic;
  if (semantic === 'void') return 'void';
  return 'canon';
}

/**
 * @param {number|string} problemId
 * @param {object} core problems.json 中的 core
 * @returns {object} 驱动/模板所需的有效签名
 */
function resolveJavaSignature(problemId, core) {
  const id = Number(problemId);
  if (core.kind === 'ops') {
    return {
      kind: 'ops',
      className: core.className,
      ops: {
        constructor: (core.ops.constructor || []).map((p) => ({ ...p, javaType: baseType(p.type) })),
        methods: (core.ops.methods || []).map((m) => ({
          ...m,
          javaRet: baseType(m.ret),
          args: (m.args || []).map((t) => ({ semantic: t, javaType: baseType(t) })),
        })),
      },
    };
  }

  const baseParams = core.params.map((p) => baseType(p.type));
  const javaParams = (PARAM_OVERRIDES[id] || baseParams).slice();
  const javaRet = RETURN_OVERRIDES[id] || baseType(core.returns);
  const paramAdapters = SPECIAL_PARAM_ADAPTERS[id] || {};

  const params = core.params.map((p, i) => {
    const javaType = javaParams[i];
    const conv = paramAdapters[i] || (javaType === baseParams[i] ? baseConv(p.type) : inferConv(p.type, javaType));
    return { name: p.name, semantic: p.type, javaType, conv };
  });

  let adapter;
  if (SPECIAL_RETURN_ADAPTERS[id]) adapter = SPECIAL_RETURN_ADAPTERS[id];
  else if (javaRet.startsWith('List<')) adapter = 'canon';
  else adapter = baseReturnAdapter(core.returns);

  return {
    kind: 'function',
    className: core.className,
    method: core.method,
    mutates: Number(core.mutates ?? -1),
    params,
    returns: { semantic: core.returns, javaType: javaRet, adapter },
  };
}

/** 模板中方法体的占位返回值 */
function javaZeroLiteral(javaType) {
  if (!javaType) return 'null';
  if (javaType === 'void') return '';
  if (javaType === 'int') return '0';
  if (javaType === 'double') return '0.0';
  if (javaType === 'boolean') return 'false';
  if (javaType === 'String') return '""';
  if (javaType === 'int[]') return 'new int[0]';
  if (javaType === 'int[][]') return 'new int[0][]';
  if (javaType === 'String[]') return 'new String[0]';
  if (javaType === 'String[][]') return 'new String[0][]';
  if (javaType === 'char[][]') return 'new char[0][]';
  if (javaType === 'ListNode[]') return 'new ListNode[0]';
  if (javaType.startsWith('List<')) return 'new ArrayList<>()';
  if (javaType === 'ListNode' || javaType === 'TreeNode' || javaType === 'Node') return 'null';
  return 'null';
}

const ALL_JAVA_TYPES = (sig) => {
  if (sig.kind === 'ops') {
    const out = [];
    for (const p of sig.ops.constructor) out.push(p.javaType);
    for (const m of sig.ops.methods) {
      out.push(m.javaRet);
      for (const a of m.args) out.push(a.javaType);
    }
    return out;
  }
  return [...sig.params.map((p) => p.javaType), sig.returns.javaType];
};

/** 模板需要以注释形式附上的评测环境类型定义 */
function javaNeededTypes(sig) {
  const types = ALL_JAVA_TYPES(sig);
  const has = (name) => types.some((t) => t === name || t === `${name}[]`);
  const out = [];
  if (has('ListNode')) out.push('ListNode');
  if (has('TreeNode')) out.push('TreeNode');
  if (has('Node')) out.push('Node');
  return out;
}

module.exports = {
  BASE_JAVA_TYPE,
  RETURN_OVERRIDES,
  PARAM_OVERRIDES,
  resolveJavaSignature,
  javaZeroLiteral,
  javaNeededTypes,
};
