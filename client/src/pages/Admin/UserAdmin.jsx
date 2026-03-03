import React, { useEffect, useState } from 'react'
import {
  Table, Button, Modal, Form, Input, Select, Space,
  message, Tag, Popconfirm, Typography, Switch, Tooltip
} from 'antd'
import { PlusOutlined, EditOutlined, UserDeleteOutlined, TeamOutlined } from '@ant-design/icons'
import { getUsers, createUser, updateUser, deleteUser } from '../../api'

const { Option } = Select
const { Text } = Typography

export default function UserAdmin() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm()
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}')

  const loadUsers = async () => {
    setLoading(true)
    try {
      const res = await getUsers()
      setUsers(res.data)
    } catch { message.error('사용자 목록을 불러오지 못했습니다.') }
    finally { setLoading(false) }
  }

  useEffect(() => { loadUsers() }, [])

  const openAdd = () => {
    setEditingUser(null)
    form.resetFields()
    form.setFieldsValue({ role: 'manager', is_active: true })
    setModalOpen(true)
  }

  const openEdit = (record) => {
    setEditingUser(record)
    form.setFieldsValue({
      name: record.name,
      role: record.role,
      phone: record.phone,
      email: record.email,
      is_active: record.is_active,
    })
    setModalOpen(true)
  }

  const handleDeactivate = async (id) => {
    try {
      await deleteUser(id)
      message.success('비활성화되었습니다.')
      loadUsers()
    } catch (err) {
      message.error(err.response?.data?.message || '처리 실패')
    }
  }

  const handleSubmit = async (values) => {
    setSubmitting(true)
    try {
      if (editingUser) {
        await updateUser(editingUser.id, values)
        message.success('수정되었습니다.')
      } else {
        await createUser(values)
        message.success('등록되었습니다.')
      }
      setModalOpen(false)
      loadUsers()
    } catch (err) {
      message.error(err.response?.data?.message || '저장 실패')
    } finally {
      setSubmitting(false)
    }
  }

  const columns = [
    {
      title: '아이디',
      dataIndex: 'username',
      key: 'username',
      width: 130,
      align: 'center',
    },
    {
      title: '이름',
      dataIndex: 'name',
      key: 'name',
      width: 100,
      align: 'center',
      render: v => <Text strong>{v}</Text>,
    },
    {
      title: '권한',
      dataIndex: 'role',
      key: 'role',
      width: 90,
      align: 'center',
      render: v => <Tag color={v === 'admin' ? 'red' : 'geekblue'}>{v === 'admin' ? '관리자' : '담당자'}</Tag>,
    },
    {
      title: '연락처',
      dataIndex: 'phone',
      key: 'phone',
      width: 140,
      align: 'center',
      render: v => v || '-',
    },
    {
      title: '이메일',
      dataIndex: 'email',
      key: 'email',
      align: 'center',
      render: v => v || '-',
    },
    {
      title: '상태',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 80,
      align: 'center',
      render: v => <Tag color={v ? 'green' : 'default'}>{v ? '활성' : '비활성'}</Tag>,
    },
    {
      title: '관리',
      key: 'action',
      width: 100,
      align: 'center',
      render: (_, record) => (
        <Space>
          <Tooltip title="수정">
            <Button icon={<EditOutlined />} size="small" onClick={() => openEdit(record)} />
          </Tooltip>
          {record.id !== currentUser.id && record.is_active && (
            <Popconfirm
              title="비활성화하시겠습니까?"
              onConfirm={() => handleDeactivate(record.id)}
              okText="비활성화" cancelText="취소" okType="danger"
            >
              <Tooltip title="비활성화">
                <Button icon={<UserDeleteOutlined />} size="small" danger />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div>
      {/* 내부 헤더 */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid #f0f0f0',
      }}>
        <Space align="center" size={8}>
          <TeamOutlined style={{ color: '#003eb3', fontSize: 16 }} />
          <span style={{ fontWeight: 600, fontSize: 14, color: '#1a1a2e' }}>사용자 관리</span>
          <Tag color="geekblue" style={{ marginLeft: 4 }}>{users.length}명</Tag>
        </Space>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          size="small"
          onClick={openAdd}
          className="btn-search-gradient"
        >
          사용자 추가
        </Button>
      </div>

      <Table
        dataSource={users}
        columns={columns}
        rowKey="id"
        loading={loading}
        size="small"
        pagination={false}
        rowClassName={(_, i) => i % 2 === 0 ? '' : 'table-row-alt'}
      />

      <Modal
        title={editingUser ? '사용자 수정' : '사용자 등록'}
        open={modalOpen}
        onOk={() => form.submit()}
        onCancel={() => setModalOpen(false)}
        okText={editingUser ? '수정' : '등록'}
        confirmLoading={submitting}
        destroyOnClose
        okButtonProps={{ className: 'btn-search-gradient' }}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          {!editingUser && (
            <Form.Item name="username" label="아이디" rules={[{ required: true, message: '아이디를 입력하세요.' }]}>
              <Input />
            </Form.Item>
          )}
          <Form.Item
            name="password"
            label={editingUser ? '새 비밀번호 (변경 시에만 입력)' : '비밀번호'}
            rules={editingUser ? [] : [{ required: true, message: '비밀번호를 입력하세요.' }]}
          >
            <Input.Password placeholder={editingUser ? '변경하지 않으면 비워두세요' : ''} />
          </Form.Item>
          <Form.Item name="name" label="이름" rules={[{ required: true, message: '이름을 입력하세요.' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="role" label="권한">
            <Select>
              <Option value="manager">담당자</Option>
              <Option value="admin">관리자</Option>
            </Select>
          </Form.Item>
          <Form.Item name="phone" label="연락처">
            <Input />
          </Form.Item>
          <Form.Item name="email" label="이메일">
            <Input />
          </Form.Item>
          {editingUser && (
            <Form.Item name="is_active" label="활성 상태" valuePropName="checked">
              <Switch />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  )
}
