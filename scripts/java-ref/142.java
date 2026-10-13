// Hot100 #142 环形链表 II（中等）· 链表/快慢指针
class Solution {
    public int detectCycle(ListNode head) {
        // ① 算法核心思路：快慢指针相遇后，新指针从 head 与 slow 同步走，交点即环入口
        // ② 关键步骤与易错点：无环返回 -1；入口依据为头节点到入口距离等于相遇点到入口距离
        // ③ 时间复杂度 O(n)，空间复杂度 O(1)
        ListNode slow = head;
        ListNode fast = head;
        while (fast != null && fast.next != null) {
            slow = slow.next;
            fast = fast.next.next;
            if (slow == fast) {
                ListNode p = head;
                while (p != slow) {
                    p = p.next;
                    slow = slow.next;
                }
                return p.val;
            }
        }
        return -1;
    }
}
