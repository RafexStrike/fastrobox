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
    fullName: "Fastrobox Student",
    username: "student",
    email: "student@example.test",
    role: "STUDENT",
  },
  {
    fullName: "Fastrobox Guardian",
    username: "guardian",
    email: "guardian@example.test",
    role: "GUARDIAN",
  },
] as const;

async function main() {
  loadEnvConfig(process.cwd());

  const { env } = await import("../.environment");
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