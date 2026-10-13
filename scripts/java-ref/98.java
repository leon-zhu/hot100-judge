// Hot100 #98 验证二叉搜索树（中等）· 二叉搜索树
class Solution {
    // 思路:前序限界检查,节点值必须落在 (lo, hi) 开区间
    // 关键:左子树收紧上界,右子树收紧下界,递归传递
    // 易错:用 long 存边界,避免 int 极值误判
    // 复杂度:时间 O(n),空间 O(h),h 为树高
    public boolean isValidBST(TreeNode root) {
        return check(root, Long.MIN_VALUE, Long.MAX_VALUE);
    }
    boolean check(TreeNode node, long lo, long hi) {
        if (node == null) return true;
        if (!(lo < node.val && node.val < hi)) return false;  // 值域越界即非法
        return check(node.left, lo, node.val) && check(node.right, node.val, hi);
    }
}
