// Hot100 #118 杨辉三角（简单）· 动态规划
import java.util.*;

class Solution {
    public int[][] generate(int numRows) {
        // 算法思路：逐行构造杨辉三角。每行两端为 1，
        // 中间元素等于上一行相邻两数之和。
        // 关键点：先整行初始化为 1，再只更新中间元素，避免覆盖两端。
        // 易错点：中间元素下标范围是 1 到 r-1。
        // 时间复杂度 O(numRows^2)，空间复杂度 O(numRows^2)。
        int[][] res = new int[numRows][];
        for (int r = 0; r < numRows; r++) {
            int[] row = new int[r + 1];
            Arrays.fill(row, 1);
            for (int i = 1; i < r; i++) row[i] = res[r - 1][i - 1] + res[r - 1][i];
            res[r] = row;
        }
        return res;
    }
}
