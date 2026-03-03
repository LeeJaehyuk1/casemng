import React, { useState } from 'react'
import { Layout, Menu, Typography, Avatar, Dropdown, Tooltip } from 'antd'
import {
  FileDoneOutlined, ShareAltOutlined, ControlOutlined,
  UserOutlined, LogoutOutlined, SolutionOutlined
} from '@ant-design/icons'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'

const { Content } = Layout
const { Text } = Typography

const COLLAPSED_W = 56
const EXPANDED_W = 200
const DURATION = '0.3s'

export default function MainLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [hovered, setHovered] = useState(false)
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/login')
  }

  const menuItems = [
    { key: '/cases',   icon: <FileDoneOutlined />,  label: '사례관리' },
    { key: '/network', icon: <ShareAltOutlined />,  label: '네트워크관리' },
    ...(user.role === 'admin'
      ? [{ key: '/admin', icon: <ControlOutlined />, label: '관리자' }]
      : []
    ),
  ]

  const userMenu = [
    { key: 'info', label: <Text>{user.name} ({user.role === 'admin' ? '관리자' : '담당자'})</Text>, disabled: true },
    { type: 'divider' },
    { key: 'logout', icon: <LogoutOutlined />, label: '로그아웃', onClick: handleLogout },
  ]

  const selectedKey = menuItems.find(m => location.pathname.startsWith(m.key))?.key || '/cases'

  return (
    <Layout style={{ height: '100vh' }}>
      {/* 커스텀 사이드바 */}
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: hovered ? EXPANDED_W : COLLAPSED_W,
          minWidth: hovered ? EXPANDED_W : COLLAPSED_W,
          transition: `width ${DURATION} cubic-bezier(0.4,0,0.2,1), min-width ${DURATION} cubic-bezier(0.4,0,0.2,1)`,
          background: 'linear-gradient(180deg, #003eb3 0%, #4a0d9e 100%)',
          boxShadow: '2px 0 8px rgba(0,0,0,0.2)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          zIndex: 10,
          flexShrink: 0,
        }}
      >
        {/* 로고 */}
        <div
          onClick={() => navigate('/cases', { state: { _home: Date.now() } })}
          style={{
            height: 64,
            cursor: 'pointer', userSelect: 'none',
            borderBottom: '1px solid rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center',
            padding: '0 10px',
            gap: 12,
            overflow: 'hidden',
            whiteSpace: 'nowrap',
          }}
        >
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <SolutionOutlined style={{ fontSize: 18, color: '#fff' }} />
          </div>
          <span style={{
            color: '#fff', fontSize: 13, fontWeight: 700, lineHeight: 1.3,
            opacity: hovered ? 1 : 0,
            transition: `opacity ${DURATION} cubic-bezier(0.4,0,0.2,1)`,
            whiteSpace: 'nowrap',
          }}>
            사례관리<br />시스템
          </span>
        </div>

        {/* 메뉴 */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          {menuItems.map(item => {
            const isSelected = selectedKey === item.key
            return (
              <Tooltip key={item.key} title={hovered ? '' : item.label} placement="right">
                <div
                  onClick={() => navigate(item.key)}
                  style={{
                    display: 'flex', alignItems: 'center',
                    height: 48,
                    padding: '0 10px',
                    gap: 12,
                    cursor: 'pointer',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    background: isSelected ? 'rgba(255,255,255,0.18)' : 'transparent',
                    borderRight: isSelected ? '3px solid #fff' : '3px solid transparent',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
                  onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
                >
                  <span style={{ fontSize: 16, color: '#fff', flexShrink: 0, width: 36, textAlign: 'center' }}>
                    {item.icon}
                  </span>
                  <span style={{
                    color: '#fff', fontSize: 13, fontWeight: isSelected ? 600 : 400,
                    opacity: hovered ? 1 : 0,
                    transition: `opacity ${DURATION} cubic-bezier(0.4,0,0.2,1)`,
                  }}>
                    {item.label}
                  </span>
                </div>
              </Tooltip>
            )
          })}
        </div>

        {/* 하단 유저 영역 */}
        <Dropdown menu={{ items: userMenu }} placement="topLeft">
          <div style={{
            borderTop: '1px solid rgba(255,255,255,0.15)',
            padding: '12px 10px',
            display: 'flex', alignItems: 'center',
            gap: 12,
            cursor: 'pointer',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
          }}>
            <Tooltip title={hovered ? '' : `${user.name}`} placement="right">
              <Avatar icon={<UserOutlined />} size={32} style={{ background: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
            </Tooltip>
            <div style={{
              overflow: 'hidden',
              opacity: hovered ? 1 : 0,
              transition: `opacity ${DURATION} cubic-bezier(0.4,0,0.2,1)`,
            }}>
              <div style={{ color: '#fff', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' }}>
                {user.name}
              </div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>
                {user.role === 'admin' ? '관리자' : '담당자'}
              </div>
            </div>
          </div>
        </Dropdown>
      </div>

      <Content style={{ overflow: 'hidden', height: '100vh' }}>
        <Outlet />
      </Content>
    </Layout>
  )
}
