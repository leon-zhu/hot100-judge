// Hot100 #146 LRU 缓存（中等）· 哈希表 + 双向链表
import java.util.*;

class LRUCache {
    final int cap;
    final Map<Integer, Node> map = new HashMap<>();
    final Node head = new Node(0, 0), tail = new Node(0, 0);
    class Node { int k, v; Node prev, next; Node(int k, int v) { this.k = k; this.v = v; } }
    public LRUCache(int capacity) { cap = capacity; head.next = tail; tail.prev = head; }
    void remove(Node n) { n.prev.next = n.next; n.next.prev = n.prev; }
    void addFirst(Node n) { n.next = head.next; n.prev = head; head.next.prev = n; head.next = n; }
    public int get(int key) {
        if (!map.containsKey(key)) return -1;
        Node n = map.get(key); remove(n); addFirst(n);
        return n.v;
    }
    public void put(int key, int value) {
        if (map.containsKey(key)) { Node n = map.get(key); n.v = value; remove(n); addFirst(n); return; }
        Node n = new Node(key, value); map.put(key, n); addFirst(n);
        if (map.size() > cap) { map.remove(tail.prev.k); remove(tail.prev); }
    }
}
