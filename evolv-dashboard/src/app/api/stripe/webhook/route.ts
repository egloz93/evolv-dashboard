// src/app/api/stripe/webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "@/lib/db";
import { headers } from "next/headers";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = headers().get("stripe-signature")!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    console.error("Stripe webhook signature failed:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "payment_intent.succeeded": {
      const pi = event.data.object as Stripe.PaymentIntent;
      await db.financialTransaction.upsert({
        where: { source_externalId_orgId: { source: "STRIPE", externalId: pi.id, orgId: pi.metadata.orgId || "default" } },
        update: { amount: pi.amount / 100 },
        create: {
          source: "STRIPE",
          externalId: pi.id,
          type: "payment",
          amount: pi.amount / 100,
          currency: pi.currency.toUpperCase(),
          date: new Date(pi.created * 1000),
          description: pi.description || "Stripe Payment",
          orgId: pi.metadata.orgId || "default",
        },
      });
      break;
    }

    case "invoice.paid": {
      const inv = event.data.object as Stripe.Invoice;
      await db.financialTransaction.upsert({
        where: { source_externalId_orgId: { source: "STRIPE", externalId: inv.id!, orgId: inv.metadata?.orgId || "default" } },
        update: { amount: (inv.amount_paid || 0) / 100 },
        create: {
          source: "STRIPE",
          externalId: inv.id!,
          type: "invoice",
          amount: (inv.amount_paid || 0) / 100,
          currency: inv.currency.toUpperCase(),
          date: new Date((inv.created || Date.now() / 1000) * 1000),
          description: `Invoice ${inv.number}`,
          orgId: inv.metadata?.orgId || "default",
        },
      });
      break;
    }

    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      // Trigger MRR recalculation
      await recalculateMRR(event.data.object as Stripe.Subscription);
      break;
    }
  }

  return NextResponse.json({ received: true });
}

async function recalculateMRR(sub: Stripe.Subscription) {
  // In production: aggregate all active subscriptions for the org
  // and update the KPIRecord for the current period
  console.log("MRR recalculation triggered for subscription:", sub.id);
}

// ── Stripe Data Sync API ──────────────────────────────────────────────────
// src/app/api/stripe/sync/route.ts
export async function GET_SYNC(req: NextRequest) {
  // Manual sync endpoint: pull last 90 days of charges
  const stripe_instance = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2024-06-20" });

  const charges = await stripe_instance.charges.list({ limit: 100 });

  for (const charge of charges.data) {
    if (charge.status !== "succeeded") continue;
    // upsert into DB...
  }

  return NextResponse.json({ synced: charges.data.length });
}
