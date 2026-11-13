import "server-only";
import { compare, hash } from "bcryptjs";
import { pool } from "@/lib/db";
import { isSelfRegisterableRole, type UserRole } from "@/lib/roles";

export const MAX_FAILED_LOGIN_ATTEMPTS = 5;
export const LOCKOUT_SECONDS = 30;

type LoginRow = {
  id: string;
  username: string;
  password_hash: string;
  role: UserRole;
  failed_login_attempts: number;
  locked_until: string | null;
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
  | {
      created: false;
      usernameTaken: boolean;
      emailTaken: boolean;
      roleRestricted?: boolean;
    };

export async function registerUser(
  input: RegistrationInput,
): Promise<RegistrationResult> {
  if (!isSelfRegisterableRole(input.role)) {
    return {
      created: false,
      usernameTaken: false,
      emailTaken: false,
      roleRestricted: true,
    };
  }

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

export async function authenticateUser(identifier: string, password: string) {
  const normalizedIdentifier = identifier.trim();
  if (!normalizedIdentifier) {
    return null;
  }

  const result = await pool.query<LoginRow>(
    `SELECT id, username, password_hash, role, failed_login_attempts, locked_until
       FROM users
      WHERE lower(username) = lower($1) OR lower(email) = lower($1)
      LIMIT 1`,
    [normalizedIdentifier],
  );
  const user = result.rows[0];

  if (!user) {
    await recordLoginAttempt({
      username: normalizedIdentifier,
      success: false,
      reason: "unknown-user",
    });
    return null;
  }

  const lockExpiresAt = user.locked_until ? new Date(user.locked_until) : null;
  const isLocked = lockExpiresAt !== null && lockExpiresAt > new Date();

  if (isLocked) {
    await recordLoginAttempt({
      userId: user.id,
      username: user.username,
      success: false,
      reason: "locked",
    });
    return null;
  }

  const passwordMatches =
    Buffer.byteLength(password, "utf8") <= 72 &&
    (await compare(password, user.password_hash));

  if (!passwordMatches) {
    await recordFailedLogin(user.id, user.username);
    return null;
  }

  await pool.query(
    `UPDATE users
        SET failed_login_attempts = 0,
            locked_until = NULL,
            updated_at = clock_timestamp()
      WHERE id = $1`,
    [user.id],
  );

  await recordLoginAttempt({
    userId: user.id,
    username: user.username,
    success: true,
  });

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

export async function getLoginHistory(limit = 50): Promise<
  Array<{
    id: string;
    username: string | null;
    user_id: string | null;
    success: boolean;
    reason: string | null;
    created_at: string;
  }>
> {
  const result = await pool.query(
    `SELECT id, username, user_id, success, reason, created_at
       FROM login_history
      ORDER BY created_at DESC
      LIMIT $1`,
    [limit],
  );

  return result.rows;
}

export function getLoginLockoutDeadline(user: { locked_until: string | null } | null): Date | null {
  if (!user?.locked_until) {
    return null;
  }

  const value = new Date(user.locked_until);
  return Number.isNaN(value.getTime()) ? null : value;
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

async function recordFailedLogin(id: string, username: string) {
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
              WHEN attempt.locked_until IS NOT NULL AND attempt.locked_until > attempt.now
                THEN attempt.failed_login_attempts
              WHEN attempt.locked_until IS NOT NULL THEN 1
              ELSE LEAST(attempt.failed_login_attempts + 1, ${MAX_FAILED_LOGIN_ATTEMPTS})
            END,
            locked_until = CASE
              WHEN attempt.locked_until IS NOT NULL AND attempt.locked_until > attempt.now THEN attempt.locked_until
              WHEN attempt.failed_login_attempts + 1 >= ${MAX_FAILED_LOGIN_ATTEMPTS}
                THEN attempt.now + INTERVAL '${LOCKOUT_SECONDS} seconds'
              ELSE NULL
            END,
            updated_at = attempt.now
       FROM attempt
      WHERE account.id = attempt.id`,
    [id],
  );

  await recordLoginAttempt({
    userId: id,
    username,
    success: false,
    reason: "invalid-password",
  });
}

async function recordLoginAttempt({
  userId,
  username,
  success,
  reason,
}: {
  userId?: string;
  username?: string;
  success: boolean;
  reason?: string;
}) {
  await pool.query(
    `INSERT INTO login_history (user_id, username, success, reason)
     VALUES ($1, $2, $3, $4)`,
    [userId ?? null, username ?? null, success, reason ?? null],
  );
}