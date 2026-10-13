import java.util.*;

// Hot100 #3 无重复字符的最长子串（中等）· 滑动窗口
// 滑动窗口 + 哈希表：记录每个字符最近出现的位置，遇到重复时把窗口左边界移到重复字符之后。
class Solution {
    public int lengthOfLongestSubstring(String s) {
        // TODO: 实现
        Map<Character, Integer> map = new HashMap<>();
        int left = 0, right = 0;
        int ans = 0;
        for (right = 0; right < s.length(); right++) {
            char ch = s.charAt(right);
            if (map.containsKey(ch)) {
                left = Math.max(left, map.get(ch) + 1);
            }
            ans = Math.max(ans, right - left + 1);
            map.put(ch, right);
        }
        return ans;
    }
}
