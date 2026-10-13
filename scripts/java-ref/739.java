// Hot100 #739 每日温度（中等）· 单调栈
import java.util.*;

class Solution {
    // 算法思路: 单调栈。从右向左遍历, 栈存下标且温度严格递减。
    // 关键点: 弹出所有不大于当前温度的下标, 栈顶即右侧第一个更高温度的位置。
    // 时间复杂度 O(n), 空间复杂度 O(n)。
    public int[] dailyTemperatures(int[] temperatures) {
        int n = temperatures.length;
        int[] ans = new int[n];
        Deque<Integer> st = new ArrayDeque<>();   // 单调递减栈，存下标
        for (int i = n - 1; i >= 0; i--) {
            while (!st.isEmpty() && temperatures[st.peek()] <= temperatures[i]) st.pop();
            if (!st.isEmpty()) ans[i] = st.peek() - i;
            st.push(i);
        }
        return ans;
    }
}
