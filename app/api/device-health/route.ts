import { authorizeRoles, getCurrentUser } from "@/lib/authz";
import { pool } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const access = await authorizeRoles("ADMIN", "TEACHER");
  if (!access.ok) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  let query = `
    SELECT DISTINCT ON (d.device_id)
      d.device_id,
      d.room_id,
      d.last_seen_at,
      d.is_online,
      sm.message_ts,
      sm.uptime_s,
      sm.rssi,
      sm.heap_kb,
      sm.chip_temp_c,
      sm.fw,
      sm.payload,
      sm.detail
    FROM mqtt_devices d
    LEFT JOIN sensor_messages sm
      ON sm.device_id = d.device_id AND sm.message_kind = 'telemetry'
  `;

  const params: string[] = [];
  if (user.role === "TEACHER") {
    query += ` WHERE d.room_id IN (
      SELECT room_id FROM teacher_room_access WHERE teacher_id = $1
    )`;
    params.push(user.id);
  }

  query += ` ORDER BY d.device_id, sm.message_ts DESC NULLS LAST`;

  const result = await pool.query(query, params);

  return Response.json({
    devices: result.rows.map((row) => ({
      deviceId: row.device_id,
      roomId: row.room_id,
      lastSeenAt: row.last_seen_at,
      isOnline: row.is_online,
      telemetryTs: row.message_ts,
      uptimeS: row.uptime_s,
      rssi: row.rssi,
      heapKb: row.heap_kb,
      chipTempC: row.chip_temp_c,
      fw: row.fw,
      payload: row.payload,
      detail: row.detail,
    })),
  });
}
