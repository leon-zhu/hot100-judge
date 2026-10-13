// Hot100 #4 寻找两个正序数组的中位数（困难）· 二分
class Solution {
    // 核心思路：对较短的数组二分切分点 i，使左半元素数为 (m+n+1)/2，
    // 并保证左半最大值不超过右半最小值，即可直接得到中位数。
    // 易错点：i 或 j 越界时要单独取另一数组的元素，避免访问越界。
    // 时间复杂度 O(log min(m,n))，空间复杂度 O(1)。
    public double findMedianSortedArrays(int[] nums1, int[] nums2) {
        int[] A = nums1, B = nums2;
        if (A.length > B.length) { int[] t = A; A = B; B = t; }
        int m = A.length, n = B.length;
        int lo = 0, hi = m;
        int totalLeft = (m + n + 1) / 2;
        while (lo <= hi) {
            int i = (lo + hi) / 2;
            int j = totalLeft - i;
            if (i < m && A[i] < B[j - 1]) {
                lo = i + 1;
            } else if (i > 0 && A[i - 1] > B[j]) {
                hi = i - 1;
            } else {
                int maxLeft;
                if (i == 0) maxLeft = B[j - 1];
                else if (j == 0) maxLeft = A[i - 1];
                else maxLeft = Math.max(A[i - 1], B[j - 1]);
                if ((m + n) % 2 == 1) return (double) maxLeft;
                int minRight;
                if (i == m) minRight = B[j];
                else if (j == n) minRight = A[i];
                else minRight = Math.min(A[i], B[j]);
                return (maxLeft + minRight) / 2.0;
            }
        }
        return 0.0;
    }
}
