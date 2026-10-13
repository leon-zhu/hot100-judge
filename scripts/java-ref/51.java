// Hot100 #51 N 皇后（困难）· 回溯
import java.util.*;

class Solution {
    // 核心思路：回溯逐行放置皇后，用列、两条对角线的占用标记剪枝。
    // 关键点：d1[r+c] 与 d2[r-c+n-1] 分别对应两条对角线方向。
    // 易错点：递归返回后需撤销标记并还原棋盘。
    // 时间复杂度 O(n!)，空间复杂度 O(n)。
    public String[][] solveNQueens(int n) {
        List<String[]> res = new ArrayList<>();
        char[][] board = new char[n][n];
        for (char[] row : board) Arrays.fill(row, '.');
        boolean[] cols = new boolean[n];
        boolean[] d1 = new boolean[2 * n - 1];
        boolean[] d2 = new boolean[2 * n - 1];
        dfs(0, n, board, cols, d1, d2, res);
        return res.toArray(new String[0][]);
    }

    void dfs(int r, int n, char[][] board, boolean[] cols, boolean[] d1, boolean[] d2, List<String[]> res) {
        if (r == n) {
            String[] sol = new String[n];
            for (int i = 0; i < n; i++) sol[i] = new String(board[i]);
            res.add(sol);
            return;
        }
        for (int c = 0; c < n; c++) {
            if (cols[c] || d1[r + c] || d2[r - c + n - 1]) continue;
            cols[c] = d1[r + c] = d2[r - c + n - 1] = true;
            board[r][c] = 'Q';
            dfs(r + 1, n, board, cols, d1, d2, res);
            board[r][c] = '.';
            cols[c] = d1[r + c] = d2[r - c + n - 1] = false;
        }
    }
}
