import { handleAuth, handleLogin, handleCallback, handleLogout } from "@auth0/nextjs-auth0";

export const GET = handleAuth({
  login: handleLogin({
    authorizationParams: { prompt: "login" },
    returnTo: "/dashboard",
  }),

  callback: handleCallback({
    redirectUri: `${process.env.AUTH0_BASE_URL}/api/auth/callback`,
    afterCallback: async (_req, session) => {
      const { db } = await import("@/lib/db");

      const existingUser = await db.user.findUnique({
        where: { auth0Id: session.user.sub },
      });

      if (!existingUser) {
        const slug = `${session.user.email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "-")}-${Date.now()}`;
        const org = await db.organization.create({
          data: { name: "My Company", slug },
        });
        await db.user.create({
          data: {
            auth0Id: session.user.sub,
            email: session.user.email,
            name: session.user.name ?? null,
            role: "ADMIN",
            onboarded: false,
            orgId: org.id,
          },
        });
      }

      return session;
    },
  }),

  logout: handleLogout({
    returnTo: `${process.env.AUTH0_BASE_URL}/login`,
  }),
}
cat > src/app/dashboard/page.tsx << 'EOF'
import { getSession } from "@auth0/nextjs-auth0";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session?.user) redirect("/api/auth/login");

  const user = await db.user.findUnique({
    where: { auth0Id: session.user.sub },
    include: { organization: true },
  });

  if (!user) redirect("/api/auth/login");
  if (!user.onboarded) redirect("/onboarding");

  const [latestSnapshot, latestKPI, recentTransactions] = await Promise.all([
    db.cashSnapshot.findFirst({ where: { orgId: user.orgId }, orderBy: { date: "desc" } }),
    db.kPIRecord.findFirst({ where: { orgId: user.orgId }, orderBy: { period: "desc" } }),
    db.financialTransaction.findMany({
      where: { orgId: user.orgId, date: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
      orderBy: { date: "desc" },
      take: 100,
    }),
  ]);

  const initialData = {
    user: { name: user.name, email: user.email, role: user.role, orgName: user.organization.name },
    cashOnHand: latestSnapshot?.cashOnHand ?? 0,
    runway: latestSnapshot?.runway ?? 0,
    burnRate: latestSnapshot?.burnRate ?? 0,
    kpis: { ltv: latestKPI?.ltv ?? 0, cac: latestKPI?.cac ?? 0, ratio: latestKPI?.ltvCacRatio ?? 0, mrr: latestKPI?.mrr ?? 0, arr: latestKPI?.arr ?? 0 },
    transactionCount: recentTransactions.length,
  };

  return <DashboardClient initialData={initialData} />;
}
