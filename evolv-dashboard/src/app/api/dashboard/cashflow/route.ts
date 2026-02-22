// src/app/api/dashboard/cashflow/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@auth0/nextjs-auth0";
import { db } from "@/lib/db";
import { startOfWeek, addWeeks, format, subWeeks } from "date-fns";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({ where: { auth0Id: session.user.sub } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const orgId = user.orgId;
  const now = new Date();
  const thirteenWeeksAgo = subWeeks(now, 13);

  // Pull all transactions in the 13-week window
  const transactions = await db.financialTransaction.findMany({
    where: {
      orgId,
      date: { gte: thirteenWeeksAgo },
    },
    orderBy: { date: "asc" },
  });

  // Bucket by week
  const weeks: Record<string, { inflow: number; outflow: number }> = {};

  for (let i = 0; i < 13; i++) {
    const weekStart = startOfWeek(addWeeks(thirteenWeeksAgo, i));
    const key = `W${i + 1}`;
    weeks[key] = { inflow: 0, outflow: 0 };
  }

  for (const txn of transactions) {
    const txnWeek = Math.floor(
      (txn.date.getTime() - thirteenWeeksAgo.getTime()) / (7 * 24 * 60 * 60 * 1000)
    );
    const key = `W${Math.min(txnWeek + 1, 13)}`;
    if (!weeks[key]) continue;

    if (["credit", "payment", "invoice"].includes(txn.type)) {
      weeks[key].inflow += txn.amount;
    } else {
      weeks[key].outflow += txn.amount;
    }
  }

  const cashFlowData = Object.entries(weeks).map(([week, { inflow, outflow }]) => ({
    week,
    inflow: Math.round(inflow),
    outflow: Math.round(outflow),
    net: Math.round(inflow - outflow),
  }));

  // Cash position trend
  const snapshots = await db.cashSnapshot.findMany({
    where: { orgId, date: { gte: thirteenWeeksAgo } },
    orderBy: { date: "asc" },
    take: 30,
  });

  // KPIs
  const latestKPI = await db.kPIRecord.findFirst({
    where: { orgId },
    orderBy: { period: "desc" },
  });

  const latestSnapshot = snapshots[snapshots.length - 1];
  const prevSnapshot = snapshots[snapshots.length - 2];

  return NextResponse.json({
    cashFlowData,
    cashPosition: {
      current: latestSnapshot?.cashOnHand ?? 0,
      previous: prevSnapshot?.cashOnHand ?? 0,
      history: snapshots.map(s => ({
        date: format(s.date, "MMM d"),
        cash: Math.round(s.cashOnHand),
      })),
    },
    kpis: {
      ltv: latestKPI?.ltv ?? 0,
      cac: latestKPI?.cac ?? 0,
      ratio: latestKPI?.ltvCacRatio ?? 0,
      mrr: latestKPI?.mrr ?? 0,
      arr: latestKPI?.arr ?? 0,
      churnRate: latestKPI?.churnRate ?? 0,
    },
    runway: latestSnapshot?.runway ?? 0,
    burnRate: latestSnapshot?.burnRate ?? 0,
  });
}
