import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
// 引入文件上传路由
import fileUploadRoutes from './routes/fileUploadRoutes';

// 加载环境变量
dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3030;

// 安全中间件
app.use(helmet());

// CORS配置
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  })
);

// 日志中间件
app.use(morgan('combined'));

// 解析JSON请求体
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 配置静态文件服务，用于访问上传的文件
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 基本路由
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'Express + TypeScript Server',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// 健康检查路由
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API 路由示例
app.get('/api/data', (req: Request, res: Response) => {
  res.json({
    message: 'Data from backend server',
    timestamp: new Date().toISOString(),
    data: {
      users: 100,
      posts: 250,
      comments: 1200,
    },
  });
});

// 使用文件上传路由
app.use('/api/upload', fileUploadRoutes);

// 用户相关API
app.get('/api/users', (req: Request, res: Response) => {
  res.json({
    users: [
      { id: 1, name: '张三', email: 'zhangsan@example.com' },
      { id: 2, name: '李四', email: 'lisi@example.com' },
      { id: 3, name: '王五', email: 'wangwu@example.com' },
    ],
  });
});

// 错误处理中间件
app.use((err: Error, req: Request, res: Response, next: any) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message:
      process.env.NODE_ENV === 'development'
        ? err.message
        : 'Internal server error',
  });
});

// 404处理
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
  });
});

// 启动服务器
app.listen(port, () => {
  console.log(`🚀 Server is running at http://localhost:${port}`);
  console.log(`📊 Health check: http://localhost:${port}/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});
