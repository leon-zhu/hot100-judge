// Hot100 #2 两数相加（中等）· 链表
class Solution {
    public ListNode addTwoNumbers(ListNode l1, ListNode l2) {
        // ① 算法核心思路：从最低位起逐位相加并记录进位，结果按位生成新节点
        // ② 关键步骤与易错点：循环条件 l1 != null || l2 != null || carry != 0 处理不等长与最高位进位
        // ③ 时间复杂度 O(max(n1, n2))，空间复杂度 O(max(n1, n2))（结果链）
        ListNode dummy = new ListNode(0);
        ListNode cur = dummy;
        int carry = 0;
        while (l1 != null || l2 != null || carry != 0) {
            int s = carry;
            if (l1 != null) { s += l1.val; l1 = l1.next; }
            if (l2 != null) { s += l2.val; l2 = l2.next; }
            cur.next = new ListNode(s % 10);
            cur = cur.next;
            carry = s / 10;
        }
        return dummy.next;
    }
}
