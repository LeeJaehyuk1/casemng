const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authMiddleware, adminOnly } = require('../middleware/auth');

// GET /api/tree - 전체 트리 노드 + 학생 조회
router.get('/', authMiddleware, async (req, res) => {
  try {
    // 폴더 노드
    const folderResult = await pool.query(
      `SELECT id, parent_id, name, node_type, level, order_num
       FROM tree_nodes
       ORDER BY level, order_num, name`
    );

    // 학생 노드 (트리에서 표시용)
    const studentResult = await pool.query(
      `SELECT s.id, s.node_id as parent_id, s.name, s.status,
              u.name as assigned_user_name
       FROM students s
       LEFT JOIN users u ON s.assigned_user_id = u.id
       ORDER BY s.name`
    );

    res.json({
      folders: folderResult.rows,
      students: studentResult.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// POST /api/tree - 새 폴더 노드 생성 (관리자)
router.post('/', authMiddleware, adminOnly, async (req, res) => {
  const { parent_id, name, order_num } = req.body;

  if (!name || name.trim() === '') {
    return res.status(400).json({ message: '폴더 이름을 입력하세요.' });
  }

  try {
    // 부모 노드 레벨 확인
    let parentLevel = -1;
    if (parent_id) {
      const parentResult = await pool.query(
        'SELECT level, node_type FROM tree_nodes WHERE id = $1',
        [parent_id]
      );
      if (parentResult.rows.length === 0) {
        return res.status(404).json({ message: '부모 노드를 찾을 수 없습니다.' });
      }
      const parent = parentResult.rows[0];

      // 완료 폴더 하위에는 관리자 폴더 생성 불가
      if (parent.node_type === 'system_completed') {
        return res.status(400).json({ message: '완료 폴더에는 하위 폴더를 생성할 수 없습니다.' });
      }
      parentLevel = parent.level;
    }

    const newLevel = parentLevel + 1;

    // 최대 3레벨 제한
    if (newLevel > 3) {
      return res.status(400).json({ message: '최대 3레벨까지만 생성할 수 있습니다.' });
    }

    const result = await pool.query(
      `INSERT INTO tree_nodes (parent_id, name, node_type, level, order_num)
       VALUES ($1, $2, 'folder', $3, $4)
       RETURNING *`,
      [parent_id || null, name.trim(), newLevel, order_num || 0]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// PUT /api/tree/reorder - 노드 순서 일괄 변경 (관리자)
router.put('/reorder', authMiddleware, adminOnly, async (req, res) => {
  const { updates } = req.body; // [{id, order_num}, ...]
  if (!Array.isArray(updates) || updates.length === 0) {
    return res.status(400).json({ message: '변경 데이터가 없습니다.' });
  }
  try {
    await pool.query('BEGIN');
    for (const { id, order_num } of updates) {
      await pool.query(
        'UPDATE tree_nodes SET order_num = $1 WHERE id = $2 AND node_type = $3',
        [order_num, id, 'folder']
      );
    }
    await pool.query('COMMIT');
    res.json({ message: '순서가 변경되었습니다.' });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// PUT /api/tree/:id - 노드 수정 (관리자)
router.put('/:id', authMiddleware, adminOnly, async (req, res) => {
  const { id } = req.params;
  const { name, order_num } = req.body;

  try {
    // 시스템 노드는 수정 불가
    const check = await pool.query(
      `SELECT node_type FROM tree_nodes WHERE id = $1`,
      [id]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ message: '노드를 찾을 수 없습니다.' });
    }
    if (['system_active', 'system_completed'].includes(check.rows[0].node_type)) {
      return res.status(400).json({ message: '시스템 폴더는 수정할 수 없습니다.' });
    }

    const result = await pool.query(
      `UPDATE tree_nodes
       SET name = COALESCE($1, name),
           order_num = COALESCE($2, order_num)
       WHERE id = $3
       RETURNING *`,
      [name?.trim(), order_num, id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// DELETE /api/tree/:id - 노드 삭제 (관리자)
router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
  const { id } = req.params;

  try {
    // 시스템 노드는 삭제 불가
    const check = await pool.query(
      `SELECT node_type FROM tree_nodes WHERE id = $1`,
      [id]
    );
    if (check.rows.length === 0) {
      return res.status(404).json({ message: '노드를 찾을 수 없습니다.' });
    }
    if (['system_active', 'system_completed'].includes(check.rows[0].node_type)) {
      return res.status(400).json({ message: '시스템 폴더는 삭제할 수 없습니다.' });
    }

    // 하위 학생 존재 여부 확인
    const studentCheck = await pool.query(
      `SELECT COUNT(*) FROM students WHERE node_id IN (
         SELECT id FROM tree_nodes WHERE id = $1 OR parent_id = $1
       )`,
      [id]
    );
    if (parseInt(studentCheck.rows[0].count) > 0) {
      return res.status(400).json({ message: '하위에 학생이 존재하여 삭제할 수 없습니다.' });
    }

    await pool.query('DELETE FROM tree_nodes WHERE id = $1', [id]);
    res.json({ message: '삭제되었습니다.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router;
