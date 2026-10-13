// Hot100 #295 数据流的中位数（困难）· 堆/设计
import java.util.*;

class MedianFinder {
    PriorityQueue<Integer> lo = new PriorityQueue<>(Collections.reverseOrder()); // 大顶堆
    PriorityQueue<Integer> hi = new PriorityQueue<>(); // 小顶堆
    public MedianFinder() {}
    public void addNum(int num) {
        lo.add(num);
        hi.add(lo.poll());
        if (hi.size() > lo.size()) lo.add(hi.poll());
    }
    public double findMedian() {
        if (lo.size() > hi.size()) return lo.peek();
        return (lo.peek() + hi.peek()) / 2.0;
    }
}
