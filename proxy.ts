import { NextResponse } from "next/server";
import { auth } from "@/auth";

export default auth((request) => {
  const pathname = request.nextUrl.pathname;
  const isApiRequest = pathname.startsWith("/api/");

  if (request.auth?.user?.id) {
    if (pathname === "/login") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  if (pathname === "/login") {
    return NextResponse.next();
  }

  if (isApiRequest) {
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set(
    "callbackUrl",
    `${pathname}${request.nextUrl.search}`,
  );
  return NextResponse.redirect(loginUrl);
});

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/api/((?!auth/).*)"],
};