// Hot100 #48 旋转图像（中等）· 矩阵
class Solution {
    public void rotate(int[][] matrix) {
        // 核心思路：先沿主对角线转置，再逐行反转，两步合成顺时针旋转 90 度。
        // 关键步骤：转置时内层循环从 i+1 开始，避免对角元素被重复交换；
        // 反转必须对每一行整体进行，两步顺序不能颠倒。
        // 复杂度：时间 O(n^2)，空间 O(1)。
        int n = matrix.length;
        for (int i = 0; i < n; i++)
            for (int j = i + 1; j < n; j++) { int t = matrix[i][j]; matrix[i][j] = matrix[j][i]; matrix[j][i] = t; }
        for (int i = 0; i < n; i++)
            for (int l = 0, r = n - 1; l < r; l++, r--) { int t = matrix[i][l]; matrix[i][l] = matrix[i][r]; matrix[i][r] = t; }
    }
}
