import React, { useState } from 'react'
import { Layout, Menu, Typography } from 'antd'
import { ApartmentOutlined, TeamOutlined } from '@ant-design/icons'
import TreeAdmin from './TreeAdmin'
import UserAdmin from './UserAdmin'

const { Sider, Content } = Layout
const { Title } = Typography

const MENU_ITEMS = [
  { key: 'tree', icon: <ApartmentOutlined />, label: '트리 구성 관리' },
  { key: 'users', icon: <TeamOutlined />,     label: '사용자 관리' },
]

export default function AdminPage() {
  const [activeMenu, setActiveMenu] = useState('tree')

  return (
    <Layout style={{ height: '100%' }}>
      <Sider width={200} style={{ background: '#fff', borderRight: '1px solid #f0f0f0' }}>
        <div style={{ padding: '16px 16px 8px' }}>
          <Title level={5} style={{ margin: 0, color: '#001529' }}>관리자</Title>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[activeMenu]}
          items={MENU_ITEMS}
          onClick={({ key }) => setActiveMenu(key)}
          style={{ borderRight: 0 }}
        />
      </Sider>
      <Content style={{ padding: 24, overflow: 'auto', background: '#fff' }}>
        {activeMenu === 'tree'  && <TreeAdmin />}
        {activeMenu === 'users' && <UserAdmin />}
      </Content>
    </Layout>
  )
}
