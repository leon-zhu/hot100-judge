// Hot100 #121 买卖股票的最佳时机（简单）· 动态规划
class Solution {
    public int maxProfit(int[] prices) {
        int min = Integer.MAX_VALUE, best = 0;
        for (int p : prices) { if (p < min) min = p; else best = Math.max(best, p - min); }
        return best;
    }
}
