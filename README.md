# Fastrobox Authentication

This project uses Auth.js v5 Credentials authentication, PostgreSQL, and bcryptjs. Public registration is available for ADMIN, TEACHER, STUDENT, and GUARDIAN roles; there is no OAuth provider. Authentication uses an eight-hour signed JWT session in Auth.js's HttpOnly cookie. The role shown in a session is checked against the current database user before protected data is returned.

Public ADMIN registration grants administrative access to anyone who can create an account. Disable or restrict that option through an invitation or approval workflow before using the app with real users.

## Environment

Copy `.env.example` to `.env.local` (or update your existing ignored `.env`) and set:

| Variable | Required | Purpose |
| --- | --- | --- |
| `POSTGRESS_SERVER` | Yes | Neon/PostgreSQL connection URL. The existing spelling is intentional. |
| `AUTH_SECRET` | Yes | Random secret of at least 32 characters for Auth.js sessions. |
| `SEED_ADMIN_PASSWORD` | Seed only | Initial ADMIN test user's password. |
| `SEED_TEACHER_PASSWORD` | Seed only | Initial TEACHER test user's password. |
| `SEED_STUDENT_PASSWORD` | Seed only | Initial STUDENT test user's password. |
| `SEED_GUARDIAN_PASSWORD` | Seed only | Initial GUARDIAN test user's password. |
| `SEED_CONFIRM` | Seed only | Must equal `CREATE_FASTROBOX_TEST_USERS` to enable seeding. |

Generate a session secret with `openssl rand -base64 32`. Choose four different test passwords with at least 12 characters. The seed command accepts only password values from environment variables and stores bcrypt hashes; do not put real user passwords in source control. The local environment loader temporarily accepts the previous `BETTER_AUTH_SECRET` key as a migration fallback, but new deployments should set `AUTH_SECRET`.

All application code reads environment variables through `environment.ts` and the `.environment.ts` re-export. Those modules are server-only by usage; never add a `NEXT_PUBLIC_` prefix to these values.

## Database Setup

1. In the Neon SQL Editor (or with `psql` connected to the intended database), run [`db/schema.sql`](db/schema.sql). It creates the `user_role` enum, `users` table including the full name field, case-insensitive unique indexes, and persistent login-lock fields. The migration is safe to rerun and backfills existing users' full names from their usernames.
2. Set all four seed passwords and `SEED_CONFIRM=CREATE_FASTROBOX_TEST_USERS` in `.env.local`.
3. Run `npm run db:seed`. It only inserts missing test accounts; it does not overwrite existing users or passwords. It prints no password or hash.
4. Start the app with `npm run dev`, then open `http://localhost:3000/login`.

The test usernames are `admin`, `teacher`, `student`, and `guardian`; each can also be reached by its corresponding `@example.test` email. Their passwords are the values you set in the matching `SEED_*_PASSWORD` variable. The seed script will not run without the explicit confirmation variable.

To create only the TEACHER, STUDENT, and GUARDIAN test accounts with generated passwords, run `npm run db:create-role-users`. It refuses to modify the database if any target username or email already exists. Save the passwords printed after creation; they are not stored in the environment or shown again.

To verify lockout locally, enter a wrong password for one seeded account three times. Further attempts must fail for 60 seconds. A successful login before the third failure resets the consecutive-attempt count. The `/api/db-test` diagnostic is ADMIN-only; `/api/me` returns only the current user's id, username, and role.

## Local Checks

```bash
npm run lint
npx tsc --noEmit
npm run build
```

The build validates the app but does not apply the schema or seed the database. Database-backed sign-in requires a reachable PostgreSQL database with the migration applied.

## Vercel and Neon

1. Create a Neon database and run `db/schema.sql` against it before deploying.
2. Import the project into Vercel and add `POSTGRESS_SERVER` and `AUTH_SECRET` to the Production environment. Use the Neon pooled connection string for serverless deployments and retain its required SSL parameters.
3. Add the same required variables to Preview and Development environments if those deployments need authentication. Never use `NEXT_PUBLIC_` for secrets.
4. Deploy. Auth.js sets secure, HttpOnly, SameSite cookies automatically for HTTPS deployments; the Proxy protects dashboard and API paths, and each server data path performs its own database-backed check.
5. To seed initial test accounts, provide the four `SEED_*_PASSWORD` values and `SEED_CONFIRM` only in a controlled environment, run `npm run db:seed` against the verified target database, then remove those seed variables from Vercel. The insert-only script will leave existing accounts unchanged.

Keep database credentials and auth secrets in Vercel's encrypted environment-variable settings and out of logs, client components, and committed files.