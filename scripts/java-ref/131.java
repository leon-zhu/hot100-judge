// Hot100 #131 分割回文串（中等）· 回溯/动态规划
import java.util.*;

class Solution {
    // 核心思路：回溯 DFS，从 start 枚举回文片段 end 并递归处理下一段。
    // 关键点：isPal 双指针判回文；递归后 path 需移除末尾恢复现场。
    // 易错点：分割到末尾时保存当前 path 的副本。
    // 时间复杂度 O(n * 2^n)，空间复杂度 O(n)。
    public String[][] partition(String s) {
        int n = s.length();
        List<String[]> res = new ArrayList<>();
        List<String> path = new ArrayList<>();
        dfs(0, n, s, path, res);
        return res.toArray(new String[0][]);
    }

    // 双指针判断 s 中 [i, j] 闭区间是否为回文串
    boolean isPal(String s, int i, int j) {
        while (i < j) {
            if (s.charAt(i) != s.charAt(j)) return false;
            i++;
            j--;
        }
        return true;
    }

    void dfs(int start, int n, String s, List<String> path, List<String[]> res) {
        if (start == n) {
            res.add(path.toArray(new String[0]));
            return;
        }
        for (int end = start; end < n; end++) {
            if (isPal(s, start, end)) {
                path.add(s.substring(start, end + 1));
                dfs(end + 1, n, s, path, res);
                path.remove(path.size() - 1);
            }
        }
    }
}
