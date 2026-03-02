import React, { useEffect, useState, useCallback } from 'react'
import {
  Tree, Spin, Button, Input, Tooltip, Space, Badge, Typography
} from 'antd'
import {
  FolderOutlined, FolderOpenOutlined, UserOutlined,
  CheckCircleOutlined, SearchOutlined, ReloadOutlined
} from '@ant-design/icons'
import { getTree } from '../../api'

const { Search } = Input
const { Text } = Typography

// 플랫 노드 배열 → Ant Design Tree 데이터 변환
function buildTreeData(folders, students, searchText = '') {
  const nodeMap = {}
  const roots = []

  // 폴더 노드 생성
  folders.forEach(f => {
    nodeMap[`folder_${f.id}`] = {
      key: `folder_${f.id}`,
      title: f.name,
      nodeType: f.node_type,
      folderId: f.id,
      parentId: f.parent_id,
      isLeaf: false,
      children: [],
      icon: f.node_type === 'system_completed'
        ? <CheckCircleOutlined style={{ color: '#52c41a' }} />
        : ({ expanded }) => expanded
          ? <FolderOpenOutlined style={{ color: '#faad14' }} />
          : <FolderOutlined style={{ color: '#faad14' }} />
    }
  })

  // 학생 노드 생성
  students.forEach(s => {
    const isCompleted = s.status === 'completed'
    const lowerSearch = searchText.toLowerCase()
    const matchSearch = !searchText || s.name.toLowerCase().includes(lowerSearch)
    if (!matchSearch) return

    nodeMap[`student_${s.id}`] = {
      key: `student_${s.id}`,
      title: (
        <span className={isCompleted ? 'tree-student-completed' : ''}>
          {s.name}
          {s.assigned_user_name && (
            <Text type="secondary" style={{ fontSize: 11, marginLeft: 6 }}>
              ({s.assigned_user_name})
            </Text>
          )}
        </span>
      ),
      nodeType: 'student',
      studentId: s.id,
      studentStatus: s.status,
      parentId: s.parent_id, // node_id
      isLeaf: true,
      icon: <UserOutlined style={{ color: isCompleted ? '#8c8c8c' : '#1677ff' }} />
    }
  })

  // 트리 연결 (폴더)
  folders.forEach(f => {
    const key = `folder_${f.id}`
    if (f.parent_id && nodeMap[`folder_${f.parent_id}`]) {
      nodeMap[`folder_${f.parent_id}`].children.push(nodeMap[key])
    } else if (!f.parent_id) {
      roots.push(nodeMap[key])
    }
  })

  // 학생을 폴더에 연결
  students.forEach(s => {
    const studentKey = `student_${s.id}`
    if (!nodeMap[studentKey]) return
    const folderKey = `folder_${s.parent_id}`
    if (nodeMap[folderKey]) {
      nodeMap[folderKey].children.push(nodeMap[studentKey])
    }
  })

  // 정렬: 폴더 먼저, 학생 나중
  const sortChildren = (nodes) => {
    nodes.forEach(n => {
      if (n.children?.length > 0) {
        n.children.sort((a, b) => {
          if (a.isLeaf !== b.isLeaf) return a.isLeaf ? 1 : -1
          return 0
        })
        sortChildren(n.children)
      }
    })
  }
  sortChildren(roots)

  return roots
}

export default function StudentTree({ onSelectStudent, selectedStudentId, refreshTrigger }) {
  const [treeData, setTreeData] = useState([])
  const [loading, setLoading] = useState(false)
  const [expandedKeys, setExpandedKeys] = useState([])
  const [searchText, setSearchText] = useState('')
  const [rawFolders, setRawFolders] = useState([])
  const [rawStudents, setRawStudents] = useState([])

  const loadTree = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getTree()
      setRawFolders(res.data.folders)
      setRawStudents(res.data.students)
      const data = buildTreeData(res.data.folders, res.data.students, searchText)
      setTreeData(data)
      // 기본 펼침: 진행중, 완료 루트 + 1레벨 폴더
      const defaultExpanded = res.data.folders
        .filter(f => f.level <= 1)
        .map(f => `folder_${f.id}`)
      setExpandedKeys(prev => prev.length > 0 ? prev : defaultExpanded)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [refreshTrigger])

  useEffect(() => { loadTree() }, [loadTree])

  useEffect(() => {
    const data = buildTreeData(rawFolders, rawStudents, searchText)
    setTreeData(data)
    if (searchText) {
      // 검색 시 모두 펼침
      setExpandedKeys(rawFolders.map(f => `folder_${f.id}`))
    }
  }, [searchText, rawFolders, rawStudents])

  const handleSelect = (_, { node }) => {
    if (node.nodeType === 'student') {
      onSelectStudent(node.studentId, node.studentStatus)
    }
  }

  const selectedKeys = selectedStudentId ? [`student_${selectedStudentId}`] : []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '8px 8px 4px' }}>
        <Space.Compact style={{ width: '100%' }}>
          <Search
            placeholder="학생 검색"
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            allowClear
            size="small"
            prefix={<SearchOutlined />}
          />
          <Tooltip title="새로고침">
            <Button icon={<ReloadOutlined />} size="small" onClick={loadTree} />
          </Tooltip>
        </Space.Compact>
      </div>
      {loading ? (
        <div style={{ textAlign: 'center', padding: 20 }}><Spin /></div>
      ) : (
        <Tree
          treeData={treeData}
          selectedKeys={selectedKeys}
          expandedKeys={expandedKeys}
          onExpand={setExpandedKeys}
          onSelect={handleSelect}
          showIcon
          blockNode
          style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}
        />
      )}
    </div>
  )
}
