const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authMiddleware, adminOnly } = require('../middleware/auth');

// POST /api/excel-upload
router.post('/', authMiddleware, adminOnly, async (req, res) => {
  const { students = [], cases = [] } = req.body;

  const studentResults = [];
  const caseResults = [];

  // name → new student id 맵 (이번 배치에서 삽입된 학생)
  const newStudentMap = {};

  // 1. 학생 삽입
  for (let i = 0; i < students.length; i++) {
    const row = students[i];
    const rowNum = i + 2; // 엑셀 행 번호 (헤더=1)

    const { name, birth_date, school, grade, class_name, address, phone,
            guardian_name, guardian_phone, folder_name, username, memo } = row;

    if (!name) {
      studentResults.push({ row: rowNum, status: 'error', message: '이름이 비어있습니다.', data: row });
      continue;
    }
    if (!folder_name) {
      studentResults.push({ row: rowNum, status: 'error', message: '폴더명이 비어있습니다.', data: row });
      continue;
    }

    try {
      // 폴더명으로 node_id 조회
      const nodeRes = await pool.query(
        `SELECT id, node_type FROM tree_nodes WHERE name = $1 AND node_type != 'system_completed'`,
        [folder_name]
      );
      if (nodeRes.rows.length === 0) {
        studentResults.push({ row: rowNum, status: 'error', message: `폴더를 찾을 수 없습니다: "${folder_name}"`, data: row });
        continue;
      }
      if (nodeRes.rows.length > 1) {
        studentResults.push({ row: rowNum, status: 'error', message: `동일한 폴더명이 여러 개입니다: "${folder_name}"`, data: row });
        continue;
      }
      const node_id = nodeRes.rows[0].id;

      // 담당자 아이디로 user_id 조회 (없으면 null)
      let assigned_user_id = null;
      if (username) {
        const userRes = await pool.query(
          `SELECT id FROM users WHERE username = $1`,
          [username]
        );
        if (userRes.rows.length > 0) {
          assigned_user_id = userRes.rows[0].id;
        }
      }

      const insertRes = await pool.query(
        `INSERT INTO students
           (node_id, name, birth_date, school, grade, class_name,
            address, phone, guardian_name, guardian_phone,
            assigned_user_id, memo, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'active')
         RETURNING id`,
        [node_id, name, birth_date || null, school || null, grade || null,
         class_name || null, address || null, phone || null,
         guardian_name || null, guardian_phone || null,
         assigned_user_id, memo || null]
      );

      const newId = insertRes.rows[0].id;
      newStudentMap[name] = newId;
      studentResults.push({ row: rowNum, status: 'success', student_id: newId, name });
    } catch (err) {
      console.error(err);
      studentResults.push({ row: rowNum, status: 'error', message: `DB 오류: ${err.message}`, data: row });
    }
  }

  // 2. 사례이력 삽입
  for (let i = 0; i < cases.length; i++) {
    const row = cases[i];
    const rowNum = i + 2;

    const { student_name, date, category, content } = row;

    if (!student_name) {
      caseResults.push({ row: rowNum, status: 'error', message: '학생이름이 비어있습니다.', data: row });
      continue;
    }
    if (!date) {
      caseResults.push({ row: rowNum, status: 'error', message: '날짜가 비어있습니다.', data: row });
      continue;
    }

    try {
      let student_id = null;

      // 이번 배치에서 삽입된 학생 우선
      if (newStudentMap[student_name] !== undefined) {
        student_id = newStudentMap[student_name];
      } else {
        // DB에서 이름으로 조회
        const sRes = await pool.query(
          `SELECT id FROM students WHERE name = $1`,
          [student_name]
        );
        if (sRes.rows.length === 0) {
          caseResults.push({ row: rowNum, status: 'error', message: `학생을 찾을 수 없습니다: "${student_name}"`, data: row });
          continue;
        }
        if (sRes.rows.length > 1) {
          caseResults.push({ row: rowNum, status: 'error', message: `동일한 이름의 학생이 여러 명입니다: "${student_name}"`, data: row });
          continue;
        }
        student_id = sRes.rows[0].id;
      }

      await pool.query(
        `INSERT INTO case_histories (student_id, date, category, content)
         VALUES ($1, $2, $3, $4)`,
        [student_id, date, category || null, content || null]
      );

      caseResults.push({ row: rowNum, status: 'success', student_name });
    } catch (err) {
      console.error(err);
      caseResults.push({ row: rowNum, status: 'error', message: `DB 오류: ${err.message}`, data: row });
    }
  }

  const summary = {
    students: {
      total: students.length,
      success: studentResults.filter(r => r.status === 'success').length,
      error: studentResults.filter(r => r.status === 'error').length,
    },
    cases: {
      total: cases.length,
      success: caseResults.filter(r => r.status === 'success').length,
      error: caseResults.filter(r => r.status === 'error').length,
    },
  };

  res.json({ studentResults, caseResults, summary });
});

module.exports = router;
