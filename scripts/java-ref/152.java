// Hot100 #152 乘积最大子数组（中等）· 动态规划

class Solution {
    public int maxProduct(int[] nums) {
        // 算法思路：动态规划。同时维护以当前元素结尾的最大乘积 cur_max 与
        // 最小乘积 cur_min，负数会反转大小关系，需要两个状态（负负得正）。
        // 关键点：遇到负数先交换两个状态再更新；每个元素可单独成子数组。
        // 易错点：中间乘积可能溢出 int，用 long 计算后转回 int。
        // 时间复杂度 O(n)，空间复杂度 O(1)。
        long cur_max = nums[0], cur_min = nums[0], best = nums[0];
        for (int i = 1; i < nums.length; i++) {
            long v = nums[i];
            if (v < 0) { // 负数反转大小关系
                long t = cur_max;
                cur_max = cur_min;
                cur_min = t;
            }
            cur_max = Math.max(v, cur_max * v);
            cur_min = Math.min(v, cur_min * v);
            best = Math.max(best, cur_max);
        }
        return (int) best;
    }
}
