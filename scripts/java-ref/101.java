// Hot100 #101 对称二叉树（简单）· 二叉树
class Solution {
    // 思路：递归判断两棵子树是否互为镜像，即值相等且 a 的左对 b 的右、a 的右对 b 的左。
    // 关键点：初始对 root 与 root 自身调用 check，统一处理根节点。
    // 易错点：两个节点都为空才是真；只有一个为空则为假。
    // 复杂度：时间 O(n)，空间 O(h)，h 为树高（递归栈深度）。
    public boolean isSymmetric(TreeNode root) {
        return check(root, root);
    }

    // 两棵子树互为镜像：a 的左对 b 的右，a 的右对 b 的左
    private boolean check(TreeNode a, TreeNode b) {
        if (a == null && b == null) return true;
        if (a == null || b == null) return false;
        return a.val == b.val && check(a.left, b.right) && check(a.right, b.left);
    }
}
