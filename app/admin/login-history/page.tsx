import { Suspense } from "react";
import { requireUser } from "@/lib/authz";
import { getLoginHistory } from "@/lib/users";

export default function AdminLoginHistoryPage() {
  return (
    <Suspense fallback={<div className="overview-loading" aria-label="Loading login history" />}>
      <AdminLoginHistoryContent />
    </Suspense>
  );
}

async function AdminLoginHistoryContent() {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    throw new Error("Forbidden");
  }

  const entries = await getLoginHistory(50);

  return (
    <main className="workspace-main">
      <div className="overview-content">
        <header className="overview-heading">
          <p className="eyebrow">Admin</p>
          <h1>Login history</h1>
        </header>
        <section className="role-panel">
          <div className="role-panel-topline"><span className="role-indicator" /> <span>LOGIN HISTORY</span></div>
          <div className="role-panel-body">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>User</th>
                  <th>Status</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {entries.length === 0 ? (
                  <tr><td colSpan={4}>No entries yet.</td></tr>
                ) : (
                  entries.map((entry) => (
                    <tr key={entry.id}>
                      <td>{new Date(entry.created_at).toLocaleString()}</td>
                      <td>{entry.username ?? "unknown"}</td>
                      <td>{entry.success ? "Success" : "Failure"}</td>
                      <td>{entry.reason ?? "n/a"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
