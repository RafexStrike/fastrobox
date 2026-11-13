import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { pool } from "@/lib/db";
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

export async function authorizeResource({
  allowedRoles,
  roomId,
  studentId,
  deviceId,
}: {
  allowedRoles: UserRole[];
  roomId?: string | null;
  studentId?: string | null;
  deviceId?: string | null;
}) {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false as const, status: 401 as const };
  }
  if (!allowedRoles.includes(user.role)) {
    return { ok: false as const, status: 403 as const };
  }

  if (user.role === "ADMIN") {
    return { ok: true as const, user };
  }

  if (roomId && user.role === "TEACHER") {
    const result = await pool.query(
      `SELECT 1 FROM teacher_room_access WHERE teacher_id = $1 AND room_id = $2 LIMIT 1`,
      [user.id, roomId],
    );
    if (result.rowCount !== 1) {
      return { ok: false as const, status: 403 as const };
    }
    return { ok: true as const, user };
  }

  if (studentId && user.role === "GUARDIAN") {
    const result = await pool.query(
      `SELECT 1 FROM guardian_children WHERE guardian_id = $1 AND student_id = $2 LIMIT 1`,
      [user.id, studentId],
    );
    if (result.rowCount !== 1) {
      return { ok: false as const, status: 403 as const };
    }
    return { ok: true as const, user };
  }

  if (studentId && user.role === "STUDENT") {
    if (studentId !== user.id) {
      return { ok: false as const, status: 403 as const };
    }
    return { ok: true as const, user };
  }

  if (deviceId && user.role === "TEACHER") {
    const result = await pool.query(
      `SELECT 1
         FROM mqtt_devices d
         LEFT JOIN teacher_room_access a ON a.room_id = d.room_id
        WHERE d.device_id = $1 AND a.teacher_id = $2
        LIMIT 1`,
      [deviceId, user.id],
    );
    if (result.rowCount !== 1) {
      return { ok: false as const, status: 403 as const };
    }
    return { ok: true as const, user };
  }

  return { ok: true as const, user };
}