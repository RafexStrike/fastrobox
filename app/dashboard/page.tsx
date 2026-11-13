import { Suspense } from "react";
import { requireUser } from "@/lib/authz";
import { roleDescriptions, roleLabels } from "@/lib/roles";

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="overview-loading" aria-label="Loading overview" />}>
      <DashboardOverview />
    </Suspense>
  );
}

async function DashboardOverview() {
  const user = await requireUser();

  return (
    <div className="overview-content">
      <header className="overview-heading">
        <p className="eyebrow">Your workspace</p>
        <h1>Welcome, {user.fullName}.</h1>
        <p>One place to keep your learning community moving.</p>
      </header>

      <section className="role-panel" aria-labelledby="role-title">
        <div className="role-panel-topline">
          <span className="role-indicator" aria-hidden="true" />
          <span>ACCOUNT ACCESS</span>
          <time dateTime={new Date().toISOString()}>
            {new Intl.DateTimeFormat("en", {
              weekday: "long",
              month: "long",
              day: "numeric",
            }).format(new Date())}
          </time>
        </div>
        <div className="role-panel-body">
          <div>
            <p className="eyebrow">Your role</p>
            <h2 id="role-title">{roleLabels[user.role]}</h2>
            <p className="role-description">{roleDescriptions[user.role]}</p>
          </div>
          <span className={`role-stamp role-stamp-${user.role.toLowerCase()}`}>
            {user.role}
          </span>
        </div>
      </section>

      <footer className="overview-footer">
        <span>FASTROBOX</span>
        <span>Signed in as {user.username}</span>
      </footer>
    </div>
  );
}