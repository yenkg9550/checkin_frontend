<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import liff from '@line/liff'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_BASE || '/api/v1'
const LIFF_ID  = import.meta.env.VITE_SCHEDULE_LIFF_ID || import.meta.env.VITE_LIFF_ID

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

const state    = ref<'loading' | 'ready' | 'error'>('loading')
const errorMsg = ref('')
const offset   = ref(0)
const schedules = ref<ScheduleItem[]>([])
let jwtToken = ''

const now = new Date()
const targetYear = computed(() => {
  const d = new Date(now.getFullYear(), now.getMonth() + offset.value, 1)
  return d.getFullYear()
})
const targetMonth = computed(() => {
  const d = new Date(now.getFullYear(), now.getMonth() + offset.value, 1)
  return d.getMonth() + 1
})
const monthLabel = computed(() => `${targetYear.value} 年 ${targetMonth.value} 月`)

const scheduleMap = computed(() => {
  const m: Record<string, ScheduleItem> = {}
  for (const s of schedules.value) m[s.work_date] = s
  return m
})

const calendarDays = computed(() => {
  const year = targetYear.value
  const month = targetMonth.value
  const firstDay = new Date(year, month - 1, 1)
  const lastDay  = new Date(year, month, 0)
  const days: { date: string }[] = []
  for (let i = 0; i < firstDay.getDay(); i++) days.push({ date: '' })
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push({
      date: `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
    })
  }
  return days
})

const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' })

async function init() {
  state.value = 'loading'
  try {
    await liff.init({ liffId: LIFF_ID })
    if (!liff.isLoggedIn()) { liff.login(); return }
    const id_token = liff.getIDToken()
    const { data } = await axios.post(`${API_BASE}/auth/line`, { id_token })
    jwtToken = data.access_token
    await loadSchedule()
  } catch (e: any) {
    errorMsg.value = e?.response?.data?.detail || e?.message || '載入失敗'
    state.value = 'error'
  }
}

async function loadSchedule() {
  state.value = 'loading'
  try {
    const { data } = await axios.get(`${API_BASE}/attendance/my-schedule`, {
      params: { year: targetYear.value, month: targetMonth.value },
      headers: { Authorization: `Bearer ${jwtToken}` },
    })
    schedules.value = data
    state.value = 'ready'
  } catch (e: any) {
    errorMsg.value = e?.response?.data?.detail || '班表載入失敗'
    state.value = 'error'
  }
}

onMounted(init)
watch([targetYear, targetMonth], loadSchedule)

function close() {
  if (liff.isInClient()) liff.closeWindow()
}
</script>

<template>
  <div class="wrap">
    <!-- Header -->
    <div class="header">
      <div class="header-title">我的班表</div>
    </div>

    <!-- 月份切換 -->
    <div class="month-nav">
      <button class="nav-btn" :disabled="offset <= -1" @click="offset--">‹</button>
      <span class="month-label">{{ monthLabel }}</span>
      <button class="nav-btn" :disabled="offset >= 1" @click="offset++">›</button>
    </div>

    <!-- 星期 -->
    <div class="dow-row">
      <span v-for="d in ['日','一','二','三','四','五','六']" :key="d" class="dow">{{ d }}</span>
    </div>

    <!-- 載入中 -->
    <div v-if="state === 'loading'" class="center">
      <div class="ring"></div>
      <p class="hint">載入中…</p>
    </div>

    <!-- 錯誤 -->
    <div v-else-if="state === 'error'" class="center err">
      <p>{{ errorMsg }}</p>
      <button class="btn" @click="init">重試</button>
    </div>

    <!-- 月曆 -->
    <div v-else class="cal-grid">
      <div
        v-for="(cell, idx) in calendarDays"
        :key="idx"
        class="cal-cell"
        :class="{
          'is-empty': !cell.date,
          'is-today': cell.date === todayStr,
          'has-shift': cell.date && scheduleMap[cell.date],
          'is-ot': cell.date && scheduleMap[cell.date]?.is_overtime,
        }"
      >
        <template v-if="cell.date">
          <span class="day-num">{{ Number(cell.date.slice(8)) }}</span>
          <template v-if="scheduleMap[cell.date]">
            <span class="shift-dot" :style="{ background: scheduleMap[cell.date].shift.color }"></span>
            <span class="shift-name">{{ scheduleMap[cell.date].shift.name }}</span>
            <span class="shift-time">{{ scheduleMap[cell.date].shift.start_time }}–{{ scheduleMap[cell.date].shift.end_time }}</span>
            <span v-if="scheduleMap[cell.date].is_overtime" class="ot-tag">OT</span>
          </template>
        </template>
      </div>
    </div>

    <!-- 統計 -->
    <div v-if="state === 'ready' && schedules.length" class="summary">
      <div class="s-item">
        <span class="s-num">{{ schedules.length }}</span>
        <span class="s-lbl">排班天數</span>
      </div>
      <div class="s-item">
        <span class="s-num">{{ schedules.filter(s => s.is_overtime).length }}</span>
        <span class="s-lbl">加班日</span>
      </div>
    </div>

    <div class="footer">
      <button class="btn-close" @click="close">關閉</button>
    </div>
  </div>
</template>

<style scoped>
* { box-sizing: border-box; margin: 0; padding: 0; }

.wrap { min-height: 100vh; background: #f8fafc; display: flex; flex-direction: column; }

.header { background: #1e293b; padding: 20px 20px 16px; }
.header-title { font-size: 18px; font-weight: 800; color: #f8fafc; }

.month-nav { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: #fff; border-bottom: 1px solid #e5e7eb; }
.nav-btn { width: 32px; height: 32px; border: none; background: #f1f5f9; border-radius: 50%; font-size: 18px; cursor: pointer; color: #374151; }
.nav-btn:disabled { opacity: 0.3; cursor: default; }
.month-label { font-size: 17px; font-weight: 800; color: #1e293b; }

.dow-row { display: grid; grid-template-columns: repeat(7, 1fr); background: #fff; border-bottom: 1px solid #f0f0f0; }
.dow { text-align: center; font-size: 11px; color: #94a3b8; font-weight: 600; padding: 6px 0; }

.cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; padding: 4px; flex: 1; }
.cal-cell { min-height: 68px; border-radius: 8px; padding: 5px 3px 4px; display: flex; flex-direction: column; align-items: center; gap: 2px; background: #f1f5f9; }
.cal-cell.is-empty { background: transparent; }
.cal-cell.has-shift { background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,.08); }
.cal-cell.is-today .day-num { background: #3b82f6; color: #fff; border-radius: 50%; width: 20px; height: 20px; display: grid; place-items: center; }
.cal-cell.is-ot { outline: 2px solid #f59e0b; outline-offset: -2px; }

.day-num { font-size: 12px; font-weight: 700; color: #374151; line-height: 1; }
.shift-dot { width: 7px; height: 7px; border-radius: 50%; }
.shift-name { font-size: 9px; font-weight: 700; color: #1e293b; text-align: center; }
.shift-time { font-size: 8px; color: #64748b; text-align: center; }
.ot-tag { font-size: 8px; font-weight: 800; background: #fef3c7; color: #d97706; border-radius: 3px; padding: 1px 3px; }

.center { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 60px 0; flex: 1; }
.hint { font-size: 14px; color: #94a3b8; }
.err { color: #ef4444; font-size: 14px; }

.ring { width: 40px; height: 40px; border: 3px solid #e5e7eb; border-top-color: #3b82f6; border-radius: 50%; animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.summary { display: flex; gap: 12px; justify-content: center; padding: 14px 16px; background: #fff; margin: 8px; border-radius: 14px; }
.s-item { display: flex; flex-direction: column; align-items: center; gap: 2px; flex: 1; }
.s-num { font-size: 22px; font-weight: 800; color: #1e293b; }
.s-lbl { font-size: 11px; color: #94a3b8; }

.footer { padding: 12px 16px 24px; }
.btn-close { width: 100%; padding: 13px; background: transparent; border: 1px solid #e2e8f0; border-radius: 12px; font-size: 15px; color: #94a3b8; cursor: pointer; }
.btn { padding: 10px 28px; background: #3b82f6; color: #fff; border: none; border-radius: 10px; font-size: 15px; font-weight: 600; cursor: pointer; }
</style>
