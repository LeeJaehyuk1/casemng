import React, { useEffect, useState } from 'react'
import {
  Table, Button, Modal, Form, Input, Space, message,
  Popconfirm, Tag, Typography, Tooltip, Select
} from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  PhoneOutlined, MailOutlined, ShareAltOutlined
} from '@ant-design/icons'
import { getOrgs, createOrg, updateOrg, deleteOrg } from '../../api'

const { Text } = Typography
const { TextArea } = Input
const { Option } = Select

const ORG_CATEGORIES = ['공공기관', '사회복지관', '상담기관', '의료기관', '교육기관', '법률기관', '기타']

export default function NetworkManagement() {
  const [orgs, setOrgs] = useState([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingOrg, setEditingOrg] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm()

  const loadOrgs = async () => {
    setLoading(true)
    try {
      const res = await getOrgs()
      setOrgs(res.data)
    } catch { message.error('기관 목록을 불러오지 못했습니다.') }
    finally { setLoading(false) }
  }

  useEffect(() => { loadOrgs() }, [])

  const openAdd = () => {
    setEditingOrg(null)
    form.resetFields()
    setModalOpen(true)
  }

  const openEdit = (record) => {
    setEditingOrg(record)
    form.setFieldsValue(record)
    setModalOpen(true)
  }

  const handleDelete = async (id) => {
    try {
      await deleteOrg(id)
      message.success('삭제되었습니다.')
      loadOrgs()
    } catch { message.error('삭제 실패') }
  }

  const handleSubmit = async (values) => {
    setSubmitting(true)
    try {
      if (editingOrg) {
        await updateOrg(editingOrg.id, values)
        message.success('수정되었습니다.')
      } else {
        await createOrg(values)
        message.success('등록되었습니다.')
      }
      setModalOpen(false)
      loadOrgs()
    } catch (err) {
      message.error(err.response?.data?.message || '저장 실패')
    } finally {
      setSubmitting(false)
    }
  }

  const columns = [
    {
      title: '기관명',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      align: 'center',
      onHeaderCell: () => ({ style: { textAlign: 'center' } }),
      render: (v) => <Text strong>{v}</Text>,
    },
    {
      title: '분류',
      dataIndex: 'category',
      key: 'category',
      width: 100,
      align: 'center',
      render: v => v ? <Tag color="geekblue">{v}</Tag> : '-',
      filters: ORG_CATEGORIES.map(c => ({ text: c, value: c })),
      onFilter: (val, record) => record.category === val,
    },
    {
      title: '담당자',
      dataIndex: 'contact_person',
      key: 'contact_person',
      width: 100,
      align: 'center',
    },
    {
      title: '연락처',
      dataIndex: 'phone',
      key: 'phone',
      width: 140,
      align: 'center',
      render: v => v ? <Space size={4}><PhoneOutlined style={{ color: '#888' }} />{v}</Space> : '-',
    },
    {
      title: '이메일',
      dataIndex: 'email',
      key: 'email',
      width: 180,
      align: 'center',
      render: v => v ? <Space size={4}><MailOutlined style={{ color: '#888' }} />{v}</Space> : '-',
    },
    {
      title: '서비스 내용',
      dataIndex: 'service_content',
      key: 'service_content',
      ellipsis: true,
      onHeaderCell: () => ({ style: { textAlign: 'center' } }),
    },
    {
      title: '주소',
      dataIndex: 'address',
      key: 'address',
      ellipsis: true,
      width: 180,
      onHeaderCell: () => ({ style: { textAlign: 'center' } }),
    },
    {
      title: '관리',
      key: 'action',
      width: 80,
      align: 'center',
      render: (_, record) => (
        <Space>
          <Tooltip title="수정">
            <Button icon={<EditOutlined />} size="small" onClick={() => openEdit(record)} />
          </Tooltip>
          <Popconfirm
            title="삭제하시겠습니까?"
            onConfirm={() => handleDelete(record.id)}
            okText="삭제" cancelText="취소" okType="danger"
          >
            <Tooltip title="삭제">
              <Button icon={<DeleteOutlined />} size="small" danger />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ]

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
            <ShareAltOutlined style={{ fontSize: 20, color: '#003eb3' }} />
          </div>
          <div>
            <div style={{ color: '#1a1a2e', fontWeight: 700, fontSize: 16 }}>네트워크(연계기관) 관리</div>
            <div style={{ color: '#888', fontSize: 12 }}>연계기관 정보를 등록하고 관리합니다.</div>
          </div>
        </Space>
        <div style={{ background: '#f0f4ff', borderRadius: 12, padding: '8px 20px', textAlign: 'center' }}>
          <div style={{ color: '#888', fontSize: 12 }}>총 기관 수</div>
          <div style={{ color: '#003eb3', fontWeight: 700, fontSize: 24 }}>{orgs.length}</div>
        </div>
      </div>

      {/* 툴바 */}
      <div style={{
        background: '#fff', padding: '14px 28px',
        borderBottom: '1px solid #eee',
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
      }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={openAdd}
          className="btn-search-gradient"
        >
          기관 등록
        </Button>
      </div>

      {/* 테이블 */}
      <div style={{ flex: 1, overflow: 'hidden', padding: '20px 28px' }}>
        <div style={{
          background: '#fff', borderRadius: 10, overflow: 'hidden', height: '100%',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}>
          <Table
            dataSource={orgs}
            columns={columns}
            rowKey="id"
            loading={loading}
            size="small"
            scroll={{ x: 1000, y: 'calc(100vh - 280px)' }}
            pagination={{ pageSize: 20, showTotal: total => `총 ${total}개` }}
            rowClassName={(_, i) => i % 2 === 0 ? '' : 'table-row-alt'}
          />
        </div>
      </div>

      {/* 등록/수정 모달 */}
      <Modal
        title={editingOrg ? '기관 수정' : '기관 등록'}
        open={modalOpen}
        onOk={() => form.submit()}
        onCancel={() => setModalOpen(false)}
        okText={editingOrg ? '수정' : '등록'}
        confirmLoading={submitting}
        width={600}
        destroyOnClose
        okButtonProps={{ className: 'btn-search-gradient' }}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="기관명" rules={[{ required: true, message: '기관명을 입력하세요.' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="category" label="분류">
            <Select allowClear placeholder="분류 선택">
              {ORG_CATEGORIES.map(c => <Option key={c} value={c}>{c}</Option>)}
            </Select>
          </Form.Item>
          <Space style={{ width: '100%' }} size={8}>
            <Form.Item name="contact_person" label="담당자" style={{ flex: 1 }}>
              <Input />
            </Form.Item>
            <Form.Item name="phone" label="전화번호" style={{ flex: 1 }}>
              <Input />
            </Form.Item>
            <Form.Item name="email" label="이메일" style={{ flex: 1 }}>
              <Input />
            </Form.Item>
          </Space>
          <Form.Item name="address" label="주소">
            <Input />
          </Form.Item>
          <Form.Item name="service_content" label="서비스 내용">
            <TextArea rows={3} />
          </Form.Item>
          <Form.Item name="memo" label="메모">
            <TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
