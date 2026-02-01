# 跨平台开发策略：语言与框架选择

> 覆盖 Apple Watch、AR (visionOS)、macOS、Windows、iOS、Android 的技术选型指南

---

## 残酷的现实

```
┌────────────────────────────────────────────────────────┐
│ 各平台的"一等公民"语言                                  │
├────────────────────────────────────────────────────────┤
│                                                        │
│  Apple Watch   → Swift (唯一选择)                      │
│  visionOS (AR) → Swift (唯一选择)                      │
│  iOS/macOS     → Swift (最佳) / 跨平台框架可用         │
│  Windows       → C#/.NET / C++ / Rust / 跨平台框架    │
│  Android       → Kotlin (最佳) / 跨平台框架可用        │
│  Web           → JavaScript/TypeScript                │
│                                                        │
│  ⚠️ 残酷现实：Apple Watch 和 visionOS 只能用 Swift     │
│  ⚠️ 没有"一种语言搞定一切"的方案                        │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## 三种主要策略

### 策略 A：Apple 生态优先（推荐）

适用场景：必须支持 Apple Watch 和/或 visionOS AR

```
┌────────────────────────────────────────────────────────┐
│ Swift + SwiftUI 为核心                                 │
├────────────────────────────────────────────────────────┤
│                                                        │
│  主力语言：Swift + SwiftUI                             │
│                                                        │
│  覆盖范围：                                            │
│  ✅ Apple Watch (watchOS)                              │
│  ✅ Apple Vision Pro (visionOS)                        │
│  ✅ iPhone/iPad (iOS/iPadOS)                           │
│  ✅ Mac (macOS) - 原生                                 │
│  ✅ Apple TV (tvOS)                                    │
│  ❌ Windows - 无法直接支持                             │
│  ❌ Android - 无法支持                                 │
│                                                        │
└────────────────────────────────────────────────────────┘
```

**Windows 补充方案：**
- 核心逻辑用 Rust 写，双端复用
- Windows UI 用 Tauri (Rust + Web) 或 C#/WinUI
- 或接受 Windows 用户使用 Web 版本

**架构示意：**

```
┌─────────────────────────────────────────────────────────┐
│                    共享核心逻辑                          │
│                    (Rust 编写)                          │
│                                                         │
│   • 数据模型与处理                                       │
│   • 业务逻辑                                            │
│   • 网络请求                                            │
│   • 本地存储                                            │
│   • 加密/安全                                           │
└─────────────────────┬───────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
        ▼             ▼             ▼
┌───────────┐  ┌───────────┐  ┌───────────┐
│  Apple    │  │  Windows  │  │   Web     │
│  Swift    │  │  Tauri /  │  │  (可选)   │
│           │  │  C# WinUI │  │           │
│ • Watch   │  │           │  │           │
│ • Vision  │  │           │  │           │
│ • iOS     │  │           │  │           │
│ • macOS   │  │           │  │           │
└───────────┘  └───────────┘  └───────────┘
```

---

### 策略 B：跨平台框架优先

适用场景：可以放弃 Apple Watch / visionOS

```
┌────────────────────────────────────────────────────────┐
│ 主流跨平台框架对比                                      │
├────────────────────────────────────────────────────────┤
│                                                        │
│  Flutter (Dart)                                       │
│  ├── ✅ iOS, Android, macOS, Windows, Linux, Web      │
│  ├── ❌ Apple Watch, visionOS                         │
│  ├── 特点：自绘 UI，跨平台一致性最好                    │
│  ├── 性能：优秀（Skia 渲染引擎）                       │
│  └── 适合：追求 UI 一致性的应用                        │
│                                                        │
│  React Native (TypeScript)                            │
│  ├── ✅ iOS, Android                                  │
│  ├── ⚠️ macOS, Windows (实验性/社区支持)              │
│  ├── ❌ Apple Watch, visionOS                         │
│  ├── 特点：使用原生组件，Web 开发者友好                │
│  ├── 性能：良好（桥接原生）                            │
│  └── 适合：已有 React 经验的团队                       │
│                                                        │
│  .NET MAUI (C#)                                       │
│  ├── ✅ iOS, Android, macOS, Windows                  │
│  ├── ❌ Apple Watch, visionOS                         │
│  ├── 特点：微软技术栈，企业友好                        │
│  ├── 性能：良好                                       │
│  └── 适合：.NET 背景团队                              │
│                                                        │
│  Kotlin Multiplatform (KMP)                           │
│  ├── ✅ iOS, Android                                  │
│  ├── ⚠️ 桌面 (Compose Multiplatform)                 │
│  ├── ❌ Apple Watch, visionOS                         │
│  ├── 特点：共享逻辑，UI 各自原生                       │
│  ├── 性能：优秀（编译到原生）                          │
│  └── 适合：Kotlin/Android 背景团队                    │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

### 策略 C：Web 技术 + 原生补充

适用场景：最大化代码复用，前端技术栈团队

```
┌────────────────────────────────────────────────────────┐
│ Web 技术为核心                                         │
├────────────────────────────────────────────────────────┤
│                                                        │
│  核心技术：TypeScript + React/Vue                      │
│                                                        │
│  桌面 (macOS/Windows/Linux)：                          │
│  ┌─────────────────────────────────────────────────┐  │
│  │  Tauri (推荐)                                   │  │
│  │  • Rust 核心 + Web 前端                         │  │
│  │  • 体积小 (~10MB vs Electron ~150MB)           │  │
│  │  • 性能好，安全性高                             │  │
│  ├─────────────────────────────────────────────────┤  │
│  │  Electron (成熟)                                │  │
│  │  • Node.js + Chromium                          │  │
│  │  • 生态最成熟                                   │  │
│  │  • 体积大，内存占用高                           │  │
│  └─────────────────────────────────────────────────┘  │
│                                                        │
│  移动 (iOS/Android)：                                  │
│  • React Native                                       │
│  • Capacitor (Web 打包为原生 App)                     │
│                                                        │
│  Apple 独占平台：                                       │
│  • Watch/Vision 单独用 Swift 写                       │
│  • 通过 API/云服务与主应用同步                         │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## 推荐方案：Apple 生态 + 跨平台核心

针对需求：**Apple Watch + AR + Mac + Windows**

```
┌────────────────────────────────────────────────────────┐
│ 推荐技术栈                                             │
├────────────────────────────────────────────────────────┤
│                                                        │
│  ┌─────────────────────────────────────────────────┐  │
│  │  1. Swift + SwiftUI (必学)                      │  │
│  │                                                  │  │
│  │     Apple 生态核心，无可替代                     │  │
│  │                                                  │  │
│  │     • Apple Watch - 唯一选择                    │  │
│  │     • visionOS AR - 唯一选择                    │  │
│  │     • iOS/iPadOS - 最佳体验                     │  │
│  │     • macOS - 原生体验                          │  │
│  │                                                  │  │
│  └─────────────────────────────────────────────────┘  │
│                                                        │
│  ┌─────────────────────────────────────────────────┐  │
│  │  2. Rust (推荐，核心逻辑层)                     │  │
│  │                                                  │  │
│  │     跨平台共享业务逻辑                           │  │
│  │                                                  │  │
│  │     • 数据处理、业务规则                         │  │
│  │     • 网络请求、本地存储                         │  │
│  │     • 通过 FFI 被 Swift/C# 调用                │  │
│  │     • UniFFI 工具自动生成绑定                   │  │
│  │                                                  │  │
│  └─────────────────────────────────────────────────┘  │
│                                                        │
│  ┌─────────────────────────────────────────────────┐  │
│  │  3. Windows 方案 (三选一)                       │  │
│  │                                                  │  │
│  │     A. Tauri (Rust + Web)                      │  │
│  │        • 如果熟悉前端技术                       │  │
│  │        • 可复用 Rust 核心                       │  │
│  │                                                  │  │
│  │     B. C# + WinUI 3                            │  │
│  │        • 如果追求原生 Windows 体验              │  │
│  │        • 微软官方推荐                           │  │
│  │                                                  │  │
│  │     C. Flutter                                 │  │
│  │        • 如果想一套代码 macOS + Windows         │  │
│  │        • UI 一致性好                            │  │
│  │                                                  │  │
│  └─────────────────────────────────────────────────┘  │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## 学习路径

```
┌────────────────────────────────────────────────────────┐
│ 阶段式学习计划                                         │
├────────────────────────────────────────────────────────┤
│                                                        │
│  第一阶段：Swift + SwiftUI (3-6 个月)                  │
│  ┌─────────────────────────────────────────────────┐  │
│  │  基础                                           │  │
│  │  • Swift 语言语法                               │  │
│  │  • 可选类型、协议、泛型                          │  │
│  │  • async/await 并发                            │  │
│  │                                                  │  │
│  │  SwiftUI                                        │  │
│  │  • 声明式 UI 思想                               │  │
│  │  • 状态管理 (@State, @Binding, @Observable)    │  │
│  │  • 导航、列表、表单                             │  │
│  │                                                  │  │
│  │  平台开发                                        │  │
│  │  • iOS App 完整开发流程                         │  │
│  │  • watchOS 基础 (简化版 SwiftUI)               │  │
│  │  • macOS 适配                                   │  │
│  │  • visionOS 基础 (3D、空间计算)                │  │
│  └─────────────────────────────────────────────────┘  │
│                                                        │
│  第二阶段：Rust 核心逻辑 (2-3 个月)                    │
│  ┌─────────────────────────────────────────────────┐  │
│  │  Rust 基础                                      │  │
│  │  • 所有权、借用、生命周期                        │  │
│  │  • 错误处理 (Result/Option)                    │  │
│  │  • 模块系统、Cargo                             │  │
│  │                                                  │  │
│  │  跨平台设计                                      │  │
│  │  • 设计平台无关的核心逻辑层                      │  │
│  │  • 抽象平台特定功能                             │  │
│  │                                                  │  │
│  │  FFI 互操作                                     │  │
│  │  • UniFFI 自动生成 Swift/Kotlin 绑定           │  │
│  │  • cbindgen 生成 C 头文件                      │  │
│  │  • 内存管理注意事项                             │  │
│  └─────────────────────────────────────────────────┘  │
│                                                        │
│  第三阶段：Windows 支持 (2-3 个月)                     │
│  ┌─────────────────────────────────────────────────┐  │
│  │  选择一个方向深入：                              │  │
│  │                                                  │  │
│  │  Tauri 路线：                                   │  │
│  │  • Web 前端 (React/Vue/Svelte)                 │  │
│  │  • Tauri API                                   │  │
│  │  • 集成 Rust 核心                              │  │
│  │                                                  │  │
│  │  或 Flutter 路线：                              │  │
│  │  • Dart 语言                                   │  │
│  │  • Flutter Widget                              │  │
│  │  • flutter_rust_bridge 集成                   │  │
│  │                                                  │  │
│  │  或 C# 路线：                                   │  │
│  │  • C# 基础                                     │  │
│  │  • WinUI 3                                     │  │
│  │  • P/Invoke 调用 Rust                         │  │
│  └─────────────────────────────────────────────────┘  │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## AR 平台详解

```
┌────────────────────────────────────────────────────────┐
│ AR/VR 平台技术选型                                     │
├────────────────────────────────────────────────────────┤
│                                                        │
│  Apple Vision Pro (visionOS)                          │
│  ┌─────────────────────────────────────────────────┐  │
│  │  唯一选择：Swift + SwiftUI + RealityKit         │  │
│  │                                                  │  │
│  │  技术栈：                                        │  │
│  │  • SwiftUI - 2D 界面                           │  │
│  │  • RealityKit - 3D 渲染                        │  │
│  │  • ARKit - 空间追踪                            │  │
│  │  • Reality Composer Pro - 3D 资源              │  │
│  │                                                  │  │
│  │  特点：                                          │  │
│  │  • 消费级 AR 最成熟平台                         │  │
│  │  • 2024 年发布，生态早期                        │  │
│  │  • 与 iOS/macOS 代码高度复用                   │  │
│  └─────────────────────────────────────────────────┘  │
│                                                        │
│  Meta Quest (Android 基础)                            │
│  ┌─────────────────────────────────────────────────┐  │
│  │  主流选择：                                      │  │
│  │  • Unity (C#) - 最多教程和资源                  │  │
│  │  • Unreal Engine (C++) - AAA 级画质            │  │
│  │                                                  │  │
│  │  特点：偏向 VR 游戏和社交                        │  │
│  └─────────────────────────────────────────────────┘  │
│                                                        │
│  Microsoft HoloLens                                   │
│  ┌─────────────────────────────────────────────────┐  │
│  │  技术栈：                                        │  │
│  │  • Unity + MRTK (Mixed Reality Toolkit)        │  │
│  │  • 或 DirectX / OpenXR                         │  │
│  │                                                  │  │
│  │  特点：企业市场为主，价格高                       │  │
│  └─────────────────────────────────────────────────┘  │
│                                                        │
│  WebXR (浏览器 AR/VR)                                 │
│  ┌─────────────────────────────────────────────────┐  │
│  │  技术栈：JavaScript + Three.js / A-Frame       │  │
│  │                                                  │  │
│  │  特点：                                          │  │
│  │  • 无需安装，浏览器即可体验                      │  │
│  │  • 功能受限，性能一般                           │  │
│  │  • 适合轻量级 AR 体验                           │  │
│  └─────────────────────────────────────────────────┘  │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## 实际案例参考

| 应用 | 策略 | 技术栈 | 说明 |
|------|------|--------|------|
| **1Password** | Rust 核心 | Rust + Swift/Kotlin/C# | 核心逻辑 Rust，各平台原生 UI |
| **Figma** | Web + 原生 | C++/WASM + Electron | 桌面 Electron，核心 C++ |
| **Notion** | Web 优先 | Electron + React Native | 各平台体验一致 |
| **Slack** | 分别开发 | Swift + Kotlin + Electron | 各平台独立开发 |
| **Discord** | Rust 核心 | Rust + React Native + Electron | 高性能部分 Rust |
| **Linear** | Web 优先 | Web + Electron | 极致 Web 体验 |
| **Todoist** | 跨平台 | React Native + Electron | 移动优先 |
| **Things** | Apple 原生 | Swift (仅 Apple 平台) | 放弃其他平台，极致体验 |

---

## 工具与框架参考

### Swift ↔ Rust 互操作

```rust
// UniFFI 示例 - 定义 Rust 接口
// src/lib.rs

#[derive(uniffi::Record)]
pub struct User {
    pub id: String,
    pub name: String,
}

#[uniffi::export]
pub fn get_user(id: String) -> User {
    User {
        id,
        name: "Alice".to_string(),
    }
}

// 自动生成 Swift 绑定
// uniffi-bindgen generate --library libmylib.dylib --language swift
```

```swift
// Swift 调用
import MyRustLib

let user = getUser(id: "123")
print(user.name) // "Alice"
```

### Tauri 基础架构

```
my-tauri-app/
├── src-tauri/           # Rust 后端
│   ├── src/
│   │   └── main.rs      # Tauri 命令
│   └── Cargo.toml
├── src/                 # Web 前端
│   ├── App.tsx
│   └── main.tsx
├── package.json
└── tauri.conf.json
```

### Flutter + Rust

```yaml
# pubspec.yaml
dependencies:
  flutter_rust_bridge: ^2.0.0
```

---

## 总结

```
┌────────────────────────────────────────────────────────┐
│ 最终建议                                               │
├────────────────────────────────────────────────────────┤
│                                                        │
│  如果必须支持 Apple Watch / visionOS：                  │
│                                                        │
│    必学：Swift + SwiftUI                              │
│    推荐：Rust (核心逻辑跨平台复用)                      │
│    Windows：Tauri / Flutter / C#                      │
│                                                        │
│  如果可以放弃 Apple Watch / visionOS：                  │
│                                                        │
│    推荐：Flutter (最佳跨平台一致性)                     │
│    或者：React Native (Web 开发者友好)                 │
│                                                        │
│  接受现实：                                            │
│    没有一种语言能完美覆盖所有平台                       │
│    Apple 封闭生态意味着 Swift 是必修课                 │
│    合理的架构设计可以最大化代码复用                     │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## 参考资源

### Swift & Apple 平台
- [Swift 官方文档](https://docs.swift.org/)
- [SwiftUI 教程](https://developer.apple.com/tutorials/swiftui)
- [watchOS 开发指南](https://developer.apple.com/watchos/)
- [visionOS 开发文档](https://developer.apple.com/visionos/)

### Rust 跨平台
- [UniFFI](https://mozilla.github.io/uniffi-rs/) - Rust FFI 绑定生成
- [cbindgen](https://github.com/mozilla/cbindgen) - C 绑定生成
- [Tauri](https://tauri.app/) - Rust + Web 桌面应用

### 跨平台框架
- [Flutter](https://flutter.dev/)
- [React Native](https://reactnative.dev/)
- [.NET MAUI](https://docs.microsoft.com/dotnet/maui/)
- [Kotlin Multiplatform](https://kotlinlang.org/lp/multiplatform/)
