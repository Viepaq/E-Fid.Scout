import { NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Lock screen — checked before everything else ──────────────────────────
  const lockExempt =
    pathname === "/lock" ||
    pathname.startsWith("/api/");

  const unlocked = request.cookies.get("site-unlocked")?.value === "true";

  if (!unlocked && !lockExempt) {
    const lockUrl = request.nextUrl.clone();
    lockUrl.pathname = "/lock";
    return NextResponse.redirect(lockUrl);
  }

  // ── Supabase session + route guards ───────────────────────────────────────
  const { response, user, serviceClient } = await updateSession(request);

  const isProtected =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/scout") ||
    pathname === "/select";

  if (isProtected && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  // Role guard: /scout requires 'scout' or 'admin'.
  // Uses service role client so RLS never blocks the lookup.
  if (pathname.startsWith("/scout") && user) {
    const { data: profile } = await serviceClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role === "user") {
      const dashboardUrl = request.nextUrl.clone();
      dashboardUrl.pathname = "/dashboard";
      return NextResponse.redirect(dashboardUrl);
    }
  }

  if (pathname === "/" && user) {
    const selectUrl = request.nextUrl.clone();
    selectUrl.pathname = "/select";
    return NextResponse.redirect(selectUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
