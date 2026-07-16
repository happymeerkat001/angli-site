import { NextRequest, NextResponse } from "next/server";

type Protection = {
  username?: string;
  password?: string;
  realm: string;
  unavailableMessage: string;
};

function unauthorized(realm: string) {
  return new NextResponse("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": `Basic realm="${realm}"` },
  });
}

function isAuthorized(authorization: string | null, protection: Protection) {
  if (!authorization?.startsWith("Basic ")) return false;

  try {
    const [username, password] = atob(authorization.slice(6)).split(":");
    return username === protection.username && password === protection.password;
  } catch {
    return false;
  }
}

export function middleware(request: NextRequest) {
  const isDashboard = request.nextUrl.pathname.startsWith("/personal");
  const protection: Protection = isDashboard
    ? {
        username: process.env.DASHBOARD_USER,
        password: process.env.DASHBOARD_PASSWORD,
        realm: "Daily Dashboard",
        unavailableMessage: "Daily dashboard protection is not configured.",
      }
    : {
        username: process.env.HT101_ARCHIVE_USER,
        password: process.env.HT101_ARCHIVE_PASSWORD,
        realm: "HT101 Archive",
        unavailableMessage: "HT101 archive protection is not configured.",
      };

  if (!protection.username || !protection.password) {
    return new NextResponse(protection.unavailableMessage, { status: 503 });
  }

  return isAuthorized(request.headers.get("authorization"), protection)
    ? NextResponse.next()
    : unauthorized(protection.realm);
}

export const config = {
  matcher: ["/ht101/:path*", "/ht101-assets/:path*", "/personal/:path*"],
};