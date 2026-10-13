// Hot100 #35 搜索插入位置（简单）· 二分
class Solution {
    // 核心思路：二分查找第一个 >= target 的位置即插入下标。
    // 易错点：hi 初始为 nums.length，左闭右开写法，循环条件 lo < hi。
    // 时间复杂度 O(log n)，空间复杂度 O(1)。
    public int searchInsert(int[] nums, int target) {
        int lo = 0, hi = nums.length;
        while (lo < hi) {
            int mid = lo + (hi - lo) / 2;
            if (nums[mid] < target) lo = mid + 1;
            else hi = mid;
        }
        return lo;
    }
}
