// Hot100 #155 最小栈（中等）· 栈/设计
import java.util.*;

class MinStack {
    // 核心思路：辅助栈 min_st 与主栈同步维护当前最小值。
    // 关键点：push 时仅当 val 不大于 min_st 栈顶才入辅助栈；
    // pop 时若栈顶等于 min_st 栈顶则同步弹出。
    // 易错点：getMin 直接返回 min_st 栈顶。
    // 时间复杂度 O(1)，空间复杂度 O(n)。
    Deque<Integer> st = new ArrayDeque<>();
    Deque<Integer> minSt = new ArrayDeque<>();

    public MinStack() {}

    public void push(int val) {
        st.push(val);
        if (minSt.isEmpty() || val <= minSt.peek()) minSt.push(val);
    }

    public void pop() {
        if (st.isEmpty()) return;
        if (st.peek().equals(minSt.peek())) minSt.pop();
        st.pop();
    }

    public int top() {
        return st.peek();
    }

    public int getMin() {
        return minSt.peek();
    }
}
