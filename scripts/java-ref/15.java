// Hot100 #15 三数之和（中等）· 双指针/排序
import java.util.*;

class Solution {
    public List<List<Integer>> threeSum(int[] nums) {
        // 核心思路：排序后固定第一个数，双指针在剩余区间查找
        // 跳过重复元素避免产生相同三元组
        // 用 long 计算三数之和防止溢出
        // 时间复杂度 O(n^2)，空间复杂度 O(1)（不计结果）
        Arrays.sort(nums);
        int n = nums.length;
        List<List<Integer>> res = new ArrayList<>();
        for (int i = 0; i < n - 2; i++) {
            if (i > 0 && nums[i] == nums[i - 1]) continue;
            int l = i + 1, r = n - 1;
            while (l < r) {
                long s = (long) nums[i] + nums[l] + nums[r];
                if (s < 0) l++;
                else if (s > 0) r--;
                else {
                    res.add(Arrays.asList(nums[i], nums[l], nums[r]));
                    while (l < r && nums[l] == nums[l + 1]) l++;
                    while (l < r && nums[r] == nums[r - 1]) r--;
                    l++; r--;
                }
            }
        }
        return res;
    }
}
