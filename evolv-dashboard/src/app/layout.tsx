// src/app/layout.tsx
import { UserProvider } from "@auth0/nextjs-auth0/client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Evolv | CFO Dashboard",
  description: "Real-time cash flow, burn rate, and financial intelligence for growing companies.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ margin: 0, padding: 0 }}>
        {/* Auth0 UserProvider makes session available client-side */}
        <UserProvider>{children}</UserProvider>
      </body>
    </html>
  );
}
