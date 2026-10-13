// Hot100 #53 最大子数组和（中等）· 动态规划
class Solution {
    public int maxSubArray(int[] nums) {
        // 核心思路：Kadane 算法，cur 记录以当前位置结尾的最大子数组和，
        // 每个元素要么单独成段，要么接在前一个最优段之后，二者取较大值。
        // 关键步骤：best 持续更新为全局最大值；全为负数时 cur 也能正确
        // 从最大元素重新开始，因此无需特判。
        // 复杂度：时间 O(n)，空间 O(1)。
        int cur = nums[0], best = nums[0];
        for (int i = 1; i < nums.length; i++) {
            cur = Math.max(nums[i], cur + nums[i]);
            best = Math.max(best, cur);
        }
        return best;
    }
}
