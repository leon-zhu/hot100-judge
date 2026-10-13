// Hot100 #215 数组中的第 K 个最大元素（中等）· 堆/快选
import java.util.*;

class Solution {
    // 算法思路: 小根堆。堆中始终保存最大的 k 个元素, 堆顶即第 k 大。
    // 关键点: 新元素大于堆顶时才弹出并入堆, 保证堆容量恒为 k。
    // 时间复杂度 O(n log k), 空间复杂度 O(k)。
    public int findKthLargest(int[] nums, int k) {
        PriorityQueue<Integer> pq = new PriorityQueue<>();  // 大小为 k 的小根堆
        for (int i = 0; i < k; i++) pq.add(nums[i]);
        for (int i = k; i < nums.length; i++) {
            if (nums[i] > pq.peek()) { pq.poll(); pq.add(nums[i]); }
        }
        return pq.peek();
    }
}
