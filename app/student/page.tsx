import { Suspense } from "react";
import { EmergencyBanner } from "@/components/emergency-banner";
import { requireUser } from "@/lib/authz";
import { authorizeRoles } from "@/lib/authz";

export default function StudentDashboardPage() {
  return (
    <Suspense fallback={<div className="overview-loading" aria-label="Loading student dashboard" />}>
      <StudentDashboardContent />
    </Suspense>
  );
}

async function StudentDashboardContent() {
  await requireUser();
  const access = await authorizeRoles("STUDENT");
  if (!access.ok) {
    throw new Error("Forbidden");
  }

  return (
    <main className="workspace-main">
      <EmergencyBanner />
      <div className="overview-content">
        <header className="overview-heading">
          <p className="eyebrow">Student</p>
          <h1>My attendance</h1>
          <p>Your own attendance is visible here only.</p>
        </header>
        <section className="role-panel">
          <div className="role-panel-topline"><span className="role-indicator" /> <span>STUDENT</span></div>
          <div className="role-panel-body">
            <div>
              <p className="eyebrow">Access</p>
              <p>Only your own attendance and personal records are available.</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
