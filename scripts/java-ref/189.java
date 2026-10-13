// Hot100 #189 轮转数组（中等）· 数组
class Solution {
    public void rotate(int[] nums, int k) {
        // 核心思路：三次翻转实现右移 k 位——先整体反转，再反转前 k 段
        // 与后 n-k 段，等价于把末尾 k 个元素搬到数组头部。
        // 关键步骤：先对 k 取模 n，避免 k 大于数组长度时越界或多余翻转。
        // 复杂度：时间 O(n)，空间 O(1)。
        int n = nums.length;
        if (n == 0) return;
        k %= n;
        rev(nums, 0, n - 1);
        rev(nums, 0, k - 1);
        rev(nums, k, n - 1);
    }
    private void rev(int[] a, int l, int r) {
        while (l < r) { int t = a[l]; a[l] = a[r]; a[r] = t; l++; r--; }
    }
}
