import React, { useEffect, useState, useCallback } from 'react'
import {
  Tree, Button, Input, Modal, Form, Space, message,
  Popconfirm, Typography, Tag, Alert
} from 'antd'
import {
  FolderAddOutlined, EditOutlined, DeleteOutlined,
  FolderOutlined, FolderOpenOutlined, CheckCircleOutlined, HolderOutlined
} from '@ant-design/icons'
import { getTree, createTreeNode, updateTreeNode, deleteTreeNode, reorderTree } from '../../api'

const { Text } = Typography

function buildAdminTree(folders) {
  const nodeMap = {}
  const roots = []

  folders.forEach(f => {
    nodeMap[f.id] = {
      key: `folder_${f.id}`,
      title: f.name,
      folderId: f.id,
      parentId: f.parent_id,
      nodeType: f.node_type,
      level: f.level,
      isLeaf: false,
      children: [],
    }
  })

  folders.forEach(f => {
    if (f.parent_id && nodeMap[f.parent_id]) {
      nodeMap[f.parent_id].children.push(nodeMap[f.id])
    } else if (!f.parent_id) {
      roots.push(nodeMap[f.id])
    }
  })

  return roots
}

export default function TreeAdmin() {
  const [treeData, setTreeData] = useState([])
  const [folders, setFolders] = useState([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingFolder, setEditingFolder] = useState(null) // null = 추가, object = 수정
  const [parentFolder, setParentFolder] = useState(null)  // 추가 시 부모
  const [form] = Form.useForm()

  const loadTree = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getTree()
      setFolders(res.data.folders)
      setTreeData(buildAdminTree(res.data.folders))
    } catch { message.error('트리를 불러오지 못했습니다.') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadTree() }, [loadTree])

  const openAdd = (parentNode) => {
    setEditingFolder(null)
    setParentFolder(parentNode)
    form.resetFields()
    form.setFieldsValue({ order_num: 0 })
    setModalOpen(true)
  }

  const openEdit = (node) => {
    setEditingFolder(node)
    setParentFolder(null)
    form.setFieldsValue({ name: node.title, order_num: 0 })
    setModalOpen(true)
  }

  const handleDelete = async (node) => {
    try {
      await deleteTreeNode(node.folderId)
      message.success('삭제되었습니다.')
      loadTree()
    } catch (err) {
      message.error(err.response?.data?.message || '삭제 실패')
    }
  }

  const handleSubmit = async (values) => {
    try {
      if (editingFolder) {
        await updateTreeNode(editingFolder.folderId, { name: values.name })
        message.success('수정되었습니다.')
      } else {
        await createTreeNode({
          parent_id: parentFolder?.folderId || null,
          name: values.name,
          order_num: values.order_num || 0,
        })
        message.success('폴더가 생성되었습니다.')
      }
      setModalOpen(false)
      loadTree()
    } catch (err) {
      message.error(err.response?.data?.message || '저장 실패')
    }
  }

  const handleDrop = (info) => {
    const { dragNode, node } = info
    const dropPosition = info.dropPosition - Number(info.node.pos.split('-').pop())

    if (dropPosition === 0) return
    if (dragNode.parentId !== node.parentId) {
      message.warning('같은 폴더 내에서만 순서를 변경할 수 있습니다.')
      return
    }

    const parentId = dragNode.parentId
    const siblings = folders
      .filter(f => f.parent_id === parentId)
      .sort((a, b) => a.order_num - b.order_num || a.name.localeCompare(b.name))

    const dragId = dragNode.folderId
    const dropId = node.folderId
    const withoutDrag = siblings.filter(s => s.id !== dragId)
    const dropIdx = withoutDrag.findIndex(s => s.id === dropId)
    const insertIdx = dropPosition === -1 ? dropIdx : dropIdx + 1

    const reordered = [
      ...withoutDrag.slice(0, insertIdx),
      siblings.find(s => s.id === dragId),
      ...withoutDrag.slice(insertIdx),
    ]

    const updates = reordered.map((s, i) => ({ id: s.id, order_num: i * 10 }))
    reorderTree(updates)
      .then(() => { loadTree(); message.success('순서가 변경되었습니다.') })
      .catch(() => message.error('순서 변경에 실패했습니다.'))
  }

  const titleRender = (node) => {
    const isSystem = ['system_active', 'system_completed'].includes(node.nodeType)
    const canAddChild = !isSystem && node.level < 3
    const isCompletedRoot = node.nodeType === 'system_completed'

    return (
      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
        <Space>
          {isCompletedRoot
            ? <CheckCircleOutlined style={{ color: '#52c41a' }} />
            : <FolderOutlined style={{ color: '#faad14' }} />
          }
          <Text>{node.title}</Text>
          {isSystem && <Tag color="default" style={{ fontSize: 10 }}>시스템</Tag>}
          {!isSystem && <Tag color="blue" style={{ fontSize: 10 }}>Lv.{node.level}</Tag>}
        </Space>
        {!isSystem && (
          <Space size={4}>
            {canAddChild && (
              <Button
                icon={<FolderAddOutlined />}
                size="small"
                type="text"
                title="하위 폴더 추가"
                onClick={(e) => { e.stopPropagation(); openAdd(node) }}
              />
            )}
            <Button
              icon={<EditOutlined />}
              size="small"
              type="text"
              title="이름 변경"
              onClick={(e) => { e.stopPropagation(); openEdit(node) }}
            />
            <Popconfirm
              title="폴더를 삭제하시겠습니까?"
              description="하위 학생이 없어야 삭제됩니다."
              onConfirm={() => handleDelete(node)}
              okText="삭제" cancelText="취소" okType="danger"
              onPopupClick={e => e.stopPropagation()}
            >
              <Button
                icon={<DeleteOutlined />}
                size="small"
                type="text"
                danger
                title="삭제"
                onClick={(e) => e.stopPropagation()}
              />
            </Popconfirm>
          </Space>
        )}
        {node.nodeType === 'system_active' && (
          <Button
            icon={<FolderAddOutlined />}
            size="small"
            type="text"
            title="최상위 폴더 추가"
            onClick={(e) => { e.stopPropagation(); openAdd(node) }}
          />
        )}
      </Space>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Text strong>트리 구조 관리</Text>
        <Button icon={<FolderAddOutlined />} size="small" onClick={() => openAdd(null)}>
          최상위 폴더 추가
        </Button>
      </div>

      <Alert
        message="트리 구성 안내"
        description="최대 3레벨까지 폴더를 생성할 수 있습니다. 시스템 폴더(진행중/완료)는 수정/삭제할 수 없습니다. 학생이 존재하는 폴더는 삭제할 수 없습니다. 폴더 왼쪽의 ⠿ 아이콘을 드래그하여 같은 레벨 내 순서를 변경할 수 있습니다."
        type="info"
        showIcon
        style={{ marginBottom: 12, fontSize: 12 }}
      />

      <Tree
        treeData={treeData}
        titleRender={titleRender}
        loading={loading}
        defaultExpandAll
        showLine={{ showLeafIcon: false }}
        blockNode
        draggable={{
          icon: <HolderOutlined style={{ color: '#bfbfbf' }} />,
          nodeDraggable: (node) =>
            !['system_active', 'system_completed'].includes(node.nodeType)
        }}
        allowDrop={({ dragNode, dropNode, dropPosition }) => {
          if (dropPosition === 0) return false
          return dragNode.parentId === dropNode.parentId
        }}
        onDrop={handleDrop}
      />

      <Modal
        title={editingFolder ? '폴더 이름 변경' : parentFolder ? `하위 폴더 추가 (상위: ${parentFolder.title})` : '폴더 추가'}
        open={modalOpen}
        onOk={() => form.submit()}
        onCancel={() => setModalOpen(false)}
        okText={editingFolder ? '수정' : '추가'}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="폴더 이름" rules={[{ required: true, message: '폴더 이름을 입력하세요.' }]}>
            <Input placeholder="예: A중학교, 1학년" autoFocus />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
