# JavaScript 模块结构说明

本项目已完成模块化重构，将原本的单文件代码拆分为多个独立模块，提升代码可维护性和可复用性。

## 📁 目录结构

```
js/
├── app.js                    # 主应用文件，整合所有模块
├── utils/                    # 工具函数模块
│   ├── constants.js          # 常量定义（CONSTANTS, PAGINATION, TOAST_ICONS）
│   └── helpers.js            # 辅助函数（debounce, 时间转换, 配速计算等）
├── managers/                 # 管理器类模块
│   ├── EventManager.js       # 事件管理器（防止内存泄漏）
│   ├── DataCache.js          # 数据缓存管理器（LRU缓存）
│   └── ErrorHandler.js       # 统一错误处理器
└── validators/               # 数据验证模块
    └── dataValidators.js     # 数据验证函数（运动记录、饮食记录）
```

## 📦 模块说明

### 1. utils/constants.js
**导出内容：**
- `CONSTANTS` - 应用常量配置
- `PAGINATION` - 分页配置
- `TOAST_ICONS` - 提示图标

**使用示例：**
```javascript
import { CONSTANTS, PAGINATION } from './utils/constants.js';

console.log(CONSTANTS.PAGE_SIZE); // 50
console.log(PAGINATION.exercise.currentPage); // 1
```

### 2. utils/helpers.js
**导出函数：**
- `debounce(func, wait)` - 防抖函数
- `timeToSeconds(timeStr)` - 时间字符串转秒数
- `secondsToTime(totalSeconds)` - 秒数转时间字符串
- `calculatePace(durationSeconds, distanceKm)` - 计算配速
- `truncateText(text, limit)` - 截断文本
- `escapeHtml(text)` - HTML转义
- `setActiveClass(selector, activeElement)` - 设置活动状态

**使用示例：**
```javascript
import { debounce, calculatePace } from './utils/helpers.js';

const debouncedSearch = debounce(handleSearch, 300);
const pace = calculatePace(3600, 10); // "6'00""
```

### 3. managers/EventManager.js
**类：EventManager**

**方法：**
- `add(element, event, handler, options)` - 添加事件监听器
- `remove(key)` - 移除指定监听器
- `removeAll()` - 清理所有监听器
- `getListenerCount()` - 获取监听器数量

**使用示例：**
```javascript
import { EventManager } from './managers/EventManager.js';

const eventManager = new EventManager();
eventManager.add(button, 'click', handleClick);
eventManager.removeAll(); // 清理所有监听器
```

**特点：**
- 自动生成唯一ID
- 防止内存泄漏
- 支持批量清理

### 4. managers/DataCache.js
**类：DataCache**

**方法：**
- `generateKey(prefix, params)` - 生成缓存键
- `get(key)` - 获取缓存数据
- `set(key, data, ttl)` - 设置缓存数据
- `clear()` - 清除所有缓存
- `invalidate(pattern)` - 清除匹配模式的缓存
- `getStats()` - 获取缓存统计信息

**使用示例：**
```javascript
import { DataCache } from './managers/DataCache.js';

const statsCache = new DataCache(100); // 最大100条
const cacheKey = statsCache.generateKey('stats', { date: '2025-10-27' });
statsCache.set(cacheKey, data, 300000); // 5分钟过期
const cachedData = statsCache.get(cacheKey);
```

**特点：**
- LRU淘汰策略
- 支持过期时间
- 模式匹配清除

### 5. managers/ErrorHandler.js
**类：ErrorHandler**

**静态方法：**
- `handle(error, context, showToUser)` - 处理错误并显示友好提示
- `wrap(asyncFn, context)` - 异步操作的错误处理包装器
- `wrapFunction(fn, context)` - 为函数添加错误处理
- `handleValidation(validation, context)` - 验证错误处理

**使用示例：**
```javascript
import { ErrorHandler } from './managers/ErrorHandler.js';

try {
    await saveData(data);
} catch (error) {
    ErrorHandler.handle(error, '保存数据');
}

// 或使用包装器
const safeSave = ErrorHandler.wrapFunction(saveData, '保存数据');
```

**特点：**
- 智能识别错误类型
- 友好的用户提示
- 支持验证错误处理

### 6. validators/dataValidators.js
**导出函数：**
- `validateExerciseData(data)` - 验证运动记录数据
- `validateDietData(data)` - 验证饮食记录数据

**返回格式：**
```javascript
{
    isValid: boolean,
    errors: string[]
}
```

**使用示例：**
```javascript
import { validateExerciseData } from './validators/dataValidators.js';

const validation = validateExerciseData(record);
if (!validation.isValid) {
    console.log(validation.errors);
}
```

**验证内容：**
- 日期格式
- 时间格式
- 数值范围
- 字符长度

## 🚀 使用方式

### 在 HTML 中引入
```html
<script type="module" src="js/app.js"></script>
```

注意：必须使用 `type="module"` 来支持ES6模块导入。

### 在 app.js 中使用
```javascript
// 导入所需模块
import { CONSTANTS } from './utils/constants.js';
import { EventManager } from './managers/EventManager.js';

// 创建实例
const eventManager = new EventManager();

// 使用功能
eventManager.add(button, 'click', handleClick);
```

## ✅ 优势

1. **代码组织清晰**：功能模块化，职责单一
2. **易于维护**：修改某个模块不影响其他模块
3. **便于测试**：每个模块可以独立测试
4. **提升复用性**：模块可以在其他项目中复用
5. **减少冲突**：使用模块作用域，避免全局变量污染

## 📝 开发指南

### 添加新模块
1. 在相应目录下创建新的 `.js` 文件
2. 使用 `export` 导出函数或类
3. 在 `app.js` 中使用 `import` 导入

### 命名规范
- **文件名**：使用 camelCase（如 `dataValidators.js`）
- **类名**：使用 PascalCase（如 `EventManager`）
- **函数名**：使用 camelCase（如 `validateExerciseData`）
- **常量**：使用 UPPER_SNAKE_CASE（如 `PAGE_SIZE`）

### 模块依赖
- 尽量减少模块间的相互依赖
- 使用依赖注入而非直接引用
- 保持模块的独立性

## 🔧 未来优化方向

1. **添加单元测试**：为每个模块编写测试用例
2. **TypeScript 支持**：添加类型定义提升开发体验
3. **打包优化**：使用 Webpack/Rollup 进行代码打包
4. **服务模块**：创建专门的数据服务层
5. **UI组件化**：将UI渲染逻辑进一步模块化

## 📚 相关文档

- [ES6 模块](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Guide/Modules)
- [Electron 最佳实践](https://www.electronjs.org/docs/latest/tutorial/performance)
- [代码优化建议报告](../../../代码优化建议报告.md)
