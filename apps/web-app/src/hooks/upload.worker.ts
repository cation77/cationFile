import SparkMd5 from 'spark-md5';

interface UploadEvent {
  data: { type: 'upload'; file: File; chunkSize: number };
}

self.onmessage = (event: UploadEvent) => {
  // 5MB 切片大小
  const { type, file, chunkSize } = event.data;
  const chunks = Math.ceil(file.size / chunkSize);
  let progress = 0;
  let currentChunk = 0;
  const fileChunks: Blob[] = [];
  const spark = new SparkMd5.ArrayBuffer();
  const fileReader = new FileReader();

  fileReader.onload = function (e) {
    const chunk = e.target?.result as ArrayBuffer;
    spark.append(chunk);
    currentChunk++;
    if (currentChunk < chunks) {
      progress += 100 / chunks;
      self.postMessage({ type: 'calculateProgress', progress });
      loadReader();
    } else {
      const hash = spark.end();
      self.postMessage({ type: 'calculateHash', hash, fileChunks });
    }
  };

  fileReader.onerror = function (e) {
    console.warn(`filer reader error: ${e.target?.error}`);
  };

  const loadReader = () => {
    const chunk = file.slice(
      currentChunk * chunkSize,
      (currentChunk + 1) * chunkSize
    );
    fileChunks.push(chunk);
    fileReader.readAsArrayBuffer(chunk);
  };
  loadReader();
};
