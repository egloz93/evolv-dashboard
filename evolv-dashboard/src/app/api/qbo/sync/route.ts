// src/app/api/qbo/sync/route.ts
// Syncs QuickBooks Online P&L and expense data into our DB

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@auth0/nextjs-auth0";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import QuickBooks from "node-quickbooks";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({ where: { auth0Id: session.user.sub } });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const integration = await db.integration.findFirst({
    where: { orgId: user.orgId, provider: "QBO", status: "ACTIVE" },
  });

  if (!integration) {
    return NextResponse.json({ error: "QBO not connected" }, { status: 400 });
  }

  const accessToken = decrypt(integration.accessToken);
  const refreshToken = decrypt(integration.refreshToken || "");
  const realmId = integration.realmId!;

  const qbo = new QuickBooks(
    process.env.QBO_CLIENT_ID!,
    process.env.QBO_CLIENT_SECRET!,
    accessToken,
    false,
    realmId,
    process.env.QBO_ENVIRONMENT === "sandbox",
    true,
    null,
    "2.0",
    refreshToken
  );

  try {
    // Fetch P&L report
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth(), 1);

    const plReport = await new Promise<any>((resolve, reject) =>
      qbo.reportProfitAndLoss(
        { start_date: startDate.toISOString().split("T")[0], end_date: today.toISOString().split("T")[0] },
        (err: any, data: any) => (err ? reject(err) : resolve(data))
      )
    );

    // Parse revenue and expenses from QBO report rows
    const revenue = extractAmount(plReport, "Total Income");
    const expenses = extractAmount(plReport, "Total Expenses");
    const netIncome = extractAmount(plReport, "Net Income");

    // Store monthly KPI snapshot
    await db.kPIRecord.upsert({
      where: {
        orgId_period: {
          orgId: user.orgId,
          period: new Date(today.getFullYear(), today.getMonth(), 1),
        },
      },
      update: { mrr: revenue, arr: revenue * 12 },
      create: {
        period: new Date(today.getFullYear(), today.getMonth(), 1),
        mrr: revenue,
        arr: revenue * 12,
        orgId: user.orgId,
      },
    });

    // Update integration sync time
    await db.integration.update({
      where: { id: integration.id },
      data: { lastSyncAt: new Date() },
    });

    return NextResponse.json({ success: true, revenue, expenses, netIncome });
  } catch (err: any) {
    console.error("QBO sync error:", err);

    // Handle token expiry
    if (err?.statusCode === 401) {
      await db.integration.update({
        where: { id: integration.id },
        data: { status: "NEEDS_REAUTH" },
      });
      return NextResponse.json({ error: "QBO token expired, please reconnect" }, { status: 401 });
    }

    return NextResponse.json({ error: "QBO sync failed" }, { status: 500 });
  }
}

function extractAmount(report: any, label: string): number {
  // Walk QBO report rows to find matching label
  const rows = report?.Rows?.Row || [];
  for (const row of rows) {
    if (row?.Summary?.ColData?.[0]?.value === label) {
      return parseFloat(row.Summary.ColData[1]?.value || "0");
    }
    // Nested rows
    for (const subRow of row?.Rows?.Row || []) {
      if (subRow?.Summary?.ColData?.[0]?.value === label) {
        return parseFloat(subRow.Summary.ColData[1]?.value || "0");
      }
    }
  }
  return 0;
}
