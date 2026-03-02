const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const pool = require('../db');
const { authMiddleware } = require('../middleware/auth');
const { upload, uploadDir } = require('../middleware/upload');

// POST /api/attachments - 파일 업로드 (멀티플)
router.post('/', authMiddleware, upload.array('files', 10), async (req, res) => {
  const { case_history_id } = req.body;

  if (!case_history_id) {
    // 업로드된 파일 삭제
    req.files?.forEach(f => fs.unlinkSync(f.path));
    return res.status(400).json({ message: 'case_history_id가 필요합니다.' });
  }

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: '파일을 선택하세요.' });
  }

  try {
    const inserted = [];
    for (const file of req.files) {
      const result = await pool.query(
        `INSERT INTO attachments
           (case_history_id, original_name, saved_name, saved_path, file_size, mime_type, uploaded_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          case_history_id,
          file.originalname,
          file.filename,
          file.path,
          file.size,
          file.mimetype,
          req.user.id
        ]
      );
      inserted.push(result.rows[0]);
    }
    res.status(201).json(inserted);
  } catch (err) {
    console.error(err);
    req.files?.forEach(f => { try { fs.unlinkSync(f.path); } catch(e) {} });
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// GET /api/attachments/:id/download - 파일 다운로드
router.get('/:id/download', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM attachments WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: '파일을 찾을 수 없습니다.' });
    }

    const attachment = result.rows[0];
    const filePath = path.join(uploadDir, attachment.saved_name);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: '파일이 서버에 존재하지 않습니다.' });
    }

    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(attachment.original_name)}`);
    res.setHeader('Content-Type', attachment.mime_type || 'application/octet-stream');
    res.sendFile(filePath);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

// DELETE /api/attachments/:id - 파일 삭제
router.delete('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM attachments WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: '파일을 찾을 수 없습니다.' });
    }

    const attachment = result.rows[0];
    const filePath = path.join(uploadDir, attachment.saved_name);

    // DB에서 삭제
    await pool.query('DELETE FROM attachments WHERE id = $1', [id]);

    // 실제 파일 삭제
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (e) {
      console.warn('파일 삭제 실패:', e.message);
    }

    res.json({ message: '삭제되었습니다.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '서버 오류가 발생했습니다.' });
  }
});

module.exports = router;
