// Hot100 #300 最长递增子序列（中等）· 动态规划/二分

class Solution {
    public int lengthOfLIS(int[] nums) {
        // 算法思路：贪心加二分。tails[i] 记录长度为 i+1 的递增子序列的最小末尾值，
        // tails 保持严格单调递增，可用二分定位。
        // 关键点：用 x 覆盖第一个不小于 x 的位置，使末尾值尽量小；
        // 找不到则追加到尾部，此时最长长度加一。
        // 时间复杂度 O(n log n)，空间复杂度 O(n)。
        int[] tails = new int[nums.length];
        int len = 0;
        for (int x : nums) {
            int lo = 0, hi = len; // 在 [lo, hi) 中找第一个 >= x 的位置
            while (lo < hi) {
                int mid = (lo + hi) >>> 1;
                if (tails[mid] < x) lo = mid + 1;
                else hi = mid;
            }
            tails[lo] = x;
            if (lo == len) len++;
        }
        return len;
    }
}
