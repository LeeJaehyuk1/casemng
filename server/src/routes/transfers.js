const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authMiddleware } = require('../middleware/auth');

// POST /api/transfers/complete - 완료 이관
router.post('/complete', authMiddleware, async (req, res) => {
  const { student_id, memo } = req.body;

  if (!student_id) {
    return res.status(400).json({ message: 'student_id가 필요합니다.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 현재 학생 상태 확인
    const studentResult = await client.query(
      'SELECT * FROM students WHERE id = $1',
      [student_id]
    );
    if (studentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: '학생을 찾을 수 없습니다.' });
    }

    const student = studentResult.rows[0];
    if (student.status === 'completed') {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: '이미 완료 처리된 학생입니다.' });
    }

    // 완료 폴더 ID 조회
    const completedFolderResult = await client.query(
      `SELECT id FROM tree_nodes WHERE node_type = 'system_completed' LIMIT 1`
    );
    if (completedFolderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(500).json({ message: '완료 폴더를 찾을 수 없습니다.' });
    }

    const completedNodeId = completedFolderResult.rows[0].id;
    const fromNodeId = student.node_id;

    // 학생 상태 업데이트 (이전 node_id 저장)
    await client.query(
      `UPDATE students
       SET status = 'completed',
           prev_node_id = node_id,
           node_id = $1,
           updated_at = NOW()
       WHERE id = $2`,
      [completedNodeId, student_id]
    );

    // 이관 이력 기록
    await client.query(
      `INSERT INTO transfer_logs
         (student_id, from_node_id, to_node_id, transfer_type, transferred_by, memo)
       VALUES ($1, $2, $3, 'complete', $4, $5)`,
      [student_id, fromNodeId, completedNodeId, req.user.id, memo || null]
    );

    await client.query('COMMIT');
    res.json({ message: '완료 처리되었습니다.' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  } finally {
    client.release();
  }
});

// POST /api/transfers/revert - 원복 (완료 → 진행중)
router.post('/revert', authMiddleware, async (req, res) => {
  const { student_id, memo } = req.body;

  if (!student_id) {
    return res.status(400).json({ message: 'student_id가 필요합니다.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 현재 학생 상태 확인
    const studentResult = await client.query(
      'SELECT * FROM students WHERE id = $1',
      [student_id]
    );
    if (studentResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: '학생을 찾을 수 없습니다.' });
    }

    const student = studentResult.rows[0];
    if (student.status !== 'completed') {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: '진행중 상태의 학생은 원복할 수 없습니다.' });
    }

    if (!student.prev_node_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: '원복할 이전 위치가 없습니다.' });
    }

    // 이전 노드가 존재하는지 확인
    const prevNodeResult = await client.query(
      'SELECT id FROM tree_nodes WHERE id = $1',
      [student.prev_node_id]
    );

    let targetNodeId = student.prev_node_id;
    if (prevNodeResult.rows.length === 0) {
      // 이전 노드가 삭제된 경우 진행중 루트로
      const activeResult = await client.query(
        `SELECT id FROM tree_nodes WHERE node_type = 'system_active' LIMIT 1`
      );
      targetNodeId = activeResult.rows[0].id;
    }

    const fromNodeId = student.node_id;

    // 학생 상태 원복
    await client.query(
      `UPDATE students
       SET status = 'active',
           node_id = $1,
           prev_node_id = NULL,
           updated_at = NOW()
       WHERE id = $2`,
      [targetNodeId, student_id]
    );

    // 원복 이력 기록
    await client.query(
      `INSERT INTO transfer_logs
         (student_id, from_node_id, to_node_id, transfer_type, transferred_by, memo)
       VALUES ($1, $2, $3, 'revert', $4, $5)`,
      [student_id, fromNodeId, targetNodeId, req.user.id, memo || null]
    );

    await client.query('COMMIT');
    res.json({ message: '원복 처리되었습니다.' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  } finally {
    client.release();
  }
});

// GET /api/transfers/:student_id - 이관 이력 조회
router.get('/:student_id', authMiddleware, async (req, res) => {
  const { student_id } = req.params;
  try {
    const result = await pool.query(
      `SELECT tl.*,
              fn.name as from_node_name,
              tn.name as to_node_name,
              u.name as transferred_by_name
       FROM transfer_logs tl
       LEFT JOIN tree_nodes fn ON tl.from_node_id = fn.id
       LEFT JOIN tree_nodes tn ON tl.to_node_id = tn.id
       LEFT JOIN users u ON tl.transferred_by = u.id
       WHERE tl.student_id = $1
       ORDER BY tl.transferred_at DESC`,
      [student_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router;
