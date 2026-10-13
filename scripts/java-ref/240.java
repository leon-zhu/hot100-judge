// Hot100 #240 搜索二维矩阵 II（中等）· 矩阵/二分
class Solution {
    public boolean searchMatrix(int[][] matrix, int target) {
        // ① 算法核心思路：矩阵按行、按列均递增，从右上角出发做 Z 字搜索，每次排除一整行或一整列
        // ② 关键步骤与易错点：先判空 matrix 与 matrix[0]；当前值大于 target 左移一列，小于 target 下移一行
        // ③ 时间复杂度 O(m + n)，空间复杂度 O(1)
        if (matrix == null || matrix.length == 0 || matrix[0].length == 0) return false;
        int m = matrix.length, n = matrix[0].length;
        int r = 0, c = n - 1;
        while (r < m && c >= 0) {
            if (matrix[r][c] == target) return true;
            if (matrix[r][c] > target) c--;
            else r++;
        }
        return false;
    }
}
