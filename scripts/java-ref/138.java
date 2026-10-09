// Hot100 #138 随机链表的复制（中等）· 哈希表
import java.util.*;

class Solution {
    public Node copyRandomList(Node head) {
        if (head == null) return null;
        Map<Node, Node> map = new HashMap<>();
        for (Node p = head; p != null; p = p.next) map.put(p, new Node(p.val));
        for (Node p = head; p != null; p = p.next) {
            Node c = map.get(p);
            c.next = p.next == null ? null : map.get(p.next);
            c.random = p.random == null ? null : map.get(p.random);
        }
        return map.get(head);
    }
}
