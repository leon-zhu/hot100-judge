// Hot100 #206 反转链表（简单）· 链表
class Solution {
    public ListNode reverseList(ListNode head) {
        // ① 算法核心思路：prev、cur、nxt 三指针迭代，逐个反转 next 指向
        // ② 关键步骤与易错点：先保存 nxt = cur.next 再修改指向；空链表时 prev 为 null 直接返回
        // ③ 时间复杂度 O(n)，空间复杂度 O(1)
        ListNode prev = null, cur = head;
        while (cur != null) {
            ListNode nxt = cur.next;
            cur.next = prev;
            prev = cur;
            cur = nxt;
        }
        return prev;
    }
}
