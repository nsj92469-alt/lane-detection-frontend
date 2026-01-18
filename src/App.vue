<template>
  <div class="app-layout">
    <header class="navbar">
      <div class="brand-container">
        <div class="logo-box">🔬</div>
        <div class="brand-text">
          <h1>LaneDet System</h1>
          <span class="version-tag">Thesis Demo v2.0</span>
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
          <p class="subtitle">Control Panel</p>
        </div>

        <div class="card-body">
          <div class="form-group">
            <label class="form-label">输入模式 / Input Mode</label>
            <div class="segment-control">
              <button v-for="mode in ['local', 'stream']" :key="mode"
                :class="['segment-btn', inputMode === mode ? 'active' : '']" @click="switchMode(mode)">
                {{ mode === 'local' ? '📁 本地文件' : '📹 实时视频流' }}
              </button>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">检测网络 / Network</label>
            <div class="select-wrapper">
              <select v-model="selectedModel" class="select-modern">
                <option value="CLRNet">CLRNet (ResNet-101)</option>
                <option value="B-RESA">B-RESA (ResNet-34)</option>
              </select>
            </div>
          </div>

          <div class="form-group input-area">
            <label class="form-label">数据源 / Source</label>

            <div v-if="inputMode === 'local'" class="upload-zone" :class="{ 'has-file': fileName }">
              <input type="file" id="file-upload" @change="handleFileUpload" accept="image/*,video/*" hidden>
              <label for="file-upload" class="upload-label">
                <span class="icon">{{ fileName ? '✅' : '☁️' }}</span>
                <span class="text">{{ fileName || '点击选择图片/视频' }}</span>
              </label>
            </div>

            <div v-else class="stream-badge">
              <span class="protocol">WS</span>
              <span class="address">ws://localhost:8000/stream</span>
            </div>
          </div>

          <div class="action-area">
            <button @click="toggleInference" :class="['btn-primary', isDetecting ? 'btn-stop' : '']"
              :disabled="inputMode === 'local' && !imageSrc">
              <span v-if="isDetecting">⏹ 停止推理 (Stop)</span>
              <span v-else>▶ 开始检测 (Start)</span>
            </button>
          </div>
        </div>
      </aside>

      <section class="stage-center modern-card">
        <div class="stage-header">
          <div class="stage-title">可视化视图 / Visualization</div>
          <div class="stage-meta">
            <span class="meta-tag">RES: {{ imageResolution }}</span>
            <span class="meta-tag">FPS: {{ fps }}</span>
          </div>
        </div>

        <div class="canvas-viewport">
          <LaneCanvas ref="laneCanvasRef" :imageSrc="imageSrc" :isDetecting="isDetecting" :inputMode="inputMode"
            :modelName="selectedModel" />
        </div>
      </section>

      <aside class="sidebar-right modern-card">
        <div class="card-header">
          <h2>系统日志</h2>
          <p class="subtitle">System Logs</p>
        </div>

        <div class="terminal-window">
          <div v-for="(log, idx) in logs" :key="idx" class="log-line">
            <span class="log-time">[{{ log.time }}]</span>
            <span class="log-msg">{{ log.msg }}</span>
          </div>
          <div v-if="logs.length === 0" class="log-empty">System Ready...</div>
        </div>

        <div class="metrics-panel">
          <div class="metric-item">
            <div class="label">Latency</div>
            <div class="value">{{ isDetecting ? '32ms' : '--' }}</div>
          </div>
          <div class="metric-item">
            <div class="label">Confidence</div>
            <div class="value">{{ isDetecting ? '0.98' : '--' }}</div>
          </div>
        </div>
      </aside>

    </main>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import LaneCanvas from './components/LaneCanvas.vue'

// --- 逻辑与之前保持完全一致，仅复用代码 ---
const inputMode = ref('local')
const selectedModel = ref('CLRNet')
const isDetecting = ref(false)
const imageSrc = ref('')
const fileName = ref('')
const logs = ref([])
const fps = ref(0)
const laneCanvasRef = ref(null)
let wsInterval = null
let frameCount = 0

// 计算属性
const connectionStatus = computed(() => {
  if (inputMode.value === 'local') return { text: 'Local Mode', class: 'status-gray' }
  if (isDetecting.value) return { text: 'Online', class: 'status-green' }
  return { text: 'Standby', class: 'status-orange' }
})
const imageResolution = computed(() => imageSrc.value ? 'Adaptive' : 'N/A')

// 方法
const switchMode = (mode) => {
  inputMode.value = mode
  isDetecting.value = false
  clearInterval(wsInterval)
  if (mode === 'stream') {
    imageSrc.value = ''
    fileName.value = ''
    addLog('System switched to Stream Mode')
  } else {
    addLog('System switched to Local Mode')
  }
}

const handleFileUpload = (event) => {
  const file = event.target.files[0]
  if (!file) return
  if (imageSrc.value) URL.revokeObjectURL(imageSrc.value)
  imageSrc.value = URL.createObjectURL(file)
  fileName.value = file.name
  isDetecting.value = false
  addLog(`Loaded: ${file.name}`)
}

const toggleInference = () => {
  if (inputMode.value === 'local' && !imageSrc.value) return
  isDetecting.value = !isDetecting.value

  if (isDetecting.value) {
    if (inputMode.value === 'stream') startSimulatedStream()
    else addLog(`Starting inference on ${selectedModel.value}...`)
  } else {
    stopStream()
    addLog('Inference stopped by user')
  }
}

const startSimulatedStream = () => {
  addLog('Connecting to WebSocket...')
  setTimeout(() => {
    addLog('Connection established.')
    wsInterval = setInterval(() => {
      fps.value = 28 + Math.floor(Math.random() * 5)
      if (laneCanvasRef.value) laneCanvasRef.value.triggerRenderFromStream()
      frameCount++
      if (frameCount % 20 === 0) addLog(`Processing Frame #${frameCount}`)
    }, 100)
  }, 500)
}

const stopStream = () => {
  clearInterval(wsInterval)
  fps.value = 0
  addLog('Connection closed')
}

const addLog = (msg) => {
  const now = new Date()
  const timeStr = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`
  logs.value.unshift({ time: timeStr, msg })
  if (logs.value.length > 50) logs.value.pop()
}
</script>

<style scoped>
/* 页面布局 CSS - 仅仅是布局，样式引用 style.css */
.app-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 0;
}

/* 1. Navbar */
.navbar {
  height: 64px;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border-light);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  box-shadow: var(--shadow-sm);
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
  color: var(--text-main);
}

.version-tag {
  background: var(--primary-light);
  color: var(--primary-color);
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

/* 2. Workspace Layout */
.workspace {
  flex: 1;
  display: flex;
  gap: 20px;
  /* 卡片间距 */
  padding: 20px;
  background: var(--bg-page);
  overflow: hidden;
}

/* Sidebars */
.sidebar-left {
  width: 300px;
  padding: 0;
}

.sidebar-right {
  width: 280px;
  padding: 0;
}

.card-header {
  padding: 20px;
  border-bottom: 1px solid var(--border-light);
  background: #fff;
}

.card-header h2 {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-main);
}

.subtitle {
  margin: 4px 0 0;
  font-size: 0.8rem;
  color: var(--text-sub);
}

.card-body {
  padding: 20px;
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

/* Segment Control */
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
  color: var(--text-sub);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
}

.segment-btn.active {
  background: #fff;
  color: var(--primary-color);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  font-weight: 700;
}

/* Upload Zone */
.upload-zone {
  border: 2px dashed var(--border-light);
  border-radius: var(--radius-md);
  text-align: center;
  transition: all 0.2s;
}

.upload-zone:hover {
  border-color: var(--primary-color);
  background: var(--primary-light);
}

.upload-zone.has-file {
  border-color: var(--success);
  background: #F0FDF4;
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
  color: var(--text-sub);
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
  font-family: var(--font-mono);
  font-size: 0.85rem;
}

.action-area {
  margin-top: auto;
  padding-top: 20px;
}

/* Center Stage */
.stage-center {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #000;
  border: none;
}

/* Canvas 背景改黑 */
.stage-header {
  padding: 12px 20px;
  background: #1E1E1E;
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
  font-family: var(--font-mono);
}

.canvas-viewport {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: #000;
}

/* Logs Terminal */
.terminal-window {
  flex: 1;
  background: var(--bg-terminal);
  padding: 15px;
  overflow-y: auto;
  font-family: var(--font-mono);
  font-size: 0.8rem;
  border-bottom: 1px solid var(--border-light);
}

.log-line {
  margin-bottom: 6px;
  display: flex;
}

.log-time {
  color: #64748B;
  margin-right: 10px;
  flex-shrink: 0;
}

.log-msg {
  color: #10B981;
  word-break: break-all;
}

.log-empty {
  color: #475569;
  text-align: center;
  margin-top: 20px;
}

.metrics-panel {
  padding: 20px;
  background: #fff;
  display: flex;
  gap: 15px;
}

.metric-item {
  flex: 1;
  background: #F8FAFC;
  padding: 12px;
  border-radius: 8px;
  text-align: center;
  border: 1px solid var(--border-light);
}

.metric-item .label {
  font-size: 0.75rem;
  color: var(--text-sub);
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.metric-item .value {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--primary-color);
  font-family: var(--font-mono);
}
</style>