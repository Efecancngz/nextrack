import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/config";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const hasUsername = !!req.auth?.user?.username;
  const { pathname } = req.nextUrl;

  // 1. If not logged in, only protect /library paths
  if (!isLoggedIn) {
    if (pathname.startsWith("/library")) {
      const signInUrl = new URL("/auth/signin", req.nextUrl.origin);
      signInUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(signInUrl);
    }
    return;
  }

  // 2. If logged in but has no username:
  // Force redirect to /auth/set-username, except when already on /auth/set-username.
  if (!hasUsername && pathname !== "/auth/set-username") {
    // Avoid redirecting Next.js internal requests, auth APIs, or static page assets
    if (
      pathname.startsWith("/_next") ||
      pathname.startsWith("/api/auth") ||
      pathname === "/favicon.ico"
    ) {
      return;
    }
    return NextResponse.redirect(new URL("/auth/set-username", req.nextUrl.origin));
  }

  // 3. If logged in and already has a username, block access to the setup page
  if (hasUsername && pathname === "/auth/set-username") {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }
});

export const config = {
  // Run on all paths except API routes, static assets, and images
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
