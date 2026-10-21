// Hot100 #23 合并 K 个升序链表（困难）· 链表/堆
import java.util.*;

class Solution {
    // 思路：最小堆维护每个链表的当前头节点，每次弹出最小节点接到结果链尾部。
    // 关键点：堆中存节点即可，按 val 比较；空链表不入堆。
    // 易错点：弹出后若该链还有下一节点，继续把下一节点入堆。
    // 复杂度：时间 O(N log k)，N 为节点总数、k 为链表数；空间 O(k)。
    public ListNode mergeKLists(ListNode[] lists) {
        // 小顶堆：堆顶始终是所有链表头中的最小节点
        PriorityQueue<ListNode> pq = new PriorityQueue<>((a, b) -> a.val - b.val);
        for (ListNode h : lists) {
            if (h != null) pq.offer(h);
        }
        ListNode dummy = new ListNode(0);
        ListNode cur = dummy;
        while (!pq.isEmpty()) {
            ListNode node = pq.poll();
            cur.next = node;
            cur = cur.next;
            if (node.next != null) pq.offer(node.next);
        }
        return dummy.next;
    }
}
