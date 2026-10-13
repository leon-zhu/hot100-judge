// Hot100 #75 颜色分类（中等）· 双指针/排序
class Solution {
    // 算法思路：荷兰国旗问题，用三指针原地对 0、1、2 排序
    // i 指向 0 区域的右边界，k 指向 2 区域的左边界，j 为当前扫描指针
    // 易错点：与 2 交换后 j 不前进，换来的元素还需再次判断
    // 时间复杂度 O(n)，空间复杂度 O(1)
    public void sortColors(int[] nums) {
        int i = 0, j = 0, k = nums.length - 1;
        while (j <= k) {
            if (nums[j] == 0) { swap(nums, i, j); i++; j++; }
            else if (nums[j] == 2) { swap(nums, j, k); k--; }
            else j++;
        }
    }

    private void swap(int[] a, int x, int y) {
        int t = a[x]; a[x] = a[y]; a[y] = t;
    }
}
