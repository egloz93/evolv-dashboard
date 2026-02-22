// src/app/api/auth/qbo/route.ts
// QuickBooks Online OAuth2 flow

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@auth0/nextjs-auth0";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/crypto";
import OAuthClient from "intuit-oauth";

const oauthClient = new OAuthClient({
  clientId: process.env.QBO_CLIENT_ID!,
  clientSecret: process.env.QBO_CLIENT_SECRET!,
  environment: process.env.QBO_ENVIRONMENT as "sandbox" | "production",
  redirectUri: process.env.QBO_REDIRECT_URI!,
  logging: false,
});

// GET /api/auth/qbo → Redirect to QBO authorization
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.redirect("/api/auth/login");

  const authUri = oauthClient.authorizeUri({
    scope: [OAuthClient.scopes.Accounting, OAuthClient.scopes.OpenId],
    state: session.user.sub, // use auth0 user id as CSRF state
  });

  return NextResponse.redirect(authUri);
}
