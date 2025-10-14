# 体育锻炼记录系统

基于 Electron 的桌面应用，用于记录和管理体育锻炼数据。

## 功能特点

- 记录跑步、力量训练等锻炼数据
- 可视化展示锻炼趋势和成果
- 查看和管理所有锻炼历史
- 数据本地存储，完全离线使用
- 自定义数据存储位置，方便备份和迁移

## 快速开始

### 安装依赖

```bash
npm install
```

### 运行应用

```bash
npm start
```

### 开发模式（带开发者工具）

```bash
npm run dev
```

## 项目结构

```
record_exercise/
├── src/                     # 源代码目录
│   ├── main/               # 主进程
│   │   ├── main.js         # Electron 主进程入口
│   │   └── preload.js      # IPC 通信桥接
│   └── renderer/           # 渲染进程
│       ├── index.html      # 应用界面
│       ├── css/
│       │   └── styles.css  # 样式文件
│       └── js/
│           └── app.js      # 前端逻辑
├── package.json            # 项目配置
└── README.md               # 项目文档
```

## 数据存储位置

### 默认存储位置

- **Windows**: `%APPDATA%\exercise-tracker-electron\exercise-data.json`
- **macOS**: `~/Library/Application Support/exercise-tracker-electron/exercise-data.json`
- **Linux**: `~/.config/exercise-tracker-electron/exercise-data.json`

### 自定义存储位置

从版本 1.0.0 开始，用户可以自定义数据文件的存储位置：

1. 打开应用，点击左侧菜单的"设置"
2. 在"数据存储位置"部分，点击"更改存储位置"按钮
3. 选择您想要保存数据文件的位置
4. 应用会自动将现有数据复制到新位置

**注意事项：**
- 更改存储位置后，原有数据会被自动复制到新位置
- 配置信息存储在默认的应用数据目录中
- 建议选择一个安全且方便备份的位置（如云同步文件夹）

## 打包发布

```bash
# 安装打包工具
npm install --save-dev electron-builder

# 打包应用
npm run dist
```

打包后的文件会在 `dist` 目录中。

## 技术栈

- Electron - 桌面应用框架
- Chart.js - 数据可视化
- JavaScript + CSS3

## 许可证

ISC
