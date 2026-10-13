// Hot100 #394 字符串解码（中等）· 栈
import java.util.*;

class Solution {
    // 算法思路: 栈模拟解码。遇到 [ 把当前字符串与重复次数压栈, 遇到 ] 弹出并按次数拼接。
    // 关键点: 数字可能多位需累加; 嵌套结构靠栈的先进后出还原。
    // 时间复杂度 O(解码后字符串长度), 空间复杂度 O(解码后字符串长度)。
    public String decodeString(String s) {
        Deque<String> strStack = new ArrayDeque<>();   // 存之前的字符串
        Deque<Integer> numStack = new ArrayDeque<>();  // 存重复次数
        StringBuilder cur = new StringBuilder();
        int num = 0;
        for (char ch : s.toCharArray()) {
            if (ch >= '0' && ch <= '9') {
                num = num * 10 + (ch - '0');            // 数字可能多位
            } else if (ch == '[') {
                strStack.push(cur.toString());
                numStack.push(num);
                cur.setLength(0);
                num = 0;
            } else if (ch == ']') {
                String pre = strStack.pop();
                int cnt = numStack.pop();
                String tmp = cur.toString();
                for (int i = 1; i < cnt; i++) cur.append(tmp);
                cur.insert(0, pre);
            } else {
                cur.append(ch);
            }
        }
        return cur.toString();
    }
}
