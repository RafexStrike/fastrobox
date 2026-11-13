import { getCurrentUser } from "@/lib/authz";
import { getEmergencyState } from "@/lib/emergency";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const state = await getEmergencyState();
  return Response.json(state);
}
