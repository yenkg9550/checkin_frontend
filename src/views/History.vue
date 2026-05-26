<script setup>
import { ref, onMounted } from 'vue'
import { fetchMyHistory } from '@/api/http.js'

const records = ref([])
const loading = ref(true)

onMounted(async () => {
  try {
    records.value = await fetchMyHistory(60)
  } finally {
    loading.value = false
  }
})

function utc(dt) {
  return new Date(dt.endsWith('Z') ? dt : dt + 'Z')
}
function formatDate(dt) {
  return utc(dt).toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric', weekday: 'short' })
}
function formatTime(dt) {
  return utc(dt).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false })
}

// 依日期分組
function groupByDate(records) {
  const map = new Map()
  for (const r of records) {
    const key = utc(r.checked_at).toLocaleDateString('zh-TW')
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(r)
  }
  return [...map.entries()]
}
</script>

<template>
  <div class="history-page">
    <h2 class="page-title">打卡紀錄</h2>

    <el-skeleton v-if="loading" :rows="6" animated />

    <el-empty v-else-if="!records.length" description="尚無打卡紀錄" />

    <div v-else>
      <div v-for="[dateKey, dayRecords] in groupByDate(records)" :key="dateKey" class="day-group">
        <div class="day-label">{{ dateKey }}</div>
        <el-card shadow="never" class="day-card">
          <div v-for="r in dayRecords" :key="r.id" class="record-row">
            <el-tag :type="r.check_type === 'clock_in' ? 'success' : 'danger'" size="small">
              {{ r.check_type === 'clock_in' ? '上班' : '下班' }}
            </el-tag>
            <span class="time">{{ formatTime(r.checked_at) }}</span>
            <span v-if="r.note" class="note">{{ r.note }}</span>
            <el-icon v-if="!r.is_valid" color="#f56c6c" title="異常"><Warning /></el-icon>
          </div>
        </el-card>
      </div>
    </div>
  </div>
</template>

<style scoped>
.history-page { max-width: 480px; margin: 0 auto; }
.page-title { font-size: 18px; font-weight: 700; margin: 0 0 16px; }
.day-group { margin-bottom: 16px; }
.day-label { font-size: 12px; color: #6b7280; margin-bottom: 6px; font-weight: 600; }
.day-card { border-radius: 12px; }
.record-row { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
.record-row:last-child { border-bottom: none; }
.time { font-size: 15px; font-weight: 600; }
.note { font-size: 12px; color: #9ca3af; margin-left: auto; }
</style>
