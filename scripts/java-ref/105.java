// Hot100 #105 从前序与中序遍历序列构造二叉树（中等）· 二叉树
import java.util.*;

class Solution {
    // 思路:前序首元素为根,中序定位后递归建树
    // 关键:idx 哈希表加速中序定位;pos 为前序取根指针
    // 易错:pos 与 idx 需在每次调用前重置
    // 复杂度:时间 O(n),空间 O(n)
    int pos;
    Map<Integer, Integer> idx = new HashMap<>();

    public TreeNode buildTree(int[] preorder, int[] inorder) {
        pos = 0;
        idx.clear();
        for (int i = 0; i < inorder.length; i++) idx.put(inorder[i], i);
        return build(preorder, 0, inorder.length - 1);
    }
    TreeNode build(int[] preorder, int l, int r) {
        if (l > r) return null;
        int val = preorder[pos++];
        TreeNode node = new TreeNode(val);
        int m = idx.get(val);  // 中序定位根,切分左右子树
        node.left = build(preorder, l, m - 1);
        node.right = build(preorder, m + 1, r);
        return node;
    }
}
