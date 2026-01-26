<template>
  <div class="canvas-container" :class="{ 'transparent-bg': inputMode === 'video' && !imageSrc }">

    <img v-if="imageSrc" ref="imgRef" :src="imageSrc" class="layer-source" />

    <div v-if="inputMode === 'video' && !imageSrc && !isDetecting" class="placeholder-box">
      <div class="icon">📹</div>
      <p>请上传本地视频进行检测</p>
    </div>

    <div v-if="inputMode === 'local' && !imageSrc" class="placeholder-box">
      <div class="icon">🖼️</div>
      <p>请上传本地图片进行检测</p>
    </div>

  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  imageSrc: String,      // 图片路径
  isDetecting: Boolean,  // 是否检测中
  inputMode: String,     // 'local' | 'video'
  modelName: String      // 模型名称
})

const imgRef = ref(null)
</script>

<style scoped>
.canvas-container {
  position: relative;
  width: 100%;
  height: 100%;
  /* background-color: #1e1e1e; */
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  border-radius: 8px;
  transition: background-color 0.3s;
}

/* 视频预览时背景透明 */
.canvas-container.transparent-bg {
  background-color: transparent;
  pointer-events: none;
}

.layer-source {
  display: block;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  z-index: 10;
}

.placeholder-box {
  position: absolute;
  z-index: 5;
  color: #666;
  text-align: center;
  pointer-events: none;
  padding: 20px;
  border-radius: 12px;
}

.icon {
  font-size: 3rem;
  margin-bottom: 10px;
  opacity: 0.5;
}

p {
  font-family: monospace;
  font-size: 0.9rem;
}
</style>