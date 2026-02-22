"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function OnboardingPage() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!companyName.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName: companyName.trim() }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Something went wrong");
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#080810", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 440, background: "linear-gradient(135deg, #0f0f18 0%, #0a0a14 100%)", border: "1px solid #1e1e30", borderRadius: 20, padding: "44px 40px", boxShadow: "0 32px 80px rgba(0,0,0,0.6)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 36 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700, color: "#fff" }}>E</div>
          <div>
            <p style={{ margin: 0
cat > src/app/api/onboarding/route.ts << 'EOF'
import { getSession } from "@auth0/nextjs-auth0";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { companyName } = await req.json();
    if (!companyName?.trim()) return NextResponse.json({ error: "Company name is required" }, { status: 400 });

    const user = await db.user.findUnique({ where: { auth0Id: session.user.sub } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    if (user.onboarded) return NextResponse.json({ success: true });

    const slug = `${companyName.trim().toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-")}-${Date.now()}`;

    await db.$transaction([
      db.organization.update({ where: { id: user.orgId }, data: { name: companyName.trim(), slug } }),
      db.user.update({ where: { id: user.id }, data: { onboarded: true } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[/api/onboarding]", err);
    return NextResponse.json({ error: "In
cat > middleware.ts << 'EOF'
import { withMiddlewareAuthRequired } from "@auth0/nextjs-auth0/edge";
import { NextResponse, NextRequest } from "next/server";

const rateMap = new Map<string, { count: number; reset: number }>();
const RATE_LIMIT = 100;
const RATE_WINDOW = 60 * 1000;

function rateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (!entry || now > entry.reset) { rateMap.set(ip, { count: 1, reset: now + RATE_WINDOW }); return true; }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

export default withMiddlewareAuthRequired(async function middleware(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  if (req.nextUrl.pathname.startsWith("/api/")) {
    if (!rateLimit(ip)) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });
  }
  const res = NextResponse.next();
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  return res;
});

export const config = {
  matcher: ["/dashboard/:path*", "/onboarding", "/api/dashboard/:path*", "/api/onboarding", "/api/chat/:path*", "/api/plaid/:path*", "/api/stripe/:path*", "/api/qbo/:path*"],
};
