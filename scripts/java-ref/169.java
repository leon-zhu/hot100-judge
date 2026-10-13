// Hot100 #169 多数元素（简单）· 数组/投票
class Solution {
    // 算法思路：摩尔投票法，维护候选数 cand 与计数 cnt
    // cnt 为 0 时更新候选，与候选相同则加一，不同则减一
    // 众数出现次数超过一半，抵消后留下的候选必为众数
    // 时间复杂度 O(n)，空间复杂度 O(1)
    public int majorityElement(int[] nums) {
        int cand = 0, cnt = 0;
        for (int v : nums) {
            if (cnt == 0) { cand = v; cnt = 1; }
            else if (v == cand) cnt++;
            else cnt--;
        }
        return cand;
    }
}
