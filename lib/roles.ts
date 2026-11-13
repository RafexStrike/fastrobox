export const userRoles = ["ADMIN", "TEACHER", "STUDENT", "GUARDIAN"] as const;
export const selfRegisterableRoles = ["TEACHER", "STUDENT", "GUARDIAN"] as const;

export type UserRole = (typeof userRoles)[number];
export type SelfRegisterableRole = (typeof selfRegisterableRoles)[number];

export function isUserRole(value: unknown): value is UserRole {
  return userRoles.some((role) => role === value);
}

export function isSelfRegisterableRole(value: unknown): value is SelfRegisterableRole {
  return selfRegisterableRoles.some((role) => role === value);
}

export const roleLabels: Record<UserRole, string> = {
  ADMIN: "Administrator",
  TEACHER: "Teacher",
  STUDENT: "Student",
  GUARDIAN: "Guardian",
};

export const roleDescriptions: Record<UserRole, string> = {
  ADMIN: "Manage the learning community and keep operations moving.",
  TEACHER: "Plan lessons, follow class progress, and support your learners.",
  STUDENT: "Pick up where you left off and keep your learning in motion.",
  GUARDIAN: "Stay close to the learning journey and the progress being made.",
};

export const roleDashboardPaths: Record<UserRole, string> = {
  ADMIN: "/admin",
  TEACHER: "/teacher",
  STUDENT: "/student",
  GUARDIAN: "/guardian",
};

export function getDefaultDashboardPath(role: UserRole): string {
  return roleDashboardPaths[role] ?? "/dashboard";
}

export function canAccessAdminHistory(role: UserRole): boolean {
  return role === "ADMIN";
}

export function canAccessDeviceHealth(role: UserRole): boolean {
  return role === "ADMIN" || role === "TEACHER";
}

export function canResetFire(role: UserRole): boolean {
  return role === "ADMIN" || role === "TEACHER";
}