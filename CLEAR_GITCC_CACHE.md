# 彻底清除 GitCC 缓存指南

由于项目已完全迁移到免费 API 提供商（AGNES AI），您可能需要清除浏览器中的旧 GitCC 配置。

## 方法 1：完全清除（推荐）

在浏览器开发者工具中执行：

```javascript
// 清除所有相关的本地存储
localStorage.removeItem('ai_manga_studio_model_registry');
localStorage.removeItem('ai_manga_studio_model_config');
localStorage.removeItem('big_banana_model_registry');
localStorage.removeItem('big_banana_model_config');
localStorage.removeItem('antsk_api_key');

// 清除所有 Session Storage
sessionStorage.clear();

// 刷新页面
location.reload();
```

## 方法 2：核心清除

如果只想保留部分数据，执行：

```javascript
// 只清除模型配置
localStorage.removeItem('ai_manga_studio_model_registry');
localStorage.removeItem('ai_manga_studio_model_config');
location.reload();
```

## 方法 3：手动清除（浏览器 UI）

### Chrome / Edge / Firefox
1. 打开开发者工具 (F12)
2. 进入 **Application** 或 **Storage** 标签页
3. 找到 **Local Storage**
4. 选择您的站点
5. 删除以下 key：
   - `ai_manga_studio_model_registry`
   - `ai_manga_studio_model_config`
   - `big_banana_model_registry`
   - `big_banana_model_config`
   - `antsk_api_key`
6. 刷新页面 (Ctrl+R 或 Cmd+R)

### Safari
1. 开发菜单 → Web Inspector
2. Storage → Local Storage
3. 选择您的站点，删除相关 key
4. 刷新页面

## 清除后的结果

✅ 所有配置重置为默认值
✅ 默认提供商：AGNES AI
✅ 默认对话模型：Agnes-2.0-Flash
✅ 默认图片模型：Agnes Image 2.1 Flash
✅ 默认视频模型：Agnes-Video-V2.0
✅ UI 中不再显示 GitCC API

## 验证清除成功

清除后，打开 Developer Tools 的 Network 或 Console 标签页，检查是否有任何 GitCC 请求。应该看不到任何 `api.gitcc.com` 的请求。

## 如果问题仍然存在

1. 尝试硬刷新：`Ctrl+Shift+R`（Windows）或 `Cmd+Shift+R`（Mac）
2. 清除浏览器缓存：Settings → Privacy/Security → Clear browsing data
3. 确保您清除的 Local Storage 来自正确的网站

