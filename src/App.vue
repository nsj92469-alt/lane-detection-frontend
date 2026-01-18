<template>
  <div class="app-layout">
    <header class="navbar">
      <div class="brand-container">
        <div class="logo-box">🔬</div>
        <div class="brand-text">
          <h1>车道线智能检测系统</h1>
          <span class="version-tag">毕业论文演示版 v2.0</span>
        </div>
      </div>

      <div class="status-indicator" :class="connectionStatus.class">
        <span class="status-dot"></span>
        {{ connectionStatus.text }}
      </div>
    </header>

    <main class="workspace">

      <aside class="sidebar-left modern-card">
        <div class="card-header">
          <h2>控制面板</h2>
          <p class="subtitle">操作配置</p>
        </div>

        <div class="card-body">
          <div class="form-group">
            <label class="form-label">输入模式</label>
            <div class="segment-control">
              <button v-for="mode in ['local', 'stream']" :key="mode"
                :class="['segment-btn', inputMode === mode ? 'active' : '']" @click="switchMode(mode)">
                {{ mode === 'local' ? '📁 本地文件' : '📹 实时视频流' }}
              </button>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">检测模型</label>
            <div class="select-wrapper">
              <select v-model="selectedModel" class="select-modern">
                <option value="CLRNet">CLRNet (ResNet-101)</option>
                <option value="B-RESA">B-RESA (ResNet-34)</option>
              </select>
            </div>
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

            <div v-else class="stream-badge">
              <span class="protocol">WS</span>
              <span class="address">ws://localhost:8000/stream</span>
            </div>
          </div>

          <div class="action-area">
            <button @click="toggleInference" :class="['btn-primary', isDetecting ? 'btn-stop' : '']"
              :disabled="(inputMode === 'local' && !currentFile) || isLoading">
              <span v-if="isLoading">⏳ 处理中...</span>
              <span v-else-if="isDetecting">⏹ 重置 / 停止</span>
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
            <span class="meta-tag" v-if="realLaneCount !== null">车道数: {{ realLaneCount }}</span>
          </div>
        </div>

        <div class="canvas-viewport">
          <LaneCanvas ref="laneCanvasRef" :imageSrc="displayImage" :isDetecting="isDetecting" :inputMode="inputMode"
            :modelName="selectedModel" />
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
              {{ isDetecting ? '检测完成' : '待机' }}
            </div>
          </div>
          <div class="metric-item">
            <div class="label">识别车道数</div>
            <div class="value">{{ realLaneCount !== null ? realLaneCount : '--' }}</div>
          </div>
        </div>
      </aside>

    </main>
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import LaneCanvas from './components/LaneCanvas.vue'

// 配置：后端 Django 地址 (确保 Django 已启动并配置了 CORS)
const API_BASE_URL = 'http://127.0.0.1:8000'

// 状态
const inputMode = ref('local')
const selectedModel = ref('B-RESA')
const isDetecting = ref(false) // 是否处于检测完成状态
const isLoading = ref(false)   // 是否正在请求接口
const displayImage = ref('')   // 当前显示的图片URL (可能是本地预览，也可能是后端结果)
const fileName = ref('')
const logs = ref([])
const laneCanvasRef = ref(null)
const logWindow = ref(null)
const currentFile = ref(null)  // 保存原始文件对象用于上传
const realLaneCount = ref(null)

// 计算属性
const connectionStatus = computed(() => {
  if (isLoading.value) return { text: '处理中...', class: 'status-orange' }
  if (isDetecting.value) return { text: '已完成', class: 'status-green' }
  return { text: '就绪', class: 'status-gray' }
})

const imageResolution = computed(() => displayImage.value ? '自适应' : '无')

// 方法
const switchMode = (mode) => {
  inputMode.value = mode
  resetState()
  if (mode === 'stream') {
    addLog('系统已切换至流媒体模式 (演示)', 'info')
  } else {
    addLog('系统已切换至本地文件模式', 'info')
  }
}

const resetState = () => {
  isDetecting.value = false
  isLoading.value = false
  displayImage.value = ''
  fileName.value = ''
  currentFile.value = null
  realLaneCount.value = null
}

const handleFileUpload = (event) => {
  const file = event.target.files[0]
  if (!file) return

  // 1. 本地预览
  if (displayImage.value) URL.revokeObjectURL(displayImage.value)
  displayImage.value = URL.createObjectURL(file)

  // 2. 保存文件对象
  fileName.value = file.name
  currentFile.value = file

  // 3. 重置状态
  isDetecting.value = false
  realLaneCount.value = null
  addLog(`已加载文件: ${file.name}`, 'info')
}

const toggleInference = () => {
  // 如果正在检测，则视为重置
  if (isDetecting.value) {
    resetState()
    addLog('状态已重置。', 'info')
    return
  }

  // 开始检测流程
  if (inputMode.value === 'local') {
    if (!currentFile.value) {
      addLog('错误：未选择图片文件。', 'error')
      return
    }
    runLocalInference()
  } else {
    addLog('演示版本暂未实现流媒体模式推理。', 'warning')
  }
}

// 🚀 核心：调用 Django 后端接口
const runLocalInference = async () => {
  isLoading.value = true
  addLog(`正在将 ${fileName.value} 发送至 Django 后端...`, 'info')

  const formData = new FormData()
  formData.append('image', currentFile.value) // 对应 Django request.FILES.get('image')

  try {
    // ⚠️ [修复点] 去掉末尾的斜杠，匹配 Django urls.py 中的 path('detection', ...)
    const response = await fetch(`${API_BASE_URL}/detection`, {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      throw new Error(`HTTP 错误: ${response.status}`)
    }

    const resJson = await response.json()

    // 兼容 Django 返回的不同 code 格式
    if (resJson.img_url || (resJson.code === 200)) {
      // 成功：处理返回数据

      // 1. 提取数据 (兼容两种返回结构)
      const resultUrl = resJson.img_url ? `${API_BASE_URL}/${resJson.img_url}` : `${API_BASE_URL}/${resJson.data.img_url}`
      const laneCount = resJson.alarms ? resJson.alarms[0].count : (resJson.data ? resJson.data.lane_count : '?')

      displayImage.value = resultUrl
      realLaneCount.value = laneCount

      isDetecting.value = true
      addLog(`✅ 成功！检测到 ${laneCount} 条车道线。`, 'success')
      addLog(`可视化结果已加载。`, 'success')
    } else {
      // 失败
      throw new Error(resJson.message || resJson.error || '未知错误')
    }

  } catch (error) {
    console.error(error)
    addLog(`❌ 推理失败: ${error.message}`, 'error')
    alert('后端连接失败！请检查 Django 控制台是否报错。')
  } finally {
    isLoading.value = false
  }
}

const addLog = (msg, type = 'normal') => {
  const now = new Date()
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
  logs.value.unshift({ time: timeStr, msg, type })
  if (logs.value.length > 50) logs.value.pop()

  // 自动滚动 (虽然是 unshift，但保持习惯)
  nextTick(() => {
    if (logWindow.value) logWindow.value.scrollTop = 0
  })
}
</script>

<style scoped>
/* 保持原有布局样式，增加少许状态颜色 */
.app-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 0;
  color: var(--text-main);
}

/* 1. Navbar */
.navbar {
  height: 64px;
  background: #ffffff;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  z-index: 10;
}

.brand-container {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-box {
  font-size: 24px;
}

.brand-text h1 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 700;
  color: #1e293b;
}

.version-tag {
  background: #dbeafe;
  color: #1d4ed8;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  font-weight: 500;
  padding: 6px 12px;
  border-radius: 20px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
}

.status-gray {
  background: #F1F5F9;
  color: #64748B;
}

.status-green {
  background: #DCFCE7;
  color: #166534;
}

.status-orange {
  background: #FEF3C7;
  color: #92400E;
}

/* 2. Workspace */
.workspace {
  flex: 1;
  display: flex;
  gap: 20px;
  padding: 20px;
  background: #f8fafc;
  overflow: hidden;
}

.sidebar-left {
  width: 300px;
  padding: 0;
  display: flex;
  flex-direction: column;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}

.sidebar-right {
  width: 280px;
  padding: 0;
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

/* Controls */
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

/* Upload */
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

/* Stage */
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

/* Logs */
.terminal-window {
  flex: 1;
  background: #0f172a;
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
</style>