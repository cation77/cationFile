<template>
  <div class="api-test">
    <h1>DB文件上传页面</h1>
    <p>上传文件到服务器</p>

    <div class="file-upload-section">
      <input type="file" @change="handleFileChange" />
      <button @click="onUploadFile" :disabled="isUploading" class="upload-btn">
        {{ isUploading ? '上传中...' : '上传文件' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import axios from 'axios';
import { prepareFile, uploadInChunks } from '../files/index';

const file = ref();
const isUploading = ref(false);

const handleFileChange = (e: any) => {
  // console.log(e.target.files);
  file.value = e.target.files?.[0];
};

const mergeFile = async (
  fileHash: string,
  fileName: string,
  totalChunks: number
) => {
  const response = await axios.post(`/api/upload/merge`, {
    fileHash,
    fileName,
    totalChunks,
  });
  if (response.data) {
    isUploading.value = false;
    console.log(`合并文件，上传成功`, response);
  } else {
  }
};

const onUploadFile = async () => {
  if (file.value) {
    isUploading.value = true;
    const res = await prepareFile(file.value);
    console.log(res);
    await uploadInChunks(
      res.fileHash,
      res.filename,
      res.totalChunks,
      '/api/upload/chunk'
    );
    mergeFile(res.fileHash, res.filename, res.totalChunks);
  }
};
</script>

<style scoped></style>
