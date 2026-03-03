import React, { useEffect, useState } from 'react'
import {
  Table, Button, Modal, Form, Input, DatePicker, Select,
  Upload, Space, Tag, message, Popconfirm, Tooltip, Typography
} from 'antd'
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  PaperClipOutlined, DownloadOutlined, InboxOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { getCases, createCase, updateCase, deleteCase, uploadAttachments, deleteAttachment, downloadAttachment } from '../../api'

const { TextArea } = Input
const { Option } = Select
const { Text } = Typography
const { Dragger } = Upload

const CATEGORIES = ['가정방문', '상담', '전화상담', '기관연계', '지원', '회의', '교육', '모니터링', '기타']

function AttachmentList({ attachments, caseId, onDeleted }) {
  const handleDelete = async (attId) => {
    try {
      await deleteAttachment(attId)
      message.success('파일이 삭제되었습니다.')
      onDeleted()
    } catch { message.error('파일 삭제 실패') }
  }

  if (!attachments || attachments.length === 0) return <Text type="secondary">-</Text>

  const handleDownload = async (a) => {
    try {
      await downloadAttachment(a.id, a.original_name)
    } catch { message.error('다운로드 실패') }
  }

  return (
    <Space direction="vertical" size={2}>
      {attachments.map(a => (
        <Space key={a.id} size={4}>
          <PaperClipOutlined style={{ color: '#1677ff' }} />
          <span
            onClick={() => handleDownload(a)}
            style={{ fontSize: 12, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block', color: '#1677ff', cursor: 'pointer' }}
            title={a.original_name}
          >
            {a.original_name}
          </span>
          <Popconfirm title="파일을 삭제하시겠습니까?" onConfirm={() => handleDelete(a.id)} okText="삭제" cancelText="취소">
            <DeleteOutlined style={{ color: '#ff4d4f', cursor: 'pointer', fontSize: 11 }} />
          </Popconfirm>
        </Space>
      ))}
    </Space>
  )
}

export default function CaseHistory({ studentId }) {
  const [cases, setCases] = useState([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCase, setEditingCase] = useState(null)
  const [fileList, setFileList] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm()
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}')

  const canEdit = (record) =>
    currentUser.role === 'admin' || record.created_by === currentUser.id

  const loadCases = async () => {
    if (!studentId) return
    setLoading(true)
    try {
      const res = await getCases(studentId)
      setCases(res.data)
    } catch { message.error('사례이력을 불러오지 못했습니다.') }
    finally { setLoading(false) }
  }

  useEffect(() => { loadCases() }, [studentId])

  const openAdd = () => {
    setEditingCase(null)
    setFileList([])
    form.resetFields()
    form.setFieldsValue({ case_date: dayjs() })
    setModalOpen(true)
  }

  const openEdit = (record) => {
    setEditingCase(record)
    setFileList([])
    form.setFieldsValue({
      case_date: dayjs(record.case_date),
      category: record.category,
      content: record.content,
    })
    setModalOpen(true)
  }

  const handleDelete = async (id) => {
    try {
      await deleteCase(id)
      message.success('삭제되었습니다.')
      loadCases()
    } catch { message.error('삭제 실패') }
  }

  const handleSubmit = async (values) => {
    setSubmitting(true)
    try {
      const payload = {
        student_id: studentId,
        case_date: values.case_date.format('YYYY-MM-DD'),
        category: values.category,
        content: values.content,
      }

      let caseId
      if (editingCase) {
        await updateCase(editingCase.id, payload)
        caseId = editingCase.id
      } else {
        const res = await createCase(payload)
        caseId = res.data.id
      }

      // 파일 업로드
      if (fileList.length > 0) {
        const rawFiles = fileList.map(f => f.originFileObj).filter(Boolean)
        if (rawFiles.length > 0) {
          await uploadAttachments(caseId, rawFiles)
        }
      }

      message.success(editingCase ? '수정되었습니다.' : '등록되었습니다.')
      setModalOpen(false)
      loadCases()
    } catch (err) {
      message.error(err.response?.data?.message || '저장 실패')
    } finally {
      setSubmitting(false)
    }
  }

  const columns = [
    {
      title: '날짜',
      dataIndex: 'case_date',
      key: 'case_date',
      width: 100,
      align: 'center',
      render: v => dayjs(v).format('YYYY-MM-DD'),
      sorter: (a, b) => dayjs(a.case_date).unix() - dayjs(b.case_date).unix(),
      defaultSortOrder: 'descend',
    },
    {
      title: '항목',
      dataIndex: 'category',
      key: 'category',
      width: 100,
      align: 'center',
      render: v => <Tag color="blue">{v}</Tag>,
      filters: CATEGORIES.map(c => ({ text: c, value: c })),
      onFilter: (val, record) => record.category === val,
    },
    {
      title: '내용',
      dataIndex: 'content',
      key: 'content',
      onHeaderCell: () => ({ style: { textAlign: 'center' } }),
      render: (v) => <div className="case-content-cell">{v}</div>,
    },
    {
      title: '첨부',
      key: 'attachments',
      width: 180,
      align: 'center',
      render: (_, record) => (
        <AttachmentList
          attachments={record.attachments}
          caseId={record.id}
          onDeleted={loadCases}
        />
      ),
    },
    {
      title: '작성자',
      dataIndex: 'created_by_name',
      key: 'created_by_name',
      width: 80,
      align: 'center',
    },
    {
      title: '관리',
      key: 'action',
      width: 80,
      align: 'center',
      render: (_, record) => (
        <Space>
          {canEdit(record) && (
            <Tooltip title="수정">
              <Button icon={<EditOutlined />} size="small" onClick={() => openEdit(record)} />
            </Tooltip>
          )}
          {canEdit(record) && (
            <Popconfirm
              title="삭제하시겠습니까?"
              onConfirm={() => handleDelete(record.id)}
              okText="삭제" cancelText="취소" okType="danger"
            >
              <Tooltip title="삭제">
                <Button icon={<DeleteOutlined />} size="small" danger />
              </Tooltip>
            </Popconfirm>
          )}
          {!canEdit(record) && <span style={{ color: '#d9d9d9', fontSize: 12 }}>-</span>}
        </Space>
      ),
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '12px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Text strong>사례관리 이력</Text>
        <Button type="primary" icon={<PlusOutlined />} size="small" onClick={openAdd}>
          이력 추가
        </Button>
      </div>

      <Table
        dataSource={cases}
        columns={columns}
        rowKey="id"
        loading={loading}
        size="small"
        scroll={{ y: 'calc(100vh - 340px)' }}
        pagination={{ pageSize: 20, showSizeChanger: false, showTotal: total => `총 ${total}건` }}
      />

      <Modal
        title={editingCase ? '사례이력 수정' : '사례이력 추가'}
        open={modalOpen}
        onOk={() => form.submit()}
        onCancel={() => setModalOpen(false)}
        okText={editingCase ? '수정' : '등록'}
        confirmLoading={submitting}
        width={600}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Space style={{ width: '100%' }} size={8}>
            <Form.Item name="case_date" label="날짜" rules={[{ required: true, message: '날짜를 선택하세요.' }]} style={{ width: 160 }}>
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="category" label="항목" rules={[{ required: true, message: '항목을 선택하세요.' }]} style={{ flex: 1 }}>
              <Select placeholder="항목 선택" showSearch>
                {CATEGORIES.map(c => <Option key={c} value={c}>{c}</Option>)}
              </Select>
            </Form.Item>
          </Space>
          <Form.Item name="content" label="내용" rules={[{ required: true, message: '내용을 입력하세요.' }]}>
            <TextArea rows={5} placeholder="사례관리 내용을 입력하세요." />
          </Form.Item>
          <Form.Item label="첨부파일">
            <Dragger
              multiple
              fileList={fileList}
              onChange={({ fileList: list }) => setFileList(list)}
              beforeUpload={() => false}
              accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.xls,.xlsx,.hwp,.ppt,.pptx,.txt,.zip"
            >
              <p className="ant-upload-drag-icon"><InboxOutlined /></p>
              <p className="ant-upload-text">파일을 드래그하거나 클릭하여 업로드</p>
              <p className="ant-upload-hint">최대 20MB, JPG·PNG·PDF·HWP·Word·Excel 등 지원</p>
            </Dragger>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
