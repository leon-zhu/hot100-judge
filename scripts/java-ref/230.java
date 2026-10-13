// Hot100 #230 二叉搜索树中第 K 小的元素（中等）· 二叉搜索树
import java.util.*;

class Solution {
    // 思路:中序遍历得到升序序列,取第 k 个元素
    // 关键:显式栈模拟递归,避免递归栈开销
    // 易错:k 递减到 0 立即返回当前节点值
    // 复杂度:时间 O(h + k),空间 O(h),h 为树高
    public int kthSmallest(TreeNode root, int k) {
        Deque<TreeNode> st = new ArrayDeque<>();
        TreeNode cur = root;
        while (cur != null || !st.isEmpty()) {
            while (cur != null) { st.push(cur); cur = cur.left; }
            cur = st.pop();
            if (--k == 0) return cur.val;  // 第 k 个出栈节点即答案
            cur = cur.right;
        }
        return -1;
    }
}
