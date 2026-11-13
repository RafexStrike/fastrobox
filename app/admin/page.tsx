import Link from "next/link";
import { Suspense } from "react";
import { EmergencyBanner } from "@/components/emergency-banner";
import { requireUser } from "@/lib/authz";
import { authorizeRoles } from "@/lib/authz";

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={<div className="overview-loading" aria-label="Loading admin dashboard" />}>
      <AdminDashboardContent />
    </Suspense>
  );
}

async function AdminDashboardContent() {
  const user = await requireUser();
  const access = await authorizeRoles("ADMIN");
  if (!access.ok) {
    throw new Error("Forbidden");
  }

  return (
    <main className="workspace-main">
      <EmergencyBanner />
      <div className="overview-content">
        <header className="overview-heading">
          <p className="eyebrow">Admin</p>
          <h1>Welcome, {user.fullName}</h1>
          <p>Secure operations, room visibility, and system health.</p>
        </header>
        <section className="role-panel">
          <div className="role-panel-topline"><span className="role-indicator" /> <span>ADMIN</span></div>
          <div className="role-panel-body">
            <div>
              <p className="eyebrow">Controls</p>
              <ul>
                <li><Link href="/admin/login-history">Login history</Link></li>
                <li><Link href="/dashboard">System overview</Link></li>
                <li><Link href="/device-health">Device health</Link></li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
