<template>
  <div class="dashboard-page">
    <div class="page-header">
      <h2>数据看板</h2>
      <span class="subtitle">基于最近 100 条检测记录的实时分析</span>
    </div>

    <div class="stats-row">
      <div class="stat-card modern-card">
        <div class="stat-icon">📊</div>
        <div class="stat-info">
          <div class="label">总检测数</div>
          <div class="value">{{ totalCount }}</div>
        </div>
      </div>
      <div class="stat-card modern-card">
        <div class="stat-icon">✅</div>
        <div class="stat-info">
          <div class="label">成功率</div>
          <div class="value">{{ successRate }}%</div>
        </div>
      </div>
      <div class="stat-card modern-card">
        <div class="stat-icon">🛣️</div>
        <div class="stat-info">
          <div class="label">平均车道数</div>
          <div class="value">{{ avgLanes }}</div>
        </div>
      </div>
    </div>

    <div class="charts-row">
      <div class="chart-card modern-card">
        <h3>检测结果分布</h3>
        <div ref="pieChartRef" class="chart-container"></div>
      </div>
      <div class="chart-card modern-card">
        <h3>每日检测趋势</h3>
        <div ref="lineChartRef" class="chart-container"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import * as echarts from 'echarts'
import request from '../utils/request'

const list = ref([])
const pieChartRef = ref(null)
const lineChartRef = ref(null)

// 统计数据
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

// 初始化数据
const fetchData = async () => {
  try {
    const response = await request('/api/history/list?skip=0&limit=100')

    // FastAPI 直接返回数组，或者根据你的封装返回结构
    // 假设后端返回的是列表: [ {id:1, ...}, ... ]
    const data = await response.json()

    if (Array.isArray(data)) {
      list.value = data
      setTimeout(initCharts, 100)
    } else {
      console.error('数据格式错误:', data)
    }
  } catch (err) {
    console.error('Fetch failed', err)
  }
}

// 渲染图表
const initCharts = () => {
  if (!pieChartRef.value || !lineChartRef.value) return

  // 1. 饼图
  const laneCounts = {}
  list.value.forEach(item => {
    let count = '未知'
    try {
      const res = typeof item.result === 'string' ? JSON.parse(item.result.replace(/'/g, '"')) : item.result
      if (res && res[0]) count = res[0].count + ' 条车道'
    } catch (e) { }
    laneCounts[count] = (laneCounts[count] || 0) + 1
  })
  const pieData = Object.keys(laneCounts).map(k => ({ value: laneCounts[k], name: k }))

  const pieChart = echarts.init(pieChartRef.value)
  pieChart.setOption({
    tooltip: { trigger: 'item' },
    legend: { bottom: '5%' },
    series: [{
      name: '车道数',
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: false,
      itemStyle: { borderRadius: 10, borderColor: '#fff', borderWidth: 2 },
      data: pieData
    }]
  })

  // 2. 折线图
  const dateCounts = {}
  list.value.forEach(item => {
    const date = item.create_time ? item.create_time.split(' ')[0] : '未知'
    dateCounts[date] = (dateCounts[date] || 0) + 1
  })
  const sortedDates = Object.keys(dateCounts).sort()
  const lineData = sortedDates.map(d => dateCounts[d])

  const lineChart = echarts.init(lineChartRef.value)
  lineChart.setOption({
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: sortedDates },
    yAxis: { type: 'value', minInterval: 1 },
    series: [{
      data: lineData,
      type: 'line',
      smooth: true,
      areaStyle: { opacity: 0.2 },
      itemStyle: { color: '#3b82f6' }
    }]
  })

  window.addEventListener('resize', () => {
    pieChart.resize()
    lineChart.resize()
  })
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped>
/* 核心修正：高度占满，允许内部滚动 */
.dashboard-page {
  height: 100%;
  overflow-y: auto;
  /* 这里的 padding 可以去掉，因为 MainLayout 已经给了 20px */
  padding-bottom: 20px;
}

.page-header {
  margin-bottom: 24px;
}

.page-header h2 {
  margin: 0;
  color: #1e293b;
}

.subtitle {
  color: #64748b;
  font-size: 0.9rem;
}

.stats-row {
  display: flex;
  gap: 20px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.stat-card {
  flex: 1;
  min-width: 200px;
  padding: 20px;
  background: #fff;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 16px;
  border: 1px solid #e2e8f0;
}

.stat-icon {
  width: 48px;
  height: 48px;
  background: #eff6ff;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.stat-info .label {
  color: #64748b;
  font-size: 0.85rem;
}

.stat-info .value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1e293b;
}

.charts-row {
  display: flex;
  gap: 20px;
  height: 400px;
  flex-wrap: wrap;
}

.chart-card {
  flex: 1;
  min-width: 300px;
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  border: 1px solid #e2e8f0;
}

.chart-card h3 {
  margin: 0 0 16px 0;
  font-size: 1rem;
  color: #334155;
}

.chart-container {
  flex: 1;
  width: 100%;
  min-height: 0;
}
</style>