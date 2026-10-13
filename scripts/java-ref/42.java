// Hot100 #42 接雨水（困难）· 双指针/栈
class Solution {
    public int trap(int[] height) {
        // 核心思路：某位置存水量取决于左右最高柱的较小者
        // 双指针从两端向中间推进，同时维护两侧最大值
        // 结算较矮一侧的水量，避免额外的前后缀数组
        // 时间复杂度 O(n)，空间复杂度 O(1)
        int n = height.length;
        int l = 0, r = n - 1, lmax = 0, rmax = 0;
        long ans = 0;
        while (l <= r) {
            if (lmax <= rmax) {
                lmax = Math.max(lmax, height[l]);
                ans += lmax - height[l];
                l++;
            } else {
                rmax = Math.max(rmax, height[r]);
                ans += rmax - height[r];
                r--;
            }
        }
        return (int) ans;
    }
}
