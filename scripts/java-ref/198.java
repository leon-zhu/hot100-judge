// Hot100 #198 打家劫舍（中等）· 动态规划

class Solution {
    public int rob(int[] nums) {
        // 算法思路：动态规划。rob1 为偷到当前家的最大收益，rob2 为偷到上一家的最大收益，
        // 每家的选择是偷或不偷：max(rob1, rob2 + v)。
        // 关键点：相邻两家不能同时偷，更新顺序要先保存旧 rob1 再滚动。
        // 易错点：用 long 避免累加溢出。
        // 时间复杂度 O(n)，空间复杂度 O(1)。
        long rob2 = 0, rob1 = 0;
        for (int v : nums) {
            long nxt = Math.max(rob1, rob2 + v);
            rob2 = rob1;
            rob1 = nxt;
        }
        return (int) rob1;
    }
}
