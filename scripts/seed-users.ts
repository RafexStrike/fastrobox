import { loadEnvConfig } from "@next/env";
import { hash } from "bcryptjs";
import { Pool } from "pg";

async function main() {
  loadEnvConfig(process.cwd());

  const { env } = await import("../environment");
  if (env.SEED_CONFIRM !== "CREATE_FASTROBOX_TEST_USERS") {
    throw new Error(
      "Set SEED_CONFIRM=CREATE_FASTROBOX_TEST_USERS after verifying the target database.",
    );
  }

  const accounts = [
    {
      fullName: "Fastrobox Admin",
      username: "admin",
      email: "admin@example.test",
      role: "ADMIN",
      password: env.SEED_ADMIN_PASSWORD,
    },
    {
      fullName: "Fastrobox Teacher",
      username: "teacher",
      email: "teacher@example.test",
      role: "TEACHER",
      password: env.SEED_TEACHER_PASSWORD,
    },
    {
      fullName: "Student S1",
      username: "student-s1",
      email: "student-s1@example.test",
      role: "STUDENT",
      password: env.SEED_S1_PASSWORD ?? env.SEED_STUDENT_PASSWORD,
    },
    {
      fullName: "Student S2",
      username: "student-s2",
      email: "student-s2@example.test",
      role: "STUDENT",
      password: env.SEED_S2_PASSWORD ?? env.SEED_STUDENT_PASSWORD,
    },
    {
      fullName: "Guardian S1",
      username: "guardian-s1",
      email: "guardian-s1@example.test",
      role: "GUARDIAN",
      password: env.SEED_GUARDIAN_S1_PASSWORD ?? env.SEED_GUARDIAN_PASSWORD,
    },
  ] as const;

  for (const account of accounts) {
    if (!account.password || account.password.length < 12) {
      throw new Error(`Set a unique SEED_${account.role}_PASSWORD of at least 12 characters.`);
    }
    if (Buffer.byteLength(account.password, "utf8") > 72) {
      throw new Error(`SEED_${account.role}_PASSWORD must be at most 72 UTF-8 bytes.`);
    }
  }

  const pool = new Pool({
    connectionString: env.POSTGRESS_SERVER,
    max: 1,
    connectionTimeoutMillis: 5_000,
  });

  try {
    for (const account of accounts) {
      const password = account.password;
      if (!password) {
        throw new Error(`Set SEED_${account.role}_PASSWORD before seeding.`);
      }
      const passwordHash = await hash(password, 12);
      const result = await pool.query(
        `INSERT INTO users (full_name, username, email, password_hash, role)
         VALUES ($1, $2, $3, $4, $5::user_role)
         ON CONFLICT DO NOTHING
         RETURNING id`,
        [account.fullName, account.username, account.email, passwordHash, account.role],
      );

      console.info(
        `${result.rowCount === 1 ? "Created" : "Skipped existing"} ${account.role} test user.`,
      );
    }

    const teacherRow = await pool.query<{ id: string }>(
      `SELECT id FROM users WHERE username = 'teacher' LIMIT 1`,
    );
    if (teacherRow.rowCount === 1) {
      await pool.query(
        `INSERT INTO teacher_room_access (teacher_id, room_id)
         VALUES ($1, 'room-01')
         ON CONFLICT DO NOTHING`,
        [teacherRow.rows[0].id],
      );
    }

    const guardianRow = await pool.query<{ id: string }>(
      `SELECT id FROM users WHERE username = 'guardian-s1' LIMIT 1`,
    );
    const studentRow = await pool.query<{ id: string }>(
      `SELECT id FROM users WHERE username = 'student-s1' LIMIT 1`,
    );
    if (guardianRow.rowCount === 1 && studentRow.rowCount === 1) {
      await pool.query(
        `INSERT INTO guardian_children (guardian_id, student_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [guardianRow.rows[0].id, studentRow.rows[0].id],
      );
    }
  } finally {
    await pool.end();
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Seeding failed.");
  process.exitCode = 1;
});