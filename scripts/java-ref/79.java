// Hot100 #79 单词搜索（中等）· 回溯
class Solution {
    int m, n;
    public boolean exist(char[][] board, String word) {
        // 核心思路: 回溯搜索，从任意格子出发沿四个方向逐字符匹配 word。
        // 关键步骤: 越界或字符不匹配立即返回 false，匹配完最后一个字符即成功。
        // 易错点: 访问过的格子要标记为 #，回溯后必须恢复原字符。
        // 复杂度: 时间 O(m·n·3^k)，空间 O(k) 递归栈，k 为单词长度。
        if (word.length() == 0) return true;
        m = board.length; n = board[0].length;
        for (int i = 0; i < m; i++)
            for (int j = 0; j < n; j++)
                if (dfs(board, word, i, j, 0)) return true;
        return false;
    }
    boolean dfs(char[][] board, String word, int i, int j, int k) {
        if (i < 0 || i >= m || j < 0 || j >= n || board[i][j] != word.charAt(k)) return false;
        if (k == word.length() - 1) return true;
        board[i][j] = '#';  // 标记已访问
        boolean found = dfs(board, word, i + 1, j, k + 1)
                     || dfs(board, word, i - 1, j, k + 1)
                     || dfs(board, word, i, j + 1, k + 1)
                     || dfs(board, word, i, j - 1, k + 1);
        board[i][j] = word.charAt(k);  // 回溯恢复
        return found;
    }
}
