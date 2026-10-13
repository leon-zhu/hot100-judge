// Hot100 #20 有效的括号（简单）· 栈
import java.util.*;

class Solution {
    // 核心思路：栈加映射表做括号匹配，右括号与栈顶左括号匹配则弹出。
    // 易错点：栈空遇右括号直接返回 false，最后要求栈为空。
    // 时间复杂度 O(n)，空间复杂度 O(n)。
    public boolean isValid(String s) {
        Deque<Character> st = new ArrayDeque<>();
        Map<Character, Character> pairs = new HashMap<>();
        pairs.put(')', '('); pairs.put(']', '['); pairs.put('}', '{');
        for (char ch : s.toCharArray()) {
            if (pairs.containsKey(ch)) {
                if (st.isEmpty() || st.pop() != pairs.get(ch)) return false;
            } else st.push(ch);
        }
        return st.isEmpty();
    }
}
