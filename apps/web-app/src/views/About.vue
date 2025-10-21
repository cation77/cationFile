<template>
  <div class="about">
    <h1>关于页面</h1>
    <p>这是关于页面的内容</p>
    
    <div class="info-card">
      <h2>项目信息</h2>
      <p>这是一个基于 pnpm monorepo 架构的项目，包含前端和后端两个子项目。</p>
      <p>前端使用 Vue3 + TypeScript + Vite 技术栈，后端使用 Node.js + Express。</p>
    </div>
  </div>
</template>

<script setup lang="ts">
// 关于页面组件逻辑
</script>

<style scoped>
.about {
  max-width: 800px;
  margin: 0 auto;
}

.info-card {
  background-color: #f8f9fa;
  padding: 1.5rem;
  border-radius: 8px;
  margin-top: 2rem;
  border-left: 4px solid #007bff;
}
</style>
