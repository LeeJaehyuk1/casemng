import React, { useState } from 'react'
import { Space } from 'antd'
import { ApartmentOutlined, TeamOutlined, ControlOutlined } from '@ant-design/icons'
import TreeAdmin from './TreeAdmin'
import UserAdmin from './UserAdmin'

const MENU_ITEMS = [
  { key: 'tree',  icon: <ApartmentOutlined />, label: '트리 구성 관리' },
  { key: 'users', icon: <TeamOutlined />,      label: '사용자 관리' },
]

export default function AdminPage() {
  const [activeMenu, setActiveMenu] = useState('tree')

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f5f6fa' }}>
      {/* 상단 배너 */}
      <div style={{
        background: '#fff', padding: '20px 28px',
        borderBottom: '1px solid #eee',
        display: 'flex', alignItems: 'center',
      }}>
        <Space align="center" size={12}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            background: '#f0f4ff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <ControlOutlined style={{ fontSize: 20, color: '#003eb3' }} />
          </div>
          <div>
            <div style={{ color: '#1a1a2e', fontWeight: 700, fontSize: 16 }}>관리자</div>
            <div style={{ color: '#888', fontSize: 12 }}>시스템 구성 및 사용자를 관리합니다.</div>
          </div>
        </Space>
      </div>

      {/* 탭 바 */}
      <div style={{
        background: '#fff', borderBottom: '1px solid #eee',
        display: 'flex', padding: '0 28px',
      }}>
        {MENU_ITEMS.map(item => (
          <div
            key={item.key}
            onClick={() => setActiveMenu(item.key)}
            style={{
              padding: '12px 20px',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 13,
              fontWeight: activeMenu === item.key ? 600 : 400,
              color: activeMenu === item.key ? '#003eb3' : '#666',
              borderBottom: activeMenu === item.key ? '2px solid #003eb3' : '2px solid transparent',
              transition: 'color 0.2s, border-color 0.2s',
            }}
          >
            {item.icon}
            {item.label}
          </div>
        ))}
      </div>

      {/* 콘텐츠 */}
      <div style={{ flex: 1, overflow: 'hidden', padding: '20px 28px' }}>
        <div style={{
          background: '#fff', borderRadius: 10,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          height: '100%', overflow: 'auto', padding: 24,
        }}>
          {activeMenu === 'tree'  && <TreeAdmin />}
          {activeMenu === 'users' && <UserAdmin />}
        </div>
      </div>
    </div>
  )
}
