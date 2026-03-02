import React, { useEffect, useState } from 'react'
import {
  Descriptions, Button, Space, Spin, Tag, Modal, Form,
  Input, DatePicker, Select, message, Tooltip, Upload, Popconfirm
} from 'antd'
import {
  EditOutlined, SwapOutlined, RollbackOutlined, HistoryOutlined,
  CameraOutlined, UserOutlined, DeleteOutlined, StarFilled, StarOutlined,
  FilePdfOutlined, FileExcelOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'
import {
  getStudent, updateStudent, getManagers, getCases,
  transferComplete, transferRevert, getTransferLogs,
  uploadStudentPhoto, deleteStudentPhoto
} from '../../api'
import { exportToPDF, exportToExcel } from '../../utils/exportUtils'

const { Option } = Select

export default function StudentInfo({ studentId, studentStatus, onTransferred, onRefreshTree, isFavorited, onToggleFavorite }) {
  const [student, setStudent] = useState(null)
  const [loading, setLoading] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)
  const [logOpen, setLogOpen] = useState(false)
  const [managers, setManagers] = useState([])
  const [transferLogs, setTransferLogs] = useState([])
  const [photoUploading, setPhotoUploading] = useState(false)
  const [photoPreview, setPhotoPreview] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [excelLoading, setExcelLoading] = useState(false)
  const [form] = Form.useForm()

  const loadStudent = async () => {
    if (!studentId) return
    setLoading(true)
    try {
      const res = await getStudent(studentId)
      setStudent(res.data)
    } catch { message.error('학생 정보를 불러오지 못했습니다.') }
    finally { setLoading(false) }
  }

  useEffect(() => { loadStudent() }, [studentId])

  const openEdit = async () => {
    try {
      const res = await getManagers()
      setManagers(res.data)
    } catch {}
    form.setFieldsValue({
      name: student.name,
      birth_date: student.birth_date ? dayjs(student.birth_date) : null,
      school: student.school,
      grade: student.grade,
      class_name: student.class_name,
      address: student.address,
      phone: student.phone,
      guardian_name: student.guardian_name,
      guardian_phone: student.guardian_phone,
      assigned_user_id: student.assigned_user_id,
      memo: student.memo,
    })
    setEditOpen(true)
  }

  const handleEditSave = async (values) => {
    try {
      await updateStudent(studentId, {
        ...values,
        birth_date: values.birth_date?.format('YYYY-MM-DD'),
      })
      message.success('저장되었습니다.')
      setEditOpen(false)
      loadStudent()
      onRefreshTree?.()
    } catch (err) {
      message.error(err.response?.data?.message || '저장 실패')
    }
  }

  const confirmTransfer = async () => {
    try {
      if (studentStatus === 'active') {
        await transferComplete(studentId)
        message.success('완료 처리되었습니다.')
      } else {
        await transferRevert(studentId)
        message.success('원복 처리되었습니다.')
      }
      setTransferOpen(false)
      onTransferred?.()
    } catch (err) {
      message.error(err.response?.data?.message || '처리 실패')
    }
  }

  const openLogs = async () => {
    try {
      const res = await getTransferLogs(studentId)
      setTransferLogs(res.data)
      setLogOpen(true)
    } catch { message.error('이관이력을 불러오지 못했습니다.') }
  }

  const fetchCasesForExport = async () => {
    const res = await getCases(studentId)
    return res.data
  }

  const handleExportPDF = async () => {
    setPdfLoading(true)
    try {
      const cases = await fetchCasesForExport()
      await exportToPDF(student, cases)
    } catch {
      message.error('PDF 생성에 실패했습니다.')
    } finally {
      setPdfLoading(false)
    }
  }

  const handleExportExcel = async () => {
    setExcelLoading(true)
    try {
      const cases = await fetchCasesForExport()
      exportToExcel(student, cases)
    } catch {
      message.error('Excel 생성에 실패했습니다.')
    } finally {
      setExcelLoading(false)
    }
  }

  const handlePhotoUpload = async (file) => {
    const isImage = file.type.startsWith('image/')
    if (!isImage) {
      message.error('이미지 파일만 업로드할 수 있습니다.')
      return false
    }
    const isUnder5M = file.size / 1024 / 1024 < 5
    if (!isUnder5M) {
      message.error('사진은 5MB 이하만 가능합니다.')
      return false
    }
    setPhotoUploading(true)
    try {
      await uploadStudentPhoto(studentId, file)
      await loadStudent()
      message.success('사진이 등록되었습니다.')
    } catch {
      message.error('사진 업로드에 실패했습니다.')
    } finally {
      setPhotoUploading(false)
    }
    return false // antd Upload 기본 동작 방지
  }

  const handlePhotoDelete = async () => {
    try {
      await deleteStudentPhoto(studentId)
      await loadStudent()
      message.success('사진이 삭제되었습니다.')
    } catch {
      message.error('사진 삭제에 실패했습니다.')
    }
  }

  if (loading) return <div style={{ textAlign: 'center', padding: 20 }}><Spin /></div>
  if (!student) return null

  const isCompleted = student.status === 'completed'

  return (
    <div className="student-info-panel" style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', background: '#fafafa' }}>
      {/* 상단: 이름 + 태그 + 버튼 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <Space>
          <span style={{ fontSize: 16, fontWeight: 700 }}>{student.name}</span>
          <Tag color={isCompleted ? 'default' : 'blue'}>
            {isCompleted ? '완료' : '진행중'}
          </Tag>
          {student.assigned_user_name && (
            <Tag color="geekblue">담당: {student.assigned_user_name}</Tag>
          )}
        </Space>
        <Space>
          <Tooltip title={isFavorited ? '즐겨찾기 해제' : '즐겨찾기 추가'}>
            <Button
              icon={isFavorited
                ? <StarFilled style={{ color: '#faad14' }} />
                : <StarOutlined style={{ color: '#bfbfbf' }} />
              }
              size="small"
              type="text"
              onClick={() => onToggleFavorite?.(student)}
            />
          </Tooltip>
          <Tooltip title="이관이력">
            <Button icon={<HistoryOutlined />} size="small" onClick={openLogs} />
          </Tooltip>
          <Button icon={<EditOutlined />} size="small" onClick={openEdit}>수정</Button>
          <Tooltip title="PDF 다운로드">
            <Button
              icon={<FilePdfOutlined />}
              size="small"
              loading={pdfLoading}
              onClick={handleExportPDF}
              style={{ color: '#ff4d4f', borderColor: '#ff4d4f' }}
            >
              PDF
            </Button>
          </Tooltip>
          <Tooltip title="Excel 다운로드">
            <Button
              icon={<FileExcelOutlined />}
              size="small"
              loading={excelLoading}
              onClick={handleExportExcel}
              style={{ color: '#52c41a', borderColor: '#52c41a' }}
            >
              Excel
            </Button>
          </Tooltip>
          {isCompleted ? (
            <Button icon={<RollbackOutlined />} size="small" danger onClick={() => setTransferOpen(true)}>
              원복
            </Button>
          ) : (
            <Button icon={<SwapOutlined />} size="small" type="primary" onClick={() => setTransferOpen(true)}>
              이관
            </Button>
          )}
        </Space>
      </div>

      {/* 사진 + 인적사항 */}
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        {/* 학생 사진 */}
        <div style={{ flexShrink: 0 }}>
          <Upload
            showUploadList={false}
            beforeUpload={handlePhotoUpload}
            accept="image/jpeg,image/png,image/gif,image/webp"
            disabled={photoUploading}
          >
            <Tooltip title="클릭하여 사진 등록/변경">
              <div style={{
                width: 90, height: 110,
                border: '1px dashed #d9d9d9', borderRadius: 6,
                overflow: 'hidden', cursor: 'pointer', position: 'relative',
                background: '#f5f5f5',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
              }}>
                {photoUploading ? (
                  <Spin size="small" />
                ) : student.photo_path ? (
                  <img
                    src={student.photo_path}
                    alt="학생사진"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onClick={e => { e.stopPropagation(); setPhotoPreview(true) }}
                  />
                ) : (
                  <>
                    <UserOutlined style={{ fontSize: 34, color: '#bfbfbf', marginBottom: 4 }} />
                    <span style={{ fontSize: 10, color: '#bfbfbf' }}>사진 없음</span>
                  </>
                )}
                {!photoUploading && (
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    background: 'rgba(0,0,0,0.45)', color: '#fff',
                    fontSize: 10, textAlign: 'center', padding: '3px 0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3,
                  }}>
                    <CameraOutlined />
                    <span>{student.photo_path ? '변경' : '등록'}</span>
                  </div>
                )}
              </div>
            </Tooltip>
          </Upload>
          {student.photo_path && (
            <Popconfirm
              title="사진을 삭제하시겠습니까?"
              onConfirm={handlePhotoDelete}
              okText="삭제" cancelText="취소" okType="danger"
            >
              <Button
                size="small" danger type="text"
                icon={<DeleteOutlined />}
                style={{ width: '100%', marginTop: 2, fontSize: 11 }}
              >
                삭제
              </Button>
            </Popconfirm>
          )}
        </div>

        {/* 인적사항 */}
        <Descriptions size="small" column={3} style={{ flex: 1 }}>
          <Descriptions.Item label="생년월일">
            {student.birth_date ? dayjs(student.birth_date).format('YYYY-MM-DD') : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="학교">{student.school || '-'}</Descriptions.Item>
          <Descriptions.Item label="학년/반">
            {[student.grade, student.class_name].filter(Boolean).join(' / ') || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="연락처">{student.phone || '-'}</Descriptions.Item>
          <Descriptions.Item label="보호자">{student.guardian_name || '-'}</Descriptions.Item>
          <Descriptions.Item label="보호자연락처">{student.guardian_phone || '-'}</Descriptions.Item>
          <Descriptions.Item label="주소" span={3}>{student.address || '-'}</Descriptions.Item>
          {student.memo && (
            <Descriptions.Item label="메모" span={3}>{student.memo}</Descriptions.Item>
          )}
        </Descriptions>
      </div>

      {/* 사진 크게 보기 모달 */}
      <Modal
        open={photoPreview}
        footer={null}
        onCancel={() => setPhotoPreview(false)}
        centered
        width="auto"
        styles={{ body: { padding: 0, lineHeight: 0 } }}
      >
        <img
          src={student.photo_path}
          alt="학생사진"
          style={{ maxWidth: '80vw', maxHeight: '80vh', display: 'block' }}
        />
      </Modal>

      {/* 이관/원복 확인 모달 */}
      <Modal
        title={isCompleted ? '원복 확인' : '이관 확인'}
        open={transferOpen}
        onOk={confirmTransfer}
        onCancel={() => setTransferOpen(false)}
        okText={isCompleted ? '원복' : '이관'}
        okButtonProps={{ danger: isCompleted }}
      >
        <p>
          {isCompleted
            ? `[${student.name}] 학생을 진행중으로 원복하시겠습니까?`
            : `[${student.name}] 학생을 완료 처리하시겠습니까?`
          }
        </p>
      </Modal>

      {/* 학생 수정 모달 */}
      <Modal
        title="학생 정보 수정"
        open={editOpen}
        onOk={() => form.submit()}
        onCancel={() => setEditOpen(false)}
        width={600}
        okText="저장"
      >
        <Form form={form} layout="vertical" onFinish={handleEditSave}>
          <Form.Item name="name" label="이름" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="birth_date" label="생년월일">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Space style={{ width: '100%' }} size={8}>
            <Form.Item name="school" label="학교" style={{ flex: 1 }}>
              <Input />
            </Form.Item>
            <Form.Item name="grade" label="학년" style={{ width: 80 }}>
              <Input />
            </Form.Item>
            <Form.Item name="class_name" label="반" style={{ width: 80 }}>
              <Input />
            </Form.Item>
          </Space>
          <Form.Item name="address" label="주소">
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="연락처">
            <Input />
          </Form.Item>
          <Space style={{ width: '100%' }} size={8}>
            <Form.Item name="guardian_name" label="보호자" style={{ flex: 1 }}>
              <Input />
            </Form.Item>
            <Form.Item name="guardian_phone" label="보호자 연락처" style={{ flex: 1 }}>
              <Input />
            </Form.Item>
          </Space>
          <Form.Item name="assigned_user_id" label="담당자">
            <Select allowClear placeholder="담당자 선택">
              {managers.map(m => (
                <Option key={m.id} value={m.id}>{m.name}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="memo" label="메모">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 이관이력 모달 */}
      <Modal
        title="이관이력"
        open={logOpen}
        onCancel={() => setLogOpen(false)}
        footer={null}
        width={600}
      >
        {transferLogs.length === 0 ? (
          <p style={{ color: '#8c8c8c', textAlign: 'center', padding: 20 }}>이관이력이 없습니다.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f0f0f0' }}>
                {['유형', '이전위치', '이동위치', '처리자', '처리일시'].map(h => (
                  <th key={h} style={{ padding: '6px 8px', textAlign: 'left', borderBottom: '1px solid #d9d9d9' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {transferLogs.map(log => (
                <tr key={log.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '6px 8px' }}>
                    <Tag color={log.transfer_type === 'complete' ? 'blue' : 'orange'}>
                      {log.transfer_type === 'complete' ? '이관' : '원복'}
                    </Tag>
                  </td>
                  <td style={{ padding: '6px 8px' }}>{log.from_node_name || '-'}</td>
                  <td style={{ padding: '6px 8px' }}>{log.to_node_name || '-'}</td>
                  <td style={{ padding: '6px 8px' }}>{log.transferred_by_name || '-'}</td>
                  <td style={{ padding: '6px 8px' }}>
                    {dayjs(log.transferred_at).format('YYYY-MM-DD HH:mm')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Modal>
    </div>
  )
}
