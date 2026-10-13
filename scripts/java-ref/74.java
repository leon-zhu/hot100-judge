// Hot100 #74 搜索二维矩阵（中等）· 二分
class Solution {
    // 核心思路：矩阵整体按一维有序数组二分，mid 映射为行列取值。
    // 易错点：mid / n 与 mid % n 完成下标转换。
    // 时间复杂度 O(log(m*n))，空间复杂度 O(1)。
    public boolean searchMatrix(int[][] matrix, int target) {
        int m = matrix.length, n = matrix[0].length;
        int lo = 0, hi = m * n - 1;
        while (lo <= hi) {
            int mid = lo + (hi - lo) / 2;
            int v = matrix[mid / n][mid % n];
            if (v == target) return true;
            if (v < target) lo = mid + 1;
            else hi = mid - 1;
        }
        return false;
    }
}
