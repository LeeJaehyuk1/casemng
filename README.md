# 사례관리 시스템

## 시작하기

### 1. PostgreSQL 설정

```bash
# PostgreSQL 접속 후 데이터베이스 생성
psql -U postgres
CREATE DATABASE casemng;
\q

# 스키마 및 초기 데이터 적용
psql -U postgres -d casemng -f database/schema.sql
psql -U postgres -d casemng -f database/seed.sql
```

### 2. 환경변수 설정

`server/.env` 파일에서 PostgreSQL 접속 정보를 수정하세요:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=casemng
DB_USER=postgres
DB_PASSWORD=postgres   ← 본인의 PostgreSQL 비밀번호로 변경
```

### 3. 패키지 설치

```bash
# 루트에서 한번에 설치
npm run install:all

# 또는 각각 설치
npm install
cd server && npm install
cd ../client && npm install
```

### 4. 실행

```bash
# 루트 디렉토리에서
npm run dev
```

- 프론트엔드: http://localhost:3000
- 백엔드 API: http://localhost:5000

### 5. 초기 로그인

| 아이디 | 비밀번호 | 권한 |
|--------|----------|------|
| admin | admin1234 | 관리자 |
| manager1 | manager1234 | 담당자 |
| manager2 | manager1234 | 담당자 |

---

## 주요 기능

### 사례관리
- **트리 메뉴**: 좌측에 학교/학년 등 폴더 구조, 학생 목록 표시
- **학생 인적사항**: 우측 상단에 선택된 학생의 상세 정보
- **사례이력**: 우측 하단 게시판 형식으로 날짜/항목/내용/첨부파일 관리
- **이관**: 진행중 → 완료 처리, 트리의 완료 폴더로 이동
- **원복**: 완료 → 진행중으로 되돌리기 (이전 위치로 복원)

### 네트워크관리
- 연계기관(복지관, 상담센터 등) CRUD 관리

### 관리자
- **트리 구성**: 폴더 추가/수정/삭제 (최대 3레벨)
- **사용자 관리**: 담당자/관리자 계정 관리

---

## 프로젝트 구조

```
casemng/
├── client/          # React 프론트엔드 (Vite + Ant Design)
│   └── src/
│       ├── api/     # API 호출 함수
│       ├── components/  # 공통 컴포넌트
│       └── pages/   # 페이지 컴포넌트
├── server/          # Node.js 백엔드 (Express)
│   └── src/
│       ├── routes/  # API 라우터
│       └── middleware/
├── database/        # SQL 스키마 및 시드 데이터
└── uploads/         # 첨부파일 저장 디렉토리 (자동생성)
```
