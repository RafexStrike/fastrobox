import { authorizeRoles } from "@/lib/authz";
import { pool } from "@/lib/db";

export async function GET(request: Request) {
  const access = await authorizeRoles("ADMIN", "TEACHER");
  if (!access.ok) {
    return Response.json(
      { error: access.status === 401 ? "Unauthenticated" : "Forbidden" },
      { status: access.status },
    );
  }

  const { searchParams } = new URL(request.url);
  const roomId = searchParams.get("roomId");

  let query = `
    SELECT DISTINCT ON (room_id)
      room_id,
      device_id,
      message_ts,
      temp_c,
      rh,
      heat_index_c,
      flame,
      door,
      status,
      heat_trend,
      rssi,
      heap_kb,
      chip_temp_c,
      fw,
      quality,
      payload
    FROM sensor_messages
    WHERE message_kind = 'telemetry'
  `;
  const params: string[] = [];

  if (access.user.role === "TEACHER") {
    query += ` AND room_id IN (
      SELECT room_id FROM teacher_room_access WHERE teacher_id = $1
    )`;
    params.push(access.user.id);
  }

  if (roomId) {
    params.push(roomId);
    query += ` AND room_id = $${params.length}`;
  }

  query += ` ORDER BY room_id, message_ts DESC`;

  const result = await pool.query(query, params);

  return Response.json(
    {
      rooms: result.rows.map((row) => ({
        roomId: row.room_id,
        deviceId: row.device_id,
        messageTs: row.message_ts,
        tempC: row.temp_c,
        rh: row.rh,
        heatIndexC: row.heat_index_c,
        flame: row.flame,
        door: row.door,
        status: row.status,
        heatTrend: row.heat_trend,
        rssi: row.rssi,
        heapKb: row.heap_kb,
        chipTempC: row.chip_temp_c,
        fw: row.fw,
        quality: row.quality,
        payload: row.payload,
      })),
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
