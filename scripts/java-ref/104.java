// Hot100 #104 二叉树的最大深度（简单）· 二叉树/DFS
class Solution {
    // 思路：递归计算树高，空树深度为 0，否则为左右子树最大深度加 1。
    // 易错点：递归出口必须处理空节点，叶子节点深度为 1。
    // 复杂度：时间 O(n)，空间 O(h)，h 为树高（递归栈深度）。
    public int maxDepth(TreeNode root) {
        if (root == null) return 0;
        return 1 + Math.max(maxDepth(root.left), maxDepth(root.right));
    }
}
