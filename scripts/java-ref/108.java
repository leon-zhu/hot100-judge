// Hot100 #108 将有序数组转换为二叉搜索树（简单）· 二叉搜索树
class Solution {
    // 思路:取区间中点建根,递归构造,树高保持 log n
    // 关键:左闭右闭区间,空区间返回空指针
    // 易错:mid 用整数除法取左中位
    // 复杂度:时间 O(n),空间 O(log n)
    public TreeNode sortedArrayToBST(int[] nums) {
        return build(nums, 0, nums.length - 1);
    }
    TreeNode build(int[] nums, int l, int r) {
        if (l > r) return null;
        int mid = (l + r) / 2;  // 取中点保持树高平衡
        TreeNode node = new TreeNode(nums[mid]);
        node.left = build(nums, l, mid - 1);
        node.right = build(nums, mid + 1, r);
        return node;
    }
}
