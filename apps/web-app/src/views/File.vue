<template>
  <div class="api-test">
    <h1>文件上传页面</h1>
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
import useUpload from '@/hooks/useUpload';

const { isUploading, uploadFile, onError, onSuccess } = useUpload();
const file = ref();

const handleFileChange = (e: any) => {
  console.log(e.target.files);
  file.value = e.target.files?.[0];
};
const onUploadFile = () => {
  if (file.value) {
    uploadFile(file.value);
  }
};

onError(() => {
  file.value = '';
});
onSuccess(() => {
  file.value = '';
});
</script>

<style scoped>
.api-test {
  max-width: 800px;
  margin: 0 auto;
}

.test-section {
  margin-top: 2rem;
}

.test-btn {
  background-color: #007bff;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  transition: background-color 0.3s;
}

.test-btn:hover:not(:disabled) {
  background-color: #0056b3;
}

.test-btn:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}

.result,
.error {
  margin-top: 1rem;
  padding: 1rem;
  border-radius: 4px;
}

.result {
  background-color: #d4edda;
  border: 1px solid #c3e6cb;
}

.error {
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
}

pre {
  background-color: #f8f9fa;
  padding: 1rem;
  border-radius: 4px;
  overflow-x: auto;
}
</style>
