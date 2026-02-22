// src/app/dashboard/page.tsx
// Server component: validates session, fetches data, renders the dashboard.
// If no session → middleware already redirects to /api/auth/login,
// but we double-check here for safety.

import { getSession } from "@auth0/nextjs-auth0";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const session = await getSession();

  // Middleware handles most cases, but belt-and-suspenders here
  if (!session?.user) {
    redirect("/api/auth/login");
  }

  // Load the user's org data for initial render
  const user = await db.user.findUnique({
    where: { auth0Id: session.user.sub },
    include: { organization: true },
  });

  if (!user) {
    // Should never happen (afterCallback creates the user), but handle gracefully
    redirect("/api/auth/login");
  }

  // Fetch initial dashboard data server-side (no loading flicker)
  const [latestSnapshot, latestKPI, recentTransactions] = await Promise.all([
    db.cashSnapshot.findFirst({
      where: { orgId: user.orgId },
      orderBy: { date: "desc" },
    }),
    db.kPIRecord.findFirst({
      where: { orgId: user.orgId },
      orderBy: { period: "desc" },
    }),
    db.financialTransaction.findMany({
      where: {
        orgId: user.orgId,
        date: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { date: "desc" },
      take: 100,
    }),
  ]);

  // Serialize for client component (Dates → strings)
  const initialData = {
    user: {
      name: user.name,
      email: user.email,
      role: user.role,
      orgName: user.organization.name,
    },
    cashOnHand: latestSnapshot?.cashOnHand ?? 0,
    runway: latestSnapshot?.runway ?? 0,
    burnRate: latestSnapshot?.burnRate ?? 0,
    kpis: {
      ltv: latestKPI?.ltv ?? 0,
      cac: latestKPI?.cac ?? 0,
      ratio: latestKPI?.ltvCacRatio ?? 0,
      mrr: latestKPI?.mrr ?? 0,
      arr: latestKPI?.arr ?? 0,
    },
    transactionCount: recentTransactions.length,
  };

  return <DashboardClient initialData={initialData} />;
}
