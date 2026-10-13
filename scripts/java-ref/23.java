// Hot100 #23 合并 K 个升序链表（困难）· 链表/堆
import java.util.*;

class Solution {
    // 解析形如 "list:[1,4,5]" 的链表描述字符串
    private ListNode parseList(String s) {
        int p = s.indexOf('[');
        int q = s.indexOf(']');
        if (p < 0 || q < 0 || q <= p) return null;
        String body = s.substring(p + 1, q);
        ListNode dummy = new ListNode(0);
        ListNode cur = dummy;
        for (String tok : body.split(",")) {
            tok = tok.trim();
            if (tok.isEmpty()) continue;
            cur.next = new ListNode(Integer.parseInt(tok));
            cur = cur.next;
        }
        return dummy.next;
    }

    // 思路：最小堆维护每个链表的当前头节点，每次弹出最小节点接到结果链尾部。
    // 关键点：堆中存节点即可，按 val 比较；空链表不入堆。
    // 易错点：弹出后若该链还有下一节点，继续把下一节点入堆。
    // 复杂度：时间 O(N log k)，N 为节点总数、k 为链表数；空间 O(k)。
    public ListNode mergeKLists(String[] lists) {
        // 小顶堆：堆顶始终是所有链表头中的最小节点
        PriorityQueue<ListNode> pq = new PriorityQueue<>((a, b) -> a.val - b.val);
        for (String s : lists) {
            ListNode h = parseList(s);
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
