// src/app/api/plaid/exchange-token/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@auth0/nextjs-auth0";
import { plaidClient } from "@/lib/plaid";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/crypto";
import { auditLog } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { public_token } = await req.json();

  const user = await db.user.findUnique({ where: { auth0Id: session.user.sub } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  try {
    const exchange = await plaidClient.itemPublicTokenExchange({ public_token });
    const { access_token, item_id } = exchange.data;

    await db.integration.upsert({
      where: { orgId_provider: { orgId: user.orgId, provider: "PLAID" } } as any,
      update: {
        accessToken: encrypt(access_token),
        realmId: item_id,
        status: "ACTIVE",
        lastSyncAt: new Date(),
      },
      create: {
        provider: "PLAID",
        accessToken: encrypt(access_token),
        realmId: item_id,
        status: "ACTIVE",
        orgId: user.orgId,
      },
    });

    await auditLog(user.id, "CONNECTED_PLAID", "integration");

    // Trigger initial sync
    await syncPlaidTransactions(user.orgId, access_token);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Plaid exchange error:", err?.response?.data || err);
    return NextResponse.json({ error: "Token exchange failed" }, { status: 500 });
  }
}

// ── Sync Helper ─────────────────────────────────────────────────────────────
async function syncPlaidTransactions(orgId: string, accessToken: string) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 90); // 90 days back

  const response = await plaidClient.transactionsGet({
    access_token: accessToken,
    start_date: startDate.toISOString().split("T")[0],
    end_date: new Date().toISOString().split("T")[0],
  });

  const txns = response.data.transactions;

  // Upsert all transactions
  for (const txn of txns) {
    await db.financialTransaction.upsert({
      where: { source_externalId_orgId: { source: "PLAID", externalId: txn.transaction_id, orgId } },
      update: {
        amount: txn.amount,
        description: txn.name,
        category: txn.personal_finance_category?.primary,
        date: new Date(txn.date),
      },
      create: {
        source: "PLAID",
        externalId: txn.transaction_id,
        type: txn.amount > 0 ? "debit" : "credit",
        amount: Math.abs(txn.amount),
        currency: txn.iso_currency_code || "USD",
        date: new Date(txn.date),
        description: txn.name,
        category: txn.personal_finance_category?.primary,
        accountId: txn.account_id,
        orgId,
      },
    });
  }

  // Update cash snapshot with current balances
  const balances = await plaidClient.accountsBalanceGet({ access_token: accessToken });
  const totalCash = balances.data.accounts.reduce(
    (sum, acc) => sum + (acc.balances.current || 0), 0
  );

  await db.cashSnapshot.create({
    data: {
      date: new Date(),
      cashOnHand: totalCash,
      source: "plaid",
      orgId,
    },
  });
}
