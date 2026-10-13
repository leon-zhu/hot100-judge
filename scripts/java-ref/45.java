// Hot100 #45 跳跃游戏 II（中等）· 贪心
class Solution {
    // 算法思路: 贪心。curEnd 是当前这一跳的边界, farthest 记录遍历中可达的最远下标。
    // 关键点: 只遍历到倒数第二格; 到达 curEnd 时跳数加一, 并将边界更新为 farthest。
    // 时间复杂度 O(n), 空间复杂度 O(1)。
    public int jump(int[] nums) {
        int n = nums.length;
        if (n <= 1) return 0;
        int jumps = 0, curEnd = 0, farthest = 0;
        for (int i = 0; i < n - 1; i++) {
            farthest = Math.max(farthest, i + nums[i]);
            if (i == curEnd) {
                jumps++;
                curEnd = farthest;
            }
        }
        return jumps;
    }
}
