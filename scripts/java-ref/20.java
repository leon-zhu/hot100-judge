// Hot100 #20 有效的括号（简单）· 栈
import java.util.*;

class Solution {
    public boolean isValid(String s) {
        Deque<Character> st = new ArrayDeque<>();
        Map<Character, Character> pair = new HashMap<>();
        pair.put(')', '('); pair.put(']', '['); pair.put('}', '{');
        for (char c : s.toCharArray()) {
            if (pair.containsKey(c)) {
                if (st.isEmpty() || st.pop() != pair.get(c)) return false;
            } else st.push(c);
        }
        return st.isEmpty();
    }
}
