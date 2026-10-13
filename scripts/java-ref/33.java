// Hot100 #33 搜索旋转排序数组（中等）· 二分
class Solution {
    // 核心思路：旋转数组二分，每次循环至少有一半是有序的，
    // 先判断 target 是否落在有序半边再决定向哪边收缩。
    // 易错点：左半有序的判断条件是 nums[lo] <= nums[mid]。
    // 时间复杂度 O(log n)，空间复杂度 O(1)。
    public int search(int[] nums, int target) {
        int lo = 0, hi = nums.length - 1;
        while (lo <= hi) {
            int mid = lo + (hi - lo) / 2;
            if (nums[mid] == target) return mid;
            if (nums[lo] <= nums[mid]) { // 左半有序
                if (nums[lo] <= target && target < nums[mid]) hi = mid - 1;
                else lo = mid + 1;
            } else { // 右半有序
                if (nums[mid] < target && target <= nums[hi]) lo = mid + 1;
                else hi = mid - 1;
            }
        }
        return -1;
    }
}
