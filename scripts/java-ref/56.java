// Hot100 #56 合并区间（中等）· 排序/区间
import java.util.*;

class Solution {
    public int[][] merge(int[][] intervals) {
        // 核心思路：先按左端点排序，使可能重叠的区间必然相邻，再线性扫描合并。
        // 关键步骤：当前区间左端点不超过结果末尾区间的右端点时合并，并把右端点
        // 更新为两者较大值；否则作为新区间直接加入结果。
        // 复杂度：时间 O(n log n)（排序主导），空间 O(n)。
        Arrays.sort(intervals, (a, b) -> a[0] - b[0]);
        List<int[]> res = new ArrayList<>();
        for (int[] p : intervals) {
            if (!res.isEmpty() && p[0] <= res.get(res.size() - 1)[1])
                res.get(res.size() - 1)[1] = Math.max(res.get(res.size() - 1)[1], p[1]);
            else
                res.add(p);
        }
        return res.toArray(new int[0][]);
    }
}
