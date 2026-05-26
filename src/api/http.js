import axios from 'axios'

const TOKEN_KEY = 'lc_token'

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || 'http://localhost:8000/api/v1',
  timeout: 15000,
})

http.interceptors.request.use((config) => {
  const token = sessionStorage.getItem(TOKEN_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

http.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      sessionStorage.removeItem(TOKEN_KEY)
      sessionStorage.removeItem('lc_user')
      if (window.location.hash !== '#/login') {
        window.location.replace(`${window.location.pathname}${window.location.search}#/login`)
      } else {
        window.location.reload()
      }
    }
    return Promise.reject(err)
  }
)

// ── 認證 ──────────────────────────────────────────────────────────────────────
export const postLineLogin = (id_token) =>
  http.post('/auth/line', { id_token }).then((r) => r.data)

// ── 打卡 ──────────────────────────────────────────────────────────────────────
export const postCheckIn = (payload) =>
  http.post('/attendance', payload).then((r) => r.data)

export const fetchTodayStatus = () =>
  http.get('/attendance/today').then((r) => r.data)

export const fetchMyHistory = (limit = 30) =>
  http.get('/attendance/me', { params: { limit } }).then((r) => r.data)

// ── 管理後台 ──────────────────────────────────────────────────────────────────
export const fetchDailyReport = (report_date) =>
  http.get('/admin/report', { params: { report_date } }).then((r) => r.data)

export const fetchEmployees = () =>
  http.get('/admin/employees').then((r) => r.data)

export const updateEmployeeRole = (id, role) =>
  http.patch(`/admin/employees/${id}/role`, null, { params: { role } }).then((r) => r.data)

export const postOverride = (payload) =>
  http.post('/admin/override', payload).then((r) => r.data)
