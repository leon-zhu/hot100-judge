// Hot100 #128 最长连续序列（中等）· 哈希/数组
import java.util.*;

class Solution {
    public int longestConsecutive(int[] nums) {
        // 核心思路：哈希集合去重，支持 O(1) 判断相邻数是否存在
        // 仅从每个连续序列的最小值开始向后延伸统计
        // 时间复杂度 O(n)，空间复杂度 O(n)
        Set<Integer> s = new HashSet<>();
        for (int x : nums) s.add(x);
        int best = 0;
        for (int x : s) {
            if (s.contains(x - 1)) continue;
            int cur = x, len = 1;
            while (s.contains(cur + 1)) { cur++; len++; }
            best = Math.max(best, len);
        }
        return best;
    }
}
