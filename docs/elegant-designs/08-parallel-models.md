# 并行计算模型

## MapReduce：分而治之

```
┌────────────────────────────────────────────────────────┐
│ MapReduce：大规模数据处理的编程模型                      │
├────────────────────────────────────────────────────────┤
│                                                        │
│  Input → Map(并行) → Shuffle → Reduce(并行) → Output   │
│                                                        │
│  Map：   (k1, v1) → list(k2, v2)                      │
│  Reduce: (k2, list(v2)) → list(v3)                    │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### Word Count 示例

```
Input: "hello world hello"

┌─────────────────────────────────────────────────────────┐
│ Map Phase (并行处理每个文档)                             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Document 1: "hello world" → [(hello, 1), (world, 1)]  │
│  Document 2: "hello rust"  → [(hello, 1), (rust, 1)]   │
│                                                         │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│ Shuffle Phase (按 key 分组)                             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  hello → [1, 1]                                        │
│  world → [1]                                           │
│  rust  → [1]                                           │
│                                                         │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│ Reduce Phase (并行聚合)                                 │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  hello → sum([1, 1]) → 2                               │
│  world → sum([1])    → 1                               │
│  rust  → sum([1])    → 1                               │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 现代实现

```python
# PySpark 示例
from pyspark import SparkContext

sc = SparkContext()
text = sc.textFile("hdfs://...")

word_counts = (
    text
    .flatMap(lambda line: line.split())     # Map: 拆分单词
    .map(lambda word: (word, 1))            # Map: 转为 (word, 1)
    .reduceByKey(lambda a, b: a + b)        # Reduce: 按 key 求和
)

word_counts.saveAsTextFile("hdfs://output")
```

---

## Actor Model：消息传递并发

```
┌────────────────────────────────────────────────────────┐
│ Actor Model：消息传递代替共享内存                        │
├────────────────────────────────────────────────────────┤
│                                                        │
│  核心概念：                                             │
│  • 每个 Actor 有自己的状态（不共享）                     │
│  • Actor 之间只能通过消息通信                           │
│  • 消息处理是串行的（Actor 内部无并发）                  │
│  • Actor 可以创建子 Actor                              │
│                                                        │
│  → 从根本上避免锁和数据竞争                             │
│                                                        │
└────────────────────────────────────────────────────────┘
```

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│    ┌─────────┐    消息    ┌─────────┐                  │
│    │ Actor A │ ─────────► │ Actor B │                  │
│    │ [状态]  │            │ [状态]  │                  │
│    └─────────┘            └────┬────┘                  │
│         ▲                      │                        │
│         │                      │ 创建                   │
│         │    消息              ▼                        │
│         └────────────── ┌─────────┐                    │
│                         │ Actor C │                    │
│                         │ [状态]  │                    │
│                         └─────────┘                    │
│                                                         │
│    每个 Actor 有独立的邮箱，消息异步处理                  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Erlang/Elixir 示例

```elixir
# Elixir Actor (GenServer)
defmodule Counter do
  use GenServer

  # 客户端 API
  def start_link(initial_value) do
    GenServer.start_link(__MODULE__, initial_value)
  end

  def increment(pid) do
    GenServer.cast(pid, :increment)  # 异步消息
  end

  def get_value(pid) do
    GenServer.call(pid, :get_value)  # 同步消息
  end

  # 服务端回调
  def init(initial_value) do
    {:ok, initial_value}  # 初始状态
  end

  def handle_cast(:increment, state) do
    {:noreply, state + 1}  # 更新状态
  end

  def handle_call(:get_value, _from, state) do
    {:reply, state, state}  # 返回状态
  end
end

# 使用
{:ok, counter} = Counter.start_link(0)
Counter.increment(counter)
Counter.increment(counter)
Counter.get_value(counter)  # => 2
```

### Akka (Scala/Java) 示例

```scala
// Akka Actor
import akka.actor._

// 消息定义
case object Increment
case object GetValue
case class Value(n: Int)

// Actor 实现
class Counter extends Actor {
  var count = 0

  def receive = {
    case Increment => count += 1
    case GetValue => sender() ! Value(count)
  }
}

// 使用
val system = ActorSystem("MySystem")
val counter = system.actorOf(Props[Counter], "counter")

counter ! Increment
counter ! Increment
counter ! GetValue  // 异步发送
```

---

## CSP：Communicating Sequential Processes

```
┌────────────────────────────────────────────────────────┐
│ CSP vs Actor Model                                     │
├────────────────────────────────────────────────────────┤
│                                                        │
│  Actor Model:                                          │
│  • 消息发送到 Actor（有身份）                           │
│  • 异步通信                                            │
│  • Erlang, Akka                                       │
│                                                        │
│  CSP:                                                  │
│  • 消息通过 Channel（匿名）                            │
│  • 同步或缓冲通信                                      │
│  • Go, Clojure core.async                             │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### Go Channels

```go
// Go CSP 示例
func main() {
    // 创建 channel
    ch := make(chan int)

    // 生产者 goroutine
    go func() {
        for i := 0; i < 5; i++ {
            ch <- i  // 发送到 channel
        }
        close(ch)
    }()

    // 消费者（主 goroutine）
    for n := range ch {
        fmt.Println(n)  // 从 channel 接收
    }
}

// Select 多路复用
func worker(jobs <-chan int, results chan<- int, done chan bool) {
    for {
        select {
        case job := <-jobs:
            results <- job * 2
        case <-done:
            return
        }
    }
}

// 带缓冲的 channel
ch := make(chan int, 100)  // 缓冲区大小 100
```

---

## Fork-Join 模型

```
┌────────────────────────────────────────────────────────┐
│ Fork-Join：递归分解任务                                 │
├────────────────────────────────────────────────────────┤
│                                                        │
│           ┌─────────┐                                  │
│           │  Task   │                                  │
│           └────┬────┘                                  │
│                │ Fork                                  │
│       ┌────────┼────────┐                              │
│       ▼        ▼        ▼                              │
│   ┌──────┐ ┌──────┐ ┌──────┐                          │
│   │Sub 1 │ │Sub 2 │ │Sub 3 │   并行执行                │
│   └──┬───┘ └──┬───┘ └──┬───┘                          │
│      │        │        │                               │
│      └────────┼────────┘                               │
│               │ Join                                   │
│               ▼                                        │
│         ┌──────────┐                                   │
│         │  Result  │                                   │
│         └──────────┘                                   │
│                                                        │
└────────────────────────────────────────────────────────┘
```

```java
// Java ForkJoinPool 示例
class SumTask extends RecursiveTask<Long> {
    private final long[] array;
    private final int start, end;
    private static final int THRESHOLD = 1000;

    @Override
    protected Long compute() {
        if (end - start <= THRESHOLD) {
            // 小任务直接计算
            long sum = 0;
            for (int i = start; i < end; i++) {
                sum += array[i];
            }
            return sum;
        } else {
            // 大任务分解
            int mid = (start + end) / 2;
            SumTask left = new SumTask(array, start, mid);
            SumTask right = new SumTask(array, mid, end);

            left.fork();   // 异步执行左半部分
            long rightResult = right.compute();  // 同步执行右半部分
            long leftResult = left.join();  // 等待左半部分

            return leftResult + rightResult;
        }
    }
}
```

---

## 对比总结

```
┌─────────────────────────────────────────────────────────┐
│ 模型            │ 特点              │ 适用场景           │
├─────────────────────────────────────────────────────────┤
│ MapReduce      │ 批处理，数据并行   │ 大数据ETL，日志分析│
│ Actor Model    │ 消息传递，容错强   │ 分布式系统，IoT    │
│ CSP (Channels) │ 同步通信，简单     │ 并发服务器，管道   │
│ Fork-Join      │ 递归分解，工作窃取 │ 并行算法，计算密集 │
│ Async/Await    │ 协程，I/O 并发    │ 网络服务，UI       │
└─────────────────────────────────────────────────────────┘
```

## 设计启示

1. **不共享状态** - Actor/CSP 通过消息避免共享
2. **分而治之** - MapReduce/Fork-Join 分解大问题
3. **通信代替同步** - Channel/消息代替锁
4. **容错设计** - Supervisor 树（Erlang）
5. **背压控制** - 有界队列/Channel 防止过载
