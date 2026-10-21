// Hot100 #49 字母异位词分组（中等）· 哈希/字符串
import java.util.*;

class Solution {
    public List<List<String>> groupAnagrams(String[] strs) {
        // 核心思路：把每个字符串排序得到统一键，哈希表按键分组
        // 键首次出现时新建分组并记录组下标
        // 时间复杂度 O(n * k log k)，空间复杂度 O(n * k)
        Map<String, Integer> idx = new HashMap<>();
        List<List<String>> groups = new ArrayList<>();
        for (String s : strs) {
            char[] ca = s.toCharArray();
            Arrays.sort(ca);
            String key = new String(ca);
            if (!idx.containsKey(key)) {
                idx.put(key, groups.size());
                groups.add(new ArrayList<String>());
            }
            groups.get(idx.get(key)).add(s);
        }
        return groups;
    }
}
