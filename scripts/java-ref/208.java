// Hot100 #208 实现 Trie（中等）· 字典树
class Trie {
    Trie[] next = new Trie[26];
    boolean end = false;
    public Trie() {}
    public void insert(String word) {
        Trie cur = this;
        for (char c : word.toCharArray()) { int i = c - 'a'; if (cur.next[i] == null) cur.next[i] = new Trie(); cur = cur.next[i]; }
        cur.end = true;
    }
    public boolean search(String word) {
        Trie cur = walk(word);
        return cur != null && cur.end;
    }
    public boolean startsWith(String prefix) {
        return walk(prefix) != null;
    }
    Trie walk(String s) {
        Trie cur = this;
        for (char c : s.toCharArray()) { int i = c - 'a'; if (cur.next[i] == null) return null; cur = cur.next[i]; }
        return cur;
    }
}
