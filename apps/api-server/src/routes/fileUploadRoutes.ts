import { Router, Request, Response } from 'express';
import { uploadSingleChunk } from '../utils/multerConfig';
import {
  saveFileChunk,
  mergeFileChunks,
  checkFileExists,
  getFileInfo,
  cleanupTempFile,
} from '../utils/fileUploadUtils';

const router = Router();

/**
 * 校验文件hash是否存在接口
 * @route GET /api/upload/check
 * @param {string} fileHash.query.required - 文件哈希值
 * @returns {object} 200 - 文件存在性检查结果
 */
router.get('/check', async (req: Request, res: Response) => {
  try {
    const { fileHash } = req.query;

    if (!fileHash || typeof fileHash !== 'string') {
      return res.status(400).json({
        success: false,
        message: '文件哈希值不能为空',
      });
    }

    const result = await checkFileExists(fileHash);

    if (result.exists && result.filePath) {
      const fileInfo = await getFileInfo(result.filePath);

      return res.json({
        success: true,
        exists: true,
        fileInfo: {
          name: result.fileName,
          size: fileInfo?.size,
          path: `/uploads/${result.fileName}`,
        },
      });
    }

    res.json({
      success: true,
      exists: false,
      message: '文件不存在，可以开始上传',
    });
  } catch (error) {
    console.error('文件检查失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误',
    });
  }
});

/**
 * 大文件分片接收与存储接口
 * @route POST /api/upload/chunk
 * @param {FormData} req.body - 包含分片数据的表单数据
 * @param {file} chunk.formData - 文件分片数据
 * @param {string} fileHash.formData - 文件哈希值
 * @param {number} chunkIndex.formData - 分片索引
 * @returns {object} 200 - 分片上传结果
 */
router.post(
  '/chunk',
  uploadSingleChunk,
  async (req: Request, res: Response) => {
    try {
      // 从请求中获取必要参数
      const { fileHash, chunkIndex } = req.body;
      const chunkFile = req.file;

      // 参数校验
      if (!fileHash || typeof fileHash !== 'string') {
        return res.status(400).json({
          success: false,
          message: '文件哈希值不能为空',
        });
      }

      if (!chunkIndex || isNaN(Number(chunkIndex))) {
        return res.status(400).json({
          success: false,
          message: '分片索引无效',
        });
      }

      if (!chunkFile) {
        return res.status(400).json({
          success: false,
          message: '分片文件不能为空',
        });
      }

      const index = Number(chunkIndex);

      // 保存文件分片
      const saved = await saveFileChunk(fileHash, index, chunkFile.path);

      if (saved) {
        res.json({
          success: true,
          message: '分片上传成功',
          fileHash,
          chunkIndex: index,
          chunkSize: chunkFile.size,
        });
      } else {
        // 清理临时文件
        await cleanupTempFile(chunkFile.path);

        res.status(500).json({
          success: false,
          message: '分片保存失败',
        });
      }
    } catch (error) {
      console.error('分片上传失败:', error);

      // 尝试清理临时文件
      if (req.file) {
        await cleanupTempFile(req.file.path);
      }

      res.status(500).json({
        success: false,
        message: '服务器内部错误',
      });
    }
  }
);

/**
 * 文件分片合并接口
 * @route POST /api/upload/merge
 * @param {object} req.body - 合并请求数据
 * @param {string} req.body.fileHash - 文件哈希值
 * @param {string} req.body.fileName - 原始文件名
 * @param {number} req.body.totalChunks - 总分片数
 * @returns {object} 200 - 合并结果
 */
router.post('/merge', async (req: Request, res: Response) => {
  try {
    const { fileHash, fileName, totalChunks } = req.body;

    // 参数校验
    if (!fileHash || typeof fileHash !== 'string') {
      return res.status(400).json({
        success: false,
        message: '文件哈希值不能为空',
      });
    }

    if (!fileName || typeof fileName !== 'string') {
      return res.status(400).json({
        success: false,
        message: '文件名不能为空',
      });
    }

    if (
      !totalChunks ||
      isNaN(Number(totalChunks)) ||
      Number(totalChunks) <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: '总分片数无效',
      });
    }

    const chunksCount = Number(totalChunks);

    // 合并文件分片
    const mergedFilePath = await mergeFileChunks(
      fileHash,
      fileName,
      chunksCount
    );

    if (mergedFilePath) {
      // 获取文件信息
      const fileInfo = await getFileInfo(mergedFilePath);
      const uploadedFileName = mergedFilePath.split('/').pop() || fileName;

      res.json({
        success: true,
        message: '文件合并成功',
        fileInfo: {
          name: fileName,
          hash: fileHash,
          size: fileInfo?.size,
          path: `/uploads/${uploadedFileName}`,
          mtime: fileInfo?.mtime,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        message: '文件合并失败',
      });
    }
  } catch (error) {
    console.error('文件合并失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误',
    });
  }
});

// 导出文件上传路由
export default router;
