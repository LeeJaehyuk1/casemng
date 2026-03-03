import React from 'react'
import { Layout, Menu, Button, Typography, Avatar, Dropdown, Tooltip } from 'antd'
import {
  FileDoneOutlined, ShareAltOutlined, ControlOutlined,
  UserOutlined, LogoutOutlined, SolutionOutlined
} from '@ant-design/icons'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'

const { Sider, Content } = Layout
const { Text } = Typography

export default function MainLayout() {
  const navigate = useNavigate()
  const location = useLocation()
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
      <Sider
        width={200}
        style={{
          background: 'linear-gradient(180deg, #003eb3 0%, #4a0d9e 100%)',
          display: 'flex', flexDirection: 'column',
          boxShadow: '2px 0 8px rgba(0,0,0,0.2)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* 로고 */}
          <div
            onClick={() => navigate('/cases', { state: { _home: Date.now() } })}
            style={{
              padding: '24px 16px 20px',
              cursor: 'pointer', userSelect: 'none',
              borderBottom: '1px solid rgba(255,255,255,0.15)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <SolutionOutlined style={{ fontSize: 18, color: '#fff' }} />
              </div>
              <span style={{ color: '#fff', fontSize: 14, fontWeight: 700, lineHeight: 1.3 }}>
                사례관리<br />시스템
              </span>
            </div>
          </div>

          {/* 메뉴 */}
          <Menu
            mode="inline"
            selectedKeys={[selectedKey]}
            items={menuItems}
            onClick={({ key }) => navigate(key)}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              marginTop: 8,
            }}
            theme="dark"
          />

          {/* 하단 유저 영역 */}
          <div style={{
            borderTop: '1px solid rgba(255,255,255,0.15)',
            padding: '12px 16px',
          }}>
            <Dropdown menu={{ items: userMenu }} placement="topLeft">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <Avatar icon={<UserOutlined />} size={32} style={{ background: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ color: '#fff', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {user.name}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>
                    {user.role === 'admin' ? '관리자' : '담당자'}
                  </div>
                </div>
              </div>
            </Dropdown>
          </div>
        </div>
      </Sider>

      <Content style={{ overflow: 'hidden', height: '100vh' }}>
        <Outlet />
      </Content>
    </Layout>
  )
}
