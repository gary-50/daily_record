# 📚 Google Drive 云同步完整指南

> 本文档包含 Google Drive 智能云同步功能的完整说明，包括配置步骤、使用指南、安全实践和故障排查。

---

## 📋 目录

1. [功能概述](#功能概述)
2. [Google OAuth 配置](#google-oauth-配置)
3. [功能使用指南](#功能使用指南)
4. [安全最佳实践](#安全最佳实践)
5. [开发者检查清单](#开发者检查清单)
6. [故障排查](#故障排查)

---

## 功能概述

### ✨ 核心特性

- **智能增量同步**：只同步变更的数据，节省流量和时间
- **多设备数据一致性**：在不同设备间自动同步数据
- **自动冲突解决**：当多设备同时修改时，自动合并数据
- **启动时自动同步**：应用启动时自动检查并同步云端数据
- **版本管理**：跟踪数据版本，支持增量更新
- **安全隐私**：数据存储在 Google Drive 应用专属文件夹，对用户不可见

### 🏗️ 技术架构

**环境变量方案**：
```
.env 文件（本地） → dotenv 读取 → 应用使用
     ↓
  Git 忽略
  不会提交
```

**数据存储结构**：
```
Google Drive / appDataFolder /
├── exercise-data.json    # 运动记录
├── diet-data.json       # 饮食记录
└── sync-metadata.json   # 同步元数据
```

---

## Google OAuth 配置

### 🚀 快速配置（5分钟）

#### 第一步：创建 Google Cloud 项目

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 点击顶部"选择项目" → "新建项目"
3. 输入项目名称（例如："日常记录系统"）
4. 点击"创建"

#### 第二步：启用 Google Drive API

1. 在左侧菜单选择"API 和服务" → "库"
2. 搜索 "Google Drive API"
3. 点击进入，点击"启用"

#### 第三步：创建 OAuth 2.0 凭据

1. 左侧菜单选择"API 和服务" → "凭据"
2. 如果提示配置同意屏幕：
   - 选择"外部"用户类型（个人使用选"内部"）
   - 填写应用名称
   - 填写邮箱
   - 其他选项可跳过
   - 保存并继续
3. 返回"凭据"页面
4. 点击"+ 创建凭据" → "OAuth 客户端 ID"
5. 应用类型选择 **"桌面应用"**
6. 输入名称（例如："日常记录系统"）
7. 点击"创建"
8. **记录显示的 Client ID 和 Client Secret**

#### 第四步：配置环境变量

1. 在项目根目录，复制 `.env.example` 为 `.env`：
   ```bash
   cp .env.example .env
   ```

2. 编辑 `.env` 文件，填入你的凭据：
   ```env
   GOOGLE_CLIENT_ID=你的Client_ID.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=你的Client_Secret
   ```

3. 保存文件

#### 第五步：运行应用

```bash
npm start
```

应用会自动读取 `.env` 文件中的凭据。

### 📁 文件说明

```
project/
├── .env              # 你的凭据（不会提交到 Git）
├── .env.example      # 配置模板（会提交到 Git）
└── .gitignore        # 确保 .env 不被提交
```

---

## 功能使用指南

### 🎯 使用场景

#### 场景 1：单设备备份

**目的**：防止数据丢失，定期备份到云端

**操作**：
1. 配置并登录 Google
2. 每次添加重要记录后，点击"立即同步"
3. 建议开启"启动时自动同步"

#### 场景 2：多设备同步

**目的**：在家里电脑和公司电脑之间同步数据

**设备 A（家里）操作**：
1. 配置并登录 Google
2. 点击"立即同步"上传本地数据

**设备 B（公司）操作**：
1. 使用相同的 Client ID 和 Secret 配置
2. 登录相同的 Google 账号
3. 点击"立即同步"下载数据
4. 开启"启动时自动同步"

**日常使用**：
- 在任意设备添加记录
- 应用启动时会自动同步
- 手动点击"立即同步"确保数据最新

#### 场景 3：数据恢复

**目的**：电脑重装系统或更换设备后恢复数据

**操作**：
1. 在新设备安装应用
2. 配置 Google Client ID 和 Secret
3. 登录 Google 账号
4. 点击"立即同步"
5. 所有数据会自动下载并恢复

### 📖 详细功能

#### 1. 智能同步机制

**工作原理**：
- 应用会在 Google Drive 的 `appDataFolder`（应用专属文件夹）中存储数据
- 每次同步时，会比较本地和云端的数据版本
- 自动合并本地和云端的变更，解决冲突
- 使用唯一 ID 识别每条记录，确保不重复

#### 2. 冲突解决策略

当在多个设备上同时修改数据时，应用会：

1. **按 ID 合并**：
   - 如果两个设备都有相同 ID 的记录，选择修改时间较新的
   
2. **保留所有新增**：
   - 设备 A 新增的记录和设备 B 新增的记录都会保留
   
3. **自动去重**：
   - 使用记录的唯一 ID 确保不会重复

**示例场景**：
```
设备 A：新增了 2025-10-24 的运动记录
设备 B：新增了 2025-10-23 的饮食记录

同步后：两台设备都会包含这两条记录
```

#### 3. 版本管理

应用使用版本号追踪数据变更：

- **运动数据版本**：每次修改运动记录时版本号 +1
- **饮食数据版本**：每次修改饮食记录时版本号 +1
- **设备标识**：记录最后同步的设备信息

点击 **"查看同步状态"** 可以看到：
- 最后同步时间
- 当前数据版本
- 是否是当前设备

#### 4. 启动时自动同步

勾选 **"启动时自动同步"** 后：

1. 应用启动时会自动检查 Google 登录状态
2. 如果已登录，会自动执行一次完整同步
3. 同步过程在后台进行，不影响应用使用
4. 如果检测到冲突，会自动合并数据

**注意**：
- 如果 Token 过期，会自动刷新
- 如果刷新失败，需要重新登录

### 🎮 操作指南

#### 添加运动记录
1. 点击侧边栏 **"添加记录"** → **"运动记录"** 标签
2. 选择跑步类型（长跑/跑速耐）
3. 填写相关数据
4. 点击 **"保存记录"**
5. 如果已登录 Google 且开启自动同步，数据会自动上传

#### 添加饮食记录
1. 点击侧边栏 **"添加记录"** → **"饮食记录"** 标签
2. 选择日期，填写三餐信息
3. 点击 **"保存记录"**
4. 数据自动同步到云端

#### 使用 AI 助手
1. 点击侧边栏 **"AI 助手"**
2. 首次使用需在 **"设置"** 配置 AI API
3. 选择数据类型（全部/运动/饮食）
4. 输入问题或点击快速问题按钮
5. AI 基于你的数据提供专业建议

---

## 安全最佳实践

### 🔐 环境变量 vs 硬编码

#### 环境变量方案（当前采用）

**优势**：
- ✅ 凭据不出现在代码中
- ✅ 适合开源项目
- ✅ 每个开发者独立配置
- ✅ CI/CD 友好

**适用场景**：
- 开源项目
- 多开发者协作
- 需要不同环境配置

#### 硬编码方案

**优势**：
- ✅ 用户体验好（无需配置）
- ✅ 适合闭源分发

**风险**：
- ⚠️ 代码泄露会暴露凭据
- ⚠️ 不适合开源

**适用场景**：
- 闭源商业软件
- 只有你一个开发者

### 🛡️ 安全检查清单

#### 开发阶段

- [ ] `.env` 文件已添加到 `.gitignore`
- [ ] 确认 `.env` 不在 Git 待提交列表
- [ ] 代码中没有硬编码的 Client Secret
- [ ] 使用 `process.env` 读取环境变量

#### 提交代码前

```bash
# 检查 .env 是否被忽略
git status
# .env 应该不在列表中

# 检查历史提交
git log --all --full-history --source -- .env
# 应该没有输出

# 搜索代码中的敏感信息
grep -r "GOCSPX-" src/
# 应该没有输出
```

#### 打包发布前

- [ ] 确认 `.env` 不在打包文件列表中
- [ ] 测试打包后的应用能否正常运行
- [ ] 确认 dotenv 在 `dependencies` 中（不是 `devDependencies`）

### 🔒 最佳实践

#### ✅ 推荐做法

1. **个人使用**：
   - 配置 `.env` 文件
   - 不要提交 `.env` 到 Git
   - 打包后的应用包含凭据，可以分享

2. **团队开发**：
   - 每个开发者配置自己的 `.env`
   - 通过安全渠道分享测试用的凭据（如 1Password）

3. **开源项目**：
   - 只提交 `.env.example` 模板
   - 在 README 中说明配置步骤
   - 在 CI/CD 中使用 Secrets 管理凭据

#### ❌ 避免做法

- ❌ 将 `.env` 提交到 Git
- ❌ 在代码中硬编码凭据
- ❌ 在公开场合分享 Client Secret
- ❌ 使用生产凭据进行测试

### 🔄 如果凭据已泄露

1. 登录 [Google Cloud Console](https://console.cloud.google.com/)
2. 进入"API 和服务" → "凭据"
3. 找到泄露的 OAuth 客户端 ID
4. 点击"删除"
5. 创建新的 OAuth 客户端 ID
6. 更新 `.env` 文件中的凭据

---

## 开发者检查清单

### 🎯 首次配置

#### 文件检查

- [ ] 项目根目录存在 `.env` 文件
- [ ] `.env` 文件包含 `GOOGLE_CLIENT_ID` 和 `GOOGLE_CLIENT_SECRET`
- [ ] `.gitignore` 包含 `.env`
- [ ] 存在 `.env.example` 模板文件

#### 配置验证

- [ ] `.env` 文件格式正确（没有引号、空格）
  ```env
  GOOGLE_CLIENT_ID=你的ID.apps.googleusercontent.com
  GOOGLE_CLIENT_SECRET=你的Secret
  ```
- [ ] Client ID 以 `.apps.googleusercontent.com` 结尾
- [ ] Client Secret 格式为 `GOCSPX-` 开头

#### Google Cloud 配置

- [ ] 已创建 Google Cloud 项目
- [ ] 已启用 Google Drive API
- [ ] 已创建 OAuth 2.0 凭据（桌面应用）
- [ ] OAuth 同意屏幕已配置

#### 功能测试

```bash
# 运行应用
npm start

# 检查控制台输出
# 应该看到: [dotenv] injecting env (2) from .env

# 测试登录功能
1. 打开应用 → 设置
2. 点击"登录 Google"
3. 应该弹出授权窗口
4. 授权成功后应显示"已登录：你的邮箱"

# 测试同步功能
1. 添加一条记录
2. 点击"立即同步"
3. 应该显示"同步完成"
```

### 🚀 打包发布前检查

#### 安全检查

- [ ] 确认 `.env` 在 `.gitignore` 中
- [ ] 确认 `.env` 未被提交到 Git
  ```bash
  git status
  # .env 应该不在待提交列表中
  ```
- [ ] 检查历史提交中是否泄露凭据
  ```bash
  git log --all --full-history --source -- .env
  # 应该没有输出
  ```

#### 打包配置

- [ ] `package.json` 中 `build.files` 不包含 `.env`
- [ ] `dotenv` 在 `dependencies` 中（不是 `devDependencies`）
- [ ] 打包后的应用能正常读取环境变量

#### 分发准备

如果你要分发应用给其他用户：

**选项 A：包含你的凭据（推荐）**
- [ ] 打包时 `.env` 会被 dotenv 读取
- [ ] 用户无需任何配置，直接使用
- [ ] 每个用户用自己的 Google 账号登录
- [ ] ✅ 适合闭源/商业分发

**选项 B：让用户自己配置**
- [ ] 提供 `.env.example` 给用户
- [ ] 在 README 中说明配置步骤
- [ ] 用户需要自己创建 Google Cloud 项目
- [ ] ✅ 适合开源项目

---

## 故障排查

### 🐛 常见问题

#### 问题 1：应用提示"Google OAuth 凭据未配置"

**原因**：`.env` 文件不存在或配置错误

**解决方法**：
1. 确认项目根目录存在 `.env` 文件
   ```bash
   ls -la .env
   ```
2. 检查文件内容格式：
   ```env
   GOOGLE_CLIENT_ID=你的ID
   GOOGLE_CLIENT_SECRET=你的Secret
   ```
3. 确保没有多余空格或引号
4. 重启应用

#### 问题 2：登录失败，提示 "invalid_client"

**原因**：Client ID 或 Secret 错误

**解决方法**：
1. 检查 `.env` 中的凭据是否完整复制
2. 确认 Google Cloud Console 中凭据类型为"桌面应用"
3. 重新复制凭据到 `.env`
4. 重启应用

#### 问题 3：授权后提示 "redirect_uri_mismatch"

**原因**：重定向 URI 不匹配

**解决方法**：
1. 进入 Google Cloud Console → 凭据
2. 编辑 OAuth 客户端
3. 确认"授权的重定向 URI"包含 `http://localhost`
4. 保存后重试

#### 问题 4：环境变量未加载

**原因**：dotenv 未正确配置或安装

**解决方法**：
```bash
# 确认 dotenv 已安装
npm list dotenv

# 检查 main.js 是否加载 dotenv
grep "require('dotenv')" src/main/main.js

# 重新安装依赖
rm -rf node_modules
npm install
```

#### 问题 5：同步失败

**可能原因**：
- 网络连接中断
- Token 过期且刷新失败
- Google Drive API 配额用尽

**解决方法**：
1. 检查网络连接
2. 尝试重新登录：设置 → 登出 → 重新登录
3. 查看控制台错误信息（开发模式下：`npm run dev`）
4. 检查 Google Cloud Console 中 API 配额使用情况

#### 问题 6：数据冲突

**可能原因**：
- 多设备同时修改了同一条记录
- 长时间未同步

**解决方法**：
- 应用会自动解决冲突，选择最新的记录
- 如果需要手动检查，可以查看两个设备的数据
- 建议：多设备使用时，先同步再修改

#### 问题 7：启动时同步很慢

**可能原因**：
- 首次同步数据量大
- 网络速度慢

**解决方法**：
- 首次同步耐心等待
- 后续同步会快很多（增量同步）
- 可以暂时关闭"启动时自动同步"

#### 问题 8：打包后凭据丢失

**原因**：dotenv 不在生产依赖中

**解决方法**：
```bash
# 确认 dotenv 在 dependencies 中（不是 devDependencies）
npm list --prod dotenv

# 如果不在，重新安装
npm install --save dotenv

# 重新打包
npm run dist
```

### 🔍 调试技巧

#### 开启开发者工具

```bash
npm run dev
```

#### 查看同步日志

打开开发者工具 → Console 标签，查看同步过程中的日志输出。

#### 检查环境变量

在 `main.js` 中临时添加：
```javascript
console.log('Client ID:', process.env.GOOGLE_CLIENT_ID ? '已配置' : '未配置');
console.log('Secret:', process.env.GOOGLE_CLIENT_SECRET ? '已配置' : '未配置');
```

#### 手动测试 Google API

```bash
# 使用 curl 测试 OAuth
curl -X POST https://oauth2.googleapis.com/token \
  -d "client_id=你的CLIENT_ID" \
  -d "client_secret=你的SECRET" \
  -d "code=授权码" \
  -d "grant_type=authorization_code"
```

---

## 📚 扩展阅读

### 官方文档

- [Google OAuth 2.0 文档](https://developers.google.com/identity/protocols/oauth2)
- [Google Drive API 文档](https://developers.google.com/drive/api/v3/about-sdk)
- [Electron 安全指南](https://www.electronjs.org/docs/latest/tutorial/security)
- [dotenv 文档](https://github.com/motdotla/dotenv)

### 最佳实践

- [12-Factor App - 配置管理](https://12factor.net/config)
- [OAuth 2.0 安全最佳实践](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics)

---

## 📞 获取帮助

遇到问题？

1. 查看本文档的"故障排查"部分
2. 检查 `.env` 文件配置是否正确
3. 查看应用控制台的错误信息（开发模式）
4. 提交 Issue（**不要包含真实凭据**）

---

## 🎉 总结

### 已实现的功能

- ✅ Google OAuth 2.0 认证
- ✅ Google Drive 智能增量同步
- ✅ 多设备数据自动合并
- ✅ 冲突自动解决
- ✅ 启动时自动同步
- ✅ 环境变量安全配置

### 技术特点

- ✅ 使用环境变量管理凭据
- ✅ 增量同步算法，节省流量
- ✅ 版本管理系统
- ✅ Token 自动刷新
- ✅ 完整的错误处理

### 安全保障

- ✅ 凭据不提交到代码仓库
- ✅ 数据存储在用户自己的 Google Drive
- ✅ 使用加密连接传输数据
- ✅ Context Isolation 进程隔离

---

**享受智能云同步带来的便利吧！** 🚀

如有任何问题或建议，欢迎提交 Issue 或 Pull Request。
