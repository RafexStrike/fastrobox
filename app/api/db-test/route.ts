import { NextResponse } from "next/server";
import { authorizeRoles } from "@/lib/authz";
import { pool } from "@/lib/db";

export async function GET() {
  const access = await authorizeRoles("ADMIN");
  if (!access.ok) {
    return NextResponse.json(
      { error: access.status === 401 ? "Unauthenticated" : "Forbidden" },
      { status: access.status },
    );
  }

  try {
    const result = await pool.query("SELECT NOW() AS time");

    return NextResponse.json({
      success: true,
      databaseTime: result.rows[0].time,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Database connection failed" },
      { status: 500 }
    );
  }
}