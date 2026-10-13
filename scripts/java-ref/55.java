// Hot100 #55 跳跃游戏（中等）· 贪心
class Solution {
    // 算法思路: 贪心。reach 表示当前能到达的最远下标, 逐格更新并判断。
    // 关键点: 若 i 超过 reach 说明无法到达该格, 直接返回 false。
    // 时间复杂度 O(n), 空间复杂度 O(1)。
    public boolean canJump(int[] nums) {
        int reach = 0;
        for (int i = 0; i < nums.length; i++) {
            if (i > reach) return false;
            reach = Math.max(reach, i + nums[i]);
        }
        return true;
    }
}
