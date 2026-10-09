// Hot100 #155 最小栈（中等）· 栈
import java.util.*;

class MinStack {
    Deque<Integer> st = new ArrayDeque<>();
    Deque<Integer> min = new ArrayDeque<>();
    public MinStack() {}
    public void push(int val) { st.push(val); min.push(min.isEmpty() ? val : Math.min(min.peek(), val)); }
    public void pop() { st.pop(); min.pop(); }
    public int top() { return st.peek(); }
    public int getMin() { return min.peek(); }
}
