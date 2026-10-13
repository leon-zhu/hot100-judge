// Hot100 #70 爬楼梯（简单）· 动态规划

class Solution {
    public int climbStairs(int n) {
        // 算法思路：斐波那契递推。爬到第 i 阶的方法数等于第 i-1 阶与第 i-2 阶之和，
        // 因为最后一步要么跨 1 级要么跨 2 级。
        // 关键点：用滚动变量 a、b 只保留前两个状态，无需完整 dp 数组。
        // 易错点：n 较大时用 long 计算避免中间值溢出，最后转回 int。
        // 时间复杂度 O(n)，空间复杂度 O(1)。
        if (n <= 2) return n;
        long a = 1, b = 2;
        for (int i = 3; i <= n; i++) {
            long c = a + b;
            a = b;
            b = c;
        }
        return (int) b;
    }
}
