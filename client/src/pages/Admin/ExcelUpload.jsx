import React, { useState } from 'react'
import {
  Button, Table, Upload, Alert, Statistic, Row, Col, Tag, Typography, Divider, Space, Steps
} from 'antd'
import { InboxOutlined, DownloadOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons'
import * as XLSX from 'xlsx'
import { uploadExcelData } from '../../api/index'

const { Dragger } = Upload
const { Title, Text } = Typography

// 엑셀 양식 다운로드 (클라이언트 생성)
function downloadTemplate() {
  const wb = XLSX.utils.book_new()

  const sheet1Data = [
    ['이름*', '생년월일', '학교', '학년', '반', '주소', '연락처', '보호자명', '보호자연락처', '폴더명*', '담당자아이디', '메모'],
    ['홍길동', '2010-03-15', '행복초등학교', '3', '2', '서울시 강남구', '010-1234-5678', '홍부모', '010-9876-5432', '진행중폴더', 'manager1', '샘플 메모'],
  ]
  const ws1 = XLSX.utils.aoa_to_sheet(sheet1Data)
  XLSX.utils.book_append_sheet(wb, ws1, '학생정보')

  const sheet2Data = [
    ['학생이름*', '날짜*', '항목', '내용'],
    ['홍길동', '2024-03-15', '상담', '초기 상담 진행'],
  ]
  const ws2 = XLSX.utils.aoa_to_sheet(sheet2Data)
  XLSX.utils.book_append_sheet(wb, ws2, '사례이력')

  XLSX.writeFile(wb, '학생_일괄업로드_양식.xlsx')
}

// 엑셀 파일 파싱
function parseExcel(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target.result, { type: 'array', cellDates: true })

        // Sheet1 - 학생정보
        const ws1 = wb.Sheets[wb.SheetNames[0]]
        const raw1 = XLSX.utils.sheet_to_json(ws1, { header: 1, defval: '' })
        const students = []
        for (let i = 1; i < raw1.length; i++) {
          const r = raw1[i]
          if (!r.some(c => c !== '')) continue
          const birthVal = r[1]
          let birth_date = null
          if (birthVal instanceof Date) {
            birth_date = birthVal.toISOString().slice(0, 10)
          } else if (typeof birthVal === 'string' && birthVal.trim()) {
            birth_date = birthVal.trim()
          } else if (typeof birthVal === 'number') {
            // Excel serial date
            const d = XLSX.SSF.parse_date_code(birthVal)
            if (d) birth_date = `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`
          }
          students.push({
            _row: i + 1,
            name: String(r[0] || '').trim(),
            birth_date,
            school: String(r[2] || '').trim() || null,
            grade: String(r[3] || '').trim() || null,
            class_name: String(r[4] || '').trim() || null,
            address: String(r[5] || '').trim() || null,
            phone: String(r[6] || '').trim() || null,
            guardian_name: String(r[7] || '').trim() || null,
            guardian_phone: String(r[8] || '').trim() || null,
            folder_name: String(r[9] || '').trim(),
            username: String(r[10] || '').trim() || null,
            memo: String(r[11] || '').trim() || null,
          })
        }

        // Sheet2 - 사례이력
        const ws2 = wb.Sheets[wb.SheetNames[1]]
        const cases = []
        if (ws2) {
          const raw2 = XLSX.utils.sheet_to_json(ws2, { header: 1, defval: '' })
          for (let i = 1; i < raw2.length; i++) {
            const r = raw2[i]
            if (!r.some(c => c !== '')) continue
            const dateVal = r[1]
            let date = null
            if (dateVal instanceof Date) {
              date = dateVal.toISOString().slice(0, 10)
            } else if (typeof dateVal === 'string' && dateVal.trim()) {
              date = dateVal.trim()
            } else if (typeof dateVal === 'number') {
              const d = XLSX.SSF.parse_date_code(dateVal)
              if (d) date = `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`
            }
            cases.push({
              _row: i + 1,
              student_name: String(r[0] || '').trim(),
              date,
              category: String(r[2] || '').trim() || null,
              content: String(r[3] || '').trim() || null,
            })
          }
        }

        resolve({ students, cases })
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

const STUDENT_COLUMNS = [
  { title: '행', dataIndex: '_row', width: 50 },
  { title: '이름', dataIndex: 'name', width: 80 },
  { title: '생년월일', dataIndex: 'birth_date', width: 100 },
  { title: '학교', dataIndex: 'school', width: 100 },
  { title: '학년/반', render: (_, r) => r.grade || r.class_name ? `${r.grade || ''}학년 ${r.class_name || ''}반` : '-', width: 90 },
  { title: '폴더명', dataIndex: 'folder_name', width: 110 },
  { title: '담당자ID', dataIndex: 'username', width: 90 },
]

const CASE_COLUMNS = [
  { title: '행', dataIndex: '_row', width: 50 },
  { title: '학생이름', dataIndex: 'student_name', width: 90 },
  { title: '날짜', dataIndex: 'date', width: 100 },
  { title: '항목', dataIndex: 'category', width: 80 },
  { title: '내용', dataIndex: 'content', ellipsis: true },
]

const RESULT_COLUMNS = [
  { title: '행', dataIndex: 'row', width: 55 },
  { title: '이름', render: (_, r) => r.name || r.student_name || '-', width: 90 },
  {
    title: '결과', dataIndex: 'status', width: 70,
    render: v => v === 'success'
      ? <Tag color="success" icon={<CheckCircleOutlined />}>성공</Tag>
      : <Tag color="error" icon={<CloseCircleOutlined />}>오류</Tag>
  },
  { title: '오류 메시지', dataIndex: 'message', render: v => v || '-' },
]

export default function ExcelUpload() {
  const [step, setStep] = useState(0)
  const [parsed, setParsed] = useState(null)   // { students, cases }
  const [result, setResult] = useState(null)   // { studentResults, caseResults, summary }
  const [loading, setLoading] = useState(false)
  const [parseError, setParseError] = useState(null)

  const handleFile = async (file) => {
    setParseError(null)
    try {
      const data = await parseExcel(file)
      setParsed(data)
      setStep(1)
    } catch (err) {
      setParseError('파일 파싱 오류: ' + err.message)
    }
    return false // Dragger 자동 업로드 방지
  }

  const handleUpload = async () => {
    if (!parsed) return
    setLoading(true)
    try {
      const res = await uploadExcelData({
        students: parsed.students.map(({ _row, ...rest }) => rest),
        cases: parsed.cases.map(({ _row, ...rest }) => rest),
      })
      setResult(res.data)
      setStep(2)
    } catch (err) {
      setParseError('업로드 오류: ' + (err.response?.data?.message || err.message))
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setStep(0)
    setParsed(null)
    setResult(null)
    setParseError(null)
  }

  return (
    <div>
      <Title level={4} style={{ marginTop: 0 }}>엑셀 일괄 업로드</Title>
      <Text type="secondary">학생정보와 사례이력을 엑셀 파일로 한 번에 등록합니다.</Text>

      <Steps
        current={step}
        style={{ margin: '20px 0 28px' }}
        items={[
          { title: '파일 준비' },
          { title: '미리보기' },
          { title: '결과' },
        ]}
      />

      {/* Step 0: 안내 + 양식 다운로드 + 파일 업로드 */}
      {step === 0 && (
        <div>
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message="업로드 안내"
            description={
              <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                <li>Sheet1(학생정보): 이름, 폴더명은 필수입니다.</li>
                <li>Sheet2(사례이력): 학생이름, 날짜는 필수입니다.</li>
                <li>폴더명은 트리에서 일치하는 이름이어야 하며, 중복 시 오류 처리됩니다.</li>
                <li>담당자아이디가 없거나 찾을 수 없으면 미배정으로 처리됩니다.</li>
                <li>부분 성공이 허용됩니다 — 오류 행만 결과에 표시됩니다.</li>
              </ul>
            }
          />
          <Button
            icon={<DownloadOutlined />}
            onClick={downloadTemplate}
            style={{ marginBottom: 20 }}
          >
            양식 다운로드 (.xlsx)
          </Button>

          <Dragger
            accept=".xlsx,.xls"
            beforeUpload={handleFile}
            showUploadList={false}
            style={{ padding: '20px 0' }}
          >
            <p className="ant-upload-drag-icon"><InboxOutlined /></p>
            <p className="ant-upload-text">클릭하거나 파일을 이 영역에 드래그하세요</p>
            <p className="ant-upload-hint">.xlsx, .xls 파일 지원</p>
          </Dragger>

          {parseError && <Alert type="error" message={parseError} style={{ marginTop: 12 }} showIcon />}
        </div>
      )}

      {/* Step 1: 미리보기 */}
      {step === 1 && parsed && (
        <div>
          <Title level={5}>학생정보 미리보기 ({parsed.students.length}행)</Title>
          <Table
            dataSource={parsed.students}
            columns={STUDENT_COLUMNS}
            rowKey="_row"
            size="small"
            pagination={{ pageSize: 10, showSizeChanger: false }}
            scroll={{ x: 700 }}
            style={{ marginBottom: 24 }}
          />

          <Title level={5}>사례이력 미리보기 ({parsed.cases.length}행)</Title>
          <Table
            dataSource={parsed.cases}
            columns={CASE_COLUMNS}
            rowKey="_row"
            size="small"
            pagination={{ pageSize: 10, showSizeChanger: false }}
            style={{ marginBottom: 24 }}
          />

          {parseError && <Alert type="error" message={parseError} style={{ marginBottom: 12 }} showIcon />}

          <Space>
            <Button onClick={handleReset}>다시 선택</Button>
            <Button
              type="primary"
              loading={loading}
              onClick={handleUpload}
              disabled={parsed.students.length === 0 && parsed.cases.length === 0}
            >
              업로드 실행
            </Button>
          </Space>
        </div>
      )}

      {/* Step 2: 결과 */}
      {step === 2 && result && (
        <div>
          <Row gutter={32} style={{ marginBottom: 24 }}>
            <Col>
              <Statistic title="학생 성공" value={result.summary.students.success} valueStyle={{ color: '#52c41a' }} />
            </Col>
            <Col>
              <Statistic title="학생 오류" value={result.summary.students.error} valueStyle={{ color: result.summary.students.error > 0 ? '#ff4d4f' : undefined }} />
            </Col>
            <Col>
              <Statistic title="이력 성공" value={result.summary.cases.success} valueStyle={{ color: '#52c41a' }} />
            </Col>
            <Col>
              <Statistic title="이력 오류" value={result.summary.cases.error} valueStyle={{ color: result.summary.cases.error > 0 ? '#ff4d4f' : undefined }} />
            </Col>
          </Row>

          <Divider />

          <Title level={5}>학생 처리 결과</Title>
          <Table
            dataSource={result.studentResults}
            columns={RESULT_COLUMNS}
            rowKey="row"
            size="small"
            pagination={{ pageSize: 10, showSizeChanger: false }}
            rowClassName={r => r.status === 'error' ? 'row-error' : ''}
            style={{ marginBottom: 24 }}
          />

          {result.caseResults.length > 0 && (
            <>
              <Title level={5}>사례이력 처리 결과</Title>
              <Table
                dataSource={result.caseResults}
                columns={RESULT_COLUMNS}
                rowKey="row"
                size="small"
                pagination={{ pageSize: 10, showSizeChanger: false }}
                rowClassName={r => r.status === 'error' ? 'row-error' : ''}
                style={{ marginBottom: 24 }}
              />
            </>
          )}

          <Button onClick={handleReset}>새 파일 업로드</Button>
        </div>
      )}
    </div>
  )
}
