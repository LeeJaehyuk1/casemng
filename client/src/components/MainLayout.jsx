import React, { useState } from 'react'
import { Layout, Menu, Button, Space, Typography, Avatar, Dropdown } from 'antd'
import {
  FileDoneOutlined, ShareAltOutlined, ControlOutlined,
  UserOutlined, LogoutOutlined, SolutionOutlined
} from '@ant-design/icons'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'

const { Header, Content } = Layout
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
      <Header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px',
        background: 'linear-gradient(90deg, #003eb3 0%, #4a0d9e 100%)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      }}>
        <Space size={32}>
          <Text
            onClick={() => navigate('/cases', { state: { _home: Date.now() } })}
            style={{
              color: '#fff', fontSize: 18, fontWeight: 700, whiteSpace: 'nowrap',
              cursor: 'pointer', userSelect: 'none',
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            <SolutionOutlined style={{ marginRight: 8, fontSize: 20, verticalAlign: 'middle' }} />
            사례관리 시스템
          </Text>
          <Menu
            theme="dark"
            mode="horizontal"
            selectedKeys={[selectedKey]}
            items={menuItems}
            onClick={({ key }) => navigate(key)}
            disabledOverflow
            style={{ background: 'transparent', borderBottom: 'none' }}
          />
        </Space>
        <Dropdown menu={{ items: userMenu }} placement="bottomRight">
          <Button type="text" style={{ color: '#fff' }}>
            <Avatar icon={<UserOutlined />} size="small" style={{ marginRight: 8, background: '#1677ff' }} />
            {user.name}
          </Button>
        </Dropdown>
      </Header>
      <Content style={{ overflow: 'hidden', height: 'calc(100vh - 64px)' }}>
        <Outlet />
      </Content>
    </Layout>
  )
}
