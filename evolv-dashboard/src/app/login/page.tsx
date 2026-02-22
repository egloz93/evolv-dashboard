"use client";
// src/app/login/page.tsx
// Standalone login page — clicking sign in triggers /api/auth/login (Auth0)

export default function LoginPage() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#080810",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Background glow */}
      <div style={{
        position: "absolute", top: "20%", left: "50%", transform: "translateX(-50%)",
        width: 600, height: 400,
        background: "radial-gradient(ellipse, rgba(99,102,241,0.12) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <div style={{
        width: "100%", maxWidth: 420,
        background: "linear-gradient(135deg, #0f0f18 0%, #0a0a14 100%)",
        border: "1px solid #1e1e30",
        borderRadius: 20,
        padding: "44px 40px",
        boxShadow: "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.08)",
        position: "relative",
        zIndex: 1,
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 36 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 20, fontWeight: 700, color: "#fff",
            boxShadow: "0 4px 20px rgba(99,102,241,0.4)",
          }}>E</div>
          <div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 18, color: "#f0f0fa" }}>Evolv</p>
            <p style={{ margin: 0, fontSize: 11, color: "#4a4a6a", letterSpacing: "0.1em", textTransform: "uppercase" }}>CFO Platform</p>
          </div>
        </div>

        <h1 style={{ margin: "0 0 8px", fontSize: 24, fontWeight: 700, color: "#f0f0fa" }}>
          Welcome back
        </h1>
        <p style={{ margin: "0 0 32px", color: "#4a4a6a", fontSize: 14, lineHeight: 1.5 }}>
          Sign in to access your real-time financial dashboard.
        </p>

        {/* Primary CTA — triggers Auth0 Universal Login */}
        <a href="/api/auth/login" style={{ textDecoration: "none" }}>
          <button style={{
            width: "100%", padding: "14px 20px",
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            border: "none", borderRadius: 12,
            color: "#fff", fontSize: 15, fontWeight: 600,
            cursor: "pointer", display: "flex", alignItems: "center",
            justifyContent: "center", gap: 8,
            boxShadow: "0 4px 24px rgba(99,102,241,0.35)",
            transition: "opacity 0.15s ease",
          }}
            onMouseEnter={e => (e.currentTarget.style.opacity = "0.9")}
            onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
          >
            <span style={{ fontSize: 18 }}>→</span>
            Continue with Auth0
          </button>
        </a>

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0" }}>
          <div style={{ flex: 1, height: 1, background: "#1e1e30" }} />
          <span style={{ color: "#2e2e42", fontSize: 12 }}>or sign in with</span>
          <div style={{ flex: 1, height: 1, background: "#1e1e30" }} />
        </div>

        {/* Google SSO — passes connection param to Auth0 */}
        <a href="/api/auth/login?connection=google-oauth2" style={{ textDecoration: "none" }}>
          <button style={{
            width: "100%", padding: "13px 20px",
            background: "transparent",
            border: "1px solid #1e1e30", borderRadius: 12,
            color: "#a0a0c0", fontSize: 14, fontWeight: 500,
            cursor: "pointer", display: "flex", alignItems: "center",
            justifyContent: "center", gap: 10,
            transition: "border-color 0.15s ease, color 0.15s ease",
          }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = "#3a3a52";
              e.currentTarget.style.color = "#f0f0fa";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = "#1e1e30";
              e.currentTarget.style.color = "#a0a0c0";
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
              <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"/>
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 6.293C4.672 4.166 6.656 3.58 9 3.58z"/>
            </svg>
            Continue with Google
          </button>
        </a>

        {/* Security notice */}
        <div style={{
          marginTop: 28, padding: "12px 16px",
          background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)",
          borderRadius: 10,
        }}>
          <p style={{ margin: 0, fontSize: 11, color: "#64648a", lineHeight: 1.6 }}>
            🔒 <strong style={{ color: "#8888aa" }}>MFA required.</strong> All logins require multi-factor authentication. Your data is encrypted at rest and in transit.
          </p>
        </div>
      </div>
    </div>
  );
}
