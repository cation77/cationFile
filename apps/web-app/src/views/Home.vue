<template>
  <div class="home">
    <h1>欢迎使用 Vue3 Monorepo 应用</h1>
    <p>这是一个基于 Vue3 + TypeScript + Vite 构建的前端应用</p>

    <div class="features">
      <h2>技术栈</h2>
      <ul>
        <li>Vue 3 - 渐进式JavaScript框架</li>
        <li>TypeScript - 类型安全的JavaScript</li>
        <li>Vite - 快速的构建工具</li>
        <li>Vue Router - 官方路由管理器</li>
        <li>Pinia - 状态管理库</li>
        <li>Vitest - 单元测试框架</li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
// 首页组件逻辑
</script>

<style scoped>
.home {
  text-align: center;
}

.features {
  margin-top: 2rem;
  text-align: left;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
}

.features ul {
  list-style-type: none;
  padding: 0;
}

.features li {
  padding: 0.5rem 0;
  border-bottom: 1px solid #eee;
}

.features li:last-child {
  border-bottom: none;
}
</style>
