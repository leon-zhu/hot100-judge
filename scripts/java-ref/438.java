// Hot100 #438 找到字符串中所有字母异位词（中等）· 滑动窗口
import java.util.*;

class Solution {
    public int[] findAnagrams(String s, String p) {
        // 核心思路：定长滑动窗口加 26 长度计数数组
        // need 为 p 的字符频次，win 为窗口内的字符频次
        // 窗口右端进一个字符、左端出一个字符，保持长度不变
        // 频次完全相等时记录窗口起点下标
        // 时间复杂度 O(n)，空间复杂度 O(1)
        if (s.length() < p.length()) return new int[0];
        int[] need = new int[26];
        int[] win = new int[26];
        for (int i = 0; i < p.length(); i++) need[p.charAt(i) - 'a']++;
        int m = p.length();
        List<Integer> res = new ArrayList<>();
        for (int i = 0; i < s.length(); i++) {
            win[s.charAt(i) - 'a']++;
            if (i >= m) win[s.charAt(i - m) - 'a']--;
            if (i >= m - 1 && Arrays.equals(win, need)) res.add(i - m + 1);
        }
        int[] out = new int[res.size()];
        for (int i = 0; i < res.size(); i++) out[i] = res.get(i);
        return out;
    }
}
