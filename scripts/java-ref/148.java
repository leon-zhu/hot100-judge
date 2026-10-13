// Hot100 #148 排序链表（中等）· 链表/归并
class Solution {
    // 思路：链表归并排序，快慢指针找中点把链表一分为二，递归排序后合并两条有序链。
    // 关键点：快指针从 head.next 起步，保证偶数长度时 slow 落在左半段末尾。
    // 易错点：拆链前先记录 mid，再把 slow.next 置空截断；合并用哑结点统一处理。
    // 复杂度：时间 O(n log n)，空间 O(log n)（递归栈）。
    public ListNode sortList(ListNode head) {
        if (head == null || head.next == null) return head;
        // 快慢指针找中点，拆成两半
        ListNode slow = head;
        ListNode fast = head.next;
        while (fast != null && fast.next != null) {
            slow = slow.next;
            fast = fast.next.next;
        }
        ListNode mid = slow.next;
        slow.next = null;
        ListNode left = sortList(head);
        ListNode right = sortList(mid);
        // 归并两个有序链表
        ListNode dummy = new ListNode(0);
        ListNode cur = dummy;
        while (left != null && right != null) {
            if (left.val <= right.val) {
                cur.next = left;
                left = left.next;
            } else {
                cur.next = right;
                right = right.next;
            }
            cur = cur.next;
        }
        cur.next = left != null ? left : right;
        return dummy.next;
    }
}
