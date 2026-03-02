const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const pool = require('../db');
const { authMiddleware, adminOnly } = require('../middleware/auth');
const { upload, uploadDir } = require('../middleware/upload');

// GET /api/students/:id - 학생 상세 조회
router.get('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT s.*,
              u.name as assigned_user_name,
              u.phone as assigned_user_phone,
              t.name as node_name
       FROM students s
       LEFT JOIN users u ON s.assigned_user_id = u.id
       LEFT JOIN tree_nodes t ON s.node_id = t.id
       WHERE s.id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: '학생을 찾을 수 없습니다.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// POST /api/students - 학생 등록
router.post('/', authMiddleware, async (req, res) => {
  const {
    node_id, name, birth_date, school, grade, class_name,
    address, phone, guardian_name, guardian_phone,
    assigned_user_id, memo
  } = req.body;

  if (!name || !node_id) {
    return res.status(400).json({ message: '학생 이름과 배치 폴더는 필수입니다.' });
  }

  try {
    // 폴더 레벨 확인 - system_completed에 직접 추가 불가
    const nodeCheck = await pool.query(
      'SELECT node_type FROM tree_nodes WHERE id = $1',
      [node_id]
    );
    if (nodeCheck.rows.length === 0) {
      return res.status(404).json({ message: '선택한 폴더를 찾을 수 없습니다.' });
    }
    if (nodeCheck.rows[0].node_type === 'system_completed') {
      return res.status(400).json({ message: '완료 폴더에는 직접 학생을 추가할 수 없습니다.' });
    }

    const result = await pool.query(
      `INSERT INTO students
         (node_id, name, birth_date, school, grade, class_name,
          address, phone, guardian_name, guardian_phone,
          assigned_user_id, memo, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'active')
       RETURNING *`,
      [node_id, name, birth_date || null, school, grade, class_name,
       address, phone, guardian_name, guardian_phone,
       assigned_user_id || null, memo]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// PUT /api/students/:id - 학생 정보 수정
router.put('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const {
    node_id, name, birth_date, school, grade, class_name,
    address, phone, guardian_name, guardian_phone,
    assigned_user_id, memo
  } = req.body;

  try {
    const result = await pool.query(
      `UPDATE students SET
         node_id = COALESCE($1, node_id),
         name = COALESCE($2, name),
         birth_date = $3,
         school = $4,
         grade = $5,
         class_name = $6,
         address = $7,
         phone = $8,
         guardian_name = $9,
         guardian_phone = $10,
         assigned_user_id = $11,
         memo = $12,
         updated_at = NOW()
       WHERE id = $13
       RETURNING *`,
      [node_id, name, birth_date || null, school, grade, class_name,
       address, phone, guardian_name, guardian_phone,
       assigned_user_id || null, memo, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: '학생을 찾을 수 없습니다.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// POST /api/students/:id/photo - 학생 사진 업로드
router.post('/:id/photo', authMiddleware, upload.single('photo'), async (req, res) => {
  const { id } = req.params;
  if (!req.file) {
    return res.status(400).json({ message: '파일이 없습니다.' });
  }
  try {
    // 기존 사진 파일 삭제
    const existing = await pool.query('SELECT photo_path FROM students WHERE id = $1', [id]);
    if (existing.rows[0]?.photo_path) {
      const oldFile = path.join(uploadDir, path.basename(existing.rows[0].photo_path));
      if (fs.existsSync(oldFile)) fs.unlinkSync(oldFile);
    }
    const photoPath = `/uploads/${req.file.filename}`;
    await pool.query(
      'UPDATE students SET photo_path = $1, updated_at = NOW() WHERE id = $2',
      [photoPath, id]
    );
    res.json({ photo_path: photoPath });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// DELETE /api/students/:id/photo - 학생 사진 삭제
router.delete('/:id/photo', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const existing = await pool.query('SELECT photo_path FROM students WHERE id = $1', [id]);
    if (existing.rows[0]?.photo_path) {
      const oldFile = path.join(uploadDir, path.basename(existing.rows[0].photo_path));
      if (fs.existsSync(oldFile)) fs.unlinkSync(oldFile);
    }
    await pool.query('UPDATE students SET photo_path = NULL, updated_at = NOW() WHERE id = $1', [id]);
    res.json({ message: '사진이 삭제되었습니다.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// DELETE /api/students/:id - 학생 삭제 (관리자)
router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM students WHERE id = $1', [id]);
    res.json({ message: '삭제되었습니다.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router;
