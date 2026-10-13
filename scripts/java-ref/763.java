// Hot100 #763 划分字母区间（中等）· 贪心
import java.util.*;

class Solution {
    // 算法思路: 贪心。last 记录每个字母最后一次出现的下标, 扫描时扩展当前段右边界。
    // 关键点: i 到达 end 时切割一段, 记录长度后重置起点。
    // 时间复杂度 O(n), 空间复杂度 O(1) (字符集固定为 26)。
    public int[] partitionLabels(String s) {
        int[] last = new int[26];
        for (int i = 0; i < s.length(); i++) last[s.charAt(i) - 'a'] = i;
        List<Integer> list = new ArrayList<>();
        int start = 0, end = 0;
        for (int i = 0; i < s.length(); i++) {
            end = Math.max(end, last[s.charAt(i) - 'a']);
            if (i == end) {
                list.add(end - start + 1);
                start = i + 1;
            }
        }
        int[] ans = new int[list.size()];
        for (int i = 0; i < ans.length; i++) ans[i] = list.get(i);
        return ans;
    }
}
