import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import * as XLSX from 'xlsx'
import dayjs from 'dayjs'

/* ──────────────────────────────
   공통 헬퍼
────────────────────────────── */
function fmt(date) {
  return date ? dayjs(date).format('YYYY-MM-DD') : '-'
}

/* ──────────────────────────────
   PDF: HTML → html2canvas → jsPDF
   (브라우저 렌더링 사용 → 한글 완벽 지원)
────────────────────────────── */
function buildReportHTML(student, cases) {
  const info = [
    ['이름',         student.name || '-'],
    ['생년월일',      fmt(student.birth_date)],
    ['학교',         student.school || '-'],
    ['학년 / 반',    [student.grade, student.class_name].filter(Boolean).join(' / ') || '-'],
    ['연락처',       student.phone || '-'],
    ['보호자',       student.guardian_name || '-'],
    ['보호자 연락처', student.guardian_phone || '-'],
    ['주소',         student.address || '-'],
    ['담당자',       student.assigned_user_name || '-'],
    ['상태',         student.status === 'completed' ? '완료' : '진행중'],
    ['메모',         student.memo || '-'],
  ]

  const infoRows = info.map(([k, v]) => `
    <tr>
      <td style="border:1px solid #e0e0e0;padding:6px 10px;background:#f5f5f5;font-weight:600;width:130px;white-space:nowrap">${k}</td>
      <td style="border:1px solid #e0e0e0;padding:6px 10px">${v}</td>
    </tr>`).join('')

  const caseRows = cases.length === 0
    ? `<tr><td colspan="4" style="border:1px solid #e0e0e0;padding:14px;text-align:center;color:#aaa">사례이력이 없습니다.</td></tr>`
    : cases.map(c => `
    <tr>
      <td style="border:1px solid #e0e0e0;padding:6px 8px;white-space:nowrap;text-align:center">${fmt(c.case_date)}</td>
      <td style="border:1px solid #e0e0e0;padding:6px 8px;white-space:nowrap;text-align:center">${c.category}</td>
      <td style="border:1px solid #e0e0e0;padding:6px 8px;white-space:pre-wrap">${c.content}</td>
      <td style="border:1px solid #e0e0e0;padding:6px 8px;white-space:nowrap;text-align:center">${c.created_by_name || '-'}</td>
    </tr>`).join('')

  const photoTag = student.photo_path
    ? `<img src="${student.photo_path}" style="width:80px;height:100px;object-fit:cover;border:1px solid #ddd;border-radius:4px" onerror="this.style.display='none'" />`
    : `<div style="width:80px;height:100px;border:1px dashed #ddd;border-radius:4px;display:flex;align-items:center;justify-content:center;color:#bbb;font-size:11px">사진없음</div>`

  return `
  <div style="font-family:'Malgun Gothic','Apple SD Gothic Neo','Noto Sans KR',sans-serif;font-size:13px;color:#222;background:#fff;padding:36px 44px;width:820px">
    <!-- 헤더 -->
    <div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #001529;padding-bottom:12px;margin-bottom:20px">
      <div>
        <div style="font-size:10px;color:#888;margin-bottom:4px">노원교육복지센터 사례관리시스템</div>
        <h2 style="margin:0;font-size:22px;font-weight:700;color:#001529">사례관리 기록</h2>
      </div>
      <div style="text-align:right;font-size:11px;color:#888">출력일: ${dayjs().format('YYYY-MM-DD')}</div>
    </div>

    <!-- 인적사항 -->
    <div style="display:flex;gap:20px;align-items:flex-start;margin-bottom:24px">
      <div style="flex-shrink:0">${photoTag}</div>
      <div style="flex:1">
        <h3 style="font-size:13px;margin:0 0 8px;padding:5px 10px;background:#001529;color:#fff;border-radius:3px">인적사항</h3>
        <table style="width:100%;border-collapse:collapse">${infoRows}</table>
      </div>
    </div>

    <!-- 사례이력 -->
    <h3 style="font-size:13px;margin:0 0 8px;padding:5px 10px;background:#001529;color:#fff;border-radius:3px">
      사례이력 <span style="font-weight:400;font-size:11px">(총 ${cases.length}건)</span>
    </h3>
    <table style="width:100%;border-collapse:collapse">
      <thead>
        <tr style="background:#f0f0f0">
          <th style="border:1px solid #e0e0e0;padding:7px 8px;width:100px">날짜</th>
          <th style="border:1px solid #e0e0e0;padding:7px 8px;width:80px">항목</th>
          <th style="border:1px solid #e0e0e0;padding:7px 8px">내용</th>
          <th style="border:1px solid #e0e0e0;padding:7px 8px;width:75px">작성자</th>
        </tr>
      </thead>
      <tbody>${caseRows}</tbody>
    </table>
  </div>`
}

export async function exportToPDF(student, cases) {
  const container = document.createElement('div')
  Object.assign(container.style, {
    position: 'fixed', left: '-9999px', top: '0',
    background: 'white', width: '820px', zIndex: '-1',
  })
  container.innerHTML = buildReportHTML(student, cases)
  document.body.appendChild(container)

  try {
    const canvas = await html2canvas(container, {
      scale: 2, useCORS: true, allowTaint: true,
      backgroundColor: '#ffffff', logging: false,
    })

    const imgData   = canvas.toDataURL('image/jpeg', 0.95)
    const pdf       = new jsPDF('p', 'mm', 'a4')
    const pageW     = pdf.internal.pageSize.getWidth()
    const pageH     = pdf.internal.pageSize.getHeight()
    const imgH      = (canvas.height / canvas.width) * pageW
    let   heightLeft = imgH
    let   position  = 0

    pdf.addImage(imgData, 'JPEG', 0, position, pageW, imgH)
    heightLeft -= pageH

    while (heightLeft > 0) {
      position -= pageH
      pdf.addPage()
      pdf.addImage(imgData, 'JPEG', 0, position, pageW, imgH)
      heightLeft -= pageH
    }

    pdf.save(`${student.name}_사례관리기록.pdf`)
  } finally {
    document.body.removeChild(container)
  }
}

/* ──────────────────────────────
   Excel: SheetJS (한글 완벽 지원)
────────────────────────────── */
export function exportToExcel(student, cases) {
  const wb = XLSX.utils.book_new()

  // ── Sheet1: 학생정보 ──
  const infoData = [
    ['항목', '내용'],
    ['이름',          student.name || ''],
    ['생년월일',       fmt(student.birth_date)],
    ['학교',          student.school || ''],
    ['학년',          student.grade || ''],
    ['반',            student.class_name || ''],
    ['연락처',        student.phone || ''],
    ['보호자',        student.guardian_name || ''],
    ['보호자 연락처',  student.guardian_phone || ''],
    ['주소',          student.address || ''],
    ['담당자',        student.assigned_user_name || ''],
    ['상태',          student.status === 'completed' ? '완료' : '진행중'],
    ['메모',          student.memo || ''],
  ]
  const wsInfo = XLSX.utils.aoa_to_sheet(infoData)
  wsInfo['!cols'] = [{ wch: 16 }, { wch: 42 }]
  XLSX.utils.book_append_sheet(wb, wsInfo, '학생정보')

  // ── Sheet2: 사례이력 ──
  const caseData = [
    ['날짜', '항목', '내용', '작성자'],
    ...cases.map(c => [
      fmt(c.case_date),
      c.category,
      c.content,
      c.created_by_name || '',
    ]),
  ]
  const wsCase = XLSX.utils.aoa_to_sheet(caseData)
  wsCase['!cols'] = [{ wch: 12 }, { wch: 12 }, { wch: 60 }, { wch: 12 }]
  XLSX.utils.book_append_sheet(wb, wsCase, '사례이력')

  XLSX.writeFile(wb, `${student.name}_사례관리기록.xlsx`)
}
