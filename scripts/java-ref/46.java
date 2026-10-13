// Hot100 #46 全排列（中等）· 回溯
import java.util.*;

class Solution {
    public int[][] permute(int[] nums) {
        // 核心思路: 回溯生成全排列，用 used 数组标记哪些下标已被选取。
        // 关键步骤: 每层按下标递增顺序尝试未用元素，递归返回后撤销选择。
        // 易错点: 撤销时必须同时弹出 path 并复位 used，保证现场完全还原。
        // 复杂度: 时间 O(n·n!)，空间 O(n) 递归栈。
        int n = nums.length;
        boolean[] used = new boolean[n];
        List<int[]> res = new ArrayList<>();
        int[] path = new int[n];
        dfs(nums, used, path, 0, res);
        return res.toArray(new int[0][]);
    }
    void dfs(int[] nums, boolean[] used, int[] path, int depth, List<int[]> res) {
        int n = nums.length;
        if (depth == n) { res.add(path.clone()); return; }
        for (int i = 0; i < n; i++) {  // 按下标递增顺序尝试，保证确定性输出
            if (used[i]) continue;
            used[i] = true;
            path[depth] = nums[i];
            dfs(nums, used, path, depth + 1, res);
            used[i] = false;
        }
    }
}
