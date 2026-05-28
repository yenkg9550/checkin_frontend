<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { fetchEmployees, updateEmployeeRole, postOverride } from '@/api/http'
import type { Employee, CheckType, Role } from '@/types'

const employees = ref<Employee[]>([])
const loading = ref<boolean>(true)

interface OverrideForm {
  employee_id: number | null
  check_type: CheckType
  override_at: string
  reason: string
}

const overrideDialog = ref<boolean>(false)
const overrideForm = reactive<OverrideForm>({
  employee_id: null,
  check_type: 'clock_in',
  override_at: '',
  reason: '',
})

onMounted(async () => {
  try {
    employees.value = await fetchEmployees()
  } finally {
    loading.value = false
  }
})

async function changeRole(emp: Employee, role: Role): Promise<void> {
  try {
    await updateEmployeeRole(emp.id, role)
    emp.role = role
    ElMessage.success('角色已更新')
  } catch {
    ElMessage.error('更新失敗')
  }
}

function openOverride(emp: Employee): void {
  overrideForm.employee_id = emp.id
  overrideForm.override_at = new Date().toISOString().slice(0, 16)
  overrideDialog.value = true
}

async function submitOverride(): Promise<void> {
  try {
    await postOverride({
      employee_id: overrideForm.employee_id!,
      check_type: overrideForm.check_type,
      override_at: new Date(overrideForm.override_at).toISOString(),
      reason: overrideForm.reason,
    })
    ElMessage.success('補打卡成功')
    overrideDialog.value = false
  } catch (e: unknown) {
    const err = e as { response?: { data?: { detail?: string } } }
    ElMessage.error(err?.response?.data?.detail || '補打卡失敗')
  }
}
</script>

<template>
  <div class="emp-page">
    <h2 class="page-title">員工管理</h2>

    <el-skeleton v-if="loading" :rows="5" animated />

    <el-table v-else :data="employees" stripe border size="small" style="border-radius:12px; overflow:hidden">
      <el-table-column label="員工" min-width="140">
        <template #default="{ row }">
          <div class="emp-cell">
            <img v-if="row.picture_url" :src="row.picture_url" class="mini-avatar" />
            <span>{{ row.display_name }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="角色" width="120">
        <template #default="{ row }">
          <el-select :model-value="row.role" size="small" @change="(v: Role) => changeRole(row, v)">
            <el-option label="員工" value="employee" />
            <el-option label="管理員" value="admin" />
          </el-select>
        </template>
      </el-table-column>
      <el-table-column label="加入日期" width="110">
        <template #default="{ row }">
          {{ new Date(row.created_at).toLocaleDateString('zh-TW') }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="90">
        <template #default="{ row }">
          <el-button size="small" @click="openOverride(row)">補打卡</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="overrideDialog" title="補打卡" width="320px">
      <el-form :model="overrideForm" label-position="top">
        <el-form-item label="類型">
          <el-radio-group v-model="overrideForm.check_type">
            <el-radio value="clock_in">上班</el-radio>
            <el-radio value="clock_out">下班</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="時間">
          <el-input v-model="overrideForm.override_at" type="datetime-local" />
        </el-form-item>
        <el-form-item label="原因">
          <el-input v-model="overrideForm.reason" placeholder="請說明補打卡原因" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="overrideDialog = false">取消</el-button>
        <el-button type="primary" @click="submitOverride">確認補打卡</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.emp-page { max-width: 600px; margin: 0 auto; }
.page-title { font-size: 18px; font-weight: 700; margin: 0 0 16px; }
.emp-cell { display: flex; align-items: center; gap: 8px; }
.mini-avatar { width: 24px; height: 24px; border-radius: 50%; }
</style>
