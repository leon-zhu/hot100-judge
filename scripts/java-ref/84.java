// Hot100 #84 柱状图中最大的矩形（困难）· 单调栈
import java.util.*;

class Solution {
    // 算法思路: 单调栈。栈中存下标且高度递增, 遇到更矮的柱子时弹出并计算矩形面积。
    // 关键点: 末尾追加 0 哨兵保证所有柱子出栈; 弹出后新栈顶即左侧边界。
    // 时间复杂度 O(n), 空间复杂度 O(n)。
    public int largestRectangleArea(int[] heights) {
        int n = heights.length;
        int[] h = new int[n + 1];
        System.arraycopy(heights, 0, h, 0, n);
        h[n] = 0;                        // 末尾哨兵
        Deque<Integer> st = new ArrayDeque<>();
        st.push(-1);
        long ans = 0;
        for (int i = 0; i < h.length; i++) {
            while (st.peek() != -1 && h[st.peek()] > h[i]) {
                int idx = st.pop();
                ans = Math.max(ans, (long) h[idx] * (i - st.peek() - 1));
            }
            st.push(i);
        }
        return (int) ans;
    }
}
