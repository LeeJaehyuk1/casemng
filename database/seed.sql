\encoding UTF8

-- 기존 데이터 초기화
TRUNCATE TABLE student_org_links, network_orgs, transfer_logs, attachments,
               case_histories, students, tree_nodes, users
RESTART IDENTITY CASCADE;

-- admin password: admin1234
INSERT INTO users (username, password_hash, name, role) VALUES
('admin', '$2a$10$rnD0RawHAmRdm0Q.yk85aer.exmUDmIRQCFSO1pPHPjFioDKvSfyi', '관리자', 'admin')
ON CONFLICT (username) DO NOTHING;

-- manager password: manager1234
INSERT INTO users (username, password_hash, name, role, phone, email) VALUES
('manager1', '$2a$10$VgwlFmCkB4b8RkMRUQqQNuJPVgEGr3sVInVe4Y0ThUnSGQXbfhLpS', '김담당', 'manager', '010-1111-2222', 'manager1@example.com'),
('manager2', '$2a$10$VgwlFmCkB4b8RkMRUQqQNuJPVgEGr3sVInVe4Y0ThUnSGQXbfhLpS', '이담당', 'manager', '010-3333-4444', 'manager2@example.com')
ON CONFLICT (username) DO NOTHING;

-- 시스템 루트 노드
INSERT INTO tree_nodes (id, parent_id, name, node_type, level, order_num) VALUES
(1, NULL, '진행중', 'system_active', 0, 1),
(2, NULL, '완료', 'system_completed', 0, 2)
ON CONFLICT (id) DO NOTHING;

SELECT setval('tree_nodes_id_seq', 100);

-- 샘플 폴더
INSERT INTO tree_nodes (parent_id, name, node_type, level, order_num) VALUES
(1, '가중학교', 'folder', 1, 1),
(1, '나고등학교', 'folder', 1, 2);

INSERT INTO tree_nodes (parent_id, name, node_type, level, order_num)
SELECT id, '1학년', 'folder', 2, 1 FROM tree_nodes WHERE name = '가중학교' AND level = 1;
INSERT INTO tree_nodes (parent_id, name, node_type, level, order_num)
SELECT id, '2학년', 'folder', 2, 2 FROM tree_nodes WHERE name = '가중학교' AND level = 1;

INSERT INTO tree_nodes (parent_id, name, node_type, level, order_num)
SELECT id, '1학년', 'folder', 2, 1 FROM tree_nodes WHERE name = '나고등학교' AND level = 1;

-- 샘플 학생
INSERT INTO students (node_id, name, birth_date, school, grade, class_name, address, phone, guardian_name, guardian_phone, assigned_user_id, status)
SELECT
    t.id, '홍길동', '2010-03-15', '가중학교', '1학년', '1반',
    '서울특별시 강남구 테헤란로 123', '010-9999-1111', '홍아버지', '010-9999-2222',
    (SELECT id FROM users WHERE username = 'manager1'), 'active'
FROM tree_nodes t
WHERE t.name = '1학년' AND t.level = 2
  AND t.parent_id = (SELECT id FROM tree_nodes WHERE name = '가중학교' AND level = 1);

INSERT INTO students (node_id, name, birth_date, school, grade, class_name, address, phone, guardian_name, guardian_phone, assigned_user_id, status)
SELECT
    t.id, '김철수', '2010-07-22', '가중학교', '1학년', '2반',
    '서울특별시 서초구 반포동 456', '010-8888-1111', '김어머니', '010-8888-2222',
    (SELECT id FROM users WHERE username = 'manager2'), 'active'
FROM tree_nodes t
WHERE t.name = '1학년' AND t.level = 2
  AND t.parent_id = (SELECT id FROM tree_nodes WHERE name = '가중학교' AND level = 1);

-- 샘플 사례이력
INSERT INTO case_histories (student_id, case_date, category, content, created_by)
SELECT s.id, '2024-01-15', '가정방문',
    '학생 가정 방문 실시. 가정환경 파악 및 지원계획 논의.',
    (SELECT id FROM users WHERE username = 'manager1')
FROM students s WHERE s.name = '홍길동';

INSERT INTO case_histories (student_id, case_date, category, content, created_by)
SELECT s.id, '2024-02-01', '상담',
    '학교 적응 관련 개별 상담 진행. 또래 관계 어려움 호소하여 지속 모니터링 예정.',
    (SELECT id FROM users WHERE username = 'manager1')
FROM students s WHERE s.name = '홍길동';

-- 샘플 연계기관
INSERT INTO network_orgs (name, category, contact_person, phone, email, address, service_content) VALUES
('강남구청', '공공기관', '박담당', '02-3423-5000', 'welfare@gangnam.go.kr', '서울특별시 강남구 학동로 426', '기초생활수급, 긴급복지지원'),
('가복지관', '사회복지기관', '이사회복', '02-1234-5678', 'info@welfare-a.org', '서울특별시 강남구 역삼동 123', '청소년 상담, 가족지원'),
('나상담센터', '상담기관', '최상담', '02-9876-5432', 'counsel@center-b.org', '서울특별시 서초구 서초동 456', '심리상담, 집단프로그램');
