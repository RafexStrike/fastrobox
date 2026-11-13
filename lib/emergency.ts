import { pool } from "@/lib/db";

export type EmergencyState =
  | { active: false }
  | { active: true; eventType: "FIRE" | "PANIC" | "HEAT_DANGER"; messageTs: string };

export async function getEmergencyState(): Promise<EmergencyState> {
  const result = await pool.query<{
    event_type: string;
    message_ts: string;
  }>(
    `SELECT event_type, message_ts
       FROM sensor_messages
      WHERE message_kind = 'event'
        AND event_type IN ('FIRE', 'PANIC', 'HEAT_DANGER')
      ORDER BY message_ts DESC
      LIMIT 1`,
  );

  const row = result.rows[0];
  if (!row) {
    return { active: false };
  }

  return {
    active: true,
    eventType: row.event_type as "FIRE" | "PANIC" | "HEAT_DANGER",
    messageTs: row.message_ts,
  };
}
