// Hot100 #25 K 个一组翻转链表（困难）· 链表
class Solution {
    // 反转区间 [a, b)，返回新头
    private ListNode reverse(ListNode a, ListNode b) {
        ListNode pre = null;
        while (a != b) {
            ListNode nxt = a.next;
            a.next = pre;
            pre = a;
            a = nxt;
        }
        return pre;
    }

    // 思路：按 k 个节点为一组，借助哑结点和区间反转 [a, b) 实现整组翻转后重新拼接。
    // 关键点：先检查剩余节点是否满 k 个，不足则保持原序直接返回。
    // 易错点：反转后要用 first 接上下一段的头 nxt，并让 pre 前进到 first 作为下一组前驱。
    // 复杂度：时间 O(n)，空间 O(1)。
    public ListNode reverseKGroup(ListNode head, int k) {
        ListNode dummy = new ListNode(0);
        dummy.next = head;
        ListNode pre = dummy;
        while (true) {
            ListNode tail = pre;
            for (int i = 0; i < k; i++) {
                tail = tail.next;
                if (tail == null) return dummy.next;  // 剩余不足 k 个，保持原序
            }
            ListNode nxt = tail.next;
            ListNode first = pre.next;
            pre.next = reverse(first, tail.next);
            first.next = nxt;
            pre = first;
        }
    }
}
