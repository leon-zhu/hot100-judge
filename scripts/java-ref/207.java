// Hot100 #207 课程表（中等）· 图/拓扑排序
import java.util.*;

class Solution {
    public boolean canFinish(int numCourses, int[][] prerequisites) {
        // 核心思路: 拓扑排序判环，能排完所有课程说明不存在循环依赖。
        // 关键步骤: 建邻接表与入度表，反复取出入度为 0 的课程并更新后继入度。
        // 易错点: 入度减到 0 才入队，否则同一节点重复入队会破坏计数。
        // 复杂度: 时间 O(V + E)，空间 O(V + E)。
        List<List<Integer>> g = new ArrayList<>();
        for (int i = 0; i < numCourses; i++) g.add(new ArrayList<>());
        int[] indeg = new int[numCourses];
        for (int[] e : prerequisites) {
            g.get(e[1]).add(e[0]);  // 先修边 e[1] -> e[0]
            indeg[e[0]]++;
        }
        Queue<Integer> q = new LinkedList<>();
        for (int i = 0; i < numCourses; i++)
            if (indeg[i] == 0) q.offer(i);
        int cnt = 0;
        while (!q.isEmpty()) {
            int u = q.poll();
            cnt++;
            for (int v : g.get(u))
                if (--indeg[v] == 0) q.offer(v);
        }
        return cnt == numCourses;
    }
}
