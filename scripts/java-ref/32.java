// Hot100 #32 最长有效括号（困难）· 动态规划/栈

class Solution {
    public int longestValidParentheses(String s) {
        // 算法思路：动态规划。dp[i] 表示以 s[i] 结尾的最长有效括号子串长度，
        // 仅当 s[i] 为右括号时更新，分直接配对与跨段配对两种情况。
        // 关键点：跨段配对时要加上左括号之前的 dp 值，注意下标越界判断。
        // 时间复杂度 O(n)，空间复杂度 O(n)。
        int n = s.length();
        int[] dp = new int[n];
        int res = 0;
        for (int i = 1; i < n; i++) {
            if (s.charAt(i) == ')') {
                if (s.charAt(i - 1) == '(') {
                    dp[i] = (i >= 2 ? dp[i - 2] : 0) + 2;
                } else if (i - dp[i - 1] - 1 >= 0 && s.charAt(i - dp[i - 1] - 1) == '(') {
                    dp[i] = dp[i - 1] + 2 + (i - dp[i - 1] - 2 >= 0 ? dp[i - dp[i - 1] - 2] : 0);
                }
                res = Math.max(res, dp[i]);
            }
        }
        return res;
    }
}
