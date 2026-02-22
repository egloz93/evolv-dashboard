// src/app/api/chat/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@auth0/nextjs-auth0";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { auditLog } from "@/lib/audit";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { messages, orgId } = await req.json();

  const user = await db.user.findUnique({ where: { auth0Id: session.user.sub } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // ── Pull real-time financial context ──────────────────────────────────────
  const [latestSnapshot, recentTxns, latestKPI] = await Promise.all([
    db.cashSnapshot.findFirst({
      where: { orgId: user.orgId },
      orderBy: { date: "desc" },
    }),
    db.financialTransaction.findMany({
      where: { orgId: user.orgId, date: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
      orderBy: { date: "desc" },
      take: 50,
    }),
    db.kPIRecord.findFirst({
      where: { orgId: user.orgId },
      orderBy: { period: "desc" },
    }),
  ]);

  // Calculate burn rate from transactions
  const expenses = recentTxns.filter(t => t.type === "debit" || t.type === "expense");
  const revenue = recentTxns.filter(t => t.type === "credit" || t.type === "payment" || t.type === "invoice");
  const monthlyBurn = expenses.reduce((s, t) => s + t.amount, 0);
  const monthlyRevenue = revenue.reduce((s, t) => s + t.amount, 0);

  const systemPrompt = `You are Evolv AI, a senior CFO co-pilot embedded in the Evolv financial dashboard. 
You have access to real-time financial data for this organization.

CURRENT FINANCIAL CONTEXT (as of ${new Date().toLocaleDateString()}):
- Cash on Hand: $${latestSnapshot?.cashOnHand?.toLocaleString() ?? "N/A"}
- Monthly Burn Rate: $${monthlyBurn.toLocaleString()}
- Monthly Revenue: $${monthlyRevenue.toLocaleString()}
- Net Cash Flow (30d): $${(monthlyRevenue - monthlyBurn).toLocaleString()}
- Runway: ${latestSnapshot?.runway?.toFixed(1) ?? "N/A"} months
- LTV/CAC Ratio: ${latestKPI?.ltvCacRatio?.toFixed(2) ?? "N/A"}x
- MRR: $${latestKPI?.mrr?.toLocaleString() ?? "N/A"}
- ARR: $${latestKPI?.arr?.toLocaleString() ?? "N/A"}

DATA SOURCES: QuickBooks Online (P&L, Expenses), Stripe (Revenue, MRR), Plaid (Cash Balances, Bank Txns)

INSTRUCTIONS:
- Answer questions about cash flow, burn rate, runway, KPIs, and financial trends
- Reference the real data above when applicable
- Be direct, specific, and use financial terminology appropriately
- Flag any concerning trends proactively
- Suggest actionable decisions, not just observations
- Format numbers clearly with $ and commas
- Do NOT make up data not in the context above
- If asked something outside your financial domain, politely redirect

You are speaking with ${user.name || user.email}, role: ${user.role}.`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map((m: any) => ({ role: m.role, content: m.content })),
    });

    const assistantMessage = response.content[0].type === "text" ? response.content[0].text : "";

    // Audit log the chat
    await auditLog(user.id, "AI_CHAT_QUERY", "chat");

    return NextResponse.json({ message: assistantMessage });
  } catch (err) {
    console.error("Anthropic API error:", err);
    return NextResponse.json({ error: "AI service unavailable" }, { status: 500 });
  }
}
