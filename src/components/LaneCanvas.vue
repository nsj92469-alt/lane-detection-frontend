<template>
  <div class="canvas-container">

    <img v-if="inputMode === 'local' && imageSrc" ref="imgRef" :src="imageSrc" class="layer-source" />

    <div v-if="inputMode === 'stream'" class="stream-placeholder">
      <div class="placeholder-content">
        <div class="icon">📹</div>
        <p>实时流模式开发中...</p>
      </div>
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
  imageSrc: String,      // 图片路径 (预览图 or 结果图)
  isDetecting: Boolean,  // 是否检测完成
  inputMode: String,     // 'local' | 'stream'
  modelName: String      // 当前选择的模型名称
})

const imgRef = ref(null)

// 之前的模拟绘制逻辑全部删除
// 现在我们完全信任后端返回的静态图片 (imageSrc)
</script>

<style scoped>
.canvas-container {
  position: relative;
  width: 100%;
  height: 100%;
  /* 保持背景透明或微深色，视个人喜好 */
  background-color: #1e1e1e;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  border-radius: 8px;
}

.layer-source {
  display: block;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  /* 保持图片比例 */
  z-index: 1;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

/* 视频流占位层 */
.stream-placeholder {
  width: 100%;
  height: 100%;
  background: radial-gradient(circle, #222 0%, #000 100%);
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 0;
}

.placeholder-box,
.placeholder-content {
  position: absolute;
  z-index: 3;
  color: #666;
  text-align: center;
  pointer-events: none;
  /* 让点击穿透，方便触发上传 */
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