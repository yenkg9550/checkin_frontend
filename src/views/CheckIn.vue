<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { postCheckIn, fetchTodayStatus } from '@/api/http'
import { useAuthStore } from '@/stores/auth'
import type { AttendanceRecord, CheckType, GpsCoords } from '@/types'

const auth = useAuthStore()
const loading = ref<boolean>(false)
const gpsLoading = ref<boolean>(false)
const pageLoading = ref<boolean>(true)
const loadError = ref<string>('')
const todayRecords = ref<AttendanceRecord[]>([])

const CLOCK_IN: CheckType = 'clock_in'
const CLOCK_OUT: CheckType = 'clock_out'

const hasClockedIn = ref<boolean>(false)
const hasClockedOut = ref<boolean>(false)

onMounted(async () => {
  await loadToday()
})

async function loadToday(): Promise<void> {
  pageLoading.value = true
  loadError.value = ''
  try {
    todayRecords.value = await fetchTodayStatus()
    hasClockedIn.value = todayRecords.value.some(r => r.check_type === CLOCK_IN)
    hasClockedOut.value = todayRecords.value.some(r => r.check_type === CLOCK_OUT)
  } catch (e: unknown) {
    const err = e as { response?: { data?: { detail?: string } }; message?: string }
    loadError.value = err?.response?.data?.detail || err.message || '無法載入打卡狀態'
  } finally {
    pageLoading.value = false
  }
}

async function getGPS(): Promise<GpsCoords> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('裝置不支援 GPS'))
    gpsLoading.value = true
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        gpsLoading.value = false
        resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      },
      () => {
        gpsLoading.value = false
        reject(new Error('無法取得位置，請確認已允許定位權限'))
      },
      { timeout: 10000, maximumAge: 0 }
    )
  })
}

async function handleCheck(type: CheckType): Promise<void> {
  loading.value = true
  try {
    const { lat, lng } = await getGPS()
    await postCheckIn({ check_type: type, lat, lng })
    ElMessage.success(type === CLOCK_IN ? '✅ 上班打卡成功！' : '✅ 下班打卡成功！')
    await loadToday()
  } catch (e: unknown) {
    const err = e as { response?: { data?: { detail?: string } }; message?: string }
    const msg = err?.response?.data?.detail || err.message || '打卡失敗'
    ElMessage.error(msg)
  } finally {
    loading.value = false
  }
}

function formatTime(dt: string): string {
  const d = new Date(dt.endsWith('Z') ? dt : dt + 'Z')
  return d.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false })
}
</script>

<template>
  <div class="checkin-page">
    <div v-if="pageLoading" class="page-state">
      <el-icon class="spin"><Loading /></el-icon>
      <span>載入打卡狀態中</span>
    </div>

    <div v-else-if="loadError" class="page-state error" @click="loadToday">
      <el-icon><CircleClose /></el-icon>
      <span>{{ loadError }}</span>
      <small>點擊重試</small>
    </div>

    <template v-else>
    <el-card class="user-card" shadow="never">
      <div class="user-info">
        <img v-if="auth.pictureUrl" :src="auth.pictureUrl" class="avatar" />
        <div class="avatar-placeholder" v-else>
          <el-icon size="28"><User /></el-icon>
        </div>
        <div>
          <div class="user-name">{{ auth.displayName }}</div>
          <div class="user-date">{{ new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }) }}</div>
        </div>
      </div>
    </el-card>

    <div class="btn-group">
      <el-button
        type="primary"
        size="large"
        class="check-btn clock-in"
        :loading="loading || gpsLoading"
        :disabled="hasClockedIn"
        @click="handleCheck(CLOCK_IN)"
      >
        <el-icon v-if="!loading" size="28"><ArrowUp /></el-icon>
        <div>
          <div class="btn-label">上班打卡</div>
          <div class="btn-sub" v-if="hasClockedIn">
            {{ formatTime(todayRecords.find(r => r.check_type === CLOCK_IN)!.checked_at) }} 已打卡
          </div>
          <div class="btn-sub" v-else>點此上班打卡</div>
        </div>
      </el-button>

      <el-button
        type="danger"
        size="large"
        class="check-btn clock-out"
        :loading="loading || gpsLoading"
        :disabled="!hasClockedIn || hasClockedOut"
        @click="handleCheck(CLOCK_OUT)"
      >
        <el-icon v-if="!loading" size="28"><ArrowDown /></el-icon>
        <div>
          <div class="btn-label">下班打卡</div>
          <div class="btn-sub" v-if="hasClockedOut">
            {{ formatTime(todayRecords.find(r => r.check_type === CLOCK_OUT)!.checked_at) }} 已打卡
          </div>
          <div class="btn-sub" v-else>點此下班打卡</div>
        </div>
      </el-button>
    </div>

    <el-card v-if="todayRecords.length" class="today-card" shadow="never">
      <template #header><span class="card-title">今日打卡紀錄</span></template>
      <div v-for="r in todayRecords" :key="r.id" class="record-row">
        <el-tag :type="r.check_type === CLOCK_IN ? 'success' : 'danger'" size="small">
          {{ r.check_type === CLOCK_IN ? '上班' : '下班' }}
        </el-tag>
        <span class="record-time">{{ formatTime(r.checked_at) }}</span>
        <span v-if="r.distance_m" class="record-dist">距公司 {{ r.distance_m.toFixed(0) }} 公尺</span>
      </div>
    </el-card>

    <div v-if="gpsLoading" class="gps-hint">
      <el-icon class="spin"><Loading /></el-icon> 取得 GPS 位置中…
    </div>
    </template>
  </div>
</template>

<style scoped>
.checkin-page { max-width: 480px; margin: 0 auto; }
.page-state {
  min-height: 220px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #6b7280;
  font-size: 14px;
}
.page-state.error {
  color: #ef4444;
  cursor: pointer;
}
.page-state small {
  color: #9ca3af;
  font-size: 12px;
}
.user-card { border-radius: 14px; margin-bottom: 20px; }
.user-info { display: flex; align-items: center; gap: 14px; }
.avatar { width: 52px; height: 52px; border-radius: 50%; }
.avatar-placeholder {
  width: 52px; height: 52px; border-radius: 50%;
  background: var(--el-color-primary-light-5);
  display: grid; place-items: center;
  color: var(--el-color-primary);
}
.user-name { font-size: 17px; font-weight: 700; }
.user-date { font-size: 12px; color: #6b7280; margin-top: 3px; }

.btn-group { display: flex; flex-direction: column; gap: 14px; margin-bottom: 20px; }
.check-btn {
  height: 80px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 0 24px;
  width: 100%;
  justify-content: flex-start;
}
.btn-label { font-size: 17px; font-weight: 700; text-align: left; }
.btn-sub { font-size: 12px; opacity: 0.85; text-align: left; margin-top: 2px; }

.today-card { border-radius: 14px; }
.card-title { font-size: 14px; font-weight: 600; }
.record-row { display: flex; align-items: center; gap: 10px; padding: 6px 0; }
.record-time { font-size: 14px; font-weight: 600; }
.record-dist { font-size: 12px; color: #6b7280; margin-left: auto; }

.gps-hint { text-align: center; color: #6b7280; font-size: 13px; margin-top: 16px; display: flex; align-items: center; justify-content: center; gap: 6px; }
.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
