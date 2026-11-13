function requiredValue(name: string, fallback?: string): string {
  const value = process.env[name]?.trim() || fallback?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const postgresServer = requiredValue("POSTGRESS_SERVER");
const authSecret = requiredValue("AUTH_SECRET", process.env.BETTER_AUTH_SECRET);

if (authSecret.length < 32) {
  throw new Error("AUTH_SECRET must contain at least 32 characters");
}

try {
  const protocol = new URL(postgresServer).protocol;
  if (protocol !== "postgres:" && protocol !== "postgresql:") {
    throw new Error();
  }
} catch {
  throw new Error("POSTGRESS_SERVER must be a valid PostgreSQL connection URL");
}

const nodeEnv = process.env.NODE_ENV ?? "development";
if (!["development", "test", "production"].includes(nodeEnv)) {
  throw new Error("NODE_ENV must be development, test, or production");
}

export const env = Object.freeze({
  POSTGRESS_SERVER: postgresServer,
  AUTH_SECRET: authSecret,
  NODE_ENV: nodeEnv as "development" | "test" | "production",
  SEED_ADMIN_PASSWORD: process.env.SEED_ADMIN_PASSWORD?.trim(),
  SEED_TEACHER_PASSWORD: process.env.SEED_TEACHER_PASSWORD?.trim(),
  SEED_STUDENT_PASSWORD: process.env.SEED_STUDENT_PASSWORD?.trim(),
  SEED_S1_PASSWORD: process.env.SEED_S1_PASSWORD?.trim(),
  SEED_S2_PASSWORD: process.env.SEED_S2_PASSWORD?.trim(),
  SEED_GUARDIAN_PASSWORD: process.env.SEED_GUARDIAN_PASSWORD?.trim(),
  SEED_GUARDIAN_S1_PASSWORD: process.env.SEED_GUARDIAN_S1_PASSWORD?.trim(),
  SEED_CONFIRM: process.env.SEED_CONFIRM?.trim(),
  TELEGRAM_NUMBER: process.env.TELEGRAM_NUMBER?.trim(),
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN?.trim(),
  TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID?.trim(),
  MQTT_HOST: process.env.MQTT_HOST?.trim(),
  MQTT_PORT: process.env.MQTT_PORT?.trim(),
  MQTT_TOPIC: process.env.MQTT_TOPIC?.trim(),
  MQTT_COMMAND_TOPIC: process.env.MQTT_COMMAND_TOPIC?.trim(),
});

export type AppEnvironment = typeof env;