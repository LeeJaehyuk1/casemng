const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authMiddleware } = require('../middleware/auth');

// GET /api/cases?student_id=X - 사례이력 목록
router.get('/', authMiddleware, async (req, res) => {
  const { student_id } = req.query;
  if (!student_id) {
    return res.status(400).json({ message: 'student_id가 필요합니다.' });
  }

  try {
    const result = await pool.query(
      `SELECT ch.*,
              u.name as created_by_name,
              COALESCE(
                json_agg(
                  json_build_object(
                    'id', a.id,
                    'original_name', a.original_name,
                    'file_size', a.file_size,
                    'mime_type', a.mime_type,
                    'uploaded_at', a.uploaded_at
                  )
                ) FILTER (WHERE a.id IS NOT NULL),
                '[]'
              ) as attachments
       FROM case_histories ch
       LEFT JOIN users u ON ch.created_by = u.id
       LEFT JOIN attachments a ON a.case_history_id = ch.id
       WHERE ch.student_id = $1
       GROUP BY ch.id, u.name
       ORDER BY ch.case_date DESC, ch.created_at DESC`,
      [student_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// GET /api/cases/by-date?date=YYYY-MM-DD&student_name=xxx - 날짜별 사례이력 조회
router.get('/by-date', authMiddleware, async (req, res) => {
  const { date, student_name } = req.query;
  if (!date) return res.status(400).json({ message: '날짜가 필요합니다.' });

  try {
    const result = await pool.query(
      `SELECT ch.id, ch.case_date, ch.category, ch.content, ch.created_at,
              s.id as student_id, s.name as student_name, s.status as student_status,
              u.name as created_by_name,
              tn.name as folder_name
       FROM case_histories ch
       JOIN students s ON ch.student_id = s.id
       LEFT JOIN users u ON ch.created_by = u.id
       LEFT JOIN tree_nodes tn ON s.node_id = tn.id
       WHERE ch.case_date = $1
         AND ($2::text IS NULL OR s.name ILIKE '%' || $2 || '%')
       ORDER BY ch.created_at DESC`,
      [date, student_name || null]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// POST /api/cases - 사례이력 등록
router.post('/', authMiddleware, async (req, res) => {
  const { student_id, case_date, category, content } = req.body;

  if (!student_id || !case_date || !category || !content) {
    return res.status(400).json({ message: '날짜, 항목, 내용은 필수입니다.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO case_histories (student_id, case_date, category, content, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [student_id, case_date, category, content, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// PUT /api/cases/:id - 사례이력 수정
router.put('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { case_date, category, content } = req.body;

  try {
    const result = await pool.query(
      `UPDATE case_histories
       SET case_date = COALESCE($1, case_date),
           category = COALESCE($2, category),
           content = COALESCE($3, content),
           updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [case_date, category, content, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: '사례이력을 찾을 수 없습니다.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// DELETE /api/cases/:id - 사례이력 삭제
router.delete('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM case_histories WHERE id = $1', [id]);
    res.json({ message: '삭제되었습니다.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router;
