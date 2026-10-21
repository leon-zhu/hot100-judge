// Hot100 #102 二叉树的层序遍历（中等）· 二叉树/BFS
import java.util.*;

class Solution {
    // 思路:BFS 层序遍历,队列逐层扩展
    // 关键:先记录本层大小 sz,循环 sz 次完成分层
    // 易错:空树直接返回空结果
    // 复杂度:时间 O(n),空间 O(n)
    public List<List<Integer>> levelOrder(TreeNode root) {
        List<List<Integer>> out = new ArrayList<>();
        if (root == null) return out;
        Queue<TreeNode> q = new ArrayDeque<>();
        q.add(root);
        while (!q.isEmpty()) {
            int sz = q.size();
            List<Integer> level = new ArrayList<>();
            for (int i = 0; i < sz; i++) {  // 循环 sz 次,只处理本层节点
                TreeNode cur = q.poll();
                level.add(cur.val);
                if (cur.left != null) q.add(cur.left);
                if (cur.right != null) q.add(cur.right);
            }
            out.add(level);
        }
        return out;
    }
}
