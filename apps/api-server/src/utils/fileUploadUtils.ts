import fs from 'fs';
import path from 'path';
import { Request } from 'express';

// 文件存储路径配置
const CHUNKS_DIR = path.join(__dirname, '../../chunks');
const UPLOADS_DIR = path.join(__dirname, '../../uploads');

// 确保目录存在
const ensureDirExists = (dirPath: string): void => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

// 初始化目录
ensureDirExists(CHUNKS_DIR);
ensureDirExists(UPLOADS_DIR);

/**
 * 保存文件分片
 * @param fileHash 文件哈希值
 * @param chunkIndex 分片索引
 * @param chunkData 分片数据路径
 * @returns 是否保存成功
 */
export const saveFileChunk = async (
  fileHash: string,
  chunkIndex: number,
  chunkData: string
): Promise<boolean> => {
  try {
    // 创建文件哈希对应的分片目录
    const chunkDir = path.join(CHUNKS_DIR, fileHash);
    ensureDirExists(chunkDir);

    // 分片目标路径
    const chunkPath = path.join(chunkDir, `${chunkIndex}.chunk`);

    // 重命名临时文件到目标位置
    await fs.promises.rename(chunkData, chunkPath);

    return true;
  } catch (error) {
    console.error('保存文件分片失败:', error);
    return false;
  }
};

/**
 * 合并文件分片
 * @param fileHash 文件哈希值
 * @param fileName 文件名
 * @param totalChunks 总分片数
 * @returns 合并后的文件路径
 */
export const mergeFileChunks = async (
  fileHash: string,
  fileName: string,
  totalChunks: number
): Promise<string | null> => {
  try {
    const chunkDir = path.join(CHUNKS_DIR, fileHash);
    const mergedFilePath = path.join(UPLOADS_DIR, fileName);

    // 检查分片目录是否存在
    if (!fs.existsSync(chunkDir)) {
      throw new Error('分片目录不存在');
    }

    // 创建写入流
    const writeStream = fs.createWriteStream(mergedFilePath);

    // 按顺序合并分片
    for (let i = 0; i < totalChunks; i++) {
      const chunkPath = path.join(chunkDir, `${i}.chunk`);

      if (!fs.existsSync(chunkPath)) {
        throw new Error(`分片 ${i} 不存在`);
      }

      // 读取分片内容并写入
      const chunkData = await fs.promises.readFile(chunkPath);
      writeStream.write(chunkData);

      // 删除已处理的分片
      await fs.promises.unlink(chunkPath);
    }

    // 关闭写入流
    writeStream.end();

    // 删除分片目录
    await fs.promises.rmdir(chunkDir, { recursive: true });

    return mergedFilePath;
  } catch (error) {
    console.error('合并文件分片失败:', error);
    return null;
  }
};

/**
 * 检查文件是否已存在
 * @param fileHash 文件哈希值
 * @returns 文件是否存在以及相关信息
 */
export const checkFileExists = async (
  fileHash: string
): Promise<{ exists: boolean; filePath?: string; fileName?: string }> => {
  try {
    // 检查上传目录中是否存在该文件
    const files = await fs.promises.readdir(UPLOADS_DIR);

    for (const file of files) {
      if (file.startsWith(fileHash)) {
        return {
          exists: true,
          filePath: path.join(UPLOADS_DIR, file),
          fileName: file,
        };
      }
    }

    // 检查是否有正在上传的分片
    const chunkDir = path.join(CHUNKS_DIR, fileHash);
    if (fs.existsSync(chunkDir)) {
      const chunks = await fs.promises.readdir(chunkDir);
      return {
        exists: false,
        // 可以返回已上传的分片信息，供前端续传使用
      };
    }

    return { exists: false };
  } catch (error) {
    console.error('检查文件存在性失败:', error);
    return { exists: false };
  }
};

/**
 * 获取文件信息
 * @param filePath 文件路径
 * @returns 文件信息
 */
export const getFileInfo = async (
  filePath: string
): Promise<{ size: number; mtime: Date } | null> => {
  try {
    const stats = await fs.promises.stat(filePath);
    return {
      size: stats.size,
      mtime: stats.mtime,
    };
  } catch (error) {
    console.error('获取文件信息失败:', error);
    return null;
  }
};

/**
 * 清理临时文件
 * @param tempFilePath 临时文件路径
 */
export const cleanupTempFile = async (tempFilePath: string): Promise<void> => {
  try {
    if (fs.existsSync(tempFilePath)) {
      await fs.promises.unlink(tempFilePath);
    }
  } catch (error) {
    console.error('清理临时文件失败:', error);
  }
};
