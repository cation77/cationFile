# Monorepo 项目说明

这是一个基于 pnpm 的 monorepo 项目，包含前端和后端两个子项目。

## 项目结构

```
├── apps/
│   ├── web-app/          # Vue3 前端应用
│   └── api-server/        # Express 后端服务
├── package.json          # 根项目配置
├── pnpm-workspace.yaml   # pnpm 工作空间配置
└── README.md
```

## 技术栈

### 前端 (web-app)

- Vue 3 + TypeScript
- Vite (构建工具)
- Vue Router (路由管理)
- Pinia (状态管理)
- Vitest (单元测试)
- ESLint (代码检查)

### 后端 (api-server)

- Node.js + Express
- TypeScript
- CORS (跨域处理)
- Helmet (安全中间件)
- Morgan (日志中间件)
- Vitest (单元测试)

## 快速开始

### 安装依赖

```bash
pnpm install
```

### 开发模式

```bash
# 同时启动前端和后端
pnpm dev

# 或者分别启动
pnpm dev:frontend  # 前端开发服务器 (http://localhost:3000)
pnpm dev:backend   # 后端开发服务器 (http://localhost:3002)
```

### 构建项目

```bash
pnpm build
```

### 运行测试

```bash
pnpm test
```

### 代码检查和格式化

```bash
# 代码检查
pnpm lint
pnpm lint:check

# 代码格式化
pnpm format
pnpm format:check

# TypeScript 类型检查
pnpm type-check
```

## 项目命令

| 命令                | 描述                         |
| ------------------- | ---------------------------- |
| `pnpm dev`          | 同时启动前端和后端开发服务器 |
| `pnpm dev:frontend` | 启动前端开发服务器           |
| `pnpm dev:backend`  | 启动后端开发服务器           |
| `pnpm build`        | 构建所有项目                 |
| `pnpm test`         | 运行所有测试                 |
| `pnpm lint`         | 代码检查并自动修复           |
| `pnpm lint:check`   | 代码检查（不修复）           |
| `pnpm format`       | 代码格式化                   |
| `pnpm format:check` | 检查代码格式                 |
| `pnpm type-check`   | TypeScript 类型检查          |
| `pnpm clean`        | 清理构建文件                 |

## API 接口

后端服务提供以下接口：

- `GET /` - 服务信息
- `GET /health` - 健康检查
- `GET /api/data` - 示例数据
- `GET /api/users` - 用户列表

## 开发说明

1. 前端项目使用 Vite 作为构建工具，支持热重载
2. 后端项目使用 ts-node-dev 进行开发，支持热重载
3. 前端通过代理访问后端 API (`/api/*` -> `http://localhost:3002/*`)
4. 项目使用 TypeScript 进行类型检查
5. 使用 ESLint + Prettier 进行代码规范和格式化
6. 使用 Vitest 进行单元测试
7. 支持 VSCode 自动格式化和代码检查

## 环境要求

- Node.js >= 18.0.0
- pnpm >= 8.0.0
