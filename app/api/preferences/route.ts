import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getLocaleFromCookie } from "@/lib/i18n";

export async function GET() {
  const cookieStore = await cookies();
  const locale = getLocaleFromCookie(cookieStore.get("fastrobox-lang")?.value);
  return NextResponse.json({ locale });
}

export async function POST(request: Request) {
  const body = (await request.json()) as { locale?: string };
  const locale = body.locale === "bn" ? "bn" : "en";
  const response = NextResponse.json({ locale });
  response.cookies.set("fastrobox-lang", locale, {
    path: "/",
    httpOnly: false,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}
