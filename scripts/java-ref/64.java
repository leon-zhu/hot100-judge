// Hot100 #64 最小路径和（中等）· 动态规划
class Solution {
    // 算法思路：动态规划，dp[i][j] 表示到达 (i,j) 时的最小路径和
    // 转移方程 dp[i][j] = min(dp[i-1][j], dp[i][j-1]) + grid[i][j]
    // 第一行与第一列路径唯一，需先初始化边界
    // 时间复杂度 O(m*n)，空间复杂度 O(m*n)
    public int minPathSum(int[][] grid) {
        int m = grid.length, n = grid[0].length;
        int[][] dp = new int[m][n];
        dp[0][0] = grid[0][0];
        for (int j = 1; j < n; j++) dp[0][j] = dp[0][j - 1] + grid[0][j];  // 第一行只能从左累加
        for (int i = 1; i < m; i++) dp[i][0] = dp[i - 1][0] + grid[i][0];  // 第一列只能从上累加
        for (int i = 1; i < m; i++)
            for (int j = 1; j < n; j++)
                dp[i][j] = Math.min(dp[i - 1][j], dp[i][j - 1]) + grid[i][j];
        return dp[m - 1][n - 1];
    }
}
