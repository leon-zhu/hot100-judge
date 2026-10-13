// Hot100 #78 子集（中等）· 回溯
import java.util.*;

class Solution {
    public int[][] subsets(int[] nums) {
        // 核心思路: 回溯枚举子集，进入每层先把当前 path 记为一个子集。
        // 关键步骤: start 限制只能向后取元素，避免产生重复子集。
        // 易错点: 要在扩展前记录当前路径，否则会漏掉空集等中间结果。
        // 复杂度: 子集共 2^n 个，时间 O(n·2^n)，空间 O(n)。
        List<int[]> res = new ArrayList<>();
        int[] path = new int[nums.length];
        dfs(nums, 0, path, 0, res);
        return res.toArray(new int[0][]);
    }
    void dfs(int[] nums, int start, int[] path, int len, List<int[]> res) {
        res.add(Arrays.copyOf(path, len));
        for (int i = start; i < nums.length; i++) {  // 按起始下标递增扩展，保证确定性顺序
            path[len] = nums[i];
            dfs(nums, i + 1, path, len + 1, res);
        }
    }
}
