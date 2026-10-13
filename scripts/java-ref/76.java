// Hot100 #76 最小覆盖子串（困难）· 滑动窗口
class Solution {
    public String minWindow(String s, String t) {
        // 核心思路：滑动窗口加计数。need 记录 t 中每个字符的需求次数，
        // formed 统计当前窗口内已满足出现次数的字符种类数。
        // 关键步骤：右指针扩张窗口直至 formed 达标，再收缩左指针寻找更短
        // 覆盖子串并更新最优解；移动左指针时同步回退计数。
        // 复杂度：时间 O(len(s)+len(t))，空间 O(|字符集|)。
        if (t.length() == 0) return "";
        int[] need = new int[128], have = new int[128];
        for (int i = 0; i < t.length(); i++) need[t.charAt(i)]++;
        int formed = 0, required = 0;
        for (int i = 0; i < 128; i++) if (need[i] > 0) required++;
        int left = 0, bestL = -1, bestLen = Integer.MAX_VALUE;
        for (int right = 0; right < s.length(); right++) {
            char c = s.charAt(right);
            have[c]++;
            if (need[c] > 0 && have[c] == need[c]) formed++;
            while (formed == required && left <= right) {
                if (right - left + 1 < bestLen) {
                    bestLen = right - left + 1;
                    bestL = left;
                }
                char lc = s.charAt(left);
                have[lc]--;
                if (need[lc] > 0 && have[lc] < need[lc]) formed--;
                left++;
            }
        }
        return bestL == -1 ? "" : s.substring(bestL, bestL + bestLen);
    }
}
