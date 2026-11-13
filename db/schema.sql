DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('ADMIN', 'TEACHER', 'STUDENT', 'GUARDIAN');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  username text NOT NULL,
  email text NOT NULL,
  password_hash text NOT NULL,
  role user_role NOT NULL,
  failed_login_attempts smallint NOT NULL DEFAULT 0
    CHECK (failed_login_attempts BETWEEN 0 AND 3),
  locked_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name text;

UPDATE users
   SET full_name = username
 WHERE full_name IS NULL;

ALTER TABLE users ALTER COLUMN full_name SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_unique
  ON users (lower(username));

CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_unique
  ON users (lower(email));