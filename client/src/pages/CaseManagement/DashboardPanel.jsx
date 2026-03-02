import React, { useEffect, useState } from 'react'
import { Table, DatePicker, Input, Button, Space, Tag, Typography } from 'antd'
import { SearchOutlined, ReloadOutlined, CalendarOutlined, FileTextOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { getCasesByDate } from '../../api'

const { Text } = Typography

export default function DashboardPanel({ onSelectStudent }) {
  const [date, setDate] = useState(dayjs())
  const [studentName, setStudentName] = useState('')
  const [cases, setCases] = useState([])
  const [loading, setLoading] = useState(false)

  const load = (d = date, name = studentName) => {
    setLoading(true)
    getCasesByDate(d.format('YYYY-MM-DD'), name.trim() || undefined)
      .then(res => setCases(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load(date, '') }, [])

  const handleDateChange = (v) => {
    if (!v) return
    setDate(v)
    load(v, studentName)
  }

  const handleNameChange = (e) => {
    setStudentName(e.target.value)
    if (!e.target.value) load(date, '')
  }

  const columns = [
    {
      title: '학생명',
      dataIndex: 'student_name',
      key: 'student_name',
      width: 90,
      render: (name, record) => (
        <Button
          type="link"
          size="small"
          style={{ padding: 0, height: 'auto', fontWeight: 600, color: '#003eb3' }}
          onClick={() => onSelectStudent(record.student_id, record.student_status)}
        >
          {name}
        </Button>
      ),
    },
    {
      title: '위치',
      dataIndex: 'folder_name',
      key: 'folder_name',
      width: 120,
      render: v => <Text type="secondary" style={{ fontSize: 12 }}>{v || '-'}</Text>,
    },
    {
      title: '항목',
      dataIndex: 'category',
      key: 'category',
      width: 90,
      render: v => <Tag color="purple">{v}</Tag>,
      filters: ['가정방문','상담','전화상담','기관연계','지원','회의','교육','모니터링','기타']
        .map(c => ({ text: c, value: c })),
      onFilter: (val, record) => record.category === val,
    },
    {
      title: '내용',
      dataIndex: 'content',
      key: 'content',
      ellipsis: true,
    },
    {
      title: '작성자',
      dataIndex: 'created_by_name',
      key: 'created_by_name',
      width: 80,
    },
  ]

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f5f6fa' }}>
      {/* 상단 배너 */}
      <div style={{
        background: 'linear-gradient(90deg, #003eb3 0%, #4a0d9e 100%)',
        padding: '20px 28px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Space align="center" size={12}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <CalendarOutlined style={{ fontSize: 20, color: '#fff' }} />
          </div>
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>일별 사례이력 조회</div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
              날짜를 선택하면 해당일의 사례이력을 조회합니다.
            </div>
          </div>
        </Space>
        <div style={{
          background: 'rgba(255,255,255,0.15)',
          borderRadius: 12, padding: '8px 20px', textAlign: 'center',
        }}>
          <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>총 건수</div>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 24 }}>{cases.length}</div>
        </div>
      </div>

      {/* 검색 조건 */}
      <div style={{
        background: '#fff',
        padding: '14px 28px',
        borderBottom: '1px solid #eee',
        display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
      }}>
        <DatePicker
          value={date}
          onChange={handleDateChange}
          allowClear={false}
          style={{ width: 160 }}
        />
        <Input
          placeholder="학생명 검색"
          value={studentName}
          onChange={handleNameChange}
          onPressEnter={() => load(date, studentName)}
          prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
          allowClear
          style={{ width: 180 }}
        />
        <Button
          type="primary"
          icon={<ReloadOutlined />}
          onClick={() => load(date, studentName)}
          style={{ background: 'linear-gradient(90deg, #003eb3, #4a0d9e)', border: 'none' }}
        >
          조회
        </Button>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {date.format('YYYY년 MM월 DD일')}
        </Text>
      </div>

      {/* 테이블 */}
      <div style={{ flex: 1, overflow: 'hidden', padding: '16px 28px' }}>
        <div style={{ background: '#fff', borderRadius: 10, overflow: 'hidden', height: '100%',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <Table
            dataSource={cases}
            columns={columns}
            rowKey="id"
            loading={loading}
            size="small"
            scroll={{ y: 'calc(100vh - 320px)' }}
            pagination={{ pageSize: 20, showSizeChanger: false, showTotal: total => `총 ${total}건` }}
            locale={{ emptyText: (
              <div style={{ padding: '40px 0', color: '#aaa' }}>
                <FileTextOutlined style={{ fontSize: 36, display: 'block', marginBottom: 8 }} />
                해당 날짜의 사례이력이 없습니다.
              </div>
            )}}
            rowClassName={(_, i) => i % 2 === 0 ? '' : 'table-row-alt'}
          />
        </div>
      </div>
    </div>
  )
}
