// Hot100 #437 路径总和 III（中等）· 二叉树/前缀和
import java.util.*;

class Solution {
    // 思路:前缀和哈希,统计根到当前节点的路径中和为 target 的数量
    // 关键:pre 记录前缀和出现次数,累加 pre[cur - target]
    // 易错:回溯时 pre[cur] 自减;用 long 防溢出
    // 复杂度:时间 O(n),空间 O(h),h 为树高
    Map<Long, Integer> pre = new HashMap<>();
    int targetSum;
    int ans;

    public int pathSum(TreeNode root, int targetSum) {
        pre.clear();
        pre.put(0L, 1);
        ans = 0;
        this.targetSum = targetSum;
        dfs(root, 0L);
        return ans;
    }
    void dfs(TreeNode node, long cur) {
        if (node == null) return;
        cur += node.val;
        ans += pre.getOrDefault(cur - targetSum, 0);  // 累加以当前节点为终点的合法路径数
        pre.put(cur, pre.getOrDefault(cur, 0) + 1);
        dfs(node.left, cur);
        dfs(node.right, cur);
        pre.put(cur, pre.get(cur) - 1);
    }
}
