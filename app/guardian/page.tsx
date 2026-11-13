import { Suspense } from "react";
import { EmergencyBanner } from "@/components/emergency-banner";
import { requireUser } from "@/lib/authz";
import { authorizeRoles } from "@/lib/authz";

export default function GuardianDashboardPage() {
  return (
    <Suspense fallback={<div className="overview-loading" aria-label="Loading guardian dashboard" />}>
      <GuardianDashboardContent />
    </Suspense>
  );
}

async function GuardianDashboardContent() {
  await requireUser();
  const access = await authorizeRoles("GUARDIAN");
  if (!access.ok) {
    throw new Error("Forbidden");
  }

  return (
    <main className="workspace-main">
      <EmergencyBanner />
      <div className="overview-content">
        <header className="overview-heading">
          <p className="eyebrow">Guardian</p>
          <h1>Child overview</h1>
          <p>Arrival, attendance, and notices for linked children only.</p>
        </header>
        <section className="role-panel">
          <div className="role-panel-topline"><span className="role-indicator" /> <span>GUARDIAN</span></div>
          <div className="role-panel-body">
            <div>
              <p className="eyebrow">Scope</p>
              <p>Only linked child records are available to this account.</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
