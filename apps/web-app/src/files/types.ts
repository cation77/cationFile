export type WorkerCommand =
  | { type: 'INIT_DB'; dbName?: string; storeName?: string }
  | {
      type: 'PROCESS_FILE';
      file: File;
      chunkSize?: number; // 默认 5MB
      filename?: string; // 默认 file.name
    }
  | { type: 'GET_CHUNK'; fileHash: string; index: number }
  | { type: 'CLEAR_FILE'; fileHash: string }
  | { type: 'CLOSE_DB' };

export type WorkerEvent =
  | { type: 'DB_READY' }
  | {
      type: 'PROCESS_PROGRESS';
      loaded: number; // 已处理字节
      total: number; // 文件总字节
      chunkIndex: number; // 当前已完成的分片索引（从 0 开始）
      totalChunks: number;
    }
  | {
      type: 'PROCESS_DONE';
      fileHash: string;
      filename: string;
      totalChunks: number;
      totalSize: number;
    }
  | {
      type: 'CHUNK';
      fileHash: string;
      index: number;
      chunk: ArrayBuffer;
      filename: string;
      totalChunks: number;
      totalSize: number;
    }
  | { type: 'ERROR'; message: string };

export interface ChunkRecord {
  fileHash: string;
  filename: string;
  index: number;
  totalChunks: number;
  totalSize: number;
  chunk: ArrayBuffer;
}
