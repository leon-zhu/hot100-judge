// Hot100 #322 零钱兑换（中等）· 动态规划
import java.util.*;

class Solution {
    public int coinChange(int[] coins, int amount) {
        // 算法思路：完全背包动态规划。dp[i] 表示凑成金额 i 所需的最少硬币数，
        // 转移方程 dp[i] = min(dp[i - c] + 1)，硬币可重复使用。
        // 关键点：dp[0] 初始化为 0，其余初始化为 INF 表示不可达；
        // 返回前判断 dp[amount] 是否仍为 INF，是则返回 -1。
        // 时间复杂度 O(amount * 硬币种类数)，空间复杂度 O(amount)。
        int INF = Integer.MAX_VALUE / 2;
        int[] dp = new int[amount + 1];
        Arrays.fill(dp, INF);
        dp[0] = 0;
        for (int i = 1; i <= amount; i++) {
            for (int c : coins) {
                if (c <= i) dp[i] = Math.min(dp[i], dp[i - c] + 1);
            }
        }
        return dp[amount] >= INF ? -1 : dp[amount];
    }
}
