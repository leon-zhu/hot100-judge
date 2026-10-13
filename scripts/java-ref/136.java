// Hot100 #136 只出现一次的数字（简单）· 位运算
class Solution {
    // 算法思路：利用异或运算，相同数字异或为 0，0 与任何数异或等于它本身
    // 将所有元素异或一次，成对出现的数字相互抵消，最终结果即唯一出现一次的数字
    // 时间复杂度 O(n)，空间复杂度 O(1)
    public int singleNumber(int[] nums) {
        int x = 0;
        for (int v : nums) x ^= v;
        return x;
    }
}
