import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const { Client } = pg;

const client = new Client({
  connectionString: 'postgresql://postgres:CodeInTheDark@db.ljdiufspcgbijgjuelnw.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false },
});

const schema = `
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS contest_sessions (
  id                       TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  label                    TEXT NOT NULL,
  scheduled_at             TIMESTAMPTZ,
  notes                    TEXT DEFAULT '',
  phase                    TEXT NOT NULL DEFAULT 'setup',
  registration_opens_at    BIGINT,
  registration_duration_ms BIGINT DEFAULT 180000,
  registration_ends_at     BIGINT,
  auto_start_on_reg_close  BOOLEAN DEFAULT true,
  challenge_duration_ms    BIGINT DEFAULT 3000000,
  challenge_starts_at      BIGINT,
  challenge_ends_at        BIGINT,
  pause_started_at         BIGINT,
  is_paused                BOOLEAN DEFAULT false,
  announcement             TEXT DEFAULT '',
  is_reveal_mode           BOOLEAN DEFAULT false,
  max_participants         INT DEFAULT 200,
  allow_late_join          BOOLEAN DEFAULT false,
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS questions (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  session_id     TEXT NOT NULL REFERENCES contest_sessions(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  category       TEXT DEFAULT 'Algorithms',
  difficulty     TEXT DEFAULT 'Medium',
  points         INT DEFAULT 400,
  display_order  INT DEFAULT 1,
  scenario       TEXT DEFAULT '',
  input_format   TEXT DEFAULT '',
  output_format  TEXT DEFAULT '',
  constraints    TEXT DEFAULT '',
  starter_c      TEXT DEFAULT '',
  starter_python TEXT DEFAULT '',
  starter_java   TEXT DEFAULT '',
  is_active      BOOLEAN DEFAULT true,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS test_cases (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  question_id     TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  input           TEXT NOT NULL DEFAULT '',
  expected_output TEXT NOT NULL DEFAULT '',
  is_hidden       BOOLEAN DEFAULT false,
  explanation     TEXT DEFAULT '',
  display_order   INT DEFAULT 1,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS participants (
  id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  session_id          TEXT NOT NULL REFERENCES contest_sessions(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  roll_number         TEXT NOT NULL,
  terminal_id         TEXT DEFAULT '',
  strikes             INT DEFAULT 0,
  is_locked_out       BOOLEAN DEFAULT false,
  active_language     TEXT DEFAULT 'python',
  current_question_id TEXT,
  registered_at       BIGINT NOT NULL,
  last_active_at      BIGINT NOT NULL,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (session_id, roll_number)
);

CREATE TABLE IF NOT EXISTS submissions (
  id                TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  session_id        TEXT NOT NULL REFERENCES contest_sessions(id) ON DELETE CASCADE,
  participant_id    TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  participant_name  TEXT DEFAULT '',
  participant_roll  TEXT DEFAULT '',
  question_id       TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  question_title    TEXT DEFAULT '',
  language          TEXT DEFAULT 'python',
  code              TEXT DEFAULT '',
  submitted_at      BIGINT,
  is_auto_submit    BOOLEAN DEFAULT false,
  evaluation_status TEXT DEFAULT 'pending',
  test_cases_passed INT DEFAULT 0,
  total_test_cases  INT DEFAULT 0,
  score             INT DEFAULT 0,
  speed_bonus       INT DEFAULT 0,
  exec_time_ms      INT,
  status_message    TEXT DEFAULT '',
  test_case_details JSONB DEFAULT '[]'::jsonb,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS violations (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  session_id       TEXT NOT NULL REFERENCES contest_sessions(id) ON DELETE CASCADE,
  participant_id   TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  participant_name TEXT DEFAULT '',
  type             TEXT DEFAULT 'tab_blur',
  details          TEXT DEFAULT '',
  strike_count     INT DEFAULT 0,
  timestamp        BIGINT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_questions_session_id ON questions(session_id);
CREATE INDEX IF NOT EXISTS idx_test_cases_question_id ON test_cases(question_id);
CREATE INDEX IF NOT EXISTS idx_participants_session_id ON participants(session_id);
CREATE INDEX IF NOT EXISTS idx_submissions_session_id ON submissions(session_id);
CREATE INDEX IF NOT EXISTS idx_submissions_participant_id ON submissions(participant_id);
CREATE INDEX IF NOT EXISTS idx_violations_session_id ON violations(session_id);
CREATE INDEX IF NOT EXISTS idx_violations_participant_id ON violations(participant_id);
CREATE INDEX IF NOT EXISTS idx_sessions_phase ON contest_sessions(phase);

ALTER TABLE contest_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE test_cases DISABLE ROW LEVEL SECURITY;
ALTER TABLE participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE submissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE violations DISABLE ROW LEVEL SECURITY;

INSERT INTO contest_sessions (label, notes, phase)
VALUES ('11:11 Chapter 2 — Final', 'Main event session', 'setup')
ON CONFLICT DO NOTHING;
`;

async function run() {
  console.log('Connecting to Supabase PostgreSQL...');
  await client.connect();
  console.log('Connected! Running schema as a single transaction...\n');

  try {
    await client.query('BEGIN');
    await client.query(schema);
    await client.query('COMMIT');
    console.log('✅ Schema applied successfully!\n');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Schema failed, rolling back:', err.message);
    await client.end();
    process.exit(1);
  }

  // Verify
  const { rows: tables } = await client.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' ORDER BY table_name;
  `);
  console.log('Tables created:');
  tables.forEach(r => console.log('  ✓', r.table_name));

  const { rows: sessions } = await client.query(`SELECT id, label, phase FROM contest_sessions;`);
  console.log('\nSeeded sessions:');
  sessions.forEach(s => console.log(`  • [${s.phase}] ${s.label} (${s.id})`));

  await client.end();
  console.log('\nDone.');
}

run().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
