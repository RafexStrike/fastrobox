-- Level 4 migration: lockout, login history, and role scope tables.

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_failed_login_attempts_check;

ALTER TABLE users
  ADD CONSTRAINT users_failed_login_attempts_check
  CHECK (failed_login_attempts BETWEEN 0 AND 5);

CREATE TABLE IF NOT EXISTS login_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  username text,
  success boolean NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS login_history_created_at_idx
  ON login_history (created_at DESC);

CREATE TABLE IF NOT EXISTS teacher_room_access (
  teacher_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  room_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (teacher_id, room_id)
);

CREATE INDEX IF NOT EXISTS teacher_room_access_room_idx
  ON teacher_room_access (room_id);

CREATE TABLE IF NOT EXISTS guardian_children (
  guardian_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (guardian_id, student_id)
);

CREATE INDEX IF NOT EXISTS guardian_children_student_idx
  ON guardian_children (student_id);
