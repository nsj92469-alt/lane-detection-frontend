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
              <option value="CLRNet">CLRNet (ResNet/DLA)</option>
              <option value="B-RESA">B-RESA (ResNet)</option>
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

  </div>
</template>

<script setup>
import { ref, computed, nextTick, watch } from 'vue' // ✅ 引入 watch
import LaneCanvas from '../components/LaneCanvas.vue'

const API_BASE_URL = 'http://127.0.0.1:8000'

// 状态
const inputMode = ref('local')
const selectedModel = ref('CLRNet')
const isDetecting = ref(false)
const isLoading = ref(false)
const displayImage = ref('')
const fileName = ref('')
const logs = ref([])
const logWindow = ref(null)
const currentFile = ref(null)
const realLaneCount = ref(null)

// ✅ [新增] 参数配置对象
const config = ref({
  backbone: 'resnet18',       // 默认骨干网络
  conf_threshold: 0.40,       // 默认置信度
  nms_threshold: 15           // 默认 NMS 阈值
})

// ✅ [新增] 模型与骨干网络的映射关系
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

// ✅ [新增] 监听模型切换，自动重置 backbone 为该模型的第一个选项
watch(selectedModel, (newVal) => {
  const options = backboneOptions.value
  if (options.length > 0) {
    config.value.backbone = options[0].value
  }
})

const imageResolution = computed(() => displayImage.value ? '自适应' : '无')

// ... (switchMode, resetState, handleFileUpload 方法保持不变) ...
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

  if (displayImage.value) URL.revokeObjectURL(displayImage.value)
  displayImage.value = URL.createObjectURL(file)
  fileName.value = file.name
  currentFile.value = file
  isDetecting.value = false
  realLaneCount.value = null
  addLog(`已加载文件: ${file.name}`, 'info')
}

// ... (toggleInference 方法保持不变) ...
const toggleInference = () => {
  if (isDetecting.value) {
    resetState()
    addLog('状态已重置。', 'info')
    return
  }

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

// ✅ [修改] runLocalInference 方法，发送新参数
// 🚀 核心：调用 FastAPI 后端接口
const runLocalInference = async () => {
  isLoading.value = true
  addLog(`正在将 ${fileName.value} 发送至 FastAPI 后端...`, 'info')

  const formData = new FormData()
  // ⚠️ 关键修正：FastAPI 的 UploadFile 参数名在 lane.py 中定义为 "file"，不是 "image"
  formData.append('file', currentFile.value)

  // ➕ 新增：传递当前选中的模型参数
  formData.append('model_name', selectedModel.value)

  try {
    // ⚠️ 关键修正：路径改为 FastAPI 的规范路径 /api/lane/detect/image
    const response = await fetch(`${API_BASE_URL}/api/lane/detect/image`, {
      method: 'POST',
      // 注意：fetch 会自动设置 Content-Type 为 multipart/form-data，不要手动设置 headers
      headers: {
        // 如果后端开启了 JWT 鉴权，这里可能以后需要加 Authorization
        // 'Authorization': `Bearer ${token}` 
      },
      body: formData
    })

    if (!response.ok) {
      // 尝试读取后端返回的详细错误信息
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.detail || `HTTP 错误: ${response.status}`)
    }

    const resJson = await response.json()

    if (resJson.code === 200) {
      // 成功：处理返回数据
      const resultData = resJson.data

      // 拼接完整的图片 URL (FastAPI 返回的是相对路径 static/...)
      const resultUrl = `${API_BASE_URL}/${resultData.img_url}`

      displayImage.value = resultUrl
      realLaneCount.value = resultData.lane_count

      isDetecting.value = true
      addLog(`✅ 成功！检测到 ${resultData.lane_count} 条车道线。`, 'success')
      addLog(`可视化结果已加载: ${resultData.img_url}`, 'success')
    } else {
      throw new Error(resJson.message || '未知业务错误')
    }

  } catch (error) {
    console.error(error)
    addLog(`❌ 推理失败: ${error.message}`, 'error')
    alert(`后端请求失败：${error.message}\n请检查后端控制台是否报错。`)
  } finally {
    isLoading.value = false
  }
}

// ... (addLog 方法保持不变) ...
const addLog = (msg, type = 'normal') => {
  const now = new Date()
  const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
  logs.value.unshift({ time: timeStr, msg, type })
  if (logs.value.length > 50) logs.value.pop()

  nextTick(() => {
    if (logWindow.value) logWindow.value.scrollTop = 0
  })
}
</script>

<style scoped>
/* 核心布局 */
.workspace {
  /* 填满 MainLayout 给的容器 */
  height: 100%;
  display: flex;
  gap: 20px;
  /* padding: 20px; 这一层不需要padding，MainLayout给了 */
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

.range-modern {
  width: 100%;
  cursor: pointer;
}
</style>