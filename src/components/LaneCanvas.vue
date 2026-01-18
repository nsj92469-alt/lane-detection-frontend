<template>
  <div class="canvas-container">

    <img v-if="inputMode === 'local' && imageSrc" ref="imgRef" :src="imageSrc" class="layer-source"
      @load="onImageLoaded" />

    <div v-if="inputMode === 'stream'" class="stream-placeholder">
    </div>

    <div v-if="inputMode === 'local' && !imageSrc" class="placeholder-box">
      <div class="icon">🖼️</div>
      <p>请上传本地图片</p>
    </div>

    <div v-if="inputMode === 'stream' && !isDetecting" class="placeholder-box">
      <div class="icon">📡</div>
      <p>等待连接视频流...</p>
    </div>

    <canvas ref="canvasRef" class="layer-overlay"></canvas>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'

const props = defineProps({
  imageSrc: String,
  isDetecting: Boolean,
  inputMode: String, // 'local' | 'stream'
  modelName: String
})

const imgRef = ref(null)
const canvasRef = ref(null)

// 初始化 Canvas 大小
// 在视频流模式下，我们默认一个 HD 分辨率
const initStreamCanvas = () => {
  if (canvasRef.value) {
    canvasRef.value.width = 1280
    canvasRef.value.height = 720
    console.log('[System] Video Stream Resolution Set: 1280x720')
  }
}

// 监听模式切换，如果是 stream 模式，立即初始化 Canvas
watch(() => props.inputMode, (mode) => {
  if (mode === 'stream') {
    // 稍微延迟确保 DOM 更新
    setTimeout(initStreamCanvas, 50)
  }
})

// 图片加载回调 (本地模式)
const onImageLoaded = () => {
  if (imgRef.value && canvasRef.value) {
    canvasRef.value.width = imgRef.value.naturalWidth
    canvasRef.value.height = imgRef.value.naturalHeight
    drawLanes() // 重绘一次清除旧内容
  }
}

// 暴露给父组件的方法：由 WebSocket (setInterval) 触发
const triggerRenderFromStream = () => {
  // 在真实逻辑中，这里会接收 lanes 数据： (lanesData)
  // drawLanes(lanesData)
  drawLanes()
}

// 核心绘制逻辑
const drawLanes = () => {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  const w = canvas.width
  const h = canvas.height
  const time = Date.now() / 200 // 速度加快一点

  // 1. 清空
  ctx.clearRect(0, 0, w, h)

  // 2. 如果是视频流模式，画一个半透明黑色底，模拟视频背景
  if (props.inputMode === 'stream') {
    ctx.fillStyle = '#111'
    ctx.fillRect(0, 0, w, h)

    // 画个网格装作在标定
    ctx.strokeStyle = '#333'
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let i = 0; i < w; i += 100) { ctx.moveTo(i, 0); ctx.lineTo(i, h); }
    for (let i = 0; i < h; i += 100) { ctx.moveTo(0, i); ctx.lineTo(w, i); }
    ctx.stroke()
  }

  // 3. 绘制动态车道线 (模拟)
  const jitter = Math.sin(time) * 10

  // 颜色配置
  const color = props.modelName === 'CLRNet' ? '#0f0' : '#00aaff'

  ctx.lineWidth = 5
  ctx.strokeStyle = color
  ctx.lineCap = 'round'

  // 左线
  ctx.beginPath()
  ctx.moveTo(w * 0.2 + jitter, h)
  ctx.bezierCurveTo(w * 0.3, h * 0.7, w * 0.45, h * 0.6, w * 0.48, h * 0.45)
  ctx.stroke()

  // 右线
  ctx.beginPath()
  ctx.moveTo(w * 0.8 - jitter, h)
  ctx.bezierCurveTo(w * 0.7, h * 0.7, w * 0.55, h * 0.6, w * 0.52, h * 0.45)
  ctx.stroke()

  // 4. 文字水印 (模拟推流时间)
  ctx.fillStyle = 'white'
  ctx.font = '20px Arial'
  ctx.fillText(`Live Inference | ${props.modelName}`, 20, 40)
}

// 暴露方法
defineExpose({
  triggerRenderFromStream
})
</script>

<style scoped>
.canvas-container {
  position: relative;
  width: 100%;
  height: 100%;
  background-color: transparent;
  /* 改为透明，背景色由父级 Card 控制 */
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
}

.layer-source {
  display: block;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  z-index: 1;
}

/* 视频流占位层 */
.stream-placeholder {
  width: 100%;
  height: 100%;
  background: radial-gradient(circle, #222 0%, #000 100%);
  position: absolute;
  top: 0;
  left: 0;
  z-index: 0;
}

.layer-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  /* 确保 Canvas 在视频流模式下也能自适应显示 */
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  z-index: 2;
}

.placeholder-box {
  position: absolute;
  z-index: 3;
  color: #666;
  text-align: center;
}

.icon {
  font-size: 3rem;
  margin-bottom: 10px;
}
</style>