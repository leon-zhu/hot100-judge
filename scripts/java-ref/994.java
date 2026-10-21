// Hot100 #994 腐烂的橘子（中等）· 图/BFS
import java.util.*;

class Solution {
    public int orangesRotting(int[][] grid) {
        // 核心思路: 多源 BFS，所有烂橘子同时向外扩散，扩散层数即所需分钟数。
        // 关键步骤: 初始把全部烂橘子入队并统计新鲜橘子数，逐层感染并计时。
        // 易错点: 结束时仍有新鲜橘子说明无法全部感染，返回 -1。
        // 复杂度: 每个格子入队一次，时间 O(m·n)，空间 O(m·n)。
        int m = grid.length, n = grid[0].length;
        Queue<int[]> q = new LinkedList<>();
        int fresh = 0;
        for (int i = 0; i < m; i++)
            for (int j = 0; j < n; j++) {
                if (grid[i][j] == 2) q.offer(new int[]{i, j});
                else if (grid[i][j] == 1) fresh++;
            }
        int[][] dirs = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};
        int minutes = 0;
        while (!q.isEmpty() && fresh > 0) {
            int sz = q.size();
            for (int k = 0; k < sz; k++) {
                int[] cur = q.poll();
                for (int[] d : dirs) {
                    int ni = cur[0] + d[0], nj = cur[1] + d[1];
                    if (ni >= 0 && ni < m && nj >= 0 && nj < n && grid[ni][nj] == 1) {
                        grid[ni][nj] = 2;
                        fresh--;
                        q.offer(new int[]{ni, nj});
                    }
                }
            }
            minutes++;
        }
        return fresh > 0 ? -1 : minutes;
    }
}
