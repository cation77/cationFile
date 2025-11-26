import SparkMD5 from 'spark-md5';
import type { WorkerCommand, WorkerEvent, ChunkRecord } from './types';

// declare const self: DedicatedWorkerGlobalScope;

type DBEnv = {
  db: IDBDatabase | null;
  dbName: string;
  storeName: string;
};
const env: DBEnv = {
  db: null,
  dbName: 'file-chunks-db',
  storeName: 'chunks',
};

function openDB(dbName: string, storeName: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(dbName, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(storeName)) {
        const store = db.createObjectStore(storeName, {
          keyPath: ['fileHash', 'index'],
        });
        // 可建立索引方便检索
        store.createIndex('fileHash', 'fileHash', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function getStore(
  db: IDBDatabase,
  storeName: string,
  mode: IDBTransactionMode
) {
  const tx = db.transaction(storeName, mode);
  const store = tx.objectStore(storeName);
  return { tx, store };
}

function putChunk(record: ChunkRecord): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!env.db) return reject(new Error('DB not initialized'));
    const { tx, store } = getStore(env.db, env.storeName, 'readwrite');
    const req = store.put(record);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function getChunk(
  fileHash: string,
  index: number
): Promise<ChunkRecord | undefined> {
  return new Promise((resolve, reject) => {
    if (!env.db) return reject(new Error('DB not initialized'));
    const { tx, store } = getStore(env.db, env.storeName, 'readonly');
    const req = store.get([fileHash, index]);
    req.onsuccess = () => resolve(req.result as ChunkRecord | undefined);
    req.onerror = () => reject(req.error);
  });
}

function clearFileChunks(fileHash: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!env.db) return reject(new Error('DB not initialized'));
    const { tx, store } = getStore(env.db, env.storeName, 'readwrite');
    const index = store.index('fileHash');
    const range = IDBKeyRange.only(fileHash);
    const req = index.openCursor(range);
    req.onsuccess = () => {
      const cursor = req.result as IDBCursorWithValue | null;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      } else {
        resolve();
      }
    };
    req.onerror = () => reject(req.error);
  });
}

async function processFile(file: File, chunkSize: number, filename?: string) {
  const name = filename || file.name;
  const totalSize = file.size;
  const totalChunks = Math.ceil(totalSize / chunkSize);
  // 增量 MD5
  const spark = new SparkMD5.ArrayBuffer();

  for (let index = 0; index < totalChunks; index++) {
    const start = index * chunkSize;
    const end = Math.min(start + chunkSize, totalSize);
    const blob = file.slice(start, end);
    const buffer = await blob.arrayBuffer();

    // 更新 MD5
    spark.append(buffer);

    // 存储到 IndexedDB
    const record: ChunkRecord = {
      fileHash: '__temp__', // 先用占位符，等最终 hash 出来再修正也行；或者先不存 hash。
      filename: name,
      index,
      totalChunks,
      totalSize,
      chunk: buffer,
    };

    // 这里的关键：在文件 hash 未确定前，暂存时可先用 (filename+totalSize) 的临时 key，
    // 处理完毕后做一次搬迁。为避免搬迁，我们可以先把所有 chunk 放到内存数组，
    // 但会占内存。更好的做法：先用一个 sessionId，再在结束后重写主键。
    // 为简化：我们先存储用 sessionKey，再在完成后迁移为 fileHash 主键。
    await putTempChunk(sessionKey, record);

    // 进度事件
    postMessage({
      type: 'PROCESS_PROGRESS',
      loaded: end,
      total: totalSize,
      chunkIndex: index,
      totalChunks,
    } satisfies WorkerEvent);
  }

  const fileHash = spark.end();

  // 将基于 sessionKey 的记录迁移成基于 fileHash 的记录
  await migrateTempToFinal(sessionKey, fileHash);

  postMessage({
    type: 'PROCESS_DONE',
    fileHash,
    filename: name,
    totalChunks,
    totalSize,
  } satisfies WorkerEvent);
}

/**
 * 为了在 hash 未完成前能够持久化 chunk，我们引入一个临时存储仓库 tempChunks，
 * 主键为 [sessionKey, index]。当 hash 计算完毕后，将其迁移到最终仓库 chunks，
 * 主键为 [fileHash, index]。
 */

function ensureTempStore(db: IDBDatabase) {
  // 本函数仅在 onupgradeneeded 调用，放在 openDB 的升级逻辑内会更稳妥。
  // 此处为了简化，假设升级时已创建。
}

function openDBWithTemp(dbName: string, storeName: string) {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(dbName, 2);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(storeName)) {
        const store = db.createObjectStore(storeName, {
          keyPath: ['fileHash', 'index'],
        });
        store.createIndex('fileHash', 'fileHash', { unique: false });
      }
      if (!db.objectStoreNames.contains('tempChunks')) {
        const temp = db.createObjectStore('tempChunks', {
          keyPath: ['sessionKey', 'index'],
        });
        temp.createIndex('sessionKey', 'sessionKey', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function putTempChunk(
  sessionKey: string,
  record: Omit<ChunkRecord, 'fileHash'>
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!env.db) return reject(new Error('DB not initialized'));
    const tx = env.db.transaction('tempChunks', 'readwrite');
    const store = tx.objectStore('tempChunks');
    console.log('record--->', sessionKey, record.index, record.chunk);
    const req = store.put({
      sessionKey,
      index: record.index,
      filename: record.filename,
      totalChunks: record.totalChunks,
      totalSize: record.totalSize,
      chunk: record.chunk,
    });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function iterateTempChunks(sessionKey: string): Promise<
  Array<{
    sessionKey: string;
    index: number;
    filename: string;
    totalChunks: number;
    totalSize: number;
    chunk: ArrayBuffer;
  }>
> {
  return new Promise((resolve, reject) => {
    if (!env.db) return reject(new Error('DB not initialized'));
    const tx = env.db.transaction('tempChunks', 'readonly');
    const store = tx.objectStore('tempChunks');
    const idx = store.index('sessionKey');
    const range = IDBKeyRange.only(sessionKey);
    const req = idx.openCursor(range);
    const out: Array<{
      sessionKey: string;
      index: number;
      filename: string;
      totalChunks: number;
      totalSize: number;
      chunk: ArrayBuffer;
    }> = [];
    req.onsuccess = () => {
      const cursor = req.result as IDBCursorWithValue | null;
      if (cursor) {
        out.push(cursor.value);
        cursor.continue();
      } else {
        resolve(out.sort((a, b) => a.index - b.index));
      }
    };
    req.onerror = () => reject(req.error);
  });
}

function clearTempChunks(sessionKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!env.db) return reject(new Error('DB not initialized'));
    const tx = env.db.transaction('tempChunks', 'readwrite');
    const store = tx.objectStore('tempChunks');
    const idx = store.index('sessionKey');
    const range = IDBKeyRange.only(sessionKey);
    const req = idx.openCursor(range);
    req.onsuccess = () => {
      const cursor = req.result as IDBCursorWithValue | null;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      } else {
        resolve();
      }
    };
    req.onerror = () => reject(req.error);
  });
}

async function migrateTempToFinal(sessionKey: string, fileHash: string) {
  const tempChunks = await iterateTempChunks(sessionKey);
  for (const t of tempChunks) {
    const record: ChunkRecord = {
      fileHash,
      filename: t.filename,
      index: t.index,
      totalChunks: t.totalChunks,
      totalSize: t.totalSize,
      chunk: t.chunk,
    };
    await putChunk(record);
  }
  await clearTempChunks(sessionKey);
}

// 为每个 PROCESS_FILE 启动一个临时会话 key
function createSessionKey(file: File) {
  // 非安全随机，仅作区分
  return `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

let sessionKey = '';

self.onmessage = async (e: MessageEvent<WorkerCommand>) => {
  const data = e.data;
  try {
    switch (data.type) {
      case 'INIT_DB': {
        env.dbName = data.dbName || env.dbName;
        env.storeName = data.storeName || env.storeName;
        env.db = await openDBWithTemp(env.dbName, env.storeName);
        postMessage({ type: 'DB_READY' } satisfies WorkerEvent);
        break;
      }
      case 'PROCESS_FILE': {
        if (!env.db) {
          env.db = await openDBWithTemp(env.dbName, env.storeName);
        }
        const chunkSize = data.chunkSize ?? 5 * 1024 * 1024;
        sessionKey = createSessionKey(data.file);
        await processFile(data.file, chunkSize, data.filename);
        break;
      }
      case 'GET_CHUNK': {
        if (!env.db) throw new Error('DB not initialized');
        const rec = await getChunk(data.fileHash, data.index);
        if (!rec)
          throw new Error(`Chunk not found: ${data.fileHash} #${data.index}`);
        postMessage(
          {
            type: 'CHUNK',
            fileHash: data.fileHash,
            index: rec.index,
            chunk: rec.chunk,
            filename: rec.filename,
            totalChunks: rec.totalChunks,
            totalSize: rec.totalSize,
          } satisfies WorkerEvent,
          // 使用 transferable 提升传输效率（ArrayBuffer 可转移）
          { transfer: [rec.chunk] }
        );
        break;
      }
      case 'CLEAR_FILE': {
        await clearFileChunks(data.fileHash);
        break;
      }
      case 'CLOSE_DB': {
        if (env.db) {
          env.db.close();
          env.db = null;
        }
        break;
      }
    }
  } catch (err: any) {
    postMessage({
      type: 'ERROR',
      message: err?.message || String(err),
    } as WorkerEvent);
  }
};
