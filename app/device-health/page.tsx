import { Suspense } from "react";
import { requireUser } from "@/lib/authz";
import { authorizeRoles } from "@/lib/authz";

export default function DeviceHealthPage() {
  return (
    <Suspense fallback={<div className="overview-loading" aria-label="Loading device health" />}>
      <DeviceHealthContent />
    </Suspense>
  );
}

async function DeviceHealthContent() {
  await requireUser();
  const access = await authorizeRoles("ADMIN", "TEACHER");
  if (!access.ok) {
    throw new Error("Forbidden");
  }

  return (
    <main className="workspace-main">
      <div className="overview-content">
        <header className="overview-heading">
          <p className="eyebrow">Health</p>
          <h1>Device health panel</h1>
          <p>Live status for room devices you are authorized to inspect.</p>
        </header>
        <section className="role-panel">
          <div className="role-panel-topline"><span className="role-indicator" /> <span>DEVICE HEALTH</span></div>
          <div className="role-panel-body">
            <div>
              <p>Operational health data loads from the MQTT telemetry table and device registry.</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
