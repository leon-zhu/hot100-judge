// Hot100 #121 买卖股票的最佳时机（简单）· 动态规划
class Solution {
    // 算法思路: 一次遍历。min 记录历史最低价, 每天计算当天卖出的收益。
    // 关键点: 先更新最低价再更新答案, 保证卖出日不早于买入日。
    // 时间复杂度 O(n), 空间复杂度 O(1)。
    public int maxProfit(int[] prices) {
        int min = Integer.MAX_VALUE, best = 0;
        for (int p : prices) {
            min = Math.min(min, p);
            best = Math.max(best, p - min);
        }
        return best;
    }
}
