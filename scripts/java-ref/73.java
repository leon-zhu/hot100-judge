// Hot100 #73 矩阵置零（中等）· 矩阵
class Solution {
    public void setZeroes(int[][] matrix) {
        // 核心思路：用第一行和第一列充当标记数组，实现 O(1) 额外空间。
        // 关键步骤：先单独记录第一行、第一列本身是否含 0；再用第一行第一列的
        // 标记把内部元素置零；最后根据记录单独处理第一行第一列，避免标记被覆盖。
        // 复杂度：时间 O(mn)，空间 O(1)。
        int m = matrix.length, n = matrix[0].length;
        boolean firstRow = false, firstCol = false;
        for (int j = 0; j < n; j++) if (matrix[0][j] == 0) firstRow = true;
        for (int i = 0; i < m; i++) if (matrix[i][0] == 0) firstCol = true;
        for (int i = 1; i < m; i++)
            for (int j = 1; j < n; j++)
                if (matrix[i][j] == 0) { matrix[i][0] = 0; matrix[0][j] = 0; }
        for (int i = 1; i < m; i++)
            for (int j = 1; j < n; j++)
                if (matrix[i][0] == 0 || matrix[0][j] == 0) matrix[i][j] = 0;
        if (firstRow) for (int j = 0; j < n; j++) matrix[0][j] = 0;
        if (firstCol) for (int i = 0; i < m; i++) matrix[i][0] = 0;
    }
}
