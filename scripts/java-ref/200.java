// Hot100 #200 岛屿数量（中等）· 图/DFS/BFS
class Solution {
    int m, n;
    public int numIslands(char[][] grid) {
        // 核心思路: 遍历网格，遇到陆地就计数并把整座岛屿淹没，避免重复统计。
        // 关键步骤: dfs 沿上下左右扩散，把访问过的陆地改为 0。
        // 易错点: 先判断越界再访问格子，防止下标越界。
        // 复杂度: 每个格子最多访问一次，时间 O(m·n)，空间 O(m·n) 最坏递归栈。
        if (grid.length == 0 || grid[0].length == 0) return 0;
        m = grid.length; n = grid[0].length;
        int cnt = 0;
        for (int i = 0; i < m; i++)
            for (int j = 0; j < n; j++)
                if (grid[i][j] == '1') { cnt++; dfs(grid, i, j); }
        return cnt;
    }
    void dfs(char[][] g, int i, int j) {
        if (i < 0 || i >= m || j < 0 || j >= n || g[i][j] != '1') return;
        g[i][j] = '0';
        dfs(g, i + 1, j); dfs(g, i - 1, j); dfs(g, i, j + 1); dfs(g, i, j - 1);
    }
}
