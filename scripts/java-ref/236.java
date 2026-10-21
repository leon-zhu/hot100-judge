// Hot100 #236 二叉树的最近公共祖先（中等）· 二叉树
class Solution {
    // 思路:后序遍历查找 p 与 q,汇聚点即最近公共祖先
    // 关键:左右子树都非空时返回当前节点
    // 易错:目标节点本身就是祖先,命中即返回
    // 复杂度:时间 O(n),空间 O(h),h 为树高
    public TreeNode lowestCommonAncestor(TreeNode root, TreeNode p, TreeNode q) {
        return lca(root, p, q);
    }
    TreeNode lca(TreeNode node, TreeNode p, TreeNode q) {
        if (node == null || node == p || node == q) return node;
        TreeNode l = lca(node.left, p, q);
        TreeNode r = lca(node.right, p, q);
        if (l != null && r != null) return node;  // 两侧都命中目标,当前节点是最近公共祖先
        return l != null ? l : r;
    }
}
