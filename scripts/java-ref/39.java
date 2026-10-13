// Hot100 #39 组合总和（中等）· 回溯
import java.util.*;

class Solution {
    public int[][] combinationSum(int[] candidates, int target) {
        // 核心思路: 回溯加剪枝，每个数可以重复选取，用 start 限制下标只增不减。
        // 关键步骤: remain 减到 0 时记录答案，候选值大于 remain 时跳过该分支。
        // 易错点: 递归时仍传当前下标 i，才能让同一个数字被重复使用。
        // 复杂度: 最坏指数级时间，空间 O(target / min) 递归深度。
        List<int[]> res = new ArrayList<>();
        int[] path = new int[target];
        dfs(candidates, target, 0, path, 0, res);
        return res.toArray(new int[0][]);
    }
    void dfs(int[] candidates, int remain, int start, int[] path, int len, List<int[]> res) {
        if (remain == 0) { res.add(Arrays.copyOf(path, len)); return; }
        for (int i = start; i < candidates.length; i++) {  // 下标只增不减，避免重复组合
            if (candidates[i] > remain) continue;
            path[len] = candidates[i];
            dfs(candidates, remain - candidates[i], i, path, len + 1, res);
        }
    }
}
