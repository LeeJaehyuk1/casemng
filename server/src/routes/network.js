const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authMiddleware, adminOnly } = require('../middleware/auth');

// GET /api/network/orgs - 연계기관 목록
router.get('/orgs', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM network_orgs WHERE is_active = TRUE ORDER BY name`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// POST /api/network/orgs - 연계기관 등록
router.post('/orgs', authMiddleware, async (req, res) => {
  const { name, category, contact_person, phone, email, address, service_content, memo } = req.body;
  if (!name) {
    return res.status(400).json({ message: '기관명은 필수입니다.' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO network_orgs
         (name, category, contact_person, phone, email, address, service_content, memo)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [name, category, contact_person, phone, email, address, service_content, memo]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// PUT /api/network/orgs/:id - 연계기관 수정
router.put('/orgs/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { name, category, contact_person, phone, email, address, service_content, memo } = req.body;
  try {
    const result = await pool.query(
      `UPDATE network_orgs SET
         name = COALESCE($1, name),
         category = $2, contact_person = $3, phone = $4,
         email = $5, address = $6, service_content = $7,
         memo = $8, updated_at = NOW()
       WHERE id = $9
       RETURNING *`,
      [name, category, contact_person, phone, email, address, service_content, memo, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: '기관을 찾을 수 없습니다.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// DELETE /api/network/orgs/:id - 연계기관 삭제
router.delete('/orgs/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(
      `UPDATE network_orgs SET is_active = FALSE WHERE id = $1`,
      [id]
    );
    res.json({ message: '삭제되었습니다.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// GET /api/network/links?student_id=X - 학생 연계현황
router.get('/links', authMiddleware, async (req, res) => {
  const { student_id } = req.query;
  if (!student_id) {
    return res.status(400).json({ message: 'student_id가 필요합니다.' });
  }
  try {
    const result = await pool.query(
      `SELECT sl.*, no.name as org_name, no.category, no.phone as org_phone
       FROM student_org_links sl
       JOIN network_orgs no ON sl.org_id = no.id
       WHERE sl.student_id = $1
       ORDER BY sl.link_date DESC`,
      [student_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// POST /api/network/links - 학생-기관 연계 등록
router.post('/links', authMiddleware, async (req, res) => {
  const { student_id, org_id, link_date, memo } = req.body;
  if (!student_id || !org_id) {
    return res.status(400).json({ message: '학생과 기관 정보는 필수입니다.' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO student_org_links (student_id, org_id, link_date, memo)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [student_id, org_id, link_date || null, memo]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// DELETE /api/network/links/:id - 연계 삭제
router.delete('/links/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM student_org_links WHERE id = $1', [id]);
    res.json({ message: '삭제되었습니다.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router;
