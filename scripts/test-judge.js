'use strict';

/**
 * Java 核心代码驱动自测（Java-only）：
 *   - 21 道官方签名特殊题 + function/ops/链表/树/矩阵/原地修改
 *   - List<Integer> / List<List<Integer>> 的 Integer→Double 归一化
 *   - 顺序无关 checker（#1/#15）与严格顺序（#54）仍然正确
 */
const fs = require('fs');
const path = require('path');
const { judgeCore } = require('../judge/judge');

const ROOT = path.join(__dirname, '..');
const problems = require(path.join(ROOT, 'data/problems.json'));
const tests = require(path.join(ROOT, 'data/tests.json'));

const problem = (id) => problems.find((p) => p.id === id);
const refCode = (id) => fs.readFileSync(path.join(__dirname, 'java-ref', `${id}.java`), 'utf8');

function show(label, outcome) {
  console.log(`\n===== ${label} =====`);
  if (outcome.error) {
    console.log('ERROR:', outcome.error);
    if (outcome.compileError) console.log(outcome.compileError.slice(0, 1500));
    return false;
  }
  let ok = true;
  for (const r of outcome.results || []) {
    if (!r.ok) {
      ok = false;
      console.log('FAIL:', JSON.stringify(r));
    }
  }
  console.log(ok ? 'ALL PASS' : 'SOME FAIL');
  return ok;
}

const TWO_SUM_REVERSED = `import java.util.*;
class Solution {
    public int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> m = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            Integer j = m.get(target - nums[i]);
            if (j != null) return new int[] { i, j }; // 与参考解相反的顺序
            m.put(nums[i], i);
        }
        return new int[] {};
    }
}`;

const THREE_SUM_DEEP_UNORDERED = `import java.util.*;
class Solution {
    public List<List<Integer>> threeSum(int[] nums) {
        Arrays.sort(nums);
        List<List<Integer>> out = new ArrayList<>();
        for (int i = 0; i < nums.length - 2; i++) {
            if (i > 0 && nums[i] == nums[i - 1]) continue;
            int l = i + 1, r = nums.length - 1;
            while (l < r) {
                int s = nums[i] + nums[l] + nums[r];
                if (s < 0) l++;
                else if (s > 0) r--;
                else {
                    // 组内与组间都逆序
                    out.add(Arrays.asList(nums[r], nums[l], nums[i]));
                    while (l < r && nums[l] == nums[l + 1]) l++;
                    while (l < r && nums[r] == nums[r - 1]) r--;
                    l++; r--;
                }
            }
        }
        Collections.reverse(out);
        return out;
    }
}`;

const SPIRAL_REVERSED = `import java.util.*;
class Solution {
    public List<Integer> spiralOrder(int[][] matrix) {
        List<Integer> r = new ArrayList<>();
        for (int[] row : matrix) for (int x : row) r.add(x);
        Collections.reverse(r); // 顺序错误，必须判失败
        return r;
    }
}`;

const TWO_SUM_BAD = `import java.util.*;
class Solution {
    public int[] twoSum(int[] nums, int target) {
        return new int[] { 0, 0 }; // 错误答案
    }
}`;

async function run(id, code) {
  const p = problem(id);
  return judgeCore({ code, core: p.core, tests: tests[String(id)].core, problemId: id });
}

function expectFail(label, outcome) {
  console.log(`\n===== ${label} =====`);
  if (outcome.error) { console.log('ERROR:', outcome.error); return false; }
  const failed = (outcome.results || []).some((r) => !r.ok);
  console.log(failed ? 'CORRECTLY FAILED' : 'UNEXPECTEDLY PASSED');
  return failed;
}

async function main() {
  let all = true;
  const ids = [
    1, 15, 17, 22, 23, 46, 49, 51, 54, 78, 94, 102, 118, 131, 139, 142,
    146, 155, 160, 199, 206, 208, 226, 236, 295, 438, 763, 994,
  ];
  for (const id of ids) {
    all = show(`#${id} ${problem(id).title}（参考题解）`, await run(id, refCode(id))) && all;
  }

  all = show('#1 顺序无关：返回反向下标必须通过', await run(1, TWO_SUM_REVERSED)) && all;
  all = show('#15 任意层级顺序无关：组内/组间逆序必须通过', await run(15, THREE_SUM_DEEP_UNORDERED)) && all;
  all = expectFail('#54 顺序敏感：逆序结果必须判失败', await run(54, SPIRAL_REVERSED)) && all;
  all = expectFail('#1 错误答案必须判失败', await run(1, TWO_SUM_BAD)) && all;

  process.exit(all ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
