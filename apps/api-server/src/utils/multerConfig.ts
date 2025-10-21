import multer, { StorageEngine, Multer } from 'multer';
import path from 'path';
import fs from 'fs';

// 临时上传目录
const TEMP_UPLOAD_DIR = path.join(__dirname, '../../temp');

// 确保临时目录存在
if (!fs.existsSync(TEMP_UPLOAD_DIR)) {
  fs.mkdirSync(TEMP_UPLOAD_DIR, { recursive: true });
}

// 自定义存储配置
const storage: StorageEngine = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, TEMP_UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    // 生成唯一的临时文件名
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const extension = path.extname(file.originalname) || '';
    cb(null, `${file.fieldname}-${uniqueSuffix}${extension}`);
  }
});

// 文件过滤器
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // 这里可以添加文件类型过滤逻辑
  // 目前允许所有文件类型
  cb(null, true);
};

// 创建multer实例
const upload: Multer = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 单个文件最大100MB
    files: 1 // 每次只处理一个文件
  }
});

// 导出分片上传的单个文件中间件
export const uploadSingleChunk = upload.single('chunk');

// 导出配置好的multer实例（如果需要其他上传方式）
export { upload };