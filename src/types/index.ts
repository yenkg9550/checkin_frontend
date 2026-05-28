export type Role = 'admin' | 'employee'
export type CheckType = 'clock_in' | 'clock_out'

export interface User {
  id: number
  line_user_id: string
  display_name: string
  picture_url: string | null
  role: Role
  created_at: string
}

export interface AttendanceRecord {
  id: number
  employee_id: number
  check_type: CheckType
  checked_at: string
  lat: number | null
  lng: number | null
  distance_m: number | null
  is_valid: boolean
  note: string | null
  display_name?: string
  picture_url?: string | null
}

export interface Employee {
  id: number
  line_user_id: string
  display_name: string
  picture_url: string | null
  role: Role
  created_at: string
}

export interface AuthResponse {
  access_token: string
  user: User
}

export interface GpsCoords {
  lat: number | null
  lng: number | null
}

export interface CheckInPayload {
  check_type: CheckType
  lat: number | null
  lng: number | null
}

export interface OverridePayload {
  employee_id: number
  check_type: CheckType
  override_at: string
  reason: string
}

export interface DailyReportRecord {
  employee_id: number
  display_name: string
  picture_url: string | null
  check_type: CheckType
  checked_at: string
  distance_m: number | null
}

export interface DashboardRow {
  employee_id: number
  display_name: string
  picture_url: string | null
  clock_in: DailyReportRecord | null
  clock_out: DailyReportRecord | null
}

export interface RowStatus {
  label: string
  type: 'success' | 'warning' | 'info' | 'danger'
}
