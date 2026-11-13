import { authorizeResource } from "@/lib/authz";
import { sendDeviceCommand } from "@/lib/mqtt/client";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { roomId?: unknown };
  const roomId = typeof body.roomId === "string" ? body.roomId.trim() : "";
  if (!roomId) {
    return Response.json({ error: "A room ID is required." }, { status: 400 });
  }

  const access = await authorizeResource({
    allowedRoles: ["ADMIN", "TEACHER"],
    roomId,
  });
  if (!access.ok) {
    return Response.json(
      { error: access.status === 401 ? "Unauthenticated" : "Forbidden" },
      { status: access.status },
    );
  }

  try {
    const result = await sendDeviceCommand("reset-fire", {
      roomId,
      actor: access.user.role,
      userId: access.user.id,
    });
    if (!result.ok) {
      return Response.json({ error: "Reset command could not be sent because the MQTT command path is unavailable." }, { status: 503 });
    }
    return Response.json({ ok: true, message: "Reset-fire command published. Device-side confirmation is not yet verified." });
  } catch (error) {
    console.error("fire reset command failed", error);
    return Response.json({ error: "Reset failed." }, { status: 500 });
  }
}
