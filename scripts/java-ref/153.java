// Hot100 #153 寻找旋转排序数组中的最小值（中等）· 二分
class Solution {
    // 核心思路：与右端点比较二分，nums[mid] > nums[hi] 时最小值在右半边。
    // 易错点：循环条件 lo < hi，结束时 lo 即最小值下标。
    // 时间复杂度 O(log n)，空间复杂度 O(1)。
    public int findMin(int[] nums) {
        int lo = 0, hi = nums.length - 1;
        while (lo < hi) {
            int mid = lo + (hi - lo) / 2;
            if (nums[mid] > nums[hi]) lo = mid + 1;
            else hi = mid;
        }
        return nums[lo];
    }
}
