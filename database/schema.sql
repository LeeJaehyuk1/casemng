\encoding UTF8
\c casemng;

CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    username      VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name          VARCHAR(100) NOT NULL,
    role          VARCHAR(20) NOT NULL DEFAULT 'manager',
    phone         VARCHAR(20),
    email         VARCHAR(100),
    is_active     BOOLEAN DEFAULT TRUE,
    created_at    TIMESTAMP DEFAULT NOW(),
    updated_at    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tree_nodes (
    id          SERIAL PRIMARY KEY,
    parent_id   INTEGER REFERENCES tree_nodes(id) ON DELETE CASCADE,
    name        VARCHAR(100) NOT NULL,
    node_type   VARCHAR(20) NOT NULL DEFAULT 'folder',
    level       INTEGER NOT NULL DEFAULT 0,
    order_num   INTEGER DEFAULT 0,
    created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS students (
    id               SERIAL PRIMARY KEY,
    node_id          INTEGER REFERENCES tree_nodes(id),
    prev_node_id     INTEGER REFERENCES tree_nodes(id),
    name             VARCHAR(100) NOT NULL,
    birth_date       DATE,
    school           VARCHAR(100),
    grade            VARCHAR(20),
    class_name       VARCHAR(20),
    address          TEXT,
    phone            VARCHAR(20),
    guardian_name    VARCHAR(100),
    guardian_phone   VARCHAR(20),
    assigned_user_id INTEGER REFERENCES users(id),
    status           VARCHAR(20) DEFAULT 'active',
    memo             TEXT,
    photo_path       VARCHAR(500),
    created_at       TIMESTAMP DEFAULT NOW(),
    updated_at       TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS case_histories (
    id          SERIAL PRIMARY KEY,
    student_id  INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    case_date   DATE NOT NULL,
    category    VARCHAR(100) NOT NULL,
    content     TEXT NOT NULL,
    created_by  INTEGER REFERENCES users(id),
    created_at  TIMESTAMP DEFAULT NOW(),
    updated_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS attachments (
    id              SERIAL PRIMARY KEY,
    case_history_id INTEGER NOT NULL REFERENCES case_histories(id) ON DELETE CASCADE,
    original_name   VARCHAR(255) NOT NULL,
    saved_name      VARCHAR(255) NOT NULL,
    saved_path      VARCHAR(500) NOT NULL,
    file_size       BIGINT,
    mime_type       VARCHAR(100),
    uploaded_by     INTEGER REFERENCES users(id),
    uploaded_at     TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS transfer_logs (
    id             SERIAL PRIMARY KEY,
    student_id     INTEGER NOT NULL REFERENCES students(id),
    from_node_id   INTEGER REFERENCES tree_nodes(id),
    to_node_id     INTEGER REFERENCES tree_nodes(id),
    transfer_type  VARCHAR(20) NOT NULL,
    transferred_by INTEGER REFERENCES users(id),
    transferred_at TIMESTAMP DEFAULT NOW(),
    memo           TEXT
);

CREATE TABLE IF NOT EXISTS network_orgs (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(200) NOT NULL,
    category        VARCHAR(100),
    contact_person  VARCHAR(100),
    phone           VARCHAR(50),
    email           VARCHAR(100),
    address         TEXT,
    service_content TEXT,
    memo            TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS student_org_links (
    id          SERIAL PRIMARY KEY,
    student_id  INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    org_id      INTEGER NOT NULL REFERENCES network_orgs(id) ON DELETE CASCADE,
    link_date   DATE,
    memo        TEXT,
    created_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tree_nodes_parent    ON tree_nodes(parent_id);
CREATE INDEX IF NOT EXISTS idx_students_node        ON students(node_id);
CREATE INDEX IF NOT EXISTS idx_students_assigned    ON students(assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_case_histories_stud  ON case_histories(student_id);
CREATE INDEX IF NOT EXISTS idx_attachments_case     ON attachments(case_history_id);
CREATE INDEX IF NOT EXISTS idx_transfer_logs_stud   ON transfer_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_student_org_student  ON student_org_links(student_id);
