import type { WorkerCommand, WorkerEvent } from './types';

// 假设你有一个 web worker 构建产物，路径根据你的构建工具调整
// 使用 Vite 可用 new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })
const worker = new Worker(new URL('./worker.ts', import.meta.url), {
  type: 'module',
});

function waitWorker<T extends WorkerEvent>(type: T['type']): Promise<T> {
  return new Promise(resolve => {
    const handler = (e: MessageEvent<WorkerEvent>) => {
      if (e.data.type === type) {
        worker.removeEventListener('message', handler);
        resolve(e.data as T);
      }
    };
    worker.addEventListener('message', handler);
  });
}

worker.addEventListener('message', (e: MessageEvent<WorkerEvent>) => {
  const evt = e.data;
  if (evt.type === 'PROCESS_PROGRESS') {
    console.log(
      `processing: chunk ${evt.chunkIndex + 1}/${evt.totalChunks} (${((evt.loaded / evt.total) * 100).toFixed(2)}%)`
    );
  } else if (evt.type === 'ERROR') {
    console.error('worker error:', evt.message);
  }
});

// 初始化数据库
worker.postMessage({ type: 'INIT_DB' } as WorkerCommand);

// 处理文件（分片+计算 hash + 存入 IndexedDB）
export async function prepareFile(file: File, chunkSize = 5 * 1024 * 1024) {
  // await waitWorker<{ type: 'DB_READY' }>('DB_READY');
  worker.postMessage({
    type: 'PROCESS_FILE',
    file,
    chunkSize,
    filename: file.name,
  } as WorkerCommand);
  const done =
    await waitWorker<Extract<WorkerEvent, { type: 'PROCESS_DONE' }>>(
      'PROCESS_DONE'
    );
  return done; // 包含 fileHash、filename、totalChunks、totalSize
}

// 从 IndexedDB 读取分片并上传
export async function uploadInChunks(
  fileHash: string,
  filename: string,
  totalChunks: number,
  serverUploadUrl: string,
  extraParams?: Record<string, string | number>
) {
  for (let index = 0; index < totalChunks; index++) {
    const chunkBuffer = await getChunkBuffer(fileHash, index);
    if (!chunkBuffer) throw new Error(`Chunk missing: ${index}`);

    // 构造表单或二进制请求体。示例使用 FormData
    const form = new FormData();
    form.append('fileHash', fileHash);
    form.append('filename', filename);
    form.append('chunkName', `${filename}_${index}`);
    form.append('chunkIndex', `${index}`);
    // 你也可以上传 totalChunks 等信息
    if (extraParams) {
      Object.entries(extraParams).forEach(([k, v]) =>
        form.append(k, String(v))
      );
    }
    // 将二进制包装为 Blob 再作为文件字段
    const blob = new Blob([chunkBuffer]);
    form.append('chunk', blob, `${filename}.part.${index}`);

    const resp = await fetch(serverUploadUrl, {
      method: 'POST',
      body: form,
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      throw new Error(
        `Upload failed for chunk ${index}: ${resp.status} ${text}`
      );
    }
  }
  worker.postMessage({
    type: 'CLEAR_FILE',
    fileHash,
  } as WorkerCommand);
}

// 从 worker 获取单个分片 ArrayBuffer
async function getChunkBuffer(
  fileHash: string,
  index: number
): Promise<ArrayBuffer | undefined> {
  const p = new Promise<ArrayBuffer | undefined>((resolve, reject) => {
    const onMsg = (e: MessageEvent<WorkerEvent>) => {
      const evt = e.data;
      if (
        evt.type === 'CHUNK' &&
        evt.fileHash === fileHash &&
        evt.index === index
      ) {
        worker.removeEventListener('message', onMsg);
        resolve(evt.chunk);
      } else if (evt.type === 'ERROR') {
        worker.removeEventListener('message', onMsg);
        reject(new Error(evt.message));
      }
    };
    worker.addEventListener('message', onMsg);
  });
  worker.postMessage({ type: 'GET_CHUNK', fileHash, index } as WorkerCommand);
  return p;
}
