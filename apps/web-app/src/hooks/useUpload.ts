import { ref, onUnmounted } from 'vue';
import axios from 'axios';
import pLimit from 'p-limit';
// import UploadWorker from './upload.worker.ts?worker';
const worker = new Worker(new URL('./upload.worker.ts', import.meta.url), {
  type: 'module', // 指定Worker为模块类型
});

interface WorkerEvent {
  data:
    | { type: 'calculateHash'; hash: string; fileChunks: Blob[] }
    | { type: 'calculateProgress'; progress: number };
}

const useUpload = () => {
  // const worker = new UploadWorker();
  const hash = ref('');
  const filename = ref('');
  const fileSize = ref(0);
  const isParsing = ref(false);
  const isUploading = ref(false);
  const fileChunks = ref<Blob[]>([]);
  let callSuccessCb: () => void;
  let callErrorCb: () => void;
  worker.onmessage = (event: WorkerEvent) => {
    console.log(event.data);
    const { type } = event.data;
    if (type === 'calculateHash') {
      console.log('hash:', hash);
      hash.value = event.data.hash;
      fileChunks.value = event.data.fileChunks;
      isParsing.value = false;
      isUploading.value = true;
      verifyFile();
    }
  };

  const callSuccess = () => {
    hash.value = '';
    fileChunks.value = [];
    isParsing.value = false;
    isUploading.value = false;
    typeof callSuccessCb && callSuccessCb();
  };

  const callError = () => {
    hash.value = '';
    fileChunks.value = [];
    isParsing.value = false;
    isUploading.value = false;
    typeof callErrorCb && callErrorCb();
  };

  const uploadFile = (file: File, chunkSize = 1024 * 1024 * 5) => {
    filename.value = file.name;
    fileSize.value = file.size;
    worker.postMessage({
      type: 'upload',
      file,
      chunkSize,
    });
    isParsing.value = true;
  };

  const verifyFile = async () => {
    const response = await axios.get(
      `/api/upload/check?fileHash=${hash.value}`
    );
    if (!response.data?.exists) {
      uploadChunks();
    } else {
      callSuccess();
    }
  };

  const mergeFile = async () => {
    const response = await axios.post(`/api/upload/merge`, {
      fileName: filename.value,
      fileHash: hash.value,
      totalChunks: fileChunks.value.length,
    });
    if (response.data) {
      console.log(`合并文件，上传成功`, response);
      callSuccess();
    } else {
      callError();
    }
  };

  const uploadChunk = async (form: FormData) => {
    const response = await axios.post('/api/upload/chunk', form, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  };

  const uploadChunks = async () => {
    const limit = pLimit(3);
    const requests = fileChunks.value.map((chunk, index) => {
      const form = new FormData();
      form.append('fileHash', hash.value);
      form.append('filename', filename.value);
      form.append('chunkName', `${filename.value}_${index}`);
      form.append('chunk', chunk);
      form.append('chunkIndex', `${index}`);
      return limit(uploadChunk, form);
    });

    Promise.all(requests)
      .then(() => {
        mergeFile();
      })
      .catch(err => {
        console.log('upload error', err);
      });
  };

  const onSuccess = (cb: () => void) => {
    callSuccessCb = cb;
  };
  const onError = (cb: () => void) => {
    callErrorCb = cb;
  };
  onUnmounted(() => {
    worker.terminate();
  });
  return {
    isParsing,
    isUploading,
    uploadFile,
    onSuccess,
    onError,
  };
};

export default useUpload;
