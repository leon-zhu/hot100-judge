// Hot100 #139 单词拆分（中等）· 动态规划
import java.util.*;

class Solution {
    public boolean wordBreak(String s, List<String> wordDict) {
        // 算法思路：动态规划。dp[i] 表示 s 的前 i 个字符能否由字典单词拼接，
        // 转移时枚举最后一段的起点 j，要求 dp[j] 为真且子串在字典中。
        // 关键点：字典转 HashSet 加速查找；用 max_len 剪枝枚举范围。
        // 易错点：dp[0] 必须初始化为 true，表示空前缀可拼接。
        // 时间复杂度 O(n*max_len)，空间复杂度 O(n)。
        Set<String> words = new HashSet<>();
        int max_len = 0;
        for (String w : wordDict) {
            words.add(w);
            max_len = Math.max(max_len, w.length());
        }
        int n = s.length();
        boolean[] dp = new boolean[n + 1];
        dp[0] = true;
        for (int i = 1; i <= n; i++) {
            for (int j = Math.max(0, i - max_len); j < i; j++) {
                if (dp[j] && words.contains(s.substring(j, i))) {
                    dp[i] = true;
                    break;
                }
            }
        }
        return dp[n];
    }
}
