const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { authMiddleware, adminOnly } = require('../middleware/auth');

// GET /api/users - 사용자 목록 (관리자)
router.get('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, username, name, role, phone, email, is_active, created_at
       FROM users ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// GET /api/users/managers - 담당자 목록 (선택 드롭다운용)
router.get('/managers', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, phone, email FROM users WHERE is_active = TRUE ORDER BY name`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// POST /api/users - 사용자 등록 (관리자)
router.post('/', authMiddleware, adminOnly, async (req, res) => {
  const { username, password, name, role, phone, email } = req.body;

  if (!username || !password || !name) {
    return res.status(400).json({ message: '아이디, 비밀번호, 이름은 필수입니다.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: '비밀번호는 6자 이상이어야 합니다.' });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (username, password_hash, name, role, phone, email)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, username, name, role, phone, email, created_at`,
      [username, hash, name, role || 'manager', phone, email]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ message: '이미 사용중인 아이디입니다.' });
    }
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// PUT /api/users/:id - 사용자 수정 (관리자)
router.put('/:id', authMiddleware, adminOnly, async (req, res) => {
  const { id } = req.params;
  const { name, role, phone, email, password, is_active } = req.body;

  try {
    let passwordHash = undefined;
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ message: '비밀번호는 6자 이상이어야 합니다.' });
      }
      passwordHash = await bcrypt.hash(password, 10);
    }

    const result = await pool.query(
      `UPDATE users SET
         name = COALESCE($1, name),
         role = COALESCE($2, role),
         phone = $3,
         email = $4,
         is_active = COALESCE($5, is_active),
         password_hash = COALESCE($6, password_hash),
         updated_at = NOW()
       WHERE id = $7
       RETURNING id, username, name, role, phone, email, is_active`,
      [name, role, phone, email, is_active, passwordHash, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// DELETE /api/users/:id - 사용자 비활성화 (관리자)
router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
  const { id } = req.params;

  // 자기 자신은 삭제 불가
  if (parseInt(id) === req.user.id) {
    return res.status(400).json({ message: '자기 자신의 계정은 비활성화할 수 없습니다.' });
  }

  try {
    await pool.query(
      `UPDATE users SET is_active = FALSE, updated_at = NOW() WHERE id = $1`,
      [id]
    );
    res.json({ message: '비활성화되었습니다.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router;
