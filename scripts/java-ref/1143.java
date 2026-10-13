// Hot100 #1143 最长公共子序列（中等）· 动态规划
class Solution {
    // 算法思路：动态规划，dp[i][j] 表示 text1 前 i 个字符与 text2 前 j 个字符的最长公共子序列长度
    // 字符相等则 dp[i][j] = dp[i-1][j-1] + 1，否则取上方与左方的较大值
    // 易错点：下标错位，text1[i-1] 对应第 i 个字符，dp 多开一行一列
    // 时间复杂度 O(m*n)，空间复杂度 O(m*n)
    public int longestCommonSubsequence(String text1, String text2) {
        int m = text1.length(), n = text2.length();
        int[][] dp = new int[m + 1][n + 1];
        for (int i = 1; i <= m; i++) {
            for (int j = 1; j <= n; j++) {
                if (text1.charAt(i - 1) == text2.charAt(j - 1)) dp[i][j] = dp[i - 1][j - 1] + 1;
                else dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
        return dp[m][n];
    }
}
