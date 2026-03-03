import React, { useEffect, useState, useCallback } from 'react'
import {
  Drawer, Tabs, Form, Input, Select, DatePicker, Button, Table,
  Space, Popconfirm, message, Modal, Checkbox, InputNumber, Tag,
  Typography, Divider
} from 'antd'
import {
  PlusOutlined, DeleteOutlined, SaveOutlined, UserAddOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'
import {
  getProgram, updateProgram,
  getProgramStudents, addProgramStudents, removeProgramStudent,
  getProgramSessions, createProgramSession, updateProgramSession, deleteProgramSession,
  getSessionAttendance, updateSessionAttendance,
  getInstructors
} from '../../api'

const { TextArea } = Input
const { Option } = Select
const { Text } = Typography

const CATEGORIES = ['학습지원', '심리정서', '문화체험', '복지지원', '기타']
const STATUS_OPTIONS = ['진행중', '완료']
const BUDGET_ITEMS = ['강사비', '재료비', '간식비', '교통비', '기타']

export default function ProgramDrawer({ programId, open, onClose, onUpdated, allStudents }) {
  const [program, setProgram] = useState(null)
  const [budgets, setBudgets] = useState([])
  const [students, setStudents] = useState([])
  const [sessions, setSessions] = useState([])
  const [instructors, setInstructors] = useState([])
  const [activeTab, setActiveTab] = useState('info')
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()

  // 학생 추가 모달
  const [addStudentOpen, setAddStudentOpen] = useState(false)
  const [selectedStudentIds, setSelectedStudentIds] = useState([])
  const [studentSearch, setStudentSearch] = useState('')
  const [addingStudents, setAddingStudents] = useState(false)

  // 회차 추가/수정 모달
  const [sessionModalOpen, setSessionModalOpen] = useState(false)
  const [editingSession, setEditingSession] = useState(null)
  const [sessionForm] = Form.useForm()
  const [savingSession, setSavingSession] = useState(false)

  // 출석 패널 상태
  const [expandedSessions, setExpandedSessions] = useState([])
  const [attendanceMap, setAttendanceMap] = useState({}) // { sessionId: records[] }
  const [savingAttendance, setSavingAttendance] = useState({})

  const loadProgram = useCallback(async () => {
    if (!programId) return
    try {
      const res = await getProgram(programId)
      setProgram(res.data)
      setBudgets(res.data.budgets || [])
      form.setFieldsValue({
        name: res.data.name,
        category: res.data.category,
        start_date: res.data.start_date ? dayjs(res.data.start_date) : null,
        end_date: res.data.end_date ? dayjs(res.data.end_date) : null,
        location: res.data.location,
        status: res.data.status,
        description: res.data.description,
      })
    } catch { message.error('프로그램 정보를 불러오지 못했습니다.') }
  }, [programId, form])

  const loadStudents = useCallback(async () => {
    if (!programId) return
    try {
      const res = await getProgramStudents(programId)
      setStudents(res.data)
    } catch { message.error('참여학생을 불러오지 못했습니다.') }
  }, [programId])

  const loadSessions = useCallback(async () => {
    if (!programId) return
    try {
      const res = await getProgramSessions(programId)
      setSessions(res.data)
    } catch { message.error('회차를 불러오지 못했습니다.') }
  }, [programId])

  const loadInstructors = useCallback(async () => {
    try {
      const res = await getInstructors()
      setInstructors(res.data)
    } catch {}
  }, [])

  useEffect(() => {
    if (open && programId) {
      setActiveTab('info')
      setExpandedSessions([])
      setAttendanceMap({})
      loadProgram()
      loadStudents()
      loadSessions()
      loadInstructors()
    }
  }, [open, programId, loadProgram, loadStudents, loadSessions, loadInstructors])

  // ── 기본정보/예산 저장 ──────────────────────────────────────────────
  const handleSave = async (values) => {
    setSaving(true)
    try {
      await updateProgram(programId, {
        name: values.name,
        category: values.category,
        start_date: values.start_date ? values.start_date.format('YYYY-MM-DD') : null,
        end_date: values.end_date ? values.end_date.format('YYYY-MM-DD') : null,
        location: values.location,
        status: values.status,
        description: values.description,
        budgets,
      })
      message.success('저장되었습니다.')
      onUpdated()
      loadProgram()
    } catch (err) {
      message.error(err.response?.data?.message || '저장 실패')
    } finally { setSaving(false) }
  }

  // ── 예산 항목 ─────────────────────────────────────────────────────
  const addBudgetRow = () => {
    setBudgets(prev => [...prev, { key: Date.now(), item_name: '', amount: 0, note: '' }])
  }

  const updateBudgetRow = (idx, field, value) => {
    setBudgets(prev => prev.map((b, i) => i === idx ? { ...b, [field]: value } : b))
  }

  const removeBudgetRow = (idx) => {
    setBudgets(prev => prev.filter((_, i) => i !== idx))
  }

  const totalBudget = budgets.reduce((sum, b) => sum + (parseInt(b.amount) || 0), 0)

  // ── 참여학생 ──────────────────────────────────────────────────────
  const handleRemoveStudent = async (sid) => {
    try {
      await removeProgramStudent(programId, sid)
      message.success('제거되었습니다.')
      loadStudents()
    } catch { message.error('제거 실패') }
  }

  const handleAddStudents = async () => {
    if (selectedStudentIds.length === 0) return
    setAddingStudents(true)
    try {
      await addProgramStudents(programId, selectedStudentIds)
      message.success(`${selectedStudentIds.length}명이 추가되었습니다.`)
      setAddStudentOpen(false)
      setSelectedStudentIds([])
      setStudentSearch('')
      loadStudents()
    } catch (err) {
      message.error(err.response?.data?.message || '추가 실패')
    } finally { setAddingStudents(false) }
  }

  const enrolledIds = new Set(students.map(s => s.student_id))
  const filteredForAdd = allStudents.filter(s =>
    !enrolledIds.has(s.id) &&
    (studentSearch === '' || s.name.includes(studentSearch) || (s.school || '').includes(studentSearch))
  )

  // ── 회차 ─────────────────────────────────────────────────────────
  const openAddSession = () => {
    setEditingSession(null)
    const nextNum = sessions.length > 0 ? Math.max(...sessions.map(s => s.session_num)) + 1 : 1
    sessionForm.setFieldsValue({ session_num: nextNum, session_date: null, location: '', instructor_id: null, content: '', notes: '' })
    setSessionModalOpen(true)
  }

  const openEditSession = (s) => {
    setEditingSession(s)
    sessionForm.setFieldsValue({
      session_num: s.session_num,
      session_date: s.session_date ? dayjs(s.session_date) : null,
      location: s.location,
      instructor_id: s.instructor_id,
      content: s.content,
      notes: s.notes,
    })
    setSessionModalOpen(true)
  }

  const handleSaveSession = async (values) => {
    setSavingSession(true)
    try {
      const payload = {
        ...values,
        session_date: values.session_date ? values.session_date.format('YYYY-MM-DD') : null,
      }
      if (editingSession) {
        await updateProgramSession(programId, editingSession.id, payload)
        message.success('수정되었습니다.')
      } else {
        await createProgramSession(programId, payload)
        message.success('회차가 추가되었습니다.')
      }
      setSessionModalOpen(false)
      loadSessions()
    } catch (err) {
      message.error(err.response?.data?.message || '저장 실패')
    } finally { setSavingSession(false) }
  }

  const handleDeleteSession = async (sid) => {
    try {
      await deleteProgramSession(programId, sid)
      message.success('삭제되었습니다.')
      loadSessions()
    } catch { message.error('삭제 실패') }
  }

  // ── 출석 ─────────────────────────────────────────────────────────
  const loadAttendance = async (sessionId) => {
    try {
      const res = await getSessionAttendance(programId, sessionId)
      setAttendanceMap(prev => ({ ...prev, [sessionId]: res.data }))
    } catch { message.error('출석 정보를 불러오지 못했습니다.') }
  }

  const handleExpandSession = (expanded, sessionId) => {
    if (expanded) {
      setExpandedSessions(prev => [...prev, sessionId])
      if (!attendanceMap[sessionId]) loadAttendance(sessionId)
    } else {
      setExpandedSessions(prev => prev.filter(id => id !== sessionId))
    }
  }

  const toggleAttendance = (sessionId, studentId) => {
    setAttendanceMap(prev => ({
      ...prev,
      [sessionId]: prev[sessionId].map(r =>
        r.student_id === studentId ? { ...r, attended: !r.attended } : r
      ),
    }))
  }

  const saveAttendance = async (sessionId) => {
    setSavingAttendance(prev => ({ ...prev, [sessionId]: true }))
    try {
      await updateSessionAttendance(programId, sessionId, attendanceMap[sessionId])
      message.success('출석이 저장되었습니다.')
    } catch { message.error('출석 저장 실패') }
    finally { setSavingAttendance(prev => ({ ...prev, [sessionId]: false })) }
  }

  // ── 컬럼 정의 ─────────────────────────────────────────────────────
  const studentColumns = [
    { title: '이름', dataIndex: 'name', key: 'name', width: 90 },
    { title: '학교', dataIndex: 'school', key: 'school', width: 120, render: v => v || '-' },
    { title: '학년/반', key: 'grade', width: 80, render: (_, r) => [r.grade, r.class_name].filter(Boolean).join('/') || '-' },
    {
      title: '출석률', key: 'attend', width: 80,
      render: (_, r) => {
        const total = parseInt(r.total_sessions) || 0
        const att = parseInt(r.attended_count) || 0
        if (total === 0) return '-'
        return `${att}/${total} (${Math.round(att / total * 100)}%)`
      }
    },
    {
      title: '제거', key: 'action', width: 60, align: 'center',
      render: (_, r) => (
        <Popconfirm title="참여학생에서 제거하시겠습니까?" onConfirm={() => handleRemoveStudent(r.student_id)} okText="제거" cancelText="취소" okType="danger">
          <Button icon={<DeleteOutlined />} size="small" danger />
        </Popconfirm>
      ),
    },
  ]

  const sessionColumns = [
    { title: '회차', dataIndex: 'session_num', key: 'session_num', width: 55, align: 'center' },
    { title: '날짜', dataIndex: 'session_date', key: 'session_date', width: 100, render: v => v ? v.slice(0, 10) : '-' },
    { title: '강사', dataIndex: 'instructor_name', key: 'instructor_name', width: 90, render: v => v || '-' },
    { title: '장소', dataIndex: 'location', key: 'location', width: 110, render: v => v || '-' },
    { title: '내용', dataIndex: 'content', key: 'content', ellipsis: true },
    {
      title: '관리', key: 'action', width: 80, align: 'center',
      render: (_, r) => (
        <Space>
          <Button size="small" onClick={() => openEditSession(r)}>수정</Button>
          <Popconfirm title="삭제하시겠습니까?" onConfirm={() => handleDeleteSession(r.id)} okText="삭제" cancelText="취소" okType="danger">
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  // ── 탭 내용 ───────────────────────────────────────────────────────
  const InfoTab = (
    <Form form={form} layout="vertical" onFinish={handleSave}>
      <div style={{ display: 'flex', gap: 12 }}>
        <Form.Item name="name" label="프로그램명" rules={[{ required: true }]} style={{ flex: 1, minWidth: 0 }}>
          <Input />
        </Form.Item>
        <Form.Item name="category" label="분류" style={{ width: 120, flexShrink: 0 }}>
          <Select allowClear placeholder="선택" style={{ width: '100%' }}>
            {CATEGORIES.map(c => <Option key={c} value={c}>{c}</Option>)}
          </Select>
        </Form.Item>
        <Form.Item name="status" label="상태" style={{ width: 90, flexShrink: 0 }}>
          <Select style={{ width: '100%' }}>
            {STATUS_OPTIONS.map(s => <Option key={s} value={s}>{s}</Option>)}
          </Select>
        </Form.Item>
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        <Form.Item name="start_date" label="시작일" style={{ width: 140, flexShrink: 0 }}>
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="end_date" label="종료일" style={{ width: 140, flexShrink: 0 }}>
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="location" label="장소" style={{ flex: 1, minWidth: 0 }}>
          <Input />
        </Form.Item>
      </div>
      <Form.Item name="description" label="설명">
        <TextArea rows={3} />
      </Form.Item>

      <Divider orientation="left" style={{ fontSize: 13 }}>예산 항목</Divider>
      <div style={{ border: '1px solid #f0f0f0', borderRadius: 6, overflow: 'hidden', marginBottom: 8 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#fafafa' }}>
              <th style={thStyle}>항목명</th>
              <th style={thStyle}>금액 (원)</th>
              <th style={thStyle}>비고</th>
              <th style={{ ...thStyle, width: 40 }}></th>
            </tr>
          </thead>
          <tbody>
            {budgets.map((b, idx) => (
              <tr key={b.id || b.key || idx}>
                <td style={tdStyle}>
                  <Select
                    size="small" style={{ width: '100%' }} value={b.item_name}
                    onChange={v => updateBudgetRow(idx, 'item_name', v)}
                    allowClear showSearch
                  >
                    {BUDGET_ITEMS.map(i => <Option key={i} value={i}>{i}</Option>)}
                  </Select>
                </td>
                <td style={tdStyle}>
                  <InputNumber
                    size="small" style={{ width: '100%' }}
                    value={b.amount} min={0} formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={v => v.replace(/,/g, '')}
                    onChange={v => updateBudgetRow(idx, 'amount', v || 0)}
                  />
                </td>
                <td style={tdStyle}>
                  <Input size="small" value={b.note} onChange={e => updateBudgetRow(idx, 'note', e.target.value)} />
                </td>
                <td style={{ ...tdStyle, textAlign: 'center' }}>
                  <Button icon={<DeleteOutlined />} size="small" type="text" danger onClick={() => removeBudgetRow(idx)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Button icon={<PlusOutlined />} size="small" onClick={addBudgetRow}>항목 추가</Button>
        <Text strong style={{ fontSize: 14 }}>합계: {totalBudget.toLocaleString()}원</Text>
      </div>

      <div style={{ textAlign: 'right' }}>
        <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving} className="btn-search-gradient">
          저장
        </Button>
      </div>
    </Form>
  )

  const StudentsTab = (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <Button type="primary" icon={<UserAddOutlined />} size="small" className="btn-search-gradient"
          onClick={() => { setAddStudentOpen(true); setSelectedStudentIds([]); setStudentSearch('') }}>
          학생 추가
        </Button>
      </div>
      <Table
        dataSource={students}
        columns={studentColumns}
        rowKey="id"
        size="small"
        pagination={false}
        scroll={{ y: 380 }}
        locale={{ emptyText: '참여학생이 없습니다.' }}
      />
    </div>
  )

  const SessionsTab = (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <Button type="primary" icon={<PlusOutlined />} size="small" className="btn-search-gradient" onClick={openAddSession}>
          회차 추가
        </Button>
      </div>
      <Table
        dataSource={sessions}
        columns={sessionColumns}
        rowKey="id"
        size="small"
        pagination={false}
        scroll={{ y: 340 }}
        locale={{ emptyText: '등록된 회차가 없습니다.' }}
        expandable={{
          expandedRowKeys: expandedSessions,
          onExpand: (expanded, record) => handleExpandSession(expanded, record.id),
          expandedRowRender: (record) => {
            const att = attendanceMap[record.id]
            if (!att) return <div style={{ padding: '8px 16px', color: '#888' }}>불러오는 중...</div>
            return (
              <div style={{ padding: '8px 16px' }}>
                <div style={{ marginBottom: 8, fontWeight: 600, fontSize: 12 }}>출석 체크</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                  {att.map(r => (
                    <Tag
                      key={r.student_id}
                      color={r.attended ? 'blue' : 'default'}
                      style={{ cursor: 'pointer', userSelect: 'none', padding: '2px 10px' }}
                      onClick={() => toggleAttendance(record.id, r.student_id)}
                    >
                      {r.attended ? '✓ ' : ''}{r.name}
                    </Tag>
                  ))}
                </div>
                {att.length === 0 && <div style={{ color: '#aaa', fontSize: 12 }}>참여학생이 없습니다.</div>}
                <Button
                  size="small" type="primary" className="btn-search-gradient"
                  loading={savingAttendance[record.id]}
                  onClick={() => saveAttendance(record.id)}
                  disabled={att.length === 0}
                >
                  출석 저장
                </Button>
              </div>
            )
          },
        }}
      />
    </div>
  )

  return (
    <>
      <Drawer
        title={program?.name || '프로그램 상세'}
        open={open}
        onClose={onClose}
        width={760}
        destroyOnClose={false}
        styles={{ body: { padding: '16px 24px' } }}
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            { key: 'info', label: '기본정보/예산', children: InfoTab },
            { key: 'students', label: `참여학생 (${students.length})`, children: StudentsTab },
            { key: 'sessions', label: `회차활동 (${sessions.length})`, children: SessionsTab },
          ]}
        />
      </Drawer>

      {/* 학생 추가 모달 */}
      <Modal
        title="학생 추가"
        open={addStudentOpen}
        onOk={handleAddStudents}
        onCancel={() => setAddStudentOpen(false)}
        okText="추가"
        confirmLoading={addingStudents}
        width={500}
        destroyOnClose
        okButtonProps={{ className: 'btn-search-gradient' }}
      >
        <Input.Search
          placeholder="이름 또는 학교 검색"
          value={studentSearch}
          onChange={e => setStudentSearch(e.target.value)}
          style={{ marginBottom: 12 }}
          allowClear
        />
        <div style={{ maxHeight: 340, overflowY: 'auto', border: '1px solid #f0f0f0', borderRadius: 6 }}>
          {filteredForAdd.length === 0 ? (
            <div style={{ padding: 16, color: '#aaa', textAlign: 'center' }}>추가할 학생이 없습니다.</div>
          ) : (
            filteredForAdd.map(s => (
              <div
                key={s.id}
                style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                  background: selectedStudentIds.includes(s.id) ? '#f0f4ff' : 'transparent' }}
                onClick={() => setSelectedStudentIds(prev =>
                  prev.includes(s.id) ? prev.filter(id => id !== s.id) : [...prev, s.id]
                )}
              >
                <Checkbox checked={selectedStudentIds.includes(s.id)} />
                <span style={{ fontWeight: 600 }}>{s.name}</span>
                <span style={{ color: '#888', fontSize: 12 }}>{s.school} {s.grade} {s.class_name}</span>
              </div>
            ))
          )}
        </div>
        <div style={{ marginTop: 8, color: '#888', fontSize: 12 }}>
          {selectedStudentIds.length}명 선택됨
        </div>
      </Modal>

      {/* 회차 추가/수정 모달 */}
      <Modal
        title={editingSession ? '회차 수정' : '회차 추가'}
        open={sessionModalOpen}
        onOk={() => sessionForm.submit()}
        onCancel={() => setSessionModalOpen(false)}
        okText={editingSession ? '수정' : '추가'}
        confirmLoading={savingSession}
        width={520}
        destroyOnClose
        okButtonProps={{ className: 'btn-search-gradient' }}
      >
        <Form form={sessionForm} layout="vertical" onFinish={handleSaveSession}>
          <Space style={{ width: '100%' }} size={12}>
            <Form.Item name="session_num" label="회차번호" rules={[{ required: true }]} style={{ width: 90 }}>
              <InputNumber min={1} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="session_date" label="날짜" style={{ flex: 1 }}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="instructor_id" label="강사" style={{ flex: 1 }}>
              <Select allowClear placeholder="강사 선택">
                {instructors.map(i => <Option key={i.id} value={i.id}>{i.name}</Option>)}
              </Select>
            </Form.Item>
          </Space>
          <Form.Item name="location" label="장소">
            <Input />
          </Form.Item>
          <Form.Item name="content" label="활동 내용">
            <TextArea rows={3} />
          </Form.Item>
          <Form.Item name="notes" label="비고">
            <TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}

const thStyle = {
  padding: '6px 10px',
  fontSize: 12,
  fontWeight: 600,
  color: '#555',
  borderBottom: '1px solid #f0f0f0',
  textAlign: 'left',
}
const tdStyle = {
  padding: '4px 8px',
  borderBottom: '1px solid #f5f5f5',
}
