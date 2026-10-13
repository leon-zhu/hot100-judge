// Hot100 #283 移动零（简单）· 数组/双指针
class Solution {
    public void moveZeroes(int[] nums) {
        // 核心思路：双指针，j 指向下一个非零元素应落的位置
        // 遇到非零元素就与 j 交换，零自然被推到数组尾部
        // 时间复杂度 O(n)，空间复杂度 O(1)
        int j = 0;
        for (int i = 0; i < nums.length; i++) {
            if (nums[i] != 0) {
                int t = nums[i]; nums[i] = nums[j]; nums[j] = t;
                j++;
            }
        }
    }
}
