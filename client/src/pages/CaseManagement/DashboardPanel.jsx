import React, { useEffect, useState } from 'react'
import { Table, DatePicker, Input, Button, Space, Tag, Typography, Divider } from 'antd'
import { SearchOutlined, ReloadOutlined, CalendarOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { getCasesByDate } from '../../api'

const { Text, Title } = Typography

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

  // 초기 로딩 (오늘 날짜)
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
          style={{ padding: 0, height: 'auto', fontWeight: 500 }}
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
      render: v => <Tag color="blue">{v}</Tag>,
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
    <div style={{ padding: '20px 24px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 헤더 */}
      <div style={{ marginBottom: 16 }}>
        <Space align="center">
          <CalendarOutlined style={{ fontSize: 18, color: '#1677ff' }} />
          <Title level={5} style={{ margin: 0 }}>일별 사례이력 조회</Title>
        </Space>
        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4, marginLeft: 26 }}>
          날짜를 선택하면 해당일에 등록된 사례이력을 조회합니다.
        </Text>
      </div>

      <Divider style={{ margin: '0 0 14px' }} />

      {/* 검색 조건 */}
      <Space style={{ marginBottom: 14 }} wrap>
        <DatePicker
          value={date}
          onChange={handleDateChange}
          allowClear={false}
          style={{ width: 160 }}
          placeholder="날짜 선택"
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
        >
          조회
        </Button>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {date.format('YYYY년 MM월 DD일')} · 총{' '}
          <Text strong style={{ fontSize: 12 }}>{cases.length}</Text>건
        </Text>
      </Space>

      {/* 그리드 */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <Table
          dataSource={cases}
          columns={columns}
          rowKey="id"
          loading={loading}
          size="small"
          scroll={{ y: 'calc(100vh - 280px)' }}
          pagination={{ pageSize: 20, showSizeChanger: false, showTotal: total => `총 ${total}건` }}
          locale={{ emptyText: '해당 날짜의 사례이력이 없습니다.' }}
        />
      </div>
    </div>
  )
}
