<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { fetchMySchedule } from '@/api/http'

interface ShiftInfo {
  id: number
  name: string
  start_time: string
  end_time: string
  color: string
  break_minutes: number
}

interface ScheduleItem {
  id: number
  work_date: string
  is_overtime: boolean
  shift: ShiftInfo
}

// 目前選擇的月份（以當月為基準，-1/0/+1）
const offset = ref(0)

const now = new Date()
const targetYear = computed(() => {
  const d = new Date(now.getFullYear(), now.getMonth() + offset.value, 1)
  return d.getFullYear()
})
const targetMonth = computed(() => {
  const d = new Date(now.getFullYear(), now.getMonth() + offset.value, 1)
  return d.getMonth() + 1
})
const monthLabel = computed(() =>
  `${targetYear.value} 年 ${targetMonth.value} 月`
)

const schedules = ref<ScheduleItem[]>([])
const loading = ref(false)
const error = ref('')

// 建立月曆格子
const calendarDays = computed(() => {
  const year = targetYear.value
  const month = targetMonth.value
  const firstDay = new Date(year, month - 1, 1)
  const lastDay = new Date(year, month, 0)
  const startDow = firstDay.getDay() // 0=日
  const days: (ScheduleItem | null)[] = []

  // 補前面空格
  for (let i = 0; i < startDow; i++) days.push(null)

  for (let d = 1; d <= lastDay.getDate(); d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const sched = schedules.value.find(s => s.work_date === dateStr) || null
    days.push(sched ?? ({ work_date: dateStr } as any))
  }
  return days
})

const scheduleMap = computed(() => {
  const m: Record<string, ScheduleItem> = {}
  for (const s of schedules.value) m[s.work_date] = s
  return m
})

async function load() {
  loading.value = true
  error.value = ''
  try {
    schedules.value = await fetchMySchedule(targetYear.value, targetMonth.value)
  } catch {
    error.value = '無法載入班表'
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch([targetYear, targetMonth], load)

function isToday(dateStr: string) {
  return dateStr === now.toLocaleDateString('zh-TW', {
    timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit',
  }).replace(/\//g, '-')
}

// 今天的日期字串（YYYY-MM-DD）
const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' })
</script>

<template>
  <div class="schedule-page">
    <!-- Header -->
    <div class="month-nav">
      <button class="nav-btn" :disabled="offset <= -1" @click="offset--">‹</button>
      <span class="month-label">{{ monthLabel }}</span>
      <button class="nav-btn" :disabled="offset >= 1" @click="offset++">›</button>
    </div>

    <!-- 星期標題 -->
    <div class="cal-header">
      <span v-for="d in ['日','一','二','三','四','五','六']" :key="d" class="dow">{{ d }}</span>
    </div>

    <!-- 載入中 -->
    <div v-if="loading" class="center-state">
      <div class="ring"></div>
    </div>

    <!-- 錯誤 -->
    <div v-else-if="error" class="center-state err">{{ error }}</div>

    <!-- 月曆 -->
    <div v-else class="cal-grid">
      <div
        v-for="(item, idx) in calendarDays"
        :key="idx"
        class="cal-cell"
        :class="{
          'is-today': item && item.work_date === todayStr,
          'has-shift': item && scheduleMap[item.work_date],
          'is-overtime': item && scheduleMap[item.work_date]?.is_overtime,
          'is-empty': !item,
        }"
      >
        <template v-if="item">
          <span class="day-num">{{ item.work_date.slice(8) }}</span>
          <template v-if="scheduleMap[item.work_date]">
            <span
              class="shift-dot"
              :style="{ background: scheduleMap[item.work_date].shift.color }"
            ></span>
            <span class="shift-name">{{ scheduleMap[item.work_date].shift.name }}</span>
            <span class="shift-time">
              {{ scheduleMap[item.work_date].shift.start_time }}–{{ scheduleMap[item.work_date].shift.end_time }}
            </span>
            <span v-if="scheduleMap[item.work_date].is_overtime" class="ot-badge">OT</span>
          </template>
        </template>
      </div>
    </div>

    <!-- 本月統計 -->
    <div v-if="!loading && schedules.length" class="summary">
      <div class="summary-item">
        <span class="s-num">{{ schedules.length }}</span>
        <span class="s-label">排班天數</span>
      </div>
      <div class="summary-item">
        <span class="s-num">{{ schedules.filter(s => s.is_overtime).length }}</span>
        <span class="s-label">加班日</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
* { box-sizing: border-box; }

.schedule-page {
  max-width: 480px;
  margin: 0 auto;
  padding: 0 4px 24px;
}

.month-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 8px 12px;
}
.nav-btn {
  width: 36px; height: 36px;
  border: none; background: #f1f5f9;
  border-radius: 50%; font-size: 20px;
  cursor: pointer; color: #374151;
  display: grid; place-items: center;
  transition: background .15s;
}
.nav-btn:disabled { opacity: 0.3; cursor: default; }
.nav-btn:not(:disabled):hover { background: #e2e8f0; }
.month-label { font-size: 18px; font-weight: 800; color: #1e293b; }

.cal-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  text-align: center;
  margin-bottom: 4px;
}
.dow { font-size: 12px; color: #94a3b8; font-weight: 600; padding: 4px 0; }

.cal-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 3px;
}

.cal-cell {
  min-height: 72px;
  border-radius: 10px;
  padding: 6px 4px 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  background: #f8fafc;
  position: relative;
}
.cal-cell.is-empty { background: transparent; }
.cal-cell.has-shift { background: #fff; box-shadow: 0 1px 4px rgba(0,0,0,.07); }
.cal-cell.is-today .day-num {
  background: #3b82f6; color: #fff;
  border-radius: 50%; width: 22px; height: 22px;
  display: grid; place-items: center;
}
.cal-cell.is-overtime { outline: 2px solid #f59e0b; outline-offset: -2px; }

.day-num { font-size: 13px; font-weight: 700; color: #374151; line-height: 1; margin-bottom: 2px; }
.shift-dot { width: 8px; height: 8px; border-radius: 50%; }
.shift-name { font-size: 10px; font-weight: 700; color: #1e293b; text-align: center; line-height: 1.2; }
.shift-time { font-size: 9px; color: #64748b; text-align: center; line-height: 1.2; }
.ot-badge {
  font-size: 9px; font-weight: 800;
  background: #fef3c7; color: #d97706;
  border-radius: 4px; padding: 1px 3px;
}

.center-state {
  display: flex; align-items: center; justify-content: center;
  padding: 60px 0; color: #94a3b8;
}
.center-state.err { color: #ef4444; font-size: 14px; }

.ring {
  width: 40px; height: 40px;
  border: 3px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin .8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.summary {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 16px;
  padding: 14px;
  background: #f8fafc;
  border-radius: 14px;
}
.summary-item { display: flex; flex-direction: column; align-items: center; gap: 2px; flex: 1; }
.s-num { font-size: 24px; font-weight: 800; color: #1e293b; }
.s-label { font-size: 12px; color: #94a3b8; }
</style>
