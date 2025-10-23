# 日常记录系统

> 基于 Electron 的桌面应用，用于记录和管理日常运动与饮食数据。

![Version](https://img.shields.io/badge/version-3.2.0-blue.svg)
![Electron](https://img.shields.io/badge/electron-28.0.0-brightgreen.svg)
![License](https://img.shields.io/badge/license-ISC-orange.svg)

## ✨ 核心特性

### 🏃‍♂️ 运动记录
- **跑步类型选择**：长跑 / 跑速耐训练
  - **长跑**：记录时长、距离、配速自动计算
  - **跑速耐**：记录每组距离（米）、组数、配速、训练备注
- **力量训练**：俯卧撑、深蹲、登山跑等项目记录
- **体感日志**：记录每次运动的感受和状态
- **智能搜索**：快速查找历史记录（支持跑速耐数据）
- **多列排序**：按日期、距离、时长等排序

### 🍽️ 饮食记录（v3.0 新增）
- **三餐管理**：独立记录早餐、午餐、晚餐
- **详细信息**：进餐时间、食物内容、备注说明
- **卡片展示**：按日期分组，直观查看饮食习惯
- **智能搜索**：按日期、食物、备注快速过滤

### 📊 数据统计与可视化
- **趋势图表**：折线图/柱状图，支持按天/周/月统计
- **配速分析**：跑步配速变化趋势
- **力量训练统计**：多项目数据对比
- **热力图日历**：全年运动分布（类似 GitHub）
- **自定义日期范围**：灵活选择统计周期

### 🤖 AI 运动助手
- **智能分析**：基于历史数据提供专业建议
- **数据类型选择**：运动数据、饮食数据或全部数据
- **流式输出**：逐字显示，流畅对话体验
- **Markdown 支持**：完整格式渲染（表格、列表、代码块等）
- **多 API 兼容**：OpenAI、Claude、Ollama（本地）等
- **隐私保护**：配置本地存储，支持离线部署

### 🎨 主题与界面
- **深色/浅色模式**：护眼深色与清爽浅色
- **5 种主题颜色**：紫色、蓝色、绿色、橙色、粉色
- **偏好记忆**：主题设置自动保存
- **响应式设计**：优雅的动画和交互

### 💾 数据管理
- **本地存储**：完全离线，数据安全
- **自定义路径**：自由选择数据存储位置
- **自动迁移**：更改路径时自动复制数据
- **JSON 格式**：易于备份和手动编辑

## 🚀 快速开始

### 环境要求
- Node.js 14.0+
- npm 或 yarn

### 安装与运行

```bash
# 安装依赖
npm install

# 运行应用（生产模式）
npm start

# 开发模式（带开发者工具）
npm run dev
```

### 打包发布

```bash
# 构建所有平台
npm run dist

# Windows 版本
npm run dist:win

# 简化版（便携版，无签名）
npm run dist:simple

# macOS 版本
npm run dist:mac

# Linux 版本
npm run dist:linux
```

打包后的文件位于 `dist` 目录。

## 📁 项目结构

```
record/
├── src/
│   ├── main/                    # Electron 主进程
│   │   ├── main.js             # 应用入口、窗口管理、IPC 通信
│   │   └── preload.js          # 安全的 IPC 桥接层
│   └── renderer/                # 渲染进程（前端）
│       ├── index.html          # 应用界面
│       ├── css/
│       │   └── styles.css      # 样式（含主题系统）
│       └── js/
│           └── app.js          # 前端业务逻辑
├── package.json                 # 项目配置
├── CHANGELOG.md                 # 版本更新日志
└── README.md                    # 项目文档
```

## 💾 数据存储

### 默认存储位置

- **Windows**: `%APPDATA%\exercise-tracker-electron\`
- **macOS**: `~/Library/Application Support/exercise-tracker-electron/`
- **Linux**: `~/.config/exercise-tracker-electron/`

包含以下文件：
- `exercise-data.json` - 运动记录
- `diet-data.json` - 饮食记录
- `config.json` - 应用配置（AI 设置、主题偏好等）

### 自定义存储位置

1. 打开应用 → **设置** → **数据存储位置**
2. 点击 **"更改存储目录"**
3. 选择新位置，数据会自动迁移

### 数据格式

**运动记录示例（长跑）**：
```json
{
  "id": 1234567890,
  "date": "2025-10-15",
  "runTime": "06:30",
  "runType": "longRun",
  "runDurationSeconds": 1800,
  "runDistance": 5.2,
  "pushups": 50,
  "squats": 30,
  "mountainClimbers": 40,
  "feeling": "今天状态不错"
}
```

**运动记录示例（跑速耐）**：
```json
{
  "id": 1234567891,
  "date": "2025-10-16",
  "runTime": "06:30",
  "runType": "speedEndurance",
  "distancePerSet": 400,
  "sets": 6,
  "pacePerSet": "1'30\"",
  "speedEnduranceNotes": "休息2分钟，感觉不错",
  "pushups": 30,
  "squats": 20,
  "mountainClimbers": 20,
  "feeling": "速度耐力训练"
}
```

**饮食记录示例**：
```json
{
  "id": 1234567891,
  "date": "2025-10-15",
  "breakfast": {
    "time": "07:30",
    "foods": "燕麦粥、鸡蛋、牛奶",
    "notes": "健康搭配"
  },
  "lunch": {
    "time": "12:00",
    "foods": "鸡胸肉、蔬菜沙拉",
    "notes": "低脂高蛋白"
  },
  "dinner": {
    "time": "18:30",
    "foods": "糙米饭、清蒸鱼",
    "notes": "清淡晚餐"
  }
}
```

## 🛠️ 技术栈

### 核心技术
- **Electron** ^28.0.0 - 跨平台桌面应用框架
- **Chart.js** ^4.4.0 - 数据可视化图表库
- **HTML5** - 语义化标签，现代化界面
- **CSS3** - CSS 变量、Grid、Flexbox、动画
- **JavaScript (ES6+)** - 模块化、async/await

### 开发工具
- **Electron Builder** - 应用打包和分发
- **Node.js** - 运行时环境

### 架构特点
- **Context Isolation** - 安全的进程隔离
- **IPC 通信** - 主进程与渲染进程通信
- **CSS 主题系统** - 基于 CSS 变量的动态主题
- **LocalStorage** - 用户偏好持久化

## 📖 使用指南

### 添加运动记录
1. 点击侧边栏 **"添加记录"** → **"运动记录"** 标签
2. 选择跑步类型：
   - **长跑**：填写跑步时长、距离（自动计算配速）
   - **跑速耐**：填写每组距离（米）、组数、配速（如 1'30"）、训练备注
3. 填写其他数据：
   - 日期、跑步时间
   - 俯卧撑、深蹲、登山跑个数
   - 体感记录（可选）
4. 点击 **"保存记录"**

### 添加饮食记录
1. 点击侧边栏 **"添加记录"** → **"饮食记录"** 标签
2. 选择日期，填写三餐信息：
   - 进餐时间
   - 食物内容
   - 备注说明
3. 点击 **"保存记录"**

### 查看历史记录
1. 点击侧边栏 **"历史记录"**
2. 切换 **"运动历史"** 或 **"饮食历史"** 标签
3. 使用搜索框查找记录
4. 点击表头排序（运动记录）
5. 点击 **"删除"** 按钮删除记录

### 数据统计
1. 点击侧边栏 **"数据统计"**
2. 查看热力图了解全年运动分布
3. 选择统计周期（按天/周/月）
4. 选择图表类型（折线图/柱状图）
5. 设置日期范围，点击图表选项查看不同维度

### 使用 AI 助手
1. 点击侧边栏 **"AI 助手"**
2. 首次使用需在 **"设置"** 配置：
   - **API 地址**：如 `https://api.openai.com/v1/chat/completions`
   - **API Key**：您的密钥
   - **模型名称**：如 `gpt-4`、`llama3` 等
3. 选择数据类型（全部/运动/饮食）
4. 输入问题或点击快速问题按钮
5. AI 基于您的数据提供专业建议

**支持的 AI 服务**：
- OpenAI (GPT-3.5/GPT-4)
- Claude (Anthropic)
- Ollama（本地免费，需安装 [Ollama](https://ollama.ai/)）
- 其他兼容 OpenAI API 的服务

### 个性化设置
1. 在侧边栏底部切换深色/浅色模式和主题颜色
2. 在 **"设置"** 页面：
   - 配置 AI 参数
   - 更改数据存储位置
   - 查看应用版本

## 🔧 代码重构（v3.0）

v3.0 版本在添加饮食功能的同时，进行了全面的代码重构，大幅提升了代码质量：

### 重构成果
- ✅ **消除 78% 重复代码**（200 行 → 45 行）
- ✅ **提升可维护性**：通用函数设计，易于扩展
- ✅ **统一代码风格**：一致的调用模式
- ✅ **增强可读性**：清晰的函数职责

### 主要优化

**1. 主进程 (main.js)**
- 提取 `handleSaveRecord()` / `handleDeleteRecord()` 通用函数
- 创建 `setDataDirectory()` 集中管理配置
- 减少 60+ 行重复代码

**2. 预加载层 (preload.js)**
- 引入 `invoke()` / `invokeWith()` 简化 IPC 调用
- 代码精简 44%（34 行 → 19 行）

**3. 渲染层 (app.js)**
- 提取 `submitFormWithFeedback()` 统一表单处理
- 创建 `setActiveClass()` 统一样式切换
- 减少 90+ 行重复代码

**4. 样式文件 (styles.css)**
- 保留 CSS 变量系统，无过度抽象
- 主题切换稳定可靠

详细的重构过程和代码对比，请查看 Git 提交历史。

## 🔄 版本更新检查清单

在更新版本号时，**务必**检查并修改以下所有位置（避免遗漏）：

### ✅ 必须修改的文件

| 文件 | 位置 | 说明 |
|------|------|------|
| **package.json** | `"version": "x.x.x"` | NPM 包版本号 |
| **CHANGELOG.md** | 文件开头添加新版本日志 | 详细记录本次更新内容 |
| **src/renderer/index.html** | 设置页面 → 关于部分 | 搜索 `<p>版本：` 修改版本号 |

### 📋 检查步骤

1. **确定版本号规则**（遵循语义化版本）：
   - 主版本号（Major）：重大功能更新或不兼容的改动
   - 次版本号（Minor）：新增功能，向后兼容
   - 修订号（Patch）：Bug 修复和小优化

2. **修改文件**：
   ```bash
   # 1. 修改 package.json
   "version": "3.0.0"  # 新版本号
   
   # 2. 修改 CHANGELOG.md
   ## v3.0.0 - 标题
   ### 🎯 主要更新
   ...
   
   # 3. 修改 src/renderer/index.html（约 704 行）
   <p>版本：3.0.0</p>
   ```

3. **验证修改**：
   ```bash
   # 搜索旧版本号，确保没有遗漏
   git grep "2.1.1"  # 搜索旧版本号
   git grep "版本"   # 检查中文版本号
   ```

4. **测试应用**：
   ```bash
   npm start
   # 检查"设置 → 关于"页面显示的版本号是否正确
   ```

5. **提交代码**：
   ```bash
   git add .
   git commit -m "v3.0.0 - 更新说明"
   git tag v3.0.0
   ```

### ⚠️ 常见遗漏

- ❌ **最容易遗漏**：`src/renderer/index.html` 中的版本号（每次都检查！）
- ❌ 忘记更新 CHANGELOG.md
- ❌ package.json 和 HTML 中的版本号不一致

### 💡 提示

建议使用全局搜索查找旧版本号，确保所有位置都已更新：
```bash
# 在项目根目录执行
git grep "<旧版本号>"  # 例如：git grep "2.1.1"
```

## 🔒 安全与隐私

- ✅ 数据完全本地存储，不上传服务器
- ✅ 无需注册账号，无需联网使用
- ✅ Context Isolation 确保渲染进程安全
- ✅ 开源代码，可自行审计
- ✅ AI 配置加密保存在本地

## 📝 更新日志

详细的版本更新记录请查看 [CHANGELOG.md](CHANGELOG.md)。

当前版本：**v3.2.0** - 跑速耐训练记录功能 + 程序名称修正

## 📄 许可证

ISC License

---

**Made with ❤️ for healthy living**
