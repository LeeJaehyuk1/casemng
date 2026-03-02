import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

// 요청 인터셉터: 토큰 자동 첨부
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// 응답 인터셉터: 401 처리
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// Auth
export const login = (data) => api.post('/auth/login', data)
export const getMe = () => api.get('/auth/me')

// Tree
export const getTree = () => api.get('/tree')
export const createTreeNode = (data) => api.post('/tree', data)
export const updateTreeNode = (id, data) => api.put(`/tree/${id}`, data)
export const deleteTreeNode = (id) => api.delete(`/tree/${id}`)
export const reorderTree = (updates) => api.put('/tree/reorder', { updates })

// Students
export const getStudent = (id) => api.get(`/students/${id}`)
export const createStudent = (data) => api.post('/students', data)
export const updateStudent = (id, data) => api.put(`/students/${id}`, data)
export const deleteStudent = (id) => api.delete(`/students/${id}`)
export const uploadStudentPhoto = (id, file) => {
  const formData = new FormData()
  formData.append('photo', file)
  return api.post(`/students/${id}/photo`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
}
export const deleteStudentPhoto = (id) => api.delete(`/students/${id}/photo`)

// Cases
export const getCases = (studentId) => api.get(`/cases?student_id=${studentId}`)
export const getCasesByDate = (date, studentName) =>
  api.get('/cases/by-date', { params: { date, student_name: studentName } })
export const createCase = (data) => api.post('/cases', data)
export const updateCase = (id, data) => api.put(`/cases/${id}`, data)
export const deleteCase = (id) => api.delete(`/cases/${id}`)

// Attachments
export const uploadAttachments = (caseHistoryId, files) => {
  const formData = new FormData()
  formData.append('case_history_id', caseHistoryId)
  files.forEach(f => formData.append('files', f))
  return api.post('/attachments', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
}
export const downloadAttachment = async (id, filename) => {
  const token = localStorage.getItem('token')
  const res = await fetch(`/api/attachments/${id}/download`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  if (!res.ok) throw new Error('다운로드 실패')
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename || 'download'
  a.click()
  URL.revokeObjectURL(url)
}
export const deleteAttachment = (id) => api.delete(`/attachments/${id}`)

// Transfers
export const transferComplete = (studentId, memo) =>
  api.post('/transfers/complete', { student_id: studentId, memo })
export const transferRevert = (studentId, memo) =>
  api.post('/transfers/revert', { student_id: studentId, memo })
export const getTransferLogs = (studentId) => api.get(`/transfers/${studentId}`)

// Network
export const getOrgs = () => api.get('/network/orgs')
export const createOrg = (data) => api.post('/network/orgs', data)
export const updateOrg = (id, data) => api.put(`/network/orgs/${id}`, data)
export const deleteOrg = (id) => api.delete(`/network/orgs/${id}`)
export const getLinks = (studentId) => api.get(`/network/links?student_id=${studentId}`)
export const createLink = (data) => api.post('/network/links', data)
export const deleteLink = (id) => api.delete(`/network/links/${id}`)

// Users
export const getUsers = () => api.get('/users')
export const getManagers = () => api.get('/users/managers')
export const createUser = (data) => api.post('/users', data)
export const updateUser = (id, data) => api.put(`/users/${id}`, data)
export const deleteUser = (id) => api.delete(`/users/${id}`)

export default api
