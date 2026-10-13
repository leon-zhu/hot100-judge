// Hot100 #239 滑动窗口最大值（困难）· 单调队列
import java.util.*;

class Solution {
    public int[] maxSlidingWindow(int[] nums, int k) {
        // 核心思路：维护单调递减队列（存下标），队首始终是当前窗口最大值。
        // 关键步骤：入队前弹出队尾所有不大于当前值的下标；滑出窗口的下标
        // （即 q.peekFirst() <= i-k）从队首弹出；i >= k-1 后每步记录一次队首值。
        // 复杂度：时间 O(n)（每个下标进出队列各一次），空间 O(k)。
        Deque<Integer> q = new ArrayDeque<>();
        int[] res = new int[nums.length - k + 1];
        int idx = 0;
        for (int i = 0; i < nums.length; i++) {
            while (!q.isEmpty() && nums[q.peekLast()] <= nums[i]) q.pollLast();
            q.offerLast(i);
            if (q.peekFirst() <= i - k) q.pollFirst();
            if (i >= k - 1) res[idx++] = nums[q.peekFirst()];
        }
        return res;
    }
}
