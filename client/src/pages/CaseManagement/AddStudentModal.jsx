import React, { useEffect, useState } from 'react'
import { Modal, Form, Input, DatePicker, Select, message } from 'antd'
import { createStudent, getManagers } from '../../api'

const { Option } = Select

// 전체 폴더 목록을 DFS 순회하여 트리 표시 순서와 동일한 순서로 반환
function getFoldersInTreeOrder(folders) {
  const childrenMap = {}
  folders.forEach(f => {
    const key = f.parent_id ?? '__root__'
    if (!childrenMap[key]) childrenMap[key] = []
    childrenMap[key].push(f)
  })

  const eligibleIds = new Set(
    folders
      .filter(f => !['system_active', 'system_completed'].includes(f.node_type))
      .map(f => f.id)
  )

  const result = []
  const traverse = (parentId) => {
    const key = parentId ?? '__root__'
    ;(childrenMap[key] || []).forEach(f => {
      if (eligibleIds.has(f.id)) result.push(f)
      traverse(f.id)
    })
  }
  traverse(null)
  return result
}

export default function AddStudentModal({ open, onClose, folders, onAdded }) {
  const [form] = Form.useForm()
  const [managers, setManagers] = useState([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      form.resetFields()
      getManagers().then(res => setManagers(res.data)).catch(() => {})
    }
  }, [open])

  // 학생을 배치할 수 있는 폴더 - 트리와 동일한 DFS 순서로 정렬
  const eligibleFolders = getFoldersInTreeOrder(folders)

  const handleSubmit = async (values) => {
    setSubmitting(true)
    try {
      await createStudent({
        ...values,
        birth_date: values.birth_date?.format('YYYY-MM-DD'),
      })
      message.success('학생이 등록되었습니다.')
      onClose()
      onAdded?.()
    } catch (err) {
      message.error(err.response?.data?.message || '등록 실패')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      title="학생 등록"
      open={open}
      onOk={() => form.submit()}
      onCancel={onClose}
      okText="등록"
      confirmLoading={submitting}
      width={580}
      destroyOnClose
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item name="node_id" label="배치 폴더" rules={[{ required: true, message: '폴더를 선택하세요.' }]}>
          <Select placeholder="배치할 폴더 선택" showSearch optionFilterProp="children">
            {eligibleFolders.map(f => (
              <Option key={f.id} value={f.id}>
                {'　'.repeat(Math.max(0, f.level - 1))}{f.name}
              </Option>
            ))}
          </Select>
        </Form.Item>
        <Form.Item name="name" label="이름" rules={[{ required: true, message: '이름을 입력하세요.' }]}>
          <Input />
        </Form.Item>
        <Form.Item name="birth_date" label="생년월일">
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="school" label="학교">
          <Input />
        </Form.Item>
        <Form.Item name="grade" label="학년">
          <Input />
        </Form.Item>
        <Form.Item name="class_name" label="반">
          <Input />
        </Form.Item>
        <Form.Item name="address" label="주소">
          <Input />
        </Form.Item>
        <Form.Item name="phone" label="연락처">
          <Input />
        </Form.Item>
        <Form.Item name="guardian_name" label="보호자">
          <Input />
        </Form.Item>
        <Form.Item name="guardian_phone" label="보호자 연락처">
          <Input />
        </Form.Item>
        <Form.Item name="assigned_user_id" label="담당자">
          <Select allowClear placeholder="담당자 선택">
            {managers.map(m => <Option key={m.id} value={m.id}>{m.name}</Option>)}
          </Select>
        </Form.Item>
        <Form.Item name="memo" label="메모">
          <Input.TextArea rows={2} />
        </Form.Item>
      </Form>
    </Modal>
  )
}
