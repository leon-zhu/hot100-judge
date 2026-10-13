// Hot100 #94 二叉树的中序遍历（简单）· 二叉树
import java.util.*;

class Solution {
    // 思路：递归深度优先遍历，按左子树、根、右子树的顺序收集节点值。
    // 易错点：空节点直接返回；左根右的访问顺序不能颠倒。
    // 复杂度：时间 O(n)，空间 O(n)（递归栈与结果数组）。
    public int[] inorderTraversal(TreeNode root) {
        List<Integer> out = new ArrayList<>();
        dfs(root, out);
        int[] res = new int[out.size()];
        for (int i = 0; i < out.size(); i++) res[i] = out.get(i);
        return res;
    }

    private void dfs(TreeNode node, List<Integer> out) {
        if (node == null) return;
        dfs(node.left, out);
        out.add(node.val);
        dfs(node.right, out);
    }
}
