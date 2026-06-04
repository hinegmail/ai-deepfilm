# 技术栈 & 构建系统

## 技术栈

### 前端框架
- **React** 19.2.0 - UI组件库
- **TypeScript** ~5.8.2 - 类型安全的JavaScript
- **Vite** 6.2.0 - 构建工具和开发服务器
- **Tailwind CSS** - 工具优先样式（暗黑主题）

### UI & 图标
- **lucide-react** 0.554.0 - 图标库
- **shadcn/ui patterns** - 组件设计模式

### 桌面端 & 部署
- **Electron** 33.0.0 - 桌面应用框架
- **electron-builder** 25.0.0 - 应用打包工具
- **Docker** & **Nginx** - 容器部署

### 后端服务
- **Express** 4.21.0 - HTTP服务器（用于Electron/Docker）
- **http-proxy-middleware** 3.0.0 - API代理（解决CORS）

### 数据 & 资产
- **IndexedDB** - 浏览器本地存储
- **jszip** 3.10.1 - 项目导出/导入处理
- **Base64编码** - 图像资产序列化

### 类型系统
- **Node.js类型** - @types/node 22.14.0
- **React类型** - React 19内置
- **TypeScript目标** - ES2022

## 项目结构

```
├── App.tsx                 # React主入口
├── components/             # React组件（按功能模块组织）
├── services/              # 业务逻辑和API集成
├── types.ts               # 核心TypeScript类型定义
├── types/                 # 其他类型定义
├── public/                # 静态资源
├── electron/              # Electron主进程和预加载脚本
├── vite.config.ts         # Vite配置
├── tsconfig.json          # TypeScript配置
├── Dockerfile             # Docker镜像定义
├── docker-compose.yaml    # Docker Compose编排
├── nginx.conf             # Nginx服务器配置
└── package.json           # 依赖和脚本
```

## 构建系统

### 本地开发
```bash
npm install                # 安装依赖
npm run dev               # 启动Vite开发服务器（端口3000）
```
- Vite运行在 `http://localhost:3000`
- `/api-proxy` 代理到 `http://api.gitcc.com`
- 启用热模块重载

### 生产构建
```bash
npm run build             # 构建优化包
npm run preview           # 本地预览生产构建（端口3005）
```
- 输出到 `dist/` 目录
- Vite处理tree-shaking和代码压缩

### 桌面应用
```bash
npm run electron:dev      # 开发：构建后启动Electron
npm run electron:build    # 为当前系统构建安装程序
npm run electron:build:win # 构建Windows安装程序(.exe)
npm run electron:build:mac # 构建macOS安装程序(.dmg)
```
- 安装程序输出到 `release/` 目录
- 产品名称：AI 漫剧工场
- 包含内置HTTP服务器和API代理

### Docker部署
```bash
docker-compose up -d --build    # 构建并启动服务
docker-compose logs -f          # 查看日志
docker-compose down             # 停止服务

# 或使用Docker命令
docker build -t ai-manga-studio .
docker run -d -p 3005:80 --name ai-manga-studio-app ai-manga-studio
```
- 通过 `http://localhost:3005` 访问
- Nginx服务前端并代理 `/api-proxy` 到GitCC API
- 无需外部后端

## 配置

### 环境变量
- `ANTSK_API_KEY` - 模型提供商API密钥（来自 `.env`）
- 通过Vite的 `loadEnv()` 在开发和构建时加载

### API代理
- **开发/预览/桌面** - `/api-proxy` → `http://api.gitcc.com`
- **Docker** - Nginx代理 `/api-proxy` 到同一目标
- **目的** - 解决CORS问题并集中管理API配置

### TypeScript配置
- **目标** - ES2022
- **模块** - ESNext
- **路径别名** - `@/*` 解析到项目根目录
- **JSX** - react-jsx转换

## 代码风格 & 约定

### 文件组织
- **组件** - 一个文件一个组件（或复杂组件用文件夹）
- **服务** - 业务逻辑与UI分离
- **类型** - `types.ts` 中的核心类型定义
- **常量** - 每个模块的 `constants.ts` 文件中分组
- **工具** - `utils.ts` 文件中的可复用帮助函数

### React组件模式
```typescript
// 使用带TypeScript的函数式组件
interface Props {
  // 组件Props
}

const ComponentName: React.FC<Props> = ({ prop1, prop2 }) => {
  // 组件逻辑
  return <div>{/* JSX */}</div>;
};

export default ComponentName;
```

### 命名约定
- **文件** - 组件用PascalCase（ComponentName.tsx），工具用camelCase（utils.ts）
- **接口** - PascalCase（Props、Character、Scene）
- **函数** - camelCase（generateId、getRegionalPrefix）
- **常量** - UPPER_SNAKE_CASE（DEFAULTS、LANGUAGE_MAP）

### 导入路径
- 使用 `@/` 别名导入项目根目录
- 例如：`import { types } from '@/types'`

## 常用命令参考

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 构建生产包 |
| `npm run preview` | 预览生产构建 |
| `npm run electron:dev` | 开发模式启动桌面应用 |
| `npm run electron:build:win` | 打包Windows桌面应用 |
| `docker-compose up -d --build` | Docker部署 |
| `npm install` | 安装/更新依赖 |

## 依赖管理

### 添加依赖
- 使用精确版本号，不用范围
- 考虑对打包体积的影响
- 优先选择维护活跃的包

### 关键外部库
- **UI** - lucide-react（图标）、Tailwind（样式）
- **AI集成** - GitCC API的自定义适配器
- **数据** - 浏览器IndexedDB API
- **导出** - jszip用于项目打包

## 类型安全

所有代码应使用严格的TypeScript类型：
- 为数据结构定义接口
- 为状态/枚举使用联合类型
- 避免 `any` 类型（必要时使用 `unknown`）
- 在tsconfig.json中启用严格模式检查
