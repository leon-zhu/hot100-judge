// Hot100 #72 编辑距离（中等）· 动态规划
class Solution {
    // 算法思路：动态规划，dp[i][j] 表示 word1 前 i 个字符转换为 word2 前 j 个字符的最少操作数
    // 字符相等则继承 dp[i-1][j-1]，否则取插入、删除、替换的最小值再加一
    // 边界：dp[i][0]=i 表示删除 i 个字符，dp[0][j]=j 表示插入 j 个字符
    // 时间复杂度 O(m*n)，空间复杂度 O(m*n)
    public int minDistance(String word1, String word2) {
        int m = word1.length(), n = word2.length();
        int[][] dp = new int[m + 1][n + 1];
        for (int i = 0; i <= m; i++) dp[i][0] = i;
        for (int j = 0; j <= n; j++) dp[0][j] = j;
        for (int i = 1; i <= m; i++) {
            for (int j = 1; j <= n; j++) {
                if (word1.charAt(i - 1) == word2.charAt(j - 1)) dp[i][j] = dp[i - 1][j - 1];
                else dp[i][j] = Math.min(dp[i - 1][j], Math.min(dp[i][j - 1], dp[i - 1][j - 1])) + 1;
            }
        }
        return dp[m][n];
    }
}
