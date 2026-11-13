import Link from "next/link";
import { Suspense } from "react";
import { EmergencyBanner } from "@/components/emergency-banner";
import { requireUser } from "@/lib/authz";
import { authorizeRoles } from "@/lib/authz";

export default function TeacherDashboardPage() {
  return (
    <Suspense fallback={<div className="overview-loading" aria-label="Loading teacher dashboard" />}>
      <TeacherDashboardContent />
    </Suspense>
  );
}

async function TeacherDashboardContent() {
  await requireUser();
  const access = await authorizeRoles("TEACHER");
  if (!access.ok) {
    throw new Error("Forbidden");
  }

  return (
    <main className="workspace-main">
      <EmergencyBanner />
      <div className="overview-content">
        <header className="overview-heading">
          <p className="eyebrow">Teacher</p>
          <h1>Teacher workspace</h1>
          <p>Track room health, emergency alerts, and class permissions.</p>
        </header>
        <section className="role-panel">
          <div className="role-panel-topline"><span className="role-indicator" /> <span>TEACHER</span></div>
          <div className="role-panel-body">
            <div>
              <p className="eyebrow">Quick links</p>
              <ul>
                <li><Link href="/dashboard">Overview</Link></li>
                <li><Link href="/device-health">Device health</Link></li>
                <li><Link href="/room/room-01">Room dashboard</Link></li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
