import { Suspense } from "react";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/authz";
import { getDefaultDashboardPath } from "@/lib/roles";

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="overview-loading" aria-label="Loading dashboard" />}>
      <DashboardRedirect />
    </Suspense>
  );
}

async function DashboardRedirect() {
  const user = await requireUser();
  redirect(getDefaultDashboardPath(user.role));
  return null;
}
