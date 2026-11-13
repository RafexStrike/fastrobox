import { Suspense } from "react";
import { authorizeResource, requireUser } from "@/lib/authz";

export default function RoomDashboardPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  return (
    <Suspense fallback={<div className="overview-loading" aria-label="Loading room dashboard" />}>
      <RoomDashboardContent params={params} />
    </Suspense>
  );
}

async function RoomDashboardContent({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  await requireUser();
  const access = await authorizeResource({
    allowedRoles: ["ADMIN", "TEACHER"],
    roomId,
  });
  if (!access.ok) {
    throw new Error("Forbidden");
  }

  return (
    <main className="workspace-main">
      <div className="overview-content">
        <header className="overview-heading">
          <p className="eyebrow">Room</p>
          <h1>Room {roomId}</h1>
          <p>Temperature, humidity, location, and emergency state update automatically.</p>
        </header>
        <section className="role-panel">
          <div className="role-panel-topline"><span className="role-indicator" /> <span>LIVE STATUS</span></div>
          <div className="role-panel-body">
            <div>
              <p>Room telemetry is served from the PostgreSQL MQTT records for this room.</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
