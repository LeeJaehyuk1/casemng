const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authMiddleware } = require('../middleware/auth');

// ─── 강사 ───────────────────────────────────────────────────────────────────
// GET /api/programs/instructors
router.get('/instructors', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM program_instructors ORDER BY name`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// POST /api/programs/instructors
router.post('/instructors', authMiddleware, async (req, res) => {
  const { name, phone, email, specialty, note } = req.body;
  if (!name) return res.status(400).json({ message: '강사명은 필수입니다.' });
  try {
    const result = await pool.query(
      `INSERT INTO program_instructors (name, phone, email, specialty, note)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [name, phone, email, specialty, note]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// PUT /api/programs/instructors/:id
router.put('/instructors/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { name, phone, email, specialty, note } = req.body;
  try {
    const result = await pool.query(
      `UPDATE program_instructors SET name=$1, phone=$2, email=$3, specialty=$4, note=$5
       WHERE id=$6 RETURNING *`,
      [name, phone, email, specialty, note, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: '강사를 찾을 수 없습니다.' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// DELETE /api/programs/instructors/:id
router.delete('/instructors/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM program_instructors WHERE id=$1', [id]);
    res.json({ message: '삭제되었습니다.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// ─── 프로그램 목록/등록 ──────────────────────────────────────────────────────
// GET /api/programs
router.get('/', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*,
         COALESCE(sc.student_count, 0) AS student_count,
         COALESCE(sc.session_count, 0) AS session_count,
         COALESCE(b.total_budget, 0)   AS total_budget
       FROM programs p
       LEFT JOIN (
         SELECT pp.id AS program_id,
           COUNT(DISTINCT ps.id) AS student_count,
           COUNT(DISTINCT ses.id) AS session_count
         FROM programs pp
         LEFT JOIN program_students ps  ON ps.program_id  = pp.id
         LEFT JOIN program_sessions ses ON ses.program_id = pp.id
         GROUP BY pp.id
       ) sc ON sc.program_id = p.id
       LEFT JOIN (
         SELECT program_id, SUM(amount) AS total_budget
         FROM program_budgets GROUP BY program_id
       ) b ON b.program_id = p.id
       ORDER BY p.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// POST /api/programs
router.post('/', authMiddleware, async (req, res) => {
  const { name, category, start_date, end_date, location, status, description, budgets } = req.body;
  if (!name) return res.status(400).json({ message: '프로그램명은 필수입니다.' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const progResult = await client.query(
      `INSERT INTO programs (name, category, start_date, end_date, location, status, description, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [name, category, start_date || null, end_date || null, location, status || '진행중', description, req.user.id]
    );
    const program = progResult.rows[0];
    if (Array.isArray(budgets) && budgets.length > 0) {
      for (const b of budgets) {
        await client.query(
          `INSERT INTO program_budgets (program_id, item_name, amount, note) VALUES ($1,$2,$3,$4)`,
          [program.id, b.item_name, b.amount || 0, b.note]
        );
      }
    }
    await client.query('COMMIT');
    res.status(201).json(program);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  } finally {
    client.release();
  }
});

// ─── 프로그램 상세/수정/삭제 ─────────────────────────────────────────────────
// GET /api/programs/:id
router.get('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const progResult = await pool.query('SELECT * FROM programs WHERE id=$1', [id]);
    if (progResult.rows.length === 0) return res.status(404).json({ message: '프로그램을 찾을 수 없습니다.' });
    const budgetResult = await pool.query(
      'SELECT * FROM program_budgets WHERE program_id=$1 ORDER BY id', [id]
    );
    res.json({ ...progResult.rows[0], budgets: budgetResult.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// PUT /api/programs/:id
router.put('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { name, category, start_date, end_date, location, status, description, budgets } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `UPDATE programs SET name=$1, category=$2, start_date=$3, end_date=$4,
         location=$5, status=$6, description=$7, updated_at=NOW()
       WHERE id=$8 RETURNING *`,
      [name, category, start_date || null, end_date || null, location, status, description, id]
    );
    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: '프로그램을 찾을 수 없습니다.' });
    }
    await client.query('DELETE FROM program_budgets WHERE program_id=$1', [id]);
    if (Array.isArray(budgets) && budgets.length > 0) {
      for (const b of budgets) {
        await client.query(
          `INSERT INTO program_budgets (program_id, item_name, amount, note) VALUES ($1,$2,$3,$4)`,
          [id, b.item_name, b.amount || 0, b.note]
        );
      }
    }
    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  } finally {
    client.release();
  }
});

// DELETE /api/programs/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM programs WHERE id=$1', [id]);
    res.json({ message: '삭제되었습니다.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// ─── 참여학생 ────────────────────────────────────────────────────────────────
// GET /api/programs/:id/students
router.get('/:id/students', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT ps.id, ps.student_id, ps.enrolled_at,
         s.name, s.school, s.grade, s.class_name,
         COUNT(pa.id) FILTER (WHERE pa.attended = TRUE) AS attended_count,
         COUNT(pa.id) AS total_sessions
       FROM program_students ps
       JOIN students s ON s.id = ps.student_id
       LEFT JOIN program_sessions ses ON ses.program_id = $1
       LEFT JOIN program_attendance pa ON pa.session_id = ses.id AND pa.student_id = ps.student_id
       WHERE ps.program_id = $1
       GROUP BY ps.id, ps.student_id, ps.enrolled_at, s.name, s.school, s.grade, s.class_name
       ORDER BY s.name`,
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// POST /api/programs/:id/students
router.post('/:id/students', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { student_ids } = req.body;
  if (!Array.isArray(student_ids) || student_ids.length === 0) {
    return res.status(400).json({ message: '학생을 선택해주세요.' });
  }
  try {
    for (const sid of student_ids) {
      await pool.query(
        `INSERT INTO program_students (program_id, student_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
        [id, sid]
      );
    }
    res.status(201).json({ message: '추가되었습니다.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// DELETE /api/programs/:id/students/:sid
router.delete('/:id/students/:sid', authMiddleware, async (req, res) => {
  const { id, sid } = req.params;
  try {
    await pool.query(
      'DELETE FROM program_students WHERE program_id=$1 AND student_id=$2',
      [id, sid]
    );
    res.json({ message: '제거되었습니다.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// ─── 회차 ────────────────────────────────────────────────────────────────────
// GET /api/programs/:id/sessions
router.get('/:id/sessions', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT ses.*, pi.name AS instructor_name
       FROM program_sessions ses
       LEFT JOIN program_instructors pi ON pi.id = ses.instructor_id
       WHERE ses.program_id = $1
       ORDER BY ses.session_num`,
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// POST /api/programs/:id/sessions
router.post('/:id/sessions', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { session_num, session_date, location, instructor_id, content, notes } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO program_sessions (program_id, session_num, session_date, location, instructor_id, content, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [id, session_num, session_date || null, location, instructor_id || null, content, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// PUT /api/programs/:id/sessions/:sid
router.put('/:id/sessions/:sid', authMiddleware, async (req, res) => {
  const { sid } = req.params;
  const { session_num, session_date, location, instructor_id, content, notes } = req.body;
  try {
    const result = await pool.query(
      `UPDATE program_sessions SET session_num=$1, session_date=$2, location=$3,
         instructor_id=$4, content=$5, notes=$6
       WHERE id=$7 RETURNING *`,
      [session_num, session_date || null, location, instructor_id || null, content, notes, sid]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: '회차를 찾을 수 없습니다.' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// DELETE /api/programs/:id/sessions/:sid
router.delete('/:id/sessions/:sid', authMiddleware, async (req, res) => {
  const { sid } = req.params;
  try {
    await pool.query('DELETE FROM program_sessions WHERE id=$1', [sid]);
    res.json({ message: '삭제되었습니다.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// ─── 출석 ────────────────────────────────────────────────────────────────────
// GET /api/programs/:id/sessions/:sid/attendance
router.get('/:id/sessions/:sid/attendance', authMiddleware, async (req, res) => {
  const { id, sid } = req.params;
  try {
    // 참여학생 기반으로 출석 현황 반환 (미등록 시 attended=false)
    const result = await pool.query(
      `SELECT s.id AS student_id, s.name, s.school, s.grade,
         COALESCE(pa.attended, FALSE) AS attended,
         pa.note
       FROM program_students ps
       JOIN students s ON s.id = ps.student_id
       LEFT JOIN program_attendance pa ON pa.session_id=$2 AND pa.student_id = ps.student_id
       WHERE ps.program_id=$1
       ORDER BY s.name`,
      [id, sid]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// PUT /api/programs/:id/sessions/:sid/attendance
router.put('/:id/sessions/:sid/attendance', authMiddleware, async (req, res) => {
  const { sid } = req.params;
  const { records } = req.body; // [{ student_id, attended, note }]
  if (!Array.isArray(records)) return res.status(400).json({ message: 'records 배열이 필요합니다.' });
  try {
    for (const r of records) {
      await pool.query(
        `INSERT INTO program_attendance (session_id, student_id, attended, note)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (session_id, student_id) DO UPDATE SET attended=$3, note=$4`,
        [sid, r.student_id, r.attended, r.note || null]
      );
    }
    res.json({ message: '출석이 저장되었습니다.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router;
