import type { ReactNode } from "react";
import { Suspense } from "react";
import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { EmergencyBanner } from "@/components/emergency-banner";
import { LanguageSwitcher } from "@/components/language-switcher";
import { requireUser } from "@/lib/authz";
import { roleLabels } from "@/lib/roles";

export default function DashboardLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <Suspense fallback={<div className="dashboard-loading" aria-label="Loading workspace" />}>
      <AuthenticatedWorkspace>{children}</AuthenticatedWorkspace>
    </Suspense>
  );
}

async function AuthenticatedWorkspace({ children }: Readonly<{ children: ReactNode }>) {
  const user = await requireUser();

  return (
    <div className="workspace-shell">
      <aside className="workspace-sidebar">
        <Link className="workspace-wordmark" href="/dashboard">
          <span className="wordmark-mark" aria-hidden="true">F</span>
          <span>Fastrobox</span>
        </Link>
        <p className="sidebar-label">Workspace</p>
        <Link className="sidebar-link sidebar-link-active" href="/dashboard" aria-current="page">
          <span className="nav-mark" aria-hidden="true" />
          Overview
        </Link>
        {user.role === "ADMIN" && (
          <Link className="sidebar-link" href="/admin/login-history">
            Login history
          </Link>
        )}
        <div className="sidebar-bottom">
          <LanguageSwitcher initialLocale="en" />
          <div className="account-chip">
            <span className="account-initial" aria-hidden="true">
              {user.username.slice(0, 1).toUpperCase()}
            </span>
            <span className="account-copy">
              <strong>{user.username}</strong>
              <span>{roleLabels[user.role]}</span>
            </span>
          </div>
          <form action={logout}>
            <button className="signout-button" type="submit">Sign out</button>
          </form>
        </div>
      </aside>
      <main className="workspace-main">
        <EmergencyBanner />
        {children}
      </main>
    </div>
  );
}