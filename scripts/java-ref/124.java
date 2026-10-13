// Hot100 #124 二叉树中的最大路径和（困难）· 二叉树/DFS
class Solution {
    // 思路:后序遍历,统计经过每个节点的最大路径和
    // 关键:左右子树贡献先与 0 取大,再更新全局答案
    // 易错:ans 初始化为 Integer.MIN_VALUE,防止全负节点
    // 复杂度:时间 O(n),空间 O(h),h 为树高
    int ans;

    public int maxPathSum(TreeNode root) {
        ans = Integer.MIN_VALUE;
        dfs(root);
        return ans;
    }
    int dfs(TreeNode node) {
        if (node == null) return 0;
        int l = Math.max(0, dfs(node.left));
        int r = Math.max(0, dfs(node.right));
        ans = Math.max(ans, l + r + node.val);  // 更新经过当前节点的最大路径和
        return Math.max(l, r) + node.val;
    }
}
