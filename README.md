```

```

# Oll - Ollama 模型管理工具

Oll 是一个基于 Tauri + Vue 3 开发的 Ollama 模型管理工具，提供了友好的图形界面来管理和使用本地大语言模型。它可以帮助你轻松地下载、管理和使用各种开源大语言模型。

![应用截图](screenshots/main.png)

## ✨ 主要特性

### 🤖 模型管理

- 浏览和搜索可用模型库
- 一键下载模型，支持多种量化版本
- 查看模型详细信息(参数量、架构等)
- 管理本地已安装模型
- 实时显示下载进度

### 💬 聊天功能

- 多会话管理，支持会话重命名和拖拽排序
- 实时对话，支持流式响应
- Markdown 渲染和代码高亮
- 消息操作(复制、重新生成、收藏等)
- 系统提示词(System Prompt)设置

### 🔖 收藏夹

- 收藏重要消息便于后续查看
- 强大的标签管理系统
- 支持导出导入收藏
- 灵活的筛选和排序功能

### ⚙️ 系统设置

- Ollama 服务器配置
- 下载参数设置
- 界面主题定制

## 🚀 快速开始

### 环境要求

- [Node.js](https://nodejs.org/) >= 16
- [Rust](https://www.rust-lang.org/) >= 1.70
- [Ollama](https://ollama.ai/) 已安装并运行

### 安装步骤

1. 克隆仓库

   ```
   git clone https://github.com/yourusername/oll.git
   cd oll
   ```

2. 安装依赖

   ```bash
   npm install
   ```

3. 启动开发服务器

   ```bash
   npm tauri dev
   ```

4. 构建应用

   ```bash
   npm tauri build
   ```

## 🛠️ 技术栈

- [Tauri](https://tauri.app/) - 跨平台应用框架
- [Vue 3](https://vuejs.org/) - 前端框架
- [Pinia](https://pinia.vuejs.org/) - 状态管理
- [Vue Router](https://router.vuejs.org/) - 路由管理
- [Tailwind CSS](https://tailwindcss.com/) - 样式框架
- [shadcn-vue](https://www.shadcn-vue.com/) - UI 组件库
- [Lucide Icons](https://lucide.dev/) - 图标库

## 📁 项目结构

```
src/
├── assets/ # 静态资源
├── components/ # 组件
│ ├── chat/ # 聊天相关组件
│ ├── layout/ # 布局组件
│ └── ui/ # UI 组件
├── stores/ # Pinia 状态管理
│ ├── chatStore.js # 聊天状态
│ ├── modelStore.js # 模型状态
│ └── settingStore.js # 设置状态
├── views/ # 页面视图
├── router/ # 路由配置
└── utils/ # 工具函数
```

## 💡 主要功能说明

### 模型搜索

- 支持按名称、描述、标签搜索
- 高级筛选(大小、下载量、模型系列等)
- 实时显示下载进度和状态
- 支持取消下载

### 本地模型管理

- 查看模型详细信息
- 一键删除模型
- 查看模型系统提示词
- 显示模型参数和许可证信息

### 聊天功能

- 支持多个并行会话
- 实时流式对话响应
- Markdown 和代码高亮渲染
- 消息操作(复制、重新生成、收藏等)
- 导出聊天记录

### 收藏夹功能

- 标签系统管理收藏消息
- 支持标签颜色和分类
- 灵活的筛选和排序
- 导出导入收藏数据
- 批量操作功能

## 📝 开发指南

### 推荐开发环境

- [VS Code](https://code.visualstudio.com/)
- [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar)
- [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode)
- [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

### 开发命令

bash
启动开发服务器
pnpm tauri dev
构建应用
pnpm tauri build
更新模型库数据
pnpm fetch-models

## ❓ 常见问题

1. Ollama 连接失败

- 确保 Ollama 已正确安装并运行
- 检查默认端口(11434)是否被占用
- 查看 Ollama 服务日志

2. 模型下载失败

- 检查网络连接
- 确保磁盘空间充足
- 尝试更换模型变体

3. 应用闪退

- 检查 Rust 和 Node.js 版本
- 查看应用日志
- 清理缓存后重试

## 📄 许可证

[MIT License](LICENSE)

## 🙏 致谢

- [Ollama](https://ollama.ai/) - 本地大语言模型运行时
- [Tauri](https://tauri.app/) - 跨平台应用框架
- [shadcn-vue](https://www.shadcn-vue.com/) - UI 组件库
