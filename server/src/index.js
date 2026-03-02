require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// 미들웨어
const isProduction = process.env.NODE_ENV === 'production';
app.use(cors({
  origin: isProduction ? false : 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 업로드 파일 정적 서빙
const uploadDir = path.join(__dirname, '../uploads');
app.use('/uploads', express.static(uploadDir));

// 라우터
app.use('/api/auth',        require('./routes/auth'));
app.use('/api/tree',        require('./routes/tree'));
app.use('/api/students',    require('./routes/students'));
app.use('/api/cases',       require('./routes/cases'));
app.use('/api/attachments', require('./routes/attachments'));
app.use('/api/transfers',   require('./routes/transfers'));
app.use('/api/network',     require('./routes/network'));
app.use('/api/users',       require('./routes/users'));

// 헬스체크
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// 프로덕션: React 빌드 정적 파일 서빙 + SPA fallback
if (isProduction) {
  const clientBuild = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientBuild));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuild, 'index.html'));
  });
}

// 오류 핸들러
app.use((err, req, res, next) => {
  console.error(err.stack);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: '파일 크기는 20MB를 초과할 수 없습니다.' });
  }
  res.status(500).json({ message: err.message || '서버 오류가 발생했습니다.' });
});

app.listen(PORT, () => {
  console.log(`사례관리 서버 실행 중: http://localhost:${PORT}`);
});
