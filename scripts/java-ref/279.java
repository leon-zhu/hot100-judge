// Hot100 #279 完全平方数（中等）· 动态规划
import java.util.*;

class Solution {
    public int numSquares(int n) {
        // 算法思路：动态规划。dp[i] 表示凑成整数 i 所需的最少完全平方数个数，
        // 转移方程 dp[i] = min(dp[i - j*j] + 1)，其中 j*j <= i。
        // 关键点：完全平方数可重复使用，等价于完全背包；
        // dp[0] 初始化为 0，其余初始化为大数表示不可达。
        // 时间复杂度 O(n*sqrt(n))，空间复杂度 O(n)。
        int INF = Integer.MAX_VALUE / 2;
        int[] dp = new int[n + 1];
        Arrays.fill(dp, INF);
        dp[0] = 0;
        for (int i = 1; i <= n; i++) {
            for (int j = 1; j * j <= i; j++) {
                dp[i] = Math.min(dp[i], dp[i - j * j] + 1);
            }
        }
        return dp[n];
    }
}
