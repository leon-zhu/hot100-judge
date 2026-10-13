// Hot100 #543 二叉树的直径（简单）· 二叉树/DFS
class Solution {
    private int best = 0;

    // 思路：后序遍历求每个节点的左右子树深度，经过该节点的最长路径为左深加右深。
    // 关键点：用全局变量 best 记录所有节点路径的最大值，直径不一定经过根节点。
    // 易错点：函数返回的是子树最大深度，路径长度只用于更新 best。
    // 复杂度：时间 O(n)，空间 O(h)，h 为树高（递归栈深度）。
    public int diameterOfBinaryTree(TreeNode root) {
        depth(root);
        return best;
    }

    private int depth(TreeNode node) {
        if (node == null) return 0;
        int l = depth(node.left);
        int r = depth(node.right);
        best = Math.max(best, l + r);  // 经过当前节点的最长路径
        return 1 + Math.max(l, r);
    }
}
