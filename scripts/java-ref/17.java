// Hot100 #17 电话号码的字母组合（中等）· 回溯
import java.util.*;

class Solution {
    public List<String> letterCombinations(String digits) {
        // 核心思路: 回溯枚举，每个数字从按键字母表选一个字符，拼接出所有组合。
        // 关键步骤: i 表示当前位，path 记录已选字母，递归后恢复现场。
        // 易错点: 空输入直接返回空列表，字符映射需覆盖数字 2 到 9。
        // 复杂度: 时间 O(4^n·n)，空间 O(n) 递归栈。
        List<String> res = new ArrayList<>();
        if (digits.length() == 0) return res;
        String[] map = {"", "", "abc", "def", "ghi", "jkl", "mno", "pqrs", "tuv", "wxyz"};
        char[] path = new char[digits.length()];
        dfs(digits, map, 0, path, res);
        return res;
    }
    void dfs(String digits, String[] map, int i, char[] path, List<String> res) {
        if (i == digits.length()) { res.add(new String(path)); return; }
        for (char ch : map[digits.charAt(i) - '0'].toCharArray()) {  // 按按键字母表顺序，保证确定性输出
            path[i] = ch;
            dfs(digits, map, i + 1, path, res);
        }
    }
}
