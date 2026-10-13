// Hot100 #199 二叉树的右视图（中等）· 二叉树/BFS
import java.util.*;

class Solution {
    // 思路:BFS 层序遍历,收集每层最后一个节点
    // 关键:记录每层节点数 sz,弹出到最后一个时记录值
    // 易错:空树直接返回空结果
    // 复杂度:时间 O(n),空间 O(n)
    public int[] rightSideView(TreeNode root) {
        List<Integer> out = new ArrayList<>();
        if (root == null) return new int[0];
        Queue<TreeNode> q = new ArrayDeque<>();
        q.add(root);
        while (!q.isEmpty()) {
            int sz = q.size();
            for (int i = 0; i < sz; i++) {
                TreeNode cur = q.poll();
                if (i == sz - 1) out.add(cur.val);  // 本层最后一个节点即右视图节点
                if (cur.left != null) q.add(cur.left);
                if (cur.right != null) q.add(cur.right);
            }
        }
        int[] res = new int[out.size()];
        for (int i = 0; i < out.size(); i++) res[i] = out.get(i);
        return res;
    }
}
