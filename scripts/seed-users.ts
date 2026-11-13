import { loadEnvConfig } from "@next/env";
import { hash } from "bcryptjs";
import { Pool } from "pg";

async function main() {
  loadEnvConfig(process.cwd());

  const { env } = await import("../.environment");
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
      fullName: "Fastrobox Student",
      username: "student",
      email: "student@example.test",
      role: "STUDENT",
      password: env.SEED_STUDENT_PASSWORD,
    },
    {
      fullName: "Fastrobox Guardian",
      username: "guardian",
      email: "guardian@example.test",
      role: "GUARDIAN",
      password: env.SEED_GUARDIAN_PASSWORD,
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
  } finally {
    await pool.end();
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Seeding failed.");
  process.exitCode = 1;
});