<template>
  <div class="dashboard-page">
    <div class="page-header">
      <h2>数据看板</h2>
      <span class="subtitle">基于最近 100 条检测记录的实时分析</span>
    </div>

    <div class="stats-row">
      <div class="stat-card modern-card">
        <div class="stat-content-wrapper">
          <div class="stat-icon icon-blue">📊</div>
          <div class="stat-info">
            <div class="label">总检测数</div>
            <div class="value">{{ totalCount }}</div>
          </div>
        </div>
      </div>
      <div class="stat-card modern-card">
        <div class="stat-content-wrapper">
          <div class="stat-icon icon-green">✅</div>
          <div class="stat-info">
            <div class="label">成功率</div>
            <div class="value">{{ successRate }}%</div>
          </div>
        </div>
      </div>
      <div class="stat-card modern-card">
        <div class="stat-content-wrapper">
          <div class="stat-icon icon-purple">🛣️</div>
          <div class="stat-info">
            <div class="label">平均车道数</div>
            <div class="value">{{ avgLanes }}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="charts-row">
      <div class="chart-card modern-card">
        <div class="card-title-area">
          <h3>检测结果分布</h3>
        </div>
        <div ref="pieChartRef" class="chart-container"></div>
      </div>
      <div class="chart-card modern-card">
        <div class="card-title-area">
          <h3>每日检测趋势</h3>
        </div>
        <div ref="lineChartRef" class="chart-container"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, onUnmounted } from 'vue'
import * as echarts from 'echarts'
import request from '../utils/request'

const list = ref([])
const pieChartRef = ref(null)
const lineChartRef = ref(null)
let pieChartInstance = null
let lineChartInstance = null

// --- 统计数据逻辑 ---
const totalCount = computed(() => list.value.length)
const successRate = computed(() => {
  if (!list.value.length) return 0
  const success = list.value.filter(i => i.result && i.result.length > 0).length
  return ((success / list.value.length) * 100).toFixed(1)
})
const avgLanes = computed(() => {
  if (!list.value.length) return 0
  let totalLanes = 0
  list.value.forEach(item => {
    try {
      const res = typeof item.result === 'string' ? JSON.parse(item.result.replace(/'/g, '"')) : item.result
      if (Array.isArray(res) && res[0] && res[0].count) {
        totalLanes += parseInt(res[0].count)
      }
    } catch (e) { /* ignore */ }
  })
  return (totalLanes / list.value.length).toFixed(1)
})

// --- 辅助函数：日期格式化 ---
const formatDate = (dateStr) => {
  if (!dateStr) return '未知日期'
  try {
    const date = new Date(dateStr)
    // 格式化为 YYYY-MM-DD
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  } catch (e) {
    return dateStr.split(' ')[0] || dateStr
  }
}

// --- 初始化数据 ---
const fetchData = async () => {
  try {
    const response = await request('/api/history/list?skip=0&limit=100')
    if (!response.ok) throw new Error('Network response was not ok')

    const data = await response.json()
    if (Array.isArray(data)) {
      list.value = data
      setTimeout(initCharts, 100)
    }
  } catch (err) {
    console.error('Fetch failed', err)
  }
}

// --- 渲染图表 ---
// --- 渲染图表 ---
const initCharts = () => {
  if (!pieChartRef.value || !lineChartRef.value) return

  if (pieChartInstance) pieChartInstance.dispose()
  if (lineChartInstance) lineChartInstance.dispose()

  // 1. 玫瑰图 (Pie Chart Upgrade)
  const laneCounts = {}
  list.value.forEach(item => {
    let count = '识别失败'
    try {
      const res = typeof item.result === 'string' ? JSON.parse(item.result.replace(/'/g, '"')) : item.result
      if (res && res[0] && res[0].count !== undefined) count = res[0].count + ' 车道'
    } catch (e) { }
    laneCounts[count] = (laneCounts[count] || 0) + 1
  })

  const pieData = Object.keys(laneCounts)
    .map(k => ({ value: laneCounts[k], name: k }))
    .sort((a, b) => b.value - a.value)

  pieChartInstance = echarts.init(pieChartRef.value)
  pieChartInstance.setOption({
    color: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
    // 鼠标悬停时显示的提示框（这里依然保留名称，方便查看）
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)'
    },
    // 图例显示在底部，用户可以通过颜色对应名称
    legend: { bottom: '0%', left: 'center', icon: 'circle' },
    series: [{
      name: '车道数分布',
      type: 'pie',
      radius: ['30%', '70%'],
      center: ['50%', '45%'],
      roseType: 'radius',
      itemStyle: {
        borderRadius: 8,
        borderColor: '#fff',
        borderWidth: 2
      },
      label: {
        show: true,
        // ✅ 核心修改：移除 {b} (名称)，只保留 {d}% (百分比)
        // 这样画面会非常干净，名称通过底部的 Legend (图例) 查看
        formatter: '{d}%'
      },
      labelLine: {
        show: true,
        smooth: 0.2,
        length: 10,
        length2: 20
      },
      data: pieData
    }]
  })

  // 2. 每日趋势图 (X轴格式化)
  const dateCounts = {}
  list.value.forEach(item => {
    // 统一格式化日期
    const date = formatDate(item.create_time)
    dateCounts[date] = (dateCounts[date] || 0) + 1
  })

  // 按日期排序
  const sortedDates = Object.keys(dateCounts).sort((a, b) => new Date(a) - new Date(b))
  const lineData = sortedDates.map(d => dateCounts[d])

  lineChartInstance = echarts.init(lineChartRef.value)
  lineChartInstance.setOption({
    color: ['#3b82f6'],
    tooltip: {
      trigger: 'axis',
      formatter: '{b}<br />检测数量: {c}'
    },
    grid: {
      top: '12%',
      left: '3%',
      right: '4%',
      bottom: '10%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: sortedDates,
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisLabel: {
        color: '#64748b',
        rotate: 0, // 如果日期太长，可以设为 45
        formatter: (value) => {
          // 智能简写：如果是同一年，可以只显示月-日 (MM-DD)
          // 这里简单返回完整 YYYY-MM-DD
          return value;
        }
      },
      boundaryGap: false
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      splitLine: { lineStyle: { type: 'dashed', color: '#f1f5f9' } }
    },
    series: [{
      data: lineData,
      type: 'line',
      smooth: true, // ✅ 平滑曲线，更高级
      symbol: 'circle',
      symbolSize: 8,
      lineStyle: { width: 3 },
      areaStyle: {
        // ✅ 渐变填充，增加科技感
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(59, 130, 246, 0.4)' },
          { offset: 1, color: 'rgba(59, 130, 246, 0.05)' }
        ])
      }
    }]
  })
}

const handleResize = () => {
  pieChartInstance?.resize()
  lineChartInstance?.resize()
}

onMounted(() => {
  fetchData()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (pieChartInstance) pieChartInstance.dispose()
  if (lineChartInstance) lineChartInstance.dispose()
})
</script>

<style scoped>
.dashboard-page {
  height: 100%;
  overflow-y: auto;
  padding: 0 4px 40px 4px;
}

/* 标题 */
.page-header {
  margin-bottom: 30px;
  border-left: 5px solid #3b82f6;
  padding-left: 15px;
}

.page-header h2 {
  margin: 0 0 5px 0;
  font-size: 1.5rem;
  color: #1e293b;
  font-weight: 700;
}

.subtitle {
  color: #64748b;
  font-size: 0.9rem;
}

/* 卡片容器 */
.stats-row {
  display: flex;
  gap: 24px;
  margin-bottom: 30px;
  flex-wrap: wrap;
}

.modern-card {
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
  border: 1px solid #f1f5f9;
  transition: transform 0.2s, box-shadow 0.2s;
}

.modern-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.08);
}

/* 统计卡片 (修复居中) */
.stat-card {
  flex: 1;
  min-width: 240px;
  padding: 24px;
  display: flex;
  /* ✅ 核心修改：水平和垂直双向居中 */
  justify-content: center;
  align-items: center;
}

/* 新增一个包装层，确保图标和文字紧凑在一起，并作为一个整体居中 */
.stat-content-wrapper {
  display: flex;
  align-items: center;
  gap: 20px;
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  /* 防止图标被压缩 */
  flex-shrink: 0;
}

.icon-blue {
  background: #eff6ff;
  color: #3b82f6;
}

.icon-green {
  background: #ecfdf5;
  color: #10b981;
}

.icon-purple {
  background: #f3e8ff;
  color: #8b5cf6;
}

.stat-info {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.stat-info .label {
  color: #64748b;
  font-size: 0.9rem;
  margin-bottom: 4px;
  white-space: nowrap;
  /* 防止文字换行 */
}

.stat-info .value {
  font-size: 1.8rem;
  font-weight: 800;
  color: #0f172a;
  line-height: 1.2;
}

/* 图表区域 */
.charts-row {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
  align-items: flex-start;
}

.chart-card {
  flex: 1;
  min-width: 400px;
  padding: 24px;
  display: flex;
  flex-direction: column;
}

.card-title-area h3 {
  margin: 0 0 20px 0;
  font-size: 1.1rem;
  color: #334155;
  font-weight: 600;
  display: flex;
  align-items: center;
}

.card-title-area h3::before {
  content: '';
  display: inline-block;
  width: 4px;
  height: 16px;
  background: #3b82f6;
  margin-right: 10px;
  border-radius: 2px;
}

.chart-container {
  width: 100%;
  height: 350px;
  min-height: 350px;
}

@media (max-width: 768px) {
  .stat-card {
    min-width: 100%;
    /* 手机上可以稍微调整 padding */
    padding: 20px;
  }

  /* 手机上可能希望左对齐而不是居中？保持居中通常也可以 */

  .chart-card {
    min-width: 100%;
  }
}
</style>