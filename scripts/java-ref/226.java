// Hot100 #226 翻转二叉树（简单）· 二叉树
class Solution {
    // 思路：自顶向下递归，先交换当前节点的左右子树，再递归处理左右子树。
    // 易错点：空节点直接返回，交换与递归的顺序不影响结果。
    // 复杂度：时间 O(n)，空间 O(h)，h 为树高（递归栈深度）。
    public TreeNode invertTree(TreeNode root) {
        if (root == null) return null;
        // 交换左右子树
        TreeNode tmp = root.left;
        root.left = root.right;
        root.right = tmp;
        invertTree(root.left);
        invertTree(root.right);
        return root;
    }
}
