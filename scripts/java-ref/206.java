// Hot100 #206 反转链表（简单）· 链表
class Solution {
    public ListNode reverseList(ListNode head) {
        ListNode prev = null, cur = head;
        while (cur != null) { ListNode next = cur.next; cur.next = prev; prev = cur; cur = next; }
        return prev;
    }
}
