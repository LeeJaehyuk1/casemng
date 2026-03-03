import React, { useEffect, useState, useCallback } from 'react'
import {
  Table, Button, Modal, Form, Input, Select, DatePicker, Space, message,
  Popconfirm, Tag, Typography, Badge
} from 'antd'
import {
  PlusOutlined, AppstoreOutlined, DeleteOutlined, TeamOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'
import {
  getPrograms, createProgram, deleteProgram, getTree
} from '../../api'
import ProgramDrawer from './ProgramDrawer'
import InstructorModal from './InstructorModal'

const { Option } = Select
const { TextArea } = Input
const { Text } = Typography

const CATEGORIES = ['학습지원', '심리정서', '문화체험', '복지지원', '기타']
const STATUS_OPTIONS = ['진행중', '완료']
const BUDGET_ITEMS = ['강사비', '재료비', '간식비', '교통비', '기타']

const STATUS_COLOR = { '진행중': 'processing', '완료': 'default' }
const CATEGORY_COLOR = {
  '학습지원': 'blue', '심리정서': 'purple', '문화체험': 'cyan',
  '복지지원': 'green', '기타': 'default',
}

export default function ProgramManagement() {
  const [programs, setPrograms] = useState([])
  const [loading, setLoading] = useState(false)
  const [filterCategory, setFilterCategory] = useState(null)
  const [filterStatus, setFilterStatus] = useState(null)

  // 등록 모달
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm] = Form.useForm()
  const [budgets, setBudgets] = useState([])
  const [creating, setCreating] = useState(false)

  // Drawer
  const [drawerProgramId, setDrawerProgramId] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // 강사 모달
  const [instructorOpen, setInstructorOpen] = useState(false)

  // 학생 목록 (학생 추가용)
  const [allStudents, setAllStudents] = useState([])

  const loadPrograms = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getPrograms()
      setPrograms(res.data)
    } catch { message.error('프로그램 목록을 불러오지 못했습니다.') }
    finally { setLoading(false) }
  }, [])

  const loadStudents = useCallback(async () => {
    try {
      const res = await getTree()
      setAllStudents(res.data.students || [])
    } catch {}
  }, [])

  useEffect(() => {
    loadPrograms()
    loadStudents()
  }, [loadPrograms, loadStudents])

  const openDrawer = (id) => {
    setDrawerProgramId(id)
    setDrawerOpen(true)
  }

  const openCreate = () => {
    setBudgets([])
    createForm.resetFields()
    setCreateOpen(true)
  }

  const addBudgetRow = () => {
    setBudgets(prev => [...prev, { key: Date.now(), item_name: '', amount: 0, note: '' }])
  }

  const updateBudget = (idx, field, value) => {
    setBudgets(prev => prev.map((b, i) => i === idx ? { ...b, [field]: value } : b))
  }

  const removeBudget = (idx) => {
    setBudgets(prev => prev.filter((_, i) => i !== idx))
  }

  const handleCreate = async (values) => {
    setCreating(true)
    try {
      await createProgram({
        name: values.name,
        category: values.category,
        start_date: values.start_date ? values.start_date.format('YYYY-MM-DD') : null,
        end_date: values.end_date ? values.end_date.format('YYYY-MM-DD') : null,
        location: values.location,
        status: values.status || '진행중',
        description: values.description,
        budgets,
      })
      message.success('프로그램이 등록되었습니다.')
      setCreateOpen(false)
      loadPrograms()
    } catch (err) {
      message.error(err.response?.data?.message || '등록 실패')
    } finally { setCreating(false) }
  }

  const handleDelete = async (id, e) => {
    e.stopPropagation()
    try {
      await deleteProgram(id)
      message.success('삭제되었습니다.')
      loadPrograms()
    } catch { message.error('삭제 실패') }
  }

  const filtered = programs.filter(p =>
    (!filterCategory || p.category === filterCategory) &&
    (!filterStatus || p.status === filterStatus)
  )

  const columns = [
    {
      title: '프로그램명',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (v) => <Text strong style={{ color: '#003eb3' }}>{v}</Text>,
    },
    {
      title: '분류',
      dataIndex: 'category',
      key: 'category',
      width: 90,
      align: 'center',
      render: v => v ? <Tag color={CATEGORY_COLOR[v] || 'default'}>{v}</Tag> : '-',
    },
    {
      title: '기간',
      key: 'period',
      width: 180,
      align: 'center',
      render: (_, r) => {
        const s = r.start_date ? r.start_date.slice(0, 10) : ''
        const e = r.end_date ? r.end_date.slice(0, 10) : ''
        if (!s && !e) return '-'
        return `${s} ~ ${e}`
      },
    },
    {
      title: '장소',
      dataIndex: 'location',
      key: 'location',
      width: 120,
      render: v => v || '-',
    },
    {
      title: '참여학생',
      dataIndex: 'student_count',
      key: 'student_count',
      width: 80,
      align: 'center',
      render: v => <Badge count={v} showZero style={{ backgroundColor: '#003eb3' }} />,
    },
    {
      title: '총예산',
      dataIndex: 'total_budget',
      key: 'total_budget',
      width: 100,
      align: 'right',
      render: v => v ? `${parseInt(v).toLocaleString()}원` : '-',
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      align: 'center',
      render: v => <Badge status={STATUS_COLOR[v] || 'default'} text={v || '-'} />,
    },
    {
      title: '관리',
      key: 'action',
      width: 70,
      align: 'center',
      render: (_, record) => (
        <Popconfirm
          title="프로그램을 삭제하시겠습니까?"
          onConfirm={e => handleDelete(record.id, e)}
          onPopupClick={e => e.stopPropagation()}
          okText="삭제" cancelText="취소" okType="danger"
        >
          <Button
            icon={<DeleteOutlined />} size="small" danger
            onClick={e => e.stopPropagation()}
          />
        </Popconfirm>
      ),
    },
  ]

  const totalBudget = budgets.reduce((s, b) => s + (parseInt(b.amount) || 0), 0)

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f5f6fa' }}>
      {/* 상단 배너 */}
      <div style={{
        background: '#fff', padding: '20px 28px',
        borderBottom: '1px solid #eee',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Space align="center" size={12}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            background: '#f0f4ff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <AppstoreOutlined style={{ fontSize: 20, color: '#003eb3' }} />
          </div>
          <div>
            <div style={{ color: '#1a1a2e', fontWeight: 700, fontSize: 16 }}>프로그램 관리</div>
            <div style={{ color: '#888', fontSize: 12 }}>교육복지 프로그램을 기획하고 운영합니다.</div>
          </div>
        </Space>
        <div style={{ background: '#f0f4ff', borderRadius: 12, padding: '8px 20px', textAlign: 'center' }}>
          <div style={{ color: '#888', fontSize: 12 }}>총 프로그램</div>
          <div style={{ color: '#003eb3', fontWeight: 700, fontSize: 24 }}>{programs.length}</div>
        </div>
      </div>

      {/* 툴바 */}
      <div style={{
        background: '#fff', padding: '14px 28px',
        borderBottom: '1px solid #eee',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Space>
          <Select
            placeholder="분류 전체"
            allowClear style={{ width: 110 }}
            value={filterCategory}
            onChange={setFilterCategory}
          >
            {CATEGORIES.map(c => <Option key={c} value={c}>{c}</Option>)}
          </Select>
          <Select
            placeholder="상태 전체"
            allowClear style={{ width: 100 }}
            value={filterStatus}
            onChange={setFilterStatus}
          >
            {STATUS_OPTIONS.map(s => <Option key={s} value={s}>{s}</Option>)}
          </Select>
        </Space>
        <Space>
          <Button icon={<TeamOutlined />} onClick={() => setInstructorOpen(true)}>강사 관리</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate} className="btn-search-gradient">
            프로그램 등록
          </Button>
        </Space>
      </div>

      {/* 테이블 */}
      <div style={{ flex: 1, overflow: 'hidden', padding: '20px 28px' }}>
        <div style={{
          background: '#fff', borderRadius: 10, overflow: 'hidden', height: '100%',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}>
          <Table
            dataSource={filtered}
            columns={columns}
            rowKey="id"
            loading={loading}
            size="small"
            scroll={{ x: 900, y: 'calc(100vh - 280px)' }}
            pagination={{ pageSize: 20, showTotal: total => `총 ${total}개` }}
            rowClassName={(_, i) => i % 2 === 0 ? '' : 'table-row-alt'}
            onRow={record => ({
              onClick: () => openDrawer(record.id),
              style: { cursor: 'pointer' },
            })}
            locale={{ emptyText: '등록된 프로그램이 없습니다.' }}
          />
        </div>
      </div>

      {/* 프로그램 등록 모달 */}
      <Modal
        title="프로그램 등록"
        open={createOpen}
        onOk={() => createForm.submit()}
        onCancel={() => setCreateOpen(false)}
        okText="등록"
        confirmLoading={creating}
        width={620}
        destroyOnClose
        okButtonProps={{ className: 'btn-search-gradient' }}
      >
        <Form form={createForm} layout="vertical" onFinish={handleCreate}>
          <div style={{ display: 'flex', gap: 12 }}>
            <Form.Item name="name" label="프로그램명" rules={[{ required: true, message: '필수' }]} style={{ flex: 1, minWidth: 0 }}>
              <Input />
            </Form.Item>
            <Form.Item name="category" label="분류" style={{ width: 120, flexShrink: 0 }}>
              <Select allowClear placeholder="선택" style={{ width: '100%' }}>
                {CATEGORIES.map(c => <Option key={c} value={c}>{c}</Option>)}
              </Select>
            </Form.Item>
            <Form.Item name="status" label="상태" initialValue="진행중" style={{ width: 90, flexShrink: 0 }}>
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
            <TextArea rows={2} />
          </Form.Item>

          <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 12, marginBottom: 8 }}>
            <Text style={{ fontSize: 13, fontWeight: 600 }}>예산 항목</Text>
          </div>
          {budgets.map((b, idx) => (
            <Space key={b.key || idx} style={{ width: '100%', marginBottom: 4 }} size={8} align="start">
              <Select
                size="small" style={{ width: 90 }} value={b.item_name} allowClear
                onChange={v => updateBudget(idx, 'item_name', v)} placeholder="항목"
              >
                {BUDGET_ITEMS.map(i => <Option key={i} value={i}>{i}</Option>)}
              </Select>
              <Input
                size="small" style={{ width: 110 }} value={b.amount} placeholder="금액"
                onChange={e => updateBudget(idx, 'amount', e.target.value)}
              />
              <Input
                size="small" style={{ width: 140 }} value={b.note} placeholder="비고"
                onChange={e => updateBudget(idx, 'note', e.target.value)}
              />
              <Button icon={<DeleteOutlined />} size="small" type="text" danger onClick={() => removeBudget(idx)} />
            </Space>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
            <Button icon={<PlusOutlined />} size="small" onClick={addBudgetRow}>항목 추가</Button>
            {budgets.length > 0 && <Text style={{ fontSize: 12 }}>합계: {totalBudget.toLocaleString()}원</Text>}
          </div>
        </Form>
      </Modal>

      {/* 프로그램 상세 Drawer */}
      <ProgramDrawer
        programId={drawerProgramId}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onUpdated={loadPrograms}
        allStudents={allStudents}
      />

      {/* 강사 관리 모달 */}
      <InstructorModal open={instructorOpen} onClose={() => setInstructorOpen(false)} />
    </div>
  )
}
