<template>
  <div class="workspace">

    <aside class="sidebar-left modern-card">
      <div class="card-header">
        <h2>控制面板</h2>
        <p class="subtitle">操作配置</p>
      </div>

      <div class="card-body">
        <div class="form-group">
          <label class="form-label">输入模式</label>
          <div class="segment-control">
            <button v-for="mode in ['local', 'video']" :key="mode"
              :class="['segment-btn', inputMode === mode ? 'active' : '']" @click="switchMode(mode)">
              {{ mode === 'local' ? '📁 图片' : '🎬 视频文件' }}
            </button>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">检测模型</label>
          <div class="select-wrapper">
            <select v-model="selectedModel" class="select-modern">
              <option value="CLRNet">CLRNet</option>
              <option value="B-RESA">B-RESA</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">骨干网络 (Backbone)</label>
          <div class="select-wrapper">
            <select v-model="config.backbone" class="select-modern">
              <option v-for="opt in backboneOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <div style="display: flex; justify-content: space-between;">
            <label class="form-label">置信度: {{ config.conf_threshold }}</label>
          </div>
          <input type="range" min="0.05" max="1.0" step="0.05" v-model.number="config.conf_threshold"
            class="range-modern">
        </div>

        <div class="form-group">
          <div style="display: flex; justify-content: space-between;">
            <label class="form-label">去重距离 (NMS): {{ config.nms_threshold }} px</label>
          </div>
          <input type="range" min="0" max="50" step="1" v-model.number="config.nms_threshold" class="range-modern">
        </div>

        <div class="form-group input-area">
          <label class="form-label">数据源</label>

          <div v-if="inputMode === 'local'" class="upload-zone" :class="{ 'has-file': fileName }">
            <input type="file" id="file-upload" @change="handleFileUpload" accept="image/*" :disabled="isDetecting"
              hidden>
            <label for="file-upload" class="upload-label">
              <span class="icon">{{ fileName ? '✅' : '☁️' }}</span>
              <span class="text">{{ fileName || '点击上传图片' }}</span>
            </label>
          </div>

          <div v-else class="upload-zone" :class="{ 'has-file': videoFileName }">
            <input type="file" id="video-upload" @change="handleVideoUpload" accept="video/mp4,video/webm"
              :disabled="isDetecting" hidden>
            <label for="video-upload" class="upload-label">
              <span class="icon">{{ videoFileName ? '🎬' : '🎞️' }}</span>
              <span class="text">{{ videoFileName || '点击上传视频 (MP4)' }}</span>
            </label>
          </div>
        </div>

        <div class="action-area">
          <button @click="toggleInference" :class="['btn-primary', isDetecting ? 'btn-stop' : '']"
            :disabled="shouldDisableStartButton">
            <span v-if="isLoading">⏳ 初始化中...</span>
            <span v-else-if="isDetecting">⏹ 停止检测</span>
            <span v-else>▶ 开始检测</span>
          </button>
        </div>
      </div>
    </aside>

    <section class="stage-center modern-card">
      <div class="stage-header">
        <div class="stage-title">可视化结果</div>
        <div class="stage-meta">
          <span class="meta-tag">分辨率: {{ imageResolution }}</span>
          <span class="meta-tag" v-if="inputMode === 'video' && fps > 0">FPS: {{ fps }}</span>
          <span class="meta-tag" v-if="realLaneCount !== null">车道数: {{ realLaneCount }}</span>
        </div>
      </div>

      <div class="canvas-viewport">
        <LaneCanvas v-show="!showVideoPreview" ref="laneCanvasRef" :imageSrc="displayImage" :isDetecting="isDetecting"
          :inputMode="inputMode" :modelName="selectedModel" />

        <video ref="videoElement" :class="showVideoPreview ? 'video-preview' : 'offscreen-stream'" autoplay playsinline
          muted loop></video>

        <canvas ref="captureCanvas" class="offscreen-stream"></canvas>
      </div>
    </section>

    <aside class="sidebar-right modern-card">
      <div class="card-header">
        <h2>系统日志</h2>
        <p class="subtitle">运行状态监控</p>
      </div>

      <div class="terminal-window" ref="logWindow">
        <div v-for="(log, idx) in logs" :key="idx" class="log-line">
          <span class="log-time">[{{ log.time }}]</span>
          <span class="log-msg" :class="log.type">{{ log.msg }}</span>
        </div>
        <div v-if="logs.length === 0" class="log-empty">系统已就绪...</div>
      </div>

      <div class="metrics-panel">
        <div class="metric-item">
          <div class="label">当前状态</div>
          <div class="value" :style="{ color: isDetecting ? '#10B981' : '#64748B' }">
            {{ isDetecting ? '检测中' : '待机' }}
          </div>
        </div>
        <div class="metric-item">
          <div class="label">识别车道数</div>
          <div class="value">{{ realLaneCount !== null ? realLaneCount : '--' }}</div>
        </div>
      </div>
    </aside>

  </div>
</template>

<script setup>
import { ref, computed, nextTick, watch, onBeforeUnmount } from 'vue'
import LaneCanvas from '../components/LaneCanvas.vue'
import request from '../utils/request'

const API_BASE_URL = 'http://127.0.0.1:8000'
// ✅ 确保这里是你的后端真实 WS 地址
const WS_URL = 'ws://127.0.0.1:8000/api/lane/ws/realtime'

// 状态
const inputMode = ref('local')
const selectedModel = ref('CLRNet')
const isDetecting = ref(false)
const isLoading = ref(false)
const displayImage = ref('')
const fileName = ref('')
const videoFileName = ref('')
const logs = ref([])
const logWindow = ref(null)
const currentFile = ref(null)
const realLaneCount = ref(null)
const fps = ref(0)

// 实时流相关 Ref
const videoElement = ref(null)
const captureCanvas = ref(null)
let ws = null
let animationFrameId = null
let lastFrameTime = 0

// 参数配置
const config = ref({
  backbone: 'resnet18',
  conf_threshold: 0.40,
  nms_threshold: 15
})

// ✅ 修改：移除了 camera 的判断，仅 video 模式且未检测时显示预览
const showVideoPreview = computed(() => {
  return inputMode.value === 'video' && !isDetecting.value
})

const backboneOptions = computed(() => {
  if (selectedModel.value === 'CLRNet') {
    return [
      { label: 'ResNet-18 (快速)', value: 'resnet18' },
      { label: 'ResNet-34 (均衡)', value: 'resnet34' },
      { label: 'ResNet-101 (高精)', value: 'resnet101' },
      { label: 'DLA-34 (推荐)', value: 'dla34' }
    ]
  } else if (selectedModel.value === 'B-RESA') {
    return [
      { label: 'ResNet-18 (快速)', value: 'resnet18' },
      { label: 'ResNet-34 (均衡)', value: 'resnet34' },
      { label: 'ResNet-50 (标准)', value: 'resnet50' }
    ]
  }
  return []
})

watch(selectedModel, (newVal) => {
  const options = backboneOptions.value
  if (options.length > 0) {
    config.value.backbone = options[0].value
  }
})

const imageResolution = computed(() => displayImage.value ? '原始分辨率' : '无')

const shouldDisableStartButton = computed(() => {
  if (isLoading.value) return true
  if (inputMode.value === 'local' && !currentFile.value) return true
  if (inputMode.value === 'video' && !videoFileName.value) return true
  return false
})

const switchMode = (mode) => {
  stopInference()
  inputMode.value = mode
  resetState()

  // ✅ 修改：移除了摄像头模式的判断
  if (mode === 'video') addLog('已切换至视频文件模式', 'info')
  else addLog('已切换至本地文件模式', 'info')
}

const resetState = () => {
  isDetecting.value = false
  isLoading.value = false
  displayImage.value = ''
  fileName.value = ''
  videoFileName.value = ''
  currentFile.value = null
  realLaneCount.value = null
  fps.value = 0
}

const handleFileUpload = (event) => {
  const file = event.target.files[0]
  if (!file) return
  if (displayImage.value) URL.revokeObjectURL(displayImage.value)
  displayImage.value = URL.createObjectURL(file)
  fileName.value = file.name
  currentFile.value = file
  isDetecting.value = false
  realLaneCount.value = null
  addLog(`已加载图片: ${file.name}`, 'info')
}

const handleVideoUpload = (event) => {
  const file = event.target.files[0]
  if (!file) return
  videoFileName.value = file.name
  if (videoElement.value) {
    videoElement.value.src = URL.createObjectURL(file)
    videoElement.value.play().catch(e => console.log('Autoplay blocked', e))
  }
  addLog(`已加载视频: ${file.name}`, 'info')
}

// ❌ 删除了 startCameraPreview 函数

const toggleInference = () => {
  if (isDetecting.value) {
    stopInference()
    addLog('推理已停止', 'warning')
    return
  }

  if (inputMode.value === 'local') {
    runLocalInference()
  } else {
    runRealtimeInference()
  }
}

const stopInference = () => {
  isDetecting.value = false
  isLoading.value = false

  if (ws) {
    ws.close()
    ws = null
  }

  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }

  if (videoElement.value && inputMode.value === 'video') {
    videoElement.value.pause()
  }
}

const runRealtimeInference = async () => {
  isLoading.value = true

  try {
    // ✅ 修改：移除了摄像头逻辑，只保留视频文件检查
    if (inputMode.value === 'video') {
      if (!videoFileName.value) throw new Error("请先上传视频文件")
      videoElement.value.play()
    }

    ws = new WebSocket(WS_URL)

    ws.onopen = () => {
      addLog('WebSocket 连接成功', 'success')
      isDetecting.value = true
      isLoading.value = false
      startFrameLoop()
    }

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.status === 'success') {
        displayImage.value = data.image

        const now = performance.now()
        if (lastFrameTime) {
          fps.value = Math.round(1000 / (now - lastFrameTime))
        }
        lastFrameTime = now
      }
    }

    ws.onerror = (e) => {
      console.error(e)
      addLog('WebSocket 连接错误', 'error')
      stopInference()
    }

    ws.onclose = () => {
      addLog('WebSocket 连接已断开', 'warning')
      stopInference()
    }

  } catch (e) {
    addLog(`启动失败: ${e.message}`, 'error')
    isLoading.value = false
    stopInference()
  }
}

const startFrameLoop = () => {
  if (!isDetecting.value || !ws) return

  const sendFrame = () => {
    if (ws.readyState === WebSocket.OPEN && videoElement.value) {
      const vid = videoElement.value

      if (vid.readyState >= 2 && !vid.paused && !vid.ended) {
        const canvas = captureCanvas.value
        const ctx = canvas.getContext('2d')

        canvas.width = vid.videoWidth
        canvas.height = vid.videoHeight

        ctx.drawImage(vid, 0, 0, canvas.width, canvas.height)

        const base64Data = canvas.toDataURL('image/jpeg', 0.8)

        ws.send(JSON.stringify({
          type: 'frame',
          image: base64Data,
          config: {
            model: selectedModel.value,
            backbone: config.value.backbone,
            conf: config.value.conf_threshold,
            nms: config.value.nms_threshold
          }
        }))
      }
    }
    animationFrameId = requestAnimationFrame(sendFrame)
  }

  sendFrame()
}

const runLocalInference = async () => {
  isLoading.value = true
  addLog(`正在发送至后端...`, 'info')

  const formData = new FormData()
  formData.append('file', currentFile.value)
  formData.append('model_name', selectedModel.value)
  formData.append('backbone', config.value.backbone);
  formData.append('conf_threshold', config.value.conf_threshold);
  formData.append('nms_threshold', config.value.nms_threshold);

  try {
    const response = await request('/api/lane/detect/image', {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || `HTTP 错误: ${response.status}`)
    }

    const resJson = await response.json()
    if (resJson.code === 200) {
      const resultData = resJson.data
      const resultUrl = `${API_BASE_URL}/${resultData.img_url}`
      displayImage.value = resultUrl
      realLaneCount.value = resultData.lane_count

      isDetecting.value = true
      addLog(`✅ 检测成功: ${resultData.lane_count} 条车道线`, 'success')
    } else {
      throw new Error(resJson.message || '未知业务错误')
    }

  } catch (error) {
    console.error(error)
    addLog(`❌ 推理失败: ${error.message}`, 'error')
  } finally {
    isLoading.value = false
  }
}

const addLog = (msg, type = 'normal') => {
  const now = new Date()
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
  logs.value.unshift({ time: timeStr, msg, type })
  if (logs.value.length > 50) logs.value.pop()

  nextTick(() => {
    if (logWindow.value) logWindow.value.scrollTop = 0
  })
}

onBeforeUnmount(() => {
  stopInference()
})
</script>

<style scoped>
/* 保持所有样式不变，确保 video-preview 等类存在 */
.workspace {
  height: 100%;
  display: flex;
  gap: 20px;
  overflow: hidden;
}

.sidebar-left {
  width: 300px;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.sidebar-right {
  width: 280px;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.card-header {
  padding: 20px;
  border-bottom: 1px solid #e2e8f0;
  background: #fff;
  border-radius: 8px 8px 0 0;
}

.card-header h2 {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: #1e293b;
}

.subtitle {
  margin: 4px 0 0;
  font-size: 0.8rem;
  color: #64748b;
}

.card-body {
  padding: 20px;
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.form-group {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  margin-bottom: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  color: #475569;
}

.segment-control {
  display: flex;
  background: #F1F5F9;
  padding: 4px;
  border-radius: 8px;
}

.segment-btn {
  flex: 1;
  border: none;
  background: transparent;
  padding: 8px;
  font-size: 0.85rem;
  color: #64748b;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
}

.segment-btn.active {
  background: #fff;
  color: #2563eb;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  font-weight: 700;
}

.select-modern {
  width: 100%;
  padding: 10px;
  border-radius: 8px;
  border: 1px solid #cbd5e1;
  background: #fff;
  color: #334155;
}

.upload-zone {
  border: 2px dashed #cbd5e1;
  border-radius: 8px;
  text-align: center;
  transition: all 0.2s;
  cursor: pointer;
}

.upload-zone:hover {
  border-color: #2563eb;
  background: #eff6ff;
}

.upload-zone.has-file {
  border-color: #10b981;
  background: #f0fdf4;
}

.upload-label {
  display: block;
  padding: 20px;
  cursor: pointer;
}

.upload-label .icon {
  display: block;
  font-size: 24px;
  margin-bottom: 8px;
}

.upload-label .text {
  font-size: 0.85rem;
  color: #64748b;
}

.stream-badge {
  background: #EFF6FF;
  border: 1px solid #BFDBFE;
  color: #1E40AF;
  padding: 15px;
  border-radius: 8px;
  text-align: center;
}

.stream-badge .protocol {
  font-weight: bold;
  background: #2563EB;
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.7rem;
  margin-right: 8px;
}

.stream-badge .address {
  font-family: monospace;
  font-size: 0.85rem;
}

.action-area {
  margin-top: auto;
  padding-top: 20px;
}

.btn-primary {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 8px;
  background: #2563eb;
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-primary:hover {
  background: #1d4ed8;
}

.btn-primary:disabled {
  background: #94a3b8;
  cursor: not-allowed;
}

.btn-stop {
  background: #ef4444;
}

.btn-stop:hover {
  background: #dc2626;
}

.stage-center {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #000;
  border-radius: 8px;
  overflow: hidden;
}

.stage-header {
  padding: 12px 20px;
  background: #1e1e1e;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #333;
}

.stage-title {
  color: #fff;
  font-weight: 600;
  font-size: 0.9rem;
}

.meta-tag {
  background: #333;
  color: #aaa;
  font-size: 0.75rem;
  padding: 2px 8px;
  border-radius: 4px;
  margin-left: 8px;
  font-family: monospace;
}

.canvas-viewport {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: #000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.terminal-window {
  flex: 1;
  background: #ffffff;
  padding: 15px;
  overflow-y: auto;
  font-family: monospace;
  font-size: 0.8rem;
  border-bottom: 1px solid #e2e8f0;
}

.log-line {
  margin-bottom: 6px;
  display: flex;
}

.log-time {
  color: #64748b;
  margin-right: 10px;
  flex-shrink: 0;
}

.log-msg {
  color: #e2e8f0;
  word-break: break-all;
}

.log-msg.error {
  color: #ef4444;
}

.log-msg.success {
  color: #10b981;
}

.log-msg.warning {
  color: #f59e0b;
}

.log-msg.info {
  color: #3b82f6;
}

.metrics-panel {
  padding: 20px;
  background: #fff;
  display: flex;
  gap: 15px;
  border-radius: 0 0 8px 8px;
}

.metric-item {
  flex: 1;
  background: #f8fafc;
  padding: 12px;
  border-radius: 8px;
  text-align: center;
  border: 1px solid #e2e8f0;
}

.metric-item .label {
  font-size: 0.75rem;
  color: #64748b;
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.metric-item .value {
  font-size: 1.25rem;
  font-weight: 700;
  color: #0f172a;
  font-family: monospace;
}

.range-modern {
  width: 100%;
  cursor: pointer;
}

/* 关键样式保留 */
.video-preview {
  max-width: 100%;
  max-height: 100%;
  display: block;
}

.offscreen-stream {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  /* 视觉不可见 */
  z-index: -1;
  /* 沉底，不挡住结果层 */
  object-fit: contain;
  /* 保持比例 */
  pointer-events: none;
}
</style>