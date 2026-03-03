import React, { useEffect, useState } from 'react'
import {
  Modal, Table, Button, Form, Input, Space, Popconfirm, message, Divider
} from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons'
import { getInstructors, createInstructor, updateInstructor, deleteInstructor } from '../../api'

export default function InstructorModal({ open, onClose }) {
  const [instructors, setInstructors] = useState([])
  const [loading, setLoading] = useState(false)
  const [addForm] = Form.useForm()
  const [editForm] = Form.useForm()
  const [editingId, setEditingId] = useState(null)
  const [adding, setAdding] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await getInstructors()
      setInstructors(res.data)
    } catch { message.error('강사 목록을 불러오지 못했습니다.') }
    finally { setLoading(false) }
  }

  useEffect(() => { if (open) load() }, [open])

  const handleAdd = async (values) => {
    setSubmitting(true)
    try {
      await createInstructor(values)
      message.success('강사가 등록되었습니다.')
      addForm.resetFields()
      setAdding(false)
      load()
    } catch (err) {
      message.error(err.response?.data?.message || '등록 실패')
    } finally { setSubmitting(false) }
  }

  const handleEdit = async (values) => {
    setSubmitting(true)
    try {
      await updateInstructor(editingId, values)
      message.success('수정되었습니다.')
      setEditingId(null)
      load()
    } catch (err) {
      message.error(err.response?.data?.message || '수정 실패')
    } finally { setSubmitting(false) }
  }

  const handleDelete = async (id) => {
    try {
      await deleteInstructor(id)
      message.success('삭제되었습니다.')
      load()
    } catch { message.error('삭제 실패') }
  }

  const startEdit = (record) => {
    setEditingId(record.id)
    editForm.setFieldsValue(record)
    setAdding(false)
  }

  const columns = [
    {
      title: '이름',
      dataIndex: 'name',
      key: 'name',
      width: 110,
      render: (v, record) => {
        if (editingId === record.id) {
          return (
            <Form.Item name="name" style={{ margin: 0 }} rules={[{ required: true, message: '필수' }]}>
              <Input size="small" style={{ width: 90 }} />
            </Form.Item>
          )
        }
        return v
      },
    },
    {
      title: '연락처',
      dataIndex: 'phone',
      key: 'phone',
      width: 120,
      render: (v, record) => {
        if (editingId === record.id) {
          return (
            <Form.Item name="phone" style={{ margin: 0 }}>
              <Input size="small" style={{ width: 100 }} />
            </Form.Item>
          )
        }
        return v || '-'
      },
    },
    {
      title: '전문분야',
      dataIndex: 'specialty',
      key: 'specialty',
      render: (v, record) => {
        if (editingId === record.id) {
          return (
            <Form.Item name="specialty" style={{ margin: 0 }}>
              <Input size="small" />
            </Form.Item>
          )
        }
        return v || '-'
      },
    },
    {
      title: '이메일',
      dataIndex: 'email',
      key: 'email',
      width: 160,
      render: (v, record) => {
        if (editingId === record.id) {
          return (
            <Form.Item name="email" style={{ margin: 0 }}>
              <Input size="small" style={{ width: 140 }} />
            </Form.Item>
          )
        }
        return v || '-'
      },
    },
    {
      title: '관리',
      key: 'action',
      width: 80,
      align: 'center',
      render: (_, record) => {
        if (editingId === record.id) {
          return (
            <Space>
              <Button
                icon={<CheckOutlined />} size="small" type="primary"
                loading={submitting}
                onClick={() => editForm.submit()}
              />
              <Button
                icon={<CloseOutlined />} size="small"
                onClick={() => setEditingId(null)}
              />
            </Space>
          )
        }
        return (
          <Space>
            <Button icon={<EditOutlined />} size="small" onClick={() => startEdit(record)} />
            <Popconfirm title="삭제하시겠습니까?" onConfirm={() => handleDelete(record.id)} okText="삭제" cancelText="취소" okType="danger">
              <Button icon={<DeleteOutlined />} size="small" danger />
            </Popconfirm>
          </Space>
        )
      },
    },
  ]

  return (
    <Modal
      title="강사 관리"
      open={open}
      onCancel={onClose}
      footer={null}
      width={700}
      destroyOnClose
    >
      <Form form={editForm} onFinish={handleEdit} component={false}>
        <Table
          dataSource={instructors}
          columns={columns}
          rowKey="id"
          loading={loading}
          size="small"
          pagination={false}
          scroll={{ y: 320 }}
        />
      </Form>

      <Divider style={{ margin: '12px 0' }} />

      {adding ? (
        <Form form={addForm} layout="inline" onFinish={handleAdd}>
          <Form.Item name="name" rules={[{ required: true, message: '이름 필수' }]}>
            <Input placeholder="이름" size="small" style={{ width: 90 }} />
          </Form.Item>
          <Form.Item name="phone">
            <Input placeholder="연락처" size="small" style={{ width: 110 }} />
          </Form.Item>
          <Form.Item name="specialty">
            <Input placeholder="전문분야" size="small" style={{ width: 110 }} />
          </Form.Item>
          <Form.Item name="email">
            <Input placeholder="이메일" size="small" style={{ width: 140 }} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" size="small" loading={submitting} icon={<CheckOutlined />}>
              저장
            </Button>
          </Form.Item>
          <Form.Item>
            <Button size="small" icon={<CloseOutlined />} onClick={() => { setAdding(false); addForm.resetFields() }}>
              취소
            </Button>
          </Form.Item>
        </Form>
      ) : (
        <Button icon={<PlusOutlined />} size="small" onClick={() => { setAdding(true); setEditingId(null) }}>
          강사 등록
        </Button>
      )}
    </Modal>
  )
}
