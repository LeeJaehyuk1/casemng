import React, { useState, useEffect } from 'react'
import { DatePicker, Button, Typography, Space, Spin, Empty } from 'antd'
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

export default function Stats() {
  const today = dayjs()
  const [dateRange, setDateRange] = useState([today, today])
  const [categoryData, setCategoryData] = useState([])
  const [loading, setLoading] = useState(false)

  const load = async (range = dateRange) => {
    if (!range || !range[0] || !range[1]) return
    setLoading(true)
    try {
      const res = await api.get('/stats/category', {
        params: {
          start: range[0].format('YYYY-MM-DD'),
          end: range[1].format('YYYY-MM-DD'),
        }
      })
      setCategoryData(res.data)
    } catch {
      setCategoryData([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const totalCount = categoryData.reduce((s, d) => s + d.count, 0)

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f5f6fa' }}>
      {/* 상단 배너 */}
      <div style={{
        background: '#fff',
        padding: '20px 28px',
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
          onClick={() => load(dateRange)}
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
        {/* 항목별 진행현황 */}
        <div style={{
          background: '#fff', borderRadius: 10,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          padding: '20px 24px',
          marginBottom: 24,
        }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#1a1a2e', marginBottom: 20 }}>
            항목별 진행현황
          </div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <Spin size="large" />
            </div>
          ) : categoryData.length === 0 ? (
            <Empty description="해당 기간의 사례이력이 없습니다." style={{ padding: '40px 0' }} />
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={categoryData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="category" tick={{ fontSize: 13 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value) => [`${value}건`, '건수']}
                  contentStyle={{ borderRadius: 8, border: '1px solid #eee' }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={60}>
                  {categoryData.map((_, i) => (
                    <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                  ))}
                  <LabelList dataKey="count" position="top" style={{ fontSize: 12, fontWeight: 600 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}
