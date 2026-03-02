import React, { useState, useCallback, useEffect } from 'react'
import { Layout, Button, Typography, Tooltip, Tag } from 'antd'
import { UserAddOutlined, StarFilled } from '@ant-design/icons'
import { useLocation } from 'react-router-dom'
import StudentTree from './StudentTree'
import StudentInfo from './StudentInfo'
import CaseHistory from './CaseHistory'
import DashboardPanel from './DashboardPanel'
import AddStudentModal from './AddStudentModal'
import { getTree } from '../../api'

const { Sider: AntSider, Content } = Layout
const { Text } = Typography

const FAV_KEY = `favorites_${JSON.parse(localStorage.getItem('user') || '{}').id}`

function loadFavorites() {
  try { return JSON.parse(localStorage.getItem(FAV_KEY) || '[]') } catch { return [] }
}

export default function CaseManagement() {
  const [selectedStudentId, setSelectedStudentId] = useState(null)
  const [selectedStudentStatus, setSelectedStudentStatus] = useState('active')
  const [treeRefresh, setTreeRefresh] = useState(0)
  const [addStudentOpen, setAddStudentOpen] = useState(false)
  const [folders, setFolders] = useState([])
  const [favOpen, setFavOpen] = useState(false)
  const [favorites, setFavorites] = useState(loadFavorites)

  const refreshTree = useCallback(() => {
    setTreeRefresh(v => v + 1)
  }, [])

  const toggleFavorite = useCallback((student) => {
    if (!student) return
    setFavorites(prev => {
      const exists = prev.some(f => f.id === student.id)
      const next = exists
        ? prev.filter(f => f.id !== student.id)
        : [...prev, { id: student.id, name: student.name, status: student.status }]
      localStorage.setItem(FAV_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const isFavorited = (studentId) => favorites.some(f => f.id === studentId)

  // 로고 클릭 시 최초 화면으로 리셋
  const location = useLocation()
  useEffect(() => {
    if (location.state?._home) setSelectedStudentId(null)
  }, [location.state?._home])

  const handleSelectStudent = (studentId, status) => {
    setSelectedStudentId(studentId)
    setSelectedStudentStatus(status)
  }

  const handleTransferred = () => {
    refreshTree()
    setSelectedStudentId(null)
  }

  const openAddStudent = async () => {
    try {
      const res = await getTree()
      setFolders(res.data.folders)
    } catch {}
    setAddStudentOpen(true)
  }

  const user = JSON.parse(localStorage.getItem('user') || '{}')

  return (
    <Layout style={{ height: '100%' }}>
      {/* 좌측 트리 */}
      <AntSider
        width={240}
        style={{ background: '#fff', borderRight: '1px solid #f0f0f0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
        className="tree-sider"
      >
        <div style={{ padding: '10px 12px 4px', borderBottom: '1px solid #f0f0f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text strong style={{ fontSize: 13 }}>사례 목록</Text>
            <Button
              type="primary"
              icon={<UserAddOutlined />}
              size="small"
              onClick={openAddStudent}
            >
              학생등록
            </Button>
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <StudentTree
            onSelectStudent={handleSelectStudent}
            selectedStudentId={selectedStudentId}
            refreshTrigger={treeRefresh}
          />
        </div>
      </AntSider>

      {/* 우측 콘텐츠 */}
      <Content style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#fff' }}>
        {selectedStudentId ? (
          <>
            {/* 상단: 인적사항 */}
            <StudentInfo
              studentId={selectedStudentId}
              studentStatus={selectedStudentStatus}
              onTransferred={handleTransferred}
              onRefreshTree={refreshTree}
              isFavorited={isFavorited(selectedStudentId)}
              onToggleFavorite={toggleFavorite}
            />
            {/* 하단: 사례이력 */}
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <CaseHistory studentId={selectedStudentId} />
            </div>
          </>
        ) : (
          <DashboardPanel onSelectStudent={handleSelectStudent} />
        )}
      </Content>

      {/* 즐겨찾기 패널 */}
      <div style={{
        width: favOpen ? 180 : 28,
        minWidth: favOpen ? 180 : 28,
        transition: 'width 0.22s ease',
        borderLeft: '1px solid #f0f0f0',
        background: '#fff',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        flexShrink: 0,
      }}>
        {/* 패널 헤더 (토글) */}
        <Tooltip title={favOpen ? '' : '즐겨찾기'} placement="left">
          <div
            onClick={() => setFavOpen(v => !v)}
            style={{
              padding: favOpen ? '10px 10px' : '10px 0',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: favOpen ? 'flex-start' : 'center',
              gap: 6,
              borderBottom: '1px solid #f0f0f0',
              background: '#fafafa',
              userSelect: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            <StarFilled style={{ color: '#faad14', fontSize: 14, flexShrink: 0 }} />
            {favOpen && (
              <span style={{ fontSize: 12, fontWeight: 600 }}>
                즐겨찾기{favorites.length > 0 ? ` (${favorites.length})` : ''}
              </span>
            )}
          </div>
        </Tooltip>

        {/* 즐겨찾기 목록 */}
        {favOpen && (
          <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
            {favorites.length === 0 ? (
              <div style={{ fontSize: 11, color: '#bfbfbf', textAlign: 'center', padding: '16px 8px' }}>
                즐겨찾기가 없습니다
              </div>
            ) : (
              favorites.map(f => (
                <div
                  key={f.id}
                  onClick={() => handleSelectStudent(f.id, f.status)}
                  style={{
                    padding: '7px 10px',
                    cursor: 'pointer',
                    fontSize: 12,
                    borderBottom: '1px solid #f5f5f5',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    background: selectedStudentId === f.id ? '#e6f4ff' : 'transparent',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { if (selectedStudentId !== f.id) e.currentTarget.style.background = '#f5f5f5' }}
                  onMouseLeave={e => { if (selectedStudentId !== f.id) e.currentTarget.style.background = 'transparent' }}
                >
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {f.name}
                  </span>
                  {f.status === 'completed' && (
                    <Tag color="default" style={{ fontSize: 10, margin: 0, lineHeight: '14px', padding: '0 3px', flexShrink: 0 }}>
                      완료
                    </Tag>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <AddStudentModal
        open={addStudentOpen}
        onClose={() => setAddStudentOpen(false)}
        folders={folders}
        onAdded={() => { refreshTree(); setAddStudentOpen(false) }}
      />
    </Layout>
  )
}
