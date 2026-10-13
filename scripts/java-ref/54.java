// Hot100 #54 螺旋矩阵（中等）· 矩阵
import java.util.*;

class Solution {
    public int[] spiralOrder(int[][] matrix) {
        // 核心思路：用边界收缩法按上、右、下、左四条边逐圈读取元素。
        // 关键步骤：每圈走完上、右两边后检查区域是否仍有效再走下面两边，
        // 否则单行或单列场景会重复读取元素。
        // 复杂度：时间 O(mn)，空间 O(1)（不计返回数组）。
        List<Integer> r = new ArrayList<>();
        int m = matrix.length, n = matrix[0].length;
        int top = 0, bottom = m - 1, left = 0, right = n - 1;
        while (top <= bottom && left <= right) {
            for (int j = left; j <= right; j++) r.add(matrix[top][j]);
            for (int i = top + 1; i <= bottom; i++) r.add(matrix[i][right]);
            if (top < bottom) for (int j = right - 1; j >= left; j--) r.add(matrix[bottom][j]);
            if (left < right) for (int i = bottom - 1; i > top; i--) r.add(matrix[i][left]);
            top++; bottom--; left++; right--;
        }
        int[] out = new int[r.size()];
        for (int i = 0; i < r.size(); i++) out[i] = r.get(i);
        return out;
    }
}
