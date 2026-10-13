// Hot100 #416 分割等和子集（中等）· 动态规划/背包

class Solution {
    public boolean canPartition(int[] nums) {
        // 算法思路：等价于 0/1 背包。若能选出若干数凑成总和的一半 target，
        // 则剩余数自然构成另一半，即可等和分割。
        // 关键点：总和为奇数直接返回 false；内层循环倒序遍历保证每个数只用一次。
        // 易错点：总和用 long 累加防止溢出，target 再转回 int。
        // 时间复杂度 O(n * target)，空间复杂度 O(target)。
        long total = 0;
        for (int v : nums) total += v;
        if (total % 2 == 1) return false;
        int target = (int) (total / 2);
        boolean[] dp = new boolean[target + 1];
        dp[0] = true;
        for (int v : nums) {
            for (int s = target; s >= v; s--) {
                if (dp[s - v]) dp[s] = true;
            }
        }
        return dp[target];
    }
}
