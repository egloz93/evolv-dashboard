// src/app/api/plaid/link-token/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@auth0/nextjs-auth0";
import { plaidClient } from "@/lib/plaid";
import { db } from "@/lib/db";
import { CountryCode, Products } from "plaid";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({ where: { auth0Id: session.user.sub } });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  try {
    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: user.id },
      client_name: "Evolv Dashboard",
      products: [Products.Transactions, Products.Balance],
      country_codes: [CountryCode.Us],
      language: "en",
      redirect_uri: process.env.PLAID_REDIRECT_URI,
    });

    return NextResponse.json({ link_token: response.data.link_token });
  } catch (err: any) {
    console.error("Plaid link token error:", err?.response?.data || err);
    return NextResponse.json({ error: "Failed to create link token" }, { status: 500 });
  }
}
