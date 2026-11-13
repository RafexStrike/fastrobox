import { randomBytes } from "node:crypto";
import { loadEnvConfig } from "@next/env";
import { hash } from "bcryptjs";
import { Pool } from "pg";

const accounts = [
  {
    fullName: "Fastrobox Teacher",
    username: "teacher",
    email: "teacher@example.test",
    role: "TEACHER",
  },
  {
    fullName: "Student S1",
    username: "student-s1",
    email: "student-s1@example.test",
    role: "STUDENT",
  },
  {
    fullName: "Student S2",
    username: "student-s2",
    email: "student-s2@example.test",
    role: "STUDENT",
  },
  {
    fullName: "Guardian S1",
    username: "guardian-s1",
    email: "guardian-s1@example.test",
    role: "GUARDIAN",
  },
] as const;

async function main() {
  loadEnvConfig(process.cwd());

  const { env } = await import("../environment");
  const pool = new Pool({
    connectionString: env.POSTGRESS_SERVER,
    max: 1,
    connectionTimeoutMillis: 5_000,
  });

  try {
    const client = await pool.connect();
    const generatedAccounts = await Promise.all(
      accounts.map(async (account) => {
        const password = randomBytes(24).toString("base64url");
        return { ...account, password, passwordHash: await hash(password, 12) };
      }),
    );

    try {
      await client.query("BEGIN");
      const existing = await client.query(
        `SELECT EXISTS (
           SELECT 1 FROM users
            WHERE lower(username) = ANY($1::text[])
               OR lower(email) = ANY($2::text[])
         ) AS conflict`,
        [
          accounts.map((account) => account.username),
          accounts.map((account) => account.email),
        ],
      );

      if (existing.rows[0].conflict) {
        throw new Error(
          "A target username or email already exists. No accounts were changed.",
        );
      }

      for (const account of generatedAccounts) {
        await client.query(
          `INSERT INTO users (full_name, username, email, password_hash, role)
           VALUES ($1, $2, $3, $4, $5::user_role)`,
          [
            account.fullName,
            account.username,
            account.email,
            account.passwordHash,
            account.role,
          ],
        );
      }

      const teacher = await client.query<{ id: string }>(
        `SELECT id FROM users WHERE username = 'teacher' LIMIT 1`,
      );
      if (teacher.rowCount === 1) {
        await client.query(
          `INSERT INTO teacher_room_access (teacher_id, room_id)
           VALUES ($1, 'room-01')
           ON CONFLICT DO NOTHING`,
          [teacher.rows[0].id],
        );
      }

      const guardian = await client.query<{ id: string }>(
        `SELECT id FROM users WHERE username = 'guardian-s1' LIMIT 1`,
      );
      const student = await client.query<{ id: string }>(
        `SELECT id FROM users WHERE username = 'student-s1' LIMIT 1`,
      );
      if (guardian.rowCount === 1 && student.rowCount === 1) {
        await client.query(
          `INSERT INTO guardian_children (guardian_id, student_id)
           VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [guardian.rows[0].id, student.rows[0].id],
        );
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    console.info(
      "Created these accounts. Save the generated passwords; they will not be shown again:\n" +
        JSON.stringify(
          generatedAccounts.map(({ username, email, role, password }) => ({
            username,
            email,
            role,
            password,
          })),
          null,
          2,
        ),
    );
  } finally {
    await pool.end();
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Account creation failed.");
  process.exitCode = 1;
});