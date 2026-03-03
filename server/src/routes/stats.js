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

module.exports = router;
