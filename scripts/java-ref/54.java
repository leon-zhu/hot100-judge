// Hot100 #54 螺旋矩阵（中等）· 模拟
import java.util.*;

class Solution {
    public int[] spiralOrder(int[][] m) {
        List<Integer> r = new ArrayList<>();
        int t = 0, b = m.length - 1, l = 0, rr = m[0].length - 1;
        while (t <= b && l <= rr) {
            for (int j = l; j <= rr; j++) r.add(m[t][j]);
            for (int i = t + 1; i <= b; i++) r.add(m[i][rr]);
            if (t < b) for (int j = rr - 1; j >= l; j--) r.add(m[b][j]);
            if (l < rr) for (int i = b - 1; i > t; i--) r.add(m[i][l]);
            t++; b--; l++; rr--;
        }
        int[] out = new int[r.size()];
        for (int i = 0; i < r.size(); i++) out[i] = r.get(i);
        return out;
    }
}
