// Hot100 #234 回文链表（简单）· 链表
class Solution {
    public boolean isPalindrome(ListNode head) {
        // ① 算法核心思路：快慢指针找中点，反转后半段，再与前半段逐节点比较值
        // ② 关键步骤与易错点：循环条件 fast != null && fast.next != null；比较以 right 非空为界，奇偶长度均正确
        // ③ 时间复杂度 O(n)，空间复杂度 O(1)
        ListNode slow = head;
        ListNode fast = head;
        while (fast != null && fast.next != null) {
            slow = slow.next;
            fast = fast.next.next;
        }
        ListNode prev = null;
        while (slow != null) {
            ListNode nxt = slow.next;
            slow.next = prev;
            prev = slow;
            slow = nxt;
        }
        ListNode left = head;
        ListNode right = prev;
        while (right != null) {
            if (left.val != right.val) return false;
            left = left.next;
            right = right.next;
        }
        return true;
    }
}
