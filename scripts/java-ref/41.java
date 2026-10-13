// Hot100 #41 缺失的第一个正数（困难）· 数组/原地哈希
class Solution {
    public int firstMissingPositive(int[] nums) {
        // 核心思路：原地哈希，把值 x（1<=x<=n）放到下标 x-1 处，
        // 使 nums[i] == i+1，缺失的最小正整数即可按下标判断。
        // 关键步骤：while 反复交换直到目标就位或越界；最后找第一个
        // nums[i] != i+1 的位置，若全部就位则答案是 n+1。
        // 复杂度：时间 O(n)，空间 O(1)。
        int n = nums.length;
        for (int i = 0; i < n; i++) {
            while (nums[i] >= 1 && nums[i] <= n && nums[nums[i] - 1] != nums[i]) {
                int idx = nums[i] - 1;
                int t = nums[i]; nums[i] = nums[idx]; nums[idx] = t;
            }
        }
        for (int i = 0; i < n; i++) {
            if (nums[i] != i + 1) return i + 1;
        }
        return n + 1;
    }
}
