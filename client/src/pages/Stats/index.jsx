import React, { useState, useEffect } from 'react'
import { DatePicker, Button, Typography, Space, Spin, Empty, Radio } from 'antd'
import { BarChartOutlined, SearchOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, LabelList
} from 'recharts'
import api from '../../api'

const { RangePicker } = DatePicker
const { Text } = Typography

const CATEGORY_COLORS = [
  '#003eb3', '#4a0d9e', '#1677ff', '#722ed1', '#2f54eb',
  '#531dab', '#096dd9', '#391085', '#0050b3', '#22075e',
]
const SCHOOL_COLORS = [
  '#13c2c2', '#36cfc9', '#08979c', '#006d75', '#00474f',
  '#5cdbd3', '#87e8de', '#0e7490', '#155e75', '#164e63',
]

function ChartCard({ title, loading, empty, children, extra }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 10,
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      padding: '20px 24px', flex: 1, minWidth: 0,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: '#1a1a2e' }}>{title}</div>
        {extra}
      </div>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}><Spin size="large" /></div>
      ) : empty ? (
        <Empty description="해당 기간의 데이터가 없습니다." style={{ padding: '40px 0' }} />
      ) : children}
    </div>
  )
}

export default function Stats() {
  const today = dayjs()
  const [dateRange, setDateRange] = useState([today, today])
  const [categoryData, setCategoryData] = useState([])
  const [schoolData, setSchoolData] = useState([])
  const [schoolType, setSchoolType] = useState('초등학교')
  const [studentData, setStudentData] = useState([])
  const [loadingCat, setLoadingCat] = useState(false)
  const [loadingSchool, setLoadingSchool] = useState(false)
  const [loadingStudent, setLoadingStudent] = useState(false)

  const loadAll = async (range = dateRange, type = schoolType) => {
    if (!range?.[0] || !range?.[1]) return
    const params = { start: range[0].format('YYYY-MM-DD'), end: range[1].format('YYYY-MM-DD') }

    setLoadingCat(true)
    api.get('/stats/category', { params })
      .then(res => setCategoryData(res.data))
      .catch(() => setCategoryData([]))
      .finally(() => setLoadingCat(false))

    setLoadingSchool(true)
    api.get('/stats/school', { params: { ...params, type } })
      .then(res => setSchoolData(res.data))
      .catch(() => setSchoolData([]))
      .finally(() => setLoadingSchool(false))

    setLoadingStudent(true)
    api.get('/stats/student', { params })
      .then(res => setStudentData(res.data))
      .catch(() => setStudentData([]))
      .finally(() => setLoadingStudent(false))
  }

  const handleSchoolTypeChange = (e) => {
    const t = e.target.value
    setSchoolType(t)
    if (!dateRange?.[0] || !dateRange?.[1]) return
    const params = { start: dateRange[0].format('YYYY-MM-DD'), end: dateRange[1].format('YYYY-MM-DD') }
    setLoadingSchool(true)
    api.get('/stats/school', { params: { ...params, type: t } })
      .then(res => setSchoolData(res.data))
      .catch(() => setSchoolData([]))
      .finally(() => setLoadingSchool(false))
  }

  useEffect(() => { loadAll() }, [])

  const totalCount = categoryData.reduce((s, d) => s + d.count, 0)

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
            <BarChartOutlined style={{ fontSize: 20, color: '#003eb3' }} />
          </div>
          <div>
            <div style={{ color: '#1a1a2e', fontWeight: 700, fontSize: 16 }}>데이터 통계</div>
            <div style={{ color: '#888', fontSize: 12 }}>기간별 사례관리 현황을 확인합니다.</div>
          </div>
        </Space>
        <div style={{ background: '#f0f4ff', borderRadius: 12, padding: '8px 20px', textAlign: 'center' }}>
          <div style={{ color: '#888', fontSize: 12 }}>총 건수</div>
          <div style={{ color: '#003eb3', fontWeight: 700, fontSize: 24 }}>{totalCount}</div>
        </div>
      </div>

      {/* 검색 조건 */}
      <div style={{
        background: '#fff', padding: '14px 28px',
        borderBottom: '1px solid #eee',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <RangePicker
          value={dateRange}
          onChange={(v) => setDateRange(v)}
          allowClear={false}
          style={{ width: 260 }}
        />
        <Button
          type="primary"
          icon={<SearchOutlined />}
          onClick={() => loadAll(dateRange, schoolType)}
          style={{ background: 'linear-gradient(90deg, #003eb3, #4a0d9e)', border: 'none' }}
        >
          조회
        </Button>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {dateRange?.[0]?.format('YYYY.MM.DD')} ~ {dateRange?.[1]?.format('YYYY.MM.DD')}
        </Text>
      </div>

      {/* 차트 영역 */}
      <div style={{ flex: 1, overflow: 'auto', padding: '24px 28px' }}>
        <div style={{ display: 'flex', gap: 20 }}>
          {/* 항목별 진행현황 */}
          <ChartCard
            title="항목별 진행현황"
            loading={loadingCat}
            empty={categoryData.length === 0}
          >
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryData} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="category" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(v) => [`${v}건`, '건수']}
                  contentStyle={{ borderRadius: 8, border: '1px solid #eee' }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={50}>
                  {categoryData.map((_, i) => (
                    <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                  ))}
                  <LabelList dataKey="count" position="top" style={{ fontSize: 11, fontWeight: 600 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* 학교별 진행현황 */}
          <ChartCard
            title="학교별 진행현황"
            loading={loadingSchool}
            empty={schoolData.length === 0}
            extra={
              <Radio.Group
                value={schoolType}
                onChange={handleSchoolTypeChange}
                size="small"
                optionType="button"
                buttonStyle="solid"
                options={[
                  { label: '초등학교', value: '초등학교' },
                  { label: '중학교',   value: '중학교' },
                  { label: '고등학교', value: '고등학교' },
                ]}
              />
            }
          >
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={schoolData} margin={{ top: 20, right: 10, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="school"
                  tick={{ fontSize: 11 }}
                  angle={-30}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(v) => [`${v}건`, '건수']}
                  contentStyle={{ borderRadius: 8, border: '1px solid #eee' }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={50}>
                  {schoolData.map((_, i) => (
                    <Cell key={i} fill={SCHOOL_COLORS[i % SCHOOL_COLORS.length]} />
                  ))}
                  <LabelList dataKey="count" position="top" style={{ fontSize: 11, fontWeight: 600 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* 학생별 이력현황 */}
        <div style={{ marginTop: 20 }}>
          <ChartCard
            title="학생별 이력현황"
            loading={loadingStudent}
            empty={studentData.length === 0}
          >
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={studentData} margin={{ top: 20, right: 10, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="student"
                  tick={{ fontSize: 12 }}
                  angle={-30}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(v) => [`${v}건`, '건수']}
                  contentStyle={{ borderRadius: 8, border: '1px solid #eee' }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={50}>
                  {studentData.map((_, i) => (
                    <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                  ))}
                  <LabelList dataKey="count" position="top" style={{ fontSize: 11, fontWeight: 600 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>
    </div>
  )
}
