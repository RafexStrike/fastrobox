import { authorizeRoles, getCurrentUser } from "@/lib/authz";
import { getLoginHistory } from "@/lib/users";

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return Response.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const access = await authorizeRoles("ADMIN");
  if (!access.ok) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const entries = await getLoginHistory(100);
  return Response.json({ entries });
}
