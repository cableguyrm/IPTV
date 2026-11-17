import { NextResponse, type NextRequest } from "next/server";

/** Fast pre-check: send visitors without a session cookie to login. Real authorisation happens server-side. */
export function middleware(req: NextRequest) {
  if (!req.cookies.get("btn_session")) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(req.nextUrl.pathname)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/dashboard/:path*", "/admin/:path*"] };
