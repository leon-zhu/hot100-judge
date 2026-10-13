// Hot100 #19 删除链表的倒数第 N 个结点（中等）· 链表/双指针
class Solution {
    public ListNode removeNthFromEnd(ListNode head, int n) {
        // ① 算法核心思路：快指针先走 n 步，再与慢指针同步前进，慢指针落在待删节点前驱
        // ② 关键步骤与易错点：哑节点统一处理删除头节点；循环条件为 fast.next 非空
        // ③ 时间复杂度 O(n)，空间复杂度 O(1)
        ListNode dummy = new ListNode(0);
        dummy.next = head;
        ListNode fast = dummy;
        ListNode slow = dummy;
        for (int i = 0; i < n; i++) fast = fast.next;
        while (fast.next != null) {
            fast = fast.next;
            slow = slow.next;
        }
        slow.next = slow.next.next;
        return dummy.next;
    }
}
