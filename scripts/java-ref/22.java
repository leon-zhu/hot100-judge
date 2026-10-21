// Hot100 #22 括号生成（中等）· 回溯
import java.util.*;

class Solution {
    public List<String> generateParenthesis(int n) {
        // 核心思路: 回溯生成合法括号串，任何前缀的右括号数都不超过左括号数。
        // 关键步骤: openCnt 与 closeCnt 统计已放括号数，长度到 2n 时收束。
        // 易错点: 只有 closeCnt 小于 openCnt 时才允许放右括号，保证合法性。
        // 复杂度: 结果数为卡特兰数，时间 O(4^n / sqrt(n))，空间 O(n)。
        List<String> res = new ArrayList<>();
        char[] path = new char[2 * n];
        dfs(0, 0, 0, path, res);
        return res;
    }
    void dfs(int openCnt, int closeCnt, int len, char[] path, List<String> res) {
        int n = path.length / 2;
        if (len == path.length) { res.add(new String(path)); return; }
        if (openCnt < n) {  // 先放左括号，保证确定性顺序
            path[len] = '(';
            dfs(openCnt + 1, closeCnt, len + 1, path, res);
        }
        if (closeCnt < openCnt) {
            path[len] = ')';
            dfs(openCnt, closeCnt + 1, len + 1, path, res);
        }
    }
}
