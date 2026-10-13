// Hot100 #5 最长回文子串（中等）· 动态规划/字符串
class Solution {
    // 算法思路：中心扩展法，以每个位置为回文中心向两侧扩散
    // 奇数长度回文中心为单个字符，偶数长度回文中心为相邻两个字符
    // 易错点：扩展停止后 l、r 越界，回文长度为 r-l-1，起点为 l+1
    // 时间复杂度 O(n^2)，空间复杂度 O(1)
    public String longestPalindrome(String s) {
        int n = s.length();
        String best = "";
        for (int i = 0; i < n; i++) {
            int l = i, r = i;  // 奇数长度回文中心
            while (l >= 0 && r < n && s.charAt(l) == s.charAt(r)) { l--; r++; }
            if (r - l - 1 > best.length()) best = s.substring(l + 1, r);
            l = i; r = i + 1;  // 偶数长度回文中心
            while (l >= 0 && r < n && s.charAt(l) == s.charAt(r)) { l--; r++; }
            if (r - l - 1 > best.length()) best = s.substring(l + 1, r);
        }
        return best;
    }
}
