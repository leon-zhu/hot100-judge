// Hot100 #34 在排序数组中查找元素的第一个和最后一个位置（中等）· 二分
class Solution {
    // 核心思路：两次二分，lower 求第一个 >= target 的下标，
    // upper 求第一个 > target 的下标，答案即 [lower, upper-1]。
    // 易错点：lower 越界或指向元素不等于 target 时返回 [-1, -1]。
    // 时间复杂度 O(log n)，空间复杂度 O(1)。
    public int[] searchRange(int[] nums, int target) {
        int l = lowerBound(nums, target);
        if (l == nums.length || nums[l] != target) return new int[] {-1, -1};
        int r = upperBound(nums, target) - 1;
        return new int[] {l, r};
    }

    // 第一个 >= target 的位置
    int lowerBound(int[] nums, int target) {
        int lo = 0, hi = nums.length;
        while (lo < hi) {
            int mid = lo + (hi - lo) / 2;
            if (nums[mid] < target) lo = mid + 1;
            else hi = mid;
        }
        return lo;
    }

    // 第一个 > target 的位置
    int upperBound(int[] nums, int target) {
        int lo = 0, hi = nums.length;
        while (lo < hi) {
            int mid = lo + (hi - lo) / 2;
            if (nums[mid] <= target) lo = mid + 1;
            else hi = mid;
        }
        return lo;
    }
}
