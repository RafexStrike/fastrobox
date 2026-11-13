import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { findUserById, type AuthenticatedUser } from "@/lib/users";
import type { UserRole } from "@/lib/roles";

export const getCurrentUser = cache(async (): Promise<AuthenticatedUser | null> => {
  const session = await auth();
  const id = session?.user?.id;

  if (!id) {
    return null;
  }

  return findUserById(id);
});

export async function requireUser(): Promise<AuthenticatedUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export async function authorizeRoles(...roles: UserRole[]) {
  const user = await getCurrentUser();

  if (!user) {
    return { ok: false as const, status: 401 as const };
  }
  if (!roles.includes(user.role)) {
    return { ok: false as const, status: 403 as const };
  }

  return { ok: true as const, user };
}