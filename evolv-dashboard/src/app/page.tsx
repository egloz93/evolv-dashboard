// src/app/page.tsx
// Root route: if user has a session → /dashboard, otherwise → /login
import { getSession } from "@auth0/nextjs-auth0";
import { redirect } from "next/navigation";

export default async function RootPage() {
  const session = await getSession();

  if (session?.user) {
    redirect("/dashboard");
  } else {
    redirect("/login");
  }
}
