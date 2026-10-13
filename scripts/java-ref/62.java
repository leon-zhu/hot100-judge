// Hot100 #62 不同路径（中等）· 动态规划
class Solution {
    // 算法思路：动态规划，dp[i][j] 表示从左上角走到 (i,j) 的路径总数
    // 转移方程 dp[i][j] = dp[i-1][j] + dp[i][j-1]，从上边或左边一步到达
    // 第一行与第一列各只有一条路径，需先初始化边界
    // 用 long 存储防止中间结果溢出，时间复杂度 O(m*n)，空间复杂度 O(m*n)
    public int uniquePaths(int m, int n) {
        long[][] dp = new long[m][n];
        for (int i = 0; i < m; i++) dp[i][0] = 1;  // 第一列只有一条路径
        for (int j = 0; j < n; j++) dp[0][j] = 1;  // 第一行只有一条路径
        for (int i = 1; i < m; i++)
            for (int j = 1; j < n; j++)
                dp[i][j] = dp[i - 1][j] + dp[i][j - 1];
        return (int) dp[m - 1][n - 1];
    }
}
