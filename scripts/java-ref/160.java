// Hot100 #160 相交链表（简单）· 链表
class Solution {
    public ListNode getIntersectionNode(ListNode headA, ListNode headB) {
        // ① 算法核心思路：pA、pB 各走完本链后换到另一条链，消除长度差后在交点相遇
        // ② 关键步骤与易错点：pA = pA.next != null ? pA.next : headB 实现换链；无交点时两者同时为 null 退出
        // ③ 时间复杂度 O(lenA + lenB)，空间复杂度 O(1)
        ListNode pA = headA;
        ListNode pB = headB;
        while (pA != pB) {
            pA = pA != null ? pA.next : headB;
            pB = pB != null ? pB.next : headA;
        }
        return pA;
    }
}
