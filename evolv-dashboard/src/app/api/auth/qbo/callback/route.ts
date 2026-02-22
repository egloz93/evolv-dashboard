// src/app/api/auth/qbo/callback/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@auth0/nextjs-auth0";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/crypto";
import OAuthClient from "intuit-oauth";
import { auditLog } from "@/lib/audit";

const oauthClient = new OAuthClient({
  clientId: process.env.QBO_CLIENT_ID!,
  clientSecret: process.env.QBO_CLIENT_SECRET!,
  environment: process.env.QBO_ENVIRONMENT as "sandbox" | "production",
  redirectUri: process.env.QBO_REDIRECT_URI!,
  logging: false,
});

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.redirect("/api/auth/login");

  const url = req.url;
  const parseRedirect = url;

  try {
    const authResponse = await oauthClient.createToken(parseRedirect);
    const token = authResponse.getJson();

    const user = await db.user.findUnique({ where: { auth0Id: session.user.sub } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Upsert the integration — store tokens encrypted
    await db.integration.upsert({
      where: { orgId_provider: { orgId: user.orgId, provider: "QBO" } } as any,
      update: {
        accessToken: encrypt(token.access_token),
        refreshToken: encrypt(token.refresh_token),
        realmId: token.realmId,
        expiresAt: new Date(Date.now() + token.expires_in * 1000),
        status: "ACTIVE",
        lastSyncAt: new Date(),
      },
      create: {
        provider: "QBO",
        accessToken: encrypt(token.access_token),
        refreshToken: encrypt(token.refresh_token),
        realmId: token.realmId,
        expiresAt: new Date(Date.now() + token.expires_in * 1000),
        status: "ACTIVE",
        orgId: user.orgId,
      },
    });

    await auditLog(user.id, "CONNECTED_QBO", "integration");

    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?connected=qbo`);
  } catch (err) {
    console.error("QBO OAuth error:", err);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?error=qbo`);
  }
}
