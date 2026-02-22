// middleware.ts
import { withMiddlewareAuthRequired, getSession } from "@auth0/nextjs-auth0/edge";
import { NextResponse, NextRequest } from "next/server";

// Rate limiting map (in-memory for edge; use Redis/Upstash in production)
const rateMap = new Map<string, { count: number; reset: number }>();
const RATE_LIMIT = 100;  // requests per window
const RATE_WINDOW = 60 * 1000; // 1 minute

function rateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateMap.get(ip);

  if (!entry || now > entry.reset) {
    rateMap.set(ip, { count: 1, reset: now + RATE_WINDOW });
    return true;
  }

  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

export default withMiddlewareAuthRequired(async function middleware(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";

  // Rate limiting for API routes
  if (req.nextUrl.pathname.startsWith("/api/")) {
    if (!rateLimit(ip)) {
      return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
    }
  }

  const res = NextResponse.next();

  // Security headers
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.anthropic.com https://cdn.plaid.com"
  );
  res.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload"
  );

  return res;
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/dashboard/:path*",
    "/api/chat/:path*",
    "/api/plaid/:path*",
    "/api/stripe/:path*",
    "/api/qbo/:path*",
  ],
};
