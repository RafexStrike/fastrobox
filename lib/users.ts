import "server-only";
import { compare, hash } from "bcryptjs";
import { pool } from "@/lib/db";
import type { UserRole } from "@/lib/roles";

type LoginRow = {
  id: string;
  username: string;
  password_hash: string;
  role: UserRole;
  is_locked: boolean;
};

export type AuthenticatedUser = {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
};

export type RegistrationInput = {
  fullName: string;
  username: string;
  email: string;
  password: string;
  role: UserRole;
};

export type RegistrationResult =
  | { created: true }
  | { created: false; usernameTaken: boolean; emailTaken: boolean };

export async function registerUser(
  input: RegistrationInput,
): Promise<RegistrationResult> {
  const existing = await pool.query<{
    username_taken: boolean;
    email_taken: boolean;
  }>(
    `SELECT EXISTS (
              SELECT 1 FROM users WHERE lower(username) = lower($1)
            ) AS username_taken,
            EXISTS (
              SELECT 1 FROM users WHERE lower(email) = lower($2)
            ) AS email_taken`,
    [input.username, input.email],
  );
  const duplicate = existing.rows[0];

  if (duplicate.username_taken || duplicate.email_taken) {
    return {
      created: false,
      usernameTaken: duplicate.username_taken,
      emailTaken: duplicate.email_taken,
    };
  }

  const passwordHash = await hash(input.password, 12);

  try {
    await pool.query(
      `INSERT INTO users (full_name, username, email, password_hash, role)
       VALUES ($1, $2, $3, $4, $5::user_role)`,
      [input.fullName, input.username, input.email, passwordHash, input.role],
    );
  } catch (error) {
    if (isUniqueViolation(error)) {
      if (error.constraint === "users_username_lower_unique") {
        return { created: false, usernameTaken: true, emailTaken: false };
      }
      if (error.constraint === "users_email_lower_unique") {
        return { created: false, usernameTaken: false, emailTaken: true };
      }
    }
    throw error;
  }

  return { created: true };
}

export async function authenticateUser(
  identifier: string,
  password: string,
) {
  const result = await pool.query<LoginRow>(
    `SELECT id, username, password_hash, role,
            locked_until > clock_timestamp() AS is_locked
       FROM users
      WHERE lower(username) = $1 OR lower(email) = $1
      LIMIT 1`,
    [identifier.trim().toLowerCase()],
  );
  const user = result.rows[0];

  if (!user || user.is_locked) {
    return null;
  }

  const passwordMatches =
    Buffer.byteLength(password, "utf8") <= 72 &&
    (await compare(password, user.password_hash));

  if (!passwordMatches) {
    await recordFailedLogin(user.id);
    return null;
  }

  const reset = await pool.query(
    `UPDATE users
        SET failed_login_attempts = 0,
            locked_until = NULL,
            updated_at = clock_timestamp()
      WHERE id = $1
        AND (locked_until IS NULL OR locked_until <= clock_timestamp())
      RETURNING id`,
    [user.id],
  );

  if (reset.rowCount !== 1) {
    return null;
  }

  return { id: user.id, role: user.role };
}

export async function findUserById(id: string): Promise<AuthenticatedUser | null> {
  const result = await pool.query<AuthenticatedUser>(
    `SELECT id, username, full_name AS "fullName", role
       FROM users
      WHERE id = $1`,
    [id],
  );

  return result.rows[0] ?? null;
}

function isUniqueViolation(
  error: unknown,
): error is { code: string; constraint?: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

async function recordFailedLogin(id: string) {
  await pool.query(
    `WITH locked_account AS MATERIALIZED (
       SELECT id, failed_login_attempts, locked_until
         FROM users
        WHERE id = $1
        FOR UPDATE
     ),
     attempt AS MATERIALIZED (
       SELECT id, failed_login_attempts, locked_until,
              clock_timestamp() AS now
         FROM locked_account
     )
     UPDATE users AS account
        SET failed_login_attempts = CASE
              WHEN attempt.locked_until > attempt.now
                THEN attempt.failed_login_attempts
              WHEN attempt.locked_until IS NOT NULL THEN 1
              ELSE LEAST(attempt.failed_login_attempts + 1, 3)
            END,
            locked_until = CASE
              WHEN attempt.locked_until > attempt.now THEN attempt.locked_until
              WHEN attempt.locked_until IS NOT NULL THEN NULL
              WHEN attempt.failed_login_attempts >= 2
                THEN attempt.now + INTERVAL '60 seconds'
              ELSE NULL
            END,
            updated_at = attempt.now
       FROM attempt
      WHERE account.id = attempt.id`,
    [id],
  );
}