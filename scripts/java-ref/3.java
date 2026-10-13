// Hot100 #3 无重复字符的最长子串（中等）· 滑动窗口
import java.util.*;

class Solution {
    public int lengthOfLongestSubstring(String s) {
        // 核心思路：滑动窗口，右指针扩展、左指针收缩
        // last 记录字符最近一次出现的位置，重复时更新左边界
        // l 只增不减，保证窗口内始终无重复字符
        // 时间复杂度 O(n)，空间复杂度 O(字符集大小)
        Map<Character, Integer> last = new HashMap<>();
        int l = 0, ans = 0;
        for (int r = 0; r < s.length(); r++) {
            char c = s.charAt(r);
            if (last.containsKey(c)) l = Math.max(l, last.get(c) + 1);
            last.put(c, r);
            ans = Math.max(ans, r - l + 1);
        }
        return ans;
    }
}
