const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const uploadDir = path.join(__dirname, '../../', process.env.UPLOAD_DIR || 'uploads');

// 업로드 디렉토리 생성
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// multer가 파일명을 Latin-1로 읽기 때문에 UTF-8로 재변환
function decodeOriginalName(file) {
  try {
    return Buffer.from(file.originalname, 'latin1').toString('utf8');
  } catch {
    return file.originalname;
  }
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    file.originalname = decodeOriginalName(file);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  // 허용 확장자
  const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|hwp|ppt|pptx|txt|zip/;
  const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  if (ext) {
    cb(null, true);
  } else {
    cb(new Error('허용되지 않는 파일 형식입니다.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB
});

module.exports = { upload, uploadDir };
