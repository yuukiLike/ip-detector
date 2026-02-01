# Rust 所有权系统：编译时内存安全

## 核心设计

```
┌────────────────────────────────────────────────────────┐
│ 编译时内存安全，零运行时开销                              │
├────────────────────────────────────────────────────────┤
│                                                        │
│  所有权规则：                                           │
│  1. 每个值有且只有一个所有者                             │
│  2. 所有者离开作用域，值被释放                           │
│  3. 值可以借用（&T）或可变借用（&mut T），但不能同时       │
│                                                        │
│  编译器在编译时检查：                                    │
│  • 空指针 ❌                                            │
│  • 悬垂指针 ❌                                          │
│  • 数据竞争 ❌                                          │
│  • 双重释放 ❌                                          │
│  • 使用已释放内存 ❌                                     │
│                                                        │
└────────────────────────────────────────────────────────┘
```

## 所有权转移（Move）

```rust
fn main() {
    let s1 = String::from("hello");  // s1 拥有这个 String
    let s2 = s1;                      // 所有权转移给 s2

    // println!("{}", s1);  // 编译错误！s1 已无效
    println!("{}", s2);     // OK，s2 是所有者

}  // s2 离开作用域，String 被释放

// 函数参数也会转移所有权
fn take_ownership(s: String) {
    println!("{}", s);
}  // s 被释放

fn main() {
    let s = String::from("hello");
    take_ownership(s);
    // println!("{}", s);  // 错误！s 已被移动
}
```

## 借用（Borrowing）

```rust
// 不可变借用：&T
fn calculate_length(s: &String) -> usize {
    s.len()
}  // s 是借用，不会释放原值

fn main() {
    let s = String::from("hello");
    let len = calculate_length(&s);  // 借用 s
    println!("{} has length {}", s, len);  // s 仍然有效
}

// 可变借用：&mut T
fn append_world(s: &mut String) {
    s.push_str(" world");
}

fn main() {
    let mut s = String::from("hello");
    append_world(&mut s);
    println!("{}", s);  // "hello world"
}
```

## 借用规则

```
┌────────────────────────────────────────────────────────┐
│ 在任意时刻，要么：                                       │
│   • 一个可变引用（&mut T）                              │
│   • 任意数量的不可变引用（&T）                           │
│ 引用必须总是有效的                                       │
└────────────────────────────────────────────────────────┘
```

```rust
// ❌ 错误：不能同时有可变和不可变引用
let mut s = String::from("hello");
let r1 = &s;      // 不可变借用
let r2 = &s;      // OK，多个不可变借用
let r3 = &mut s;  // 错误！已经有不可变借用
println!("{}, {}", r1, r2);

// ✅ 正确：借用的作用域不重叠
let mut s = String::from("hello");
let r1 = &s;
let r2 = &s;
println!("{}, {}", r1, r2);  // r1, r2 作用域结束

let r3 = &mut s;  // OK，之前的借用已结束
println!("{}", r3);
```

## 生命周期（Lifetimes）

```rust
// 生命周期确保引用有效
// 'a 是生命周期参数，表示返回值的生命周期与参数相关

fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() > y.len() { x } else { y }
}

// 编译器检查：返回的引用不会比输入活得更久

fn main() {
    let s1 = String::from("long string");
    {
        let s2 = String::from("xyz");
        let result = longest(&s1, &s2);
        println!("{}", result);  // OK
    }  // s2 离开作用域

    // 如果 result 在这里使用，且指向 s2，就会是悬垂引用
    // 但编译器会阻止这种情况
}

// 结构体中的生命周期
struct ImportantExcerpt<'a> {
    part: &'a str,
}

impl<'a> ImportantExcerpt<'a> {
    fn level(&self) -> i32 { 3 }
    fn announce(&self, announcement: &str) -> &str {
        self.part
    }
}
```

## 智能指针

```rust
// Box<T> - 堆分配，单一所有权
let b = Box::new(5);

// Rc<T> - 引用计数，多所有权（单线程）
use std::rc::Rc;
let a = Rc::new(5);
let b = Rc::clone(&a);  // 引用计数 +1
println!("count: {}", Rc::strong_count(&a));  // 2

// Arc<T> - 原子引用计数（多线程安全）
use std::sync::Arc;
let a = Arc::new(5);
let b = Arc::clone(&a);

// RefCell<T> - 内部可变性（运行时借用检查）
use std::cell::RefCell;
let data = RefCell::new(5);
*data.borrow_mut() += 1;

// 组合使用：Rc<RefCell<T>> 多所有权 + 可变
use std::rc::Rc;
use std::cell::RefCell;
let shared_data = Rc::new(RefCell::new(vec![1, 2, 3]));
```

## 并发安全

```rust
// Send: 可以安全地在线程间转移所有权
// Sync: 可以安全地在线程间共享引用

use std::thread;
use std::sync::{Arc, Mutex};

// Arc + Mutex = 线程安全的共享可变状态
let counter = Arc::new(Mutex::new(0));
let mut handles = vec![];

for _ in 0..10 {
    let counter = Arc::clone(&counter);
    let handle = thread::spawn(move || {
        let mut num = counter.lock().unwrap();
        *num += 1;
    });
    handles.push(handle);
}

for handle in handles {
    handle.join().unwrap();
}

println!("Result: {}", *counter.lock().unwrap());  // 10
```

## 与其他语言对比

```
┌─────────────────────────────────────────────────────────┐
│ 语言        │ 内存管理      │ 安全性检查   │ 性能开销   │
├─────────────────────────────────────────────────────────┤
│ C/C++      │ 手动          │ 无           │ 零        │
│ Java/Go   │ GC            │ 运行时       │ GC 暂停   │
│ Python    │ GC + 引用计数  │ 运行时       │ 高        │
│ Rust      │ 所有权系统     │ 编译时       │ 零        │
└─────────────────────────────────────────────────────────┘
```

## 常见模式

```rust
// Builder 模式 - 链式调用返回 self
struct RequestBuilder {
    url: String,
    method: String,
}

impl RequestBuilder {
    fn new(url: &str) -> Self {
        Self { url: url.to_string(), method: "GET".to_string() }
    }

    fn method(mut self, method: &str) -> Self {
        self.method = method.to_string();
        self
    }

    fn build(self) -> Request {
        Request { url: self.url, method: self.method }
    }
}

// 使用
let req = RequestBuilder::new("https://api.example.com")
    .method("POST")
    .build();

// RAII - 资源获取即初始化
struct TempFile {
    path: std::path::PathBuf,
}

impl Drop for TempFile {
    fn drop(&mut self) {
        std::fs::remove_file(&self.path).ok();
    }
}
// TempFile 离开作用域时自动删除文件
```

## 设计启示

1. **编译时检查** - 将错误前移，减少运行时开销
2. **显式优于隐式** - 所有权转移清晰可见
3. **零成本抽象** - 安全性不以性能为代价
4. **借用而非复制** - 默认引用语义，需要时显式 clone
5. **类型系统编码约束** - Send/Sync trait 编码并发安全
