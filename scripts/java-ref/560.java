// Hot100 #560 和为 K 的子数组（中等）· 前缀和/哈希
import java.util.*;

class Solution {
    public int subarraySum(int[] nums, int k) {
        // 核心思路：前缀和加哈希表统计出现次数
        // 子数组和为 k 当且仅当 pre - k 在前面出现过
        // 先累加答案再更新当前前缀和计数
        // 用 long 存储前缀和防止溢出
        // 时间复杂度 O(n)，空间复杂度 O(n)
        Map<Long, Integer> cnt = new HashMap<>();
        cnt.put(0L, 1);
        long pre = 0;
        int ans = 0;
        for (int x : nums) {
            pre += x;
            ans += cnt.getOrDefault(pre - k, 0);
            cnt.put(pre, cnt.getOrDefault(pre, 0) + 1);
        }
        return ans;
    }
}
