// Hot100 #24 两两交换链表中的节点（中等）· 链表
class Solution {
    public ListNode swapPairs(ListNode head) {
        // ① 算法核心思路：哑节点加三指针，每轮交换相邻两个节点后前移一对
        // ② 关键步骤与易错点：按 a.next = b.next、b.next = a、prev.next = b 的顺序调整指针
        // ③ 时间复杂度 O(n)，空间复杂度 O(1)
        ListNode dummy = new ListNode(0);
        dummy.next = head;
        ListNode prev = dummy;
        while (prev.next != null && prev.next.next != null) {
            ListNode a = prev.next;
            ListNode b = a.next;
            a.next = b.next;
            b.next = a;
            prev.next = b;
            prev = a;
        }
        return dummy.next;
    }
}
