const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authMiddleware } = require('../middleware/auth');

// GET /api/stats/category?start=YYYY-MM-DD&end=YYYY-MM-DD
// 항목별 사례이력 건수
router.get('/category', authMiddleware, async (req, res) => {
  const { start, end } = req.query;
  if (!start || !end) {
    return res.status(400).json({ message: '시작일과 종료일이 필요합니다.' });
  }
  try {
    const result = await pool.query(
      `SELECT category, COUNT(*)::int as count
       FROM case_histories
       WHERE case_date BETWEEN $1 AND $2
       GROUP BY category
       ORDER BY count DESC`,
      [start, end]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// GET /api/stats/school?start=YYYY-MM-DD&end=YYYY-MM-DD&type=초등학교|중학교|고등학교
// 학교별 총 사례 진행 건수
router.get('/school', authMiddleware, async (req, res) => {
  const { start, end, type } = req.query;
  if (!start || !end) {
    return res.status(400).json({ message: '시작일과 종료일이 필요합니다.' });
  }
  try {
    const result = await pool.query(
      `SELECT s.school, COUNT(ch.id)::int as count
       FROM case_histories ch
       JOIN students s ON ch.student_id = s.id
       WHERE ch.case_date BETWEEN $1 AND $2
         AND s.school IS NOT NULL AND s.school != ''
         AND ($3::text IS NULL OR s.school ILIKE '%' || $3 || '%')
       GROUP BY s.school
       ORDER BY count DESC`,
      [start, end, type || null]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// GET /api/stats/student?start=YYYY-MM-DD&end=YYYY-MM-DD
// 학생별 사례이력 건수
router.get('/student', authMiddleware, async (req, res) => {
  const { start, end } = req.query;
  if (!start || !end) {
    return res.status(400).json({ message: '시작일과 종료일이 필요합니다.' });
  }
  try {
    const result = await pool.query(
      `SELECT s.name as student, COUNT(ch.id)::int as count
       FROM case_histories ch
       JOIN students s ON ch.student_id = s.id
       WHERE ch.case_date BETWEEN $1 AND $2
       GROUP BY s.id, s.name
       ORDER BY count DESC`,
      [start, end]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// GET /api/stats/manager?start=YYYY-MM-DD&end=YYYY-MM-DD
// 담당자별 사례이력 건수
router.get('/manager', authMiddleware, async (req, res) => {
  const { start, end } = req.query;
  if (!start || !end) {
    return res.status(400).json({ message: '시작일과 종료일이 필요합니다.' });
  }
  try {
    const result = await pool.query(
      `SELECT u.name as manager, COUNT(ch.id)::int as count
       FROM case_histories ch
       JOIN users u ON ch.created_by = u.id
       WHERE ch.case_date BETWEEN $1 AND $2
       GROUP BY u.id, u.name
       ORDER BY count DESC`,
      [start, end]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router;
