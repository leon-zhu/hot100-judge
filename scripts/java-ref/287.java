// Hot100 #287 寻找重复数（中等）· 快慢指针/二分
class Solution {
    // 算法思路：把数组看作链表，下标 i 指向 nums[i]，重复元素导致环的出现
    // 快慢指针先在环中相遇，再让慢指针从头出发，两指针同速走到环入口
    // 环入口下标就是重复数字，时间复杂度 O(n)，空间复杂度 O(1)
    public int findDuplicate(int[] nums) {
        int slow = 0, fast = 0;
        while (true) {
            slow = nums[slow];
            fast = nums[nums[fast]];
            if (slow == fast) break;
        }
        slow = 0;
        while (slow != fast) {
            slow = nums[slow];
            fast = nums[fast];
        }
        return slow;
    }
}
