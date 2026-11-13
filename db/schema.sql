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

CREATE TABLE IF NOT EXISTS sensor_messages (
  device_id text NOT NULL,
  room_id text NOT NULL,
  seq bigint NOT NULL CHECK (seq >= 0),
  message_kind text NOT NULL CHECK (message_kind IN ('telemetry', 'event')),
  message_ts timestamptz NOT NULL,
  event_type text,
  detail jsonb,
  uptime_s bigint,
  temp_c double precision,
  rh double precision,
  heat_index_c double precision,
  flame boolean,
  door text,
  status text,
  heat_trend text,
  rssi integer,
  heap_kb double precision,
  chip_temp_c double precision,
  fw text,
  quality text,
  payload jsonb NOT NULL,
  received_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (device_id, seq),
  CHECK (
    (message_kind = 'telemetry' AND event_type IS NULL AND detail IS NULL)
    OR (message_kind = 'event' AND event_type IS NOT NULL AND detail IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS sensor_messages_event_time_idx
  ON sensor_messages (event_type, message_ts DESC)
  WHERE message_kind = 'event';

CREATE TABLE IF NOT EXISTS mqtt_devices (
  device_id text PRIMARY KEY,
  room_id text NOT NULL,
  last_seen_at timestamptz NOT NULL,
  is_online boolean NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS mqtt_devices_online_last_seen_idx
  ON mqtt_devices (last_seen_at)
  WHERE is_online;