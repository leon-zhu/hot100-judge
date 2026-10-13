// Hot100 #347 前 K 个高频元素（中等）· 堆/哈希
import java.util.*;

class Solution {
    // 算法思路: 哈希表统计频率, 按频率降序、数值升序排序后取前 k 个。
    // 关键点: 比较器先比频率再比数值, 保证输出顺序确定。
    // 时间复杂度 O(n log n), 空间复杂度 O(n)。
    public int[] topKFrequent(int[] nums, int k) {
        Map<Integer, Integer> cnt = new HashMap<>();
        for (int x : nums) cnt.put(x, cnt.getOrDefault(x, 0) + 1);
        List<Map.Entry<Integer, Integer>> items = new ArrayList<>(cnt.entrySet());
        // 按 (-频率, 数值) 排序，保证确定性顺序
        items.sort((a, b) -> {
            int cf = Integer.compare(b.getValue(), a.getValue());
            return cf != 0 ? cf : Integer.compare(a.getKey(), b.getKey());
        });
        int[] ans = new int[k];
        for (int i = 0; i < k; i++) ans[i] = items.get(i).getKey();
        return ans;
    }
}
