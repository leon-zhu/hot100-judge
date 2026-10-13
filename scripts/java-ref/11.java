// Hot100 #11 盛最多水的容器（中等）· 双指针
class Solution {
    public int maxArea(int[] height) {
        // 核心思路：左右指针从两端相向移动
        // 面积等于较短边乘以宽度，移动较短边才有机会变大
        // 用 long 计算面积防止宽度乘高度溢出
        // 时间复杂度 O(n)，空间复杂度 O(1)
        int l = 0, r = height.length - 1;
        long ans = 0;
        while (l < r) {
            ans = Math.max(ans, (long) Math.min(height[l], height[r]) * (r - l));
            if (height[l] < height[r]) l++;
            else r--;
        }
        return (int) ans;
    }
}
