<template>
  <ToastManager />

  <router-view></router-view>
</template>

<script setup>
import ToastManager from './components/ToastManager.vue'
</script>

<style>
/* 全局基础样式 */
html,
body,
#app {
  height: 100%;
  margin: 0;
  padding: 0;
  background-color: #f8fafc;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
</style>