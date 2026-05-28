import axios from 'axios'
import type {
  AuthResponse,
  AttendanceRecord,
  Employee,
  CheckInPayload,
  OverridePayload,
  DailyReportRecord,
  Role,
} from '@/types'

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

export const postLineLogin = (id_token: string): Promise<AuthResponse> =>
  http.post('/auth/line', { id_token }).then((r) => r.data)

export const postCheckIn = (payload: CheckInPayload): Promise<AttendanceRecord> =>
  http.post('/attendance', payload).then((r) => r.data)

export const fetchTodayStatus = (): Promise<AttendanceRecord[]> =>
  http.get('/attendance/today').then((r) => r.data)

export const fetchMyHistory = (limit = 30): Promise<AttendanceRecord[]> =>
  http.get('/attendance/me', { params: { limit } }).then((r) => r.data)

export const fetchDailyReport = (report_date: string): Promise<DailyReportRecord[]> =>
  http.get('/admin/report', { params: { report_date } }).then((r) => r.data)

export const fetchEmployees = (): Promise<Employee[]> =>
  http.get('/admin/employees').then((r) => r.data)

export const updateEmployeeRole = (id: number, role: Role): Promise<Employee> =>
  http.patch(`/admin/employees/${id}/role`, null, { params: { role } }).then((r) => r.data)

export const postOverride = (payload: OverridePayload): Promise<AttendanceRecord> =>
  http.post('/admin/override', payload).then((r) => r.data)
