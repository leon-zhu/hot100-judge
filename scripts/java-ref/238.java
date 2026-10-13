// Hot100 #238 除自身以外数组的乘积（中等）· 前缀积
class Solution {
    public int[] productExceptSelf(int[] nums) {
        // 核心思路：两趟扫描——先从左到右累乘前缀积，再从右到左累乘后缀积，
        // res[i] 最终为除 nums[i] 外所有元素的乘积，全程不使用除法。
        // 关键步骤：前缀趟先赋值再累乘，后缀趟先累乘再乘入结果；
        // 不依赖除法，因此输入含 0 时同样正确。
        // 复杂度：时间 O(n)，空间 O(1)（不计返回数组）。
        int n = nums.length;
        int[] res = new int[n];
        int prefix = 1;
        for (int i = 0; i < n; i++) { res[i] = prefix; prefix *= nums[i]; }
        int suffix = 1;
        for (int i = n - 1; i >= 0; i--) { res[i] *= suffix; suffix *= nums[i]; }
        return res;
    }
}
