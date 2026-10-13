// Hot100 #21 合并两个有序链表（简单）· 链表
class Solution {
    public ListNode mergeTwoLists(ListNode list1, ListNode list2) {
        // ① 算法核心思路：哑节点加尾指针归并，每轮接入较小节点
        // ② 关键步骤与易错点：比较用 <= 保持稳定性；结束时接入剩余整段链表
        // ③ 时间复杂度 O(n1 + n2)，空间复杂度 O(1)
        ListNode dummy = new ListNode(0);
        ListNode cur = dummy;
        while (list1 != null && list2 != null) {
            if (list1.val <= list2.val) {
                cur.next = list1;
                list1 = list1.next;
            } else {
                cur.next = list2;
                list2 = list2.next;
            }
            cur = cur.next;
        }
        cur.next = list1 != null ? list1 : list2;
        return dummy.next;
    }
}
