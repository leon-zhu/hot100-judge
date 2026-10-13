// Hot100 #31 下一个排列（中等）· 数组
class Solution {
    // 算法思路：从右向左找第一个 nums[i] < nums[i+1] 的下降点 i
    // 再从右向左找第一个大于 nums[i] 的数与之交换，最后反转 i 之后区间使其升序
    // 易错点：整个序列为降序时 i 为 -1，此时直接反转整个数组
    // 时间复杂度 O(n)，空间复杂度 O(1)
    public void nextPermutation(int[] nums) {
        int n = nums.length;
        int i = n - 2;
        while (i >= 0 && nums[i] >= nums[i + 1]) i--;
        if (i >= 0) {
            int j = n - 1;
            while (j > i && nums[j] <= nums[i]) j--;
            swap(nums, i, j);
        }
        reverse(nums, i + 1, n - 1);  // 反转后缀得到下一个排列
    }

    private void swap(int[] a, int x, int y) {
        int t = a[x]; a[x] = a[y]; a[y] = t;
    }

    private void reverse(int[] a, int l, int r) {
        while (l < r) {
            int t = a[l]; a[l] = a[r]; a[r] = t;
            l++; r--;
        }
    }
}
