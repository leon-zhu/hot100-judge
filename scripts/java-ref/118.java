// Hot100 #118 杨辉三角（简单）· 动态规划
import java.util.*;

class Solution {
    public List<List<Integer>> generate(int numRows) {
        // 算法思路：逐行构造杨辉三角。每行两端为 1，
        // 中间元素等于上一行相邻两数之和。
        // 关键点：先整行初始化为 1，再只更新中间元素，避免覆盖两端。
        // 易错点：中间元素下标范围是 1 到 r-1。
        // 时间复杂度 O(numRows^2)，空间复杂度 O(numRows^2)。
        List<List<Integer>> res = new ArrayList<>();
        for (int r = 0; r < numRows; r++) {
            List<Integer> row = new ArrayList<>();
            for (int i = 0; i <= r; i++) {
                if (i == 0 || i == r) row.add(1);
                else row.add(res.get(r - 1).get(i - 1) + res.get(r - 1).get(i));
            }
            res.add(row);
        }
        return res;
    }
}
