<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { fetchDailyReport, fetchEmployees } from '@/api/http'
import { useRouter } from 'vue-router'
import type { Employee, DailyReportRecord, DashboardRow, RowStatus } from '@/types'

const router = useRouter()
const rawRecords = ref<DailyReportRecord[]>([])
const employees  = ref<Employee[]>([])
const loading    = ref<boolean>(true)
const selectedDate = ref<string>(new Date().toISOString().slice(0, 10))

onMounted(() => loadAll())

async function loadAll(): Promise<void> {
  loading.value = true
  try {
    [rawRecords.value, employees.value] = await Promise.all([
      fetchDailyReport(selectedDate.value),
      fetchEmployees(),
    ])
  } finally {
    loading.value = false
  }
}

const rows = computed<DashboardRow[]>(() => {
  const map: Record<number, DashboardRow> = {}
  for (const r of rawRecords.value) {
    if (!map[r.employee_id]) {
      map[r.employee_id] = {
        employee_id: r.employee_id,
        display_name: r.display_name,
        picture_url: r.picture_url,
        clock_in: null,
        clock_out: null,
      }
    }
    if (r.check_type === 'clock_in')  map[r.employee_id].clock_in  = r
    if (r.check_type === 'clock_out') map[r.employee_id].clock_out = r
  }
  return Object.values(map)
})

const presentCount = computed<number>(() => rows.value.filter(r => r.clock_in).length)
const absentCount  = computed<number>(() => employees.value.length - presentCount.value)

function fmt(dt: string | undefined): string {
  if (!dt) return '—'
  const d = new Date(dt.endsWith('Z') ? dt : dt + 'Z')
  return d.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function rowStatus(row: DashboardRow): RowStatus {
  if (row.clock_in && row.clock_out) return { label: '已完成', type: 'success' }
  if (row.clock_in)                  return { label: '上班中', type: 'warning' }
  return                                    { label: '未打卡', type: 'info'    }
}
</script>

<template>
  <div class="dashboard">
    <div class="page-header">
      <h2 class="page-title">出勤管理</h2>
      <el-button size="small" type="primary" plain @click="router.push('/app/admin/employees')">
        <el-icon><User /></el-icon>&nbsp;員工管理
      </el-button>
    </div>

    <el-date-picker
      v-model="selectedDate"
      type="date"
      placeholder="選擇日期"
      format="YYYY/MM/DD"
      value-format="YYYY-MM-DD"
      size="default"
      style="width:100%; margin-bottom:16px;"
      @change="loadAll"
    />

    <div class="stat-row">
      <div class="stat-card blue">
        <div class="stat-num">{{ employees.length }}</div>
        <div class="stat-label">總員工</div>
      </div>
      <div class="stat-card green">
        <div class="stat-num">{{ presentCount }}</div>
        <div class="stat-label">已出勤</div>
      </div>
      <div class="stat-card red">
        <div class="stat-num">{{ absentCount }}</div>
        <div class="stat-label">未打卡</div>
      </div>
    </div>

    <el-skeleton v-if="loading" :rows="6" animated />
    <el-empty v-else-if="!rows.length" description="當日無打卡紀錄" />

    <div v-else class="record-list">
      <div v-for="row in rows" :key="row.employee_id" class="record-card">
        <div class="record-left">
          <img v-if="row.picture_url" :src="row.picture_url" class="avatar" />
          <div class="avatar-placeholder" v-else><el-icon><User /></el-icon></div>
          <div>
            <div class="emp-name">{{ row.display_name }}</div>
            <el-tag :type="rowStatus(row).type" size="small" style="margin-top:4px;">
              {{ rowStatus(row).label }}
            </el-tag>
          </div>
        </div>

        <div class="record-times">
          <div class="time-item">
            <span class="time-label">上班</span>
            <span class="time-value" :class="{ dimmed: !row.clock_in }">{{ fmt(row.clock_in?.checked_at) }}</span>
            <span v-if="row.clock_in?.distance_m != null" class="dist">{{ row.clock_in.distance_m.toFixed(0) }}m</span>
          </div>
          <div class="time-divider"></div>
          <div class="time-item">
            <span class="time-label">下班</span>
            <span class="time-value" :class="{ dimmed: !row.clock_out }">{{ fmt(row.clock_out?.checked_at) }}</span>
            <span v-if="row.clock_out?.distance_m != null" class="dist">{{ row.clock_out.distance_m.toFixed(0) }}m</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard { max-width: 600px; margin: 0 auto; }
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
.page-title { font-size: 18px; font-weight: 700; margin: 0; }

.stat-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 16px; }
.stat-card { border-radius: 14px; padding: 14px 10px; text-align: center; color: #fff; }
.stat-card.blue  { background: linear-gradient(135deg, #3b82f6, #1d4ed8); }
.stat-card.green { background: linear-gradient(135deg, #10b981, #059669); }
.stat-card.red   { background: linear-gradient(135deg, #f87171, #dc2626); }
.stat-num   { font-size: 28px; font-weight: 800; line-height: 1; }
.stat-label { font-size: 12px; opacity: 0.9; margin-top: 4px; }

.record-list { display: flex; flex-direction: column; gap: 10px; }
.record-card {
  background: #fff; border-radius: 14px; padding: 14px 16px;
  display: flex; align-items: center; justify-content: space-between;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}
.record-left { display: flex; align-items: center; gap: 12px; }
.avatar { width: 42px; height: 42px; border-radius: 50%; }
.avatar-placeholder {
  width: 42px; height: 42px; border-radius: 50%;
  background: #e5e7eb; display: grid; place-items: center; color: #9ca3af;
}
.emp-name { font-size: 15px; font-weight: 600; color: #1f2937; }

.record-times { display: flex; align-items: center; gap: 10px; }
.time-item { display: flex; flex-direction: column; align-items: center; gap: 2px; min-width: 50px; }
.time-label { font-size: 10px; color: #9ca3af; }
.time-value { font-size: 14px; font-weight: 700; color: #1f2937; }
.time-value.dimmed { color: #d1d5db; }
.dist { font-size: 10px; color: #9ca3af; }
.time-divider { width: 1px; height: 30px; background: #f3f4f6; }
</style>
