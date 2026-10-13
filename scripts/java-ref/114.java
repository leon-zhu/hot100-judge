// Hot100 #114 二叉树展开为链表（中等）· 二叉树/链表
class Solution {
    // 思路:原地展开为右向链表,顺序为前序遍历
    // 关键:左子树最右节点 pre,把原右子树接到 pre 右侧
    // 易错:先保存 nxt 再改指针;当前节点左指针必须置空
    // 复杂度:时间 O(n),空间 O(1)
    public void flatten(TreeNode root) {
        TreeNode cur = root;
        while (cur != null) {
            if (cur.left != null) {
                TreeNode nxt = cur.left;
                TreeNode pre = nxt;
                while (pre.right != null) pre = pre.right;
                pre.right = cur.right;  // 左子树最右节点接上原右子树
                cur.left = null;
                cur.right = nxt;
            }
            cur = cur.right;
        }
    }
}
