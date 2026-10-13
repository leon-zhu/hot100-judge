// Hot100 #141 环形链表（简单）· 链表/快慢指针
class Solution {
    public boolean hasCycle(ListNode head) {
        // ① 算法核心思路：快慢指针从 head 出发，快指针每次走两步，有环则必然相遇
        // ② 关键步骤与易错点：循环条件 fast != null && fast.next != null 防越界；空链表或单节点直接返回 false
        // ③ 时间复杂度 O(n)，空间复杂度 O(1)
        ListNode slow = head;
        ListNode fast = head;
        while (fast != null && fast.next != null) {
            slow = slow.next;
            fast = fast.next.next;
            if (slow == fast) return true;
        }
        return false;
    }
}
