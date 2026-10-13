// Hot100 #138 随机链表的复制（中等）· 链表/哈希
class Solution {
    // 思路：三次遍历完成深拷贝，无需额外哈希表。
    // 第一步在每个原节点后插入值相同的拷贝节点，第二步按原 random 指向设置拷贝的 random，
    // 第三步把拷贝节点从原链分离并还原原链。
    // 易错点：random 为空时跳过；分离时先断原链 next 再断拷贝链 next。
    // 复杂度：时间 O(n)，空间 O(1)（不计结果链表本身）。
    public Node copyRandomList(Node head) {
        if (head == null) return null;
        // 第一遍：在每个原节点后插入拷贝节点
        for (Node cur = head; cur != null; cur = cur.next.next) {
            Node cp = new Node(cur.val);
            cp.next = cur.next;
            cur.next = cp;
        }
        // 第二遍：拷贝 random 指针
        for (Node cur = head; cur != null; cur = cur.next.next) {
            if (cur.random != null) cur.next.random = cur.random.next;
        }
        // 第三遍：分离两条链
        Node newHead = head.next;
        for (Node cur = head; cur != null; cur = cur.next) {
            Node cp = cur.next;
            cur.next = cp.next;
            if (cp.next != null) cp.next = cp.next.next;
        }
        return newHead;
    }
}
