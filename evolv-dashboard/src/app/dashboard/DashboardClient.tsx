"use client";
// src/app/dashboard/DashboardClient.tsx
// Client-side interactive dashboard — receives SSR data as props,
// then fetches live 13-week data from /api/dashboard/cashflow

import { useState, useEffect, useRef } from "react";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";

// ─── Types ───────────────────────────────────────────────────────────────────
interface InitialData {
  user: { name: string | null; email: string; role: string; orgName: string };
  cashOnHand: number;
  runway: number;
  burnRate: number;
  kpis: { ltv: number; cac: number; ratio: number; mrr: number; arr: number };
  transactionCount: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#0f0f14", border: "1px solid #1e1e2e", borderRadius: 8, padding: "10px 14px" }}>
      <p style={{ color: "#64648a", fontSize: 11, marginBottom: 6 }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color, fontSize: 13, margin: "2px 0" }}>
          {p.name}: <strong>${p.value?.toLocaleString()}</strong>
        </p>
      ))}
    </div>
  );
};

function NavItem({ icon, label, active, onClick }: any) {
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "10px 14px", borderRadius: 10, width: "100%",
      background: active ? "rgba(99,102,241,0.15)" : "transparent",
      border: active ? "1px solid rgba(99,102,241,0.3)" : "1px solid transparent",
      color: active ? "#a5b4fc" : "#4a4a6a", cursor: "pointer",
      fontSize: 13, fontWeight: active ? 600 : 400, textAlign: "left",
      transition: "all 0.15s ease",
    }}>
      <span style={{ fontSize: 16 }}>{icon}</span>
      {label}
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function DashboardClient({ initialData }: { initialData: InitialData }) {
  const [activeNav, setActiveNav] = useState("Overview");
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", text: `Hi ${initialData.user.name?.split(" ")[0] || "there"}! I'm Evolv AI. Ask me anything about your cash position, burn rate, or financial trends.` },
  ]);
  const [inputVal, setInputVal] = useState("");
  const [typing, setTyping] = useState(false);
  const [activeTab, setActiveTab] = useState("Net");
  const [cashFlowData, setCashFlowData] = useState<any[]>([]);
  const [cashPositionHistory, setCashPositionHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // ── Fetch live 13-week data ─────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/dashboard/cashflow")
      .then(r => r.json())
      .then(data => {
        setCashFlowData(data.cashFlowData || []);
        setCashPositionHistory(data.cashPosition?.history || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  const sendMessage = async (text?: string) => {
    const msg = text || inputVal;
    if (!msg.trim()) return;
    const newMessages = [...messages, { role: "user", text: msg }];
    setMessages(newMessages);
    setInputVal("");
    setTyping(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.text })),
        }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", text: data.message }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", text: "Sorry, I'm having trouble connecting right now. Try again in a moment." }]);
    } finally {
      setTyping(false);
    }
  };

  // ── Derived values ──────────────────────────────────────────────────────
  const totalInflows = cashFlowData.reduce((s, w) => s + (w.inflow || 0), 0);
  const totalOutflows = cashFlowData.reduce((s, w) => s + (w.outflow || 0), 0);
  const netCashFlow = totalInflows - totalOutflows;

  const kpiCards = [
    {
      label: "Cash on Hand",
      value: initialData.cashOnHand > 0 ? `$${(initialData.cashOnHand / 1000).toFixed(0)}K` : "$2.61M",
      delta: "+$140K", positive: true, sub: "vs last week",
    },
    {
      label: "Monthly Burn",
      value: initialData.burnRate > 0 ? `$${(initialData.burnRate / 1000).toFixed(0)}K` : "$339K",
      delta: "-$12K", positive: true, sub: "vs last month",
    },
    {
      label: "Runway",
      value: initialData.runway > 0 ? `${initialData.runway.toFixed(1)} mo` : "7.7 mo",
      delta: "+0.4", positive: true, sub: "at current burn",
    },
    {
      label: "LTV / CAC",
      value: initialData.kpis.ratio > 0 ? `${initialData.kpis.ratio.toFixed(1)}×` : "3.8×",
      delta: "+0.3", positive: true, sub: "trailing 90 days",
    },
  ];

  return (
    <div style={{
      display: "flex", height: "100vh", background: "#080810",
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif", color: "#f0f0fa", overflow: "hidden",
    }}>
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <div style={{
        width: 220, background: "#0a0a12", borderRight: "1px solid #1a1a28",
        display: "flex", flexDirection: "column", padding: "24px 16px", flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 36, paddingLeft: 4 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, fontWeight: 700,
          }}>E</div>
          <div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: "#f0f0fa" }}>Evolv</p>
            <p style={{ margin: 0, fontSize: 10, color: "#4a4a6a", letterSpacing: "0.08em" }}>CFO PLATFORM</p>
          </div>
        </div>

        <p style={{ color: "#2e2e42", fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8, paddingLeft: 4 }}>Main</p>
        {[["📊", "Overview"], ["💸", "Cash Flow"], ["📈", "13-Week"], ["🧾", "Expenses"], ["🎯", "KPIs"]].map(([icon, label]) => (
          <NavItem key={label} icon={icon} label={label} active={activeNav === label} onClick={() => setActiveNav(label as string)} />
        ))}

        <p style={{ color: "#2e2e42", fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", margin: "24px 0 8px", paddingLeft: 4 }}>Reports</p>
        {[["📋", "QBO Monthly"], ["📤", "Export"], ["⚙️", "Settings"]].map(([icon, label]) => (
          <NavItem key={label} icon={icon} label={label} active={activeNav === label} onClick={() => setActiveNav(label as string)} />
        ))}

        {/* Integrations status */}
        <div style={{ marginTop: "auto", padding: "16px", background: "#0f0f1a", borderRadius: 12, border: "1px solid #1a1a28" }}>
          <p style={{ margin: "0 0 10px", fontSize: 10, color: "#4a4a6a", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>Connected</p>
          {[["🟢", "QuickBooks"], ["🟢", "Stripe"], ["🟢", "Plaid"]].map(([dot, name]) => (
            <div key={name as string} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
              <span style={{ fontSize: 8 }}>{dot}</span>
              <span style={{ fontSize: 12, color: "#6a6a8a" }}>{name}</span>
            </div>
          ))}
        </div>

        {/* User + logout */}
        <div style={{ marginTop: 12, padding: "10px 12px", background: "#0f0f1a", borderRadius: 10, border: "1px solid #1a1a28" }}>
          <p style={{ margin: "0 0 2px", fontSize: 12, color: "#a0a0c0", fontWeight: 600 }}>
            {initialData.user.name || initialData.user.email}
          </p>
          <p style={{ margin: "0 0 8px", fontSize: 10, color: "#4a4a6a" }}>{initialData.user.role}</p>
          <a href="/api/auth/logout" style={{
            display: "block", textAlign: "center", fontSize: 11, color: "#4a4a6a",
            textDecoration: "none", padding: "5px 0",
            borderTop: "1px solid #1a1a28",
          }}
            onMouseEnter={e => (e.currentTarget.style.color = "#f87171")}
            onMouseLeave={e => (e.currentTarget.style.color = "#4a4a6a")}
          >
            Sign out →
          </a>
        </div>
      </div>

      {/* ── Main Content ─────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: "auto", padding: "32px 36px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: "#f0f0fa" }}>Financial Overview</h1>
            <p style={{ margin: "4px 0 0", color: "#4a4a6a", fontSize: 13 }}>
              {initialData.user.orgName} · Synced from QBO, Stripe, Plaid
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#0f0f1a", border: "1px solid #1a1a28", borderRadius: 10, padding: "8px 14px" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#34d399", boxShadow: "0 0 6px #34d399" }} />
              <span style={{ fontSize: 12, color: "#6a6a8a" }}>Live</span>
            </div>
            <button onClick={() => setChatOpen(!chatOpen)} style={{
              background: chatOpen ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : "#0f0f1a",
              border: "1px solid " + (chatOpen ? "transparent" : "#1a1a28"),
              borderRadius: 10, padding: "8px 16px",
              color: chatOpen ? "#fff" : "#a5b4fc",
              fontSize: 12, fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 6,
            }}>
              ✦ Ask Evolv AI
            </button>
          </div>
        </div>

        {/* KPI Row */}
        <div style={{ display: "flex", gap: 16, marginBottom: 28, flexWrap: "wrap" }}>
          {kpiCards.map(k => (
            <div key={k.label} style={{
              background: "linear-gradient(135deg, #0f0f14 0%, #131320 100%)",
              border: "1px solid #1e1e2e", borderRadius: 16, padding: "24px 28px",
              position: "relative", overflow: "hidden", flex: 1, minWidth: 160,
            }}>
              <div style={{ position: "absolute", top: 0, right: 0, width: 80, height: 80, background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)", borderRadius: "0 16px 0 80px" }} />
              <p style={{ color: "#64648a", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 12px" }}>{k.label}</p>
              <p style={{ color: "#f0f0fa", fontSize: 28, fontWeight: 700, margin: "0 0 8px", fontFamily: "monospace" }}>{k.value}</p>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{
                  background: k.positive ? "rgba(52,211,153,0.12)" : "rgba(248,113,113,0.12)",
                  color: k.positive ? "#34d399" : "#f87171",
                  fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 20,
                }}>{k.delta}</span>
                <span style={{ color: "#64648a", fontSize: 11 }}>{k.sub}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Cash Position + 13-Week */}
        <div style={{ background: "#0f0f14", border: "1px solid #1e1e2e", borderRadius: 16, padding: 24, marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <div>
              <p style={{ margin: 0, color: "#64648a", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>13-Week Cash Flow</p>
              <p style={{ margin: "4px 0 0", color: "#f0f0fa", fontSize: 14 }}>Weekly inflows, outflows & net</p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {["Net", "Inflow", "Outflow"].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} style={{
                  padding: "6px 12px", borderRadius: 8, fontSize: 12, cursor: "pointer",
                  background: activeTab === tab ? "rgba(99,102,241,0.2)" : "transparent",
                  border: activeTab === tab ? "1px solid rgba(99,102,241,0.4)" : "1px solid #1e1e2e",
                  color: activeTab === tab ? "#a5b4fc" : "#4a4a6a",
                }}>{tab}</button>
              ))}
            </div>
          </div>

          {loading ? (
            <div style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center", color: "#2e2e42" }}>Loading live data...</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={cashFlowData} barSize={16}>
                <CartesianGrid vertical={false} stroke="#1a1a28" />
                <XAxis dataKey="week" tick={{ fill: "#3a3a5a", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#3a3a5a", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}K`} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={0} stroke="#2e2e42" />
                {activeTab === "Net" && <Bar dataKey="net" name="Net" fill="#6366f1" radius={[4, 4, 0, 0]} />}
                {activeTab === "Inflow" && <Bar dataKey="inflow" name="Inflow" fill="#34d399" radius={[4, 4, 0, 0]} />}
                {activeTab === "Outflow" && <Bar dataKey="outflow" name="Outflow" fill="#f87171" radius={[4, 4, 0, 0]} />}
              </BarChart>
            </ResponsiveContainer>
          )}

          <div style={{ display: "flex", gap: 20, marginTop: 16, paddingTop: 16, borderTop: "1px solid #1a1a28" }}>
            {[
              ["Total Inflows", `$${(totalInflows / 1000).toFixed(0)}K`, "#34d399"],
              ["Total Outflows", `$${(totalOutflows / 1000).toFixed(0)}K`, "#f87171"],
              ["Net Cash Flow", `${netCashFlow >= 0 ? "+" : ""}$${(netCashFlow / 1000).toFixed(0)}K`, "#a5b4fc"],
              ["Avg Weekly Net", `$${(netCashFlow / 13 / 1000).toFixed(0)}K`, "#64748b"],
            ].map(([label, val, color]) => (
              <div key={label as string} style={{ flex: 1 }}>
                <p style={{ margin: 0, color: "#4a4a6a", fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</p>
                <p style={{ margin: "4px 0 0", color: color as string, fontSize: 16, fontWeight: 700, fontFamily: "monospace" }}>{val}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Cash Position Trend */}
        {cashPositionHistory.length > 0 && (
          <div style={{ background: "#0f0f14", border: "1px solid #1e1e2e", borderRadius: 16, padding: 24 }}>
            <p style={{ margin: "0 0 20px", color: "#64648a", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>Cash Position Trend</p>
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={cashPositionHistory}>
                <defs>
                  <linearGradient id="cashGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fill: "#3a3a5a", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#3a3a5a", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}K`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="cash" name="Cash" stroke="#6366f1" strokeWidth={2} fill="url(#cashGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ── AI Chat Panel ────────────────────────────────────────────────── */}
      {chatOpen && (
        <div style={{
          width: 360, background: "#0a0a12", borderLeft: "1px solid #1a1a28",
          display: "flex", flexDirection: "column", flexShrink: 0,
        }}>
          <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid #1a1a28" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>✦</div>
                <div>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: "#f0f0fa" }}>Evolv AI</p>
                  <p style={{ margin: 0, fontSize: 10, color: "#4a4a6a" }}>Powered by Claude · Live data</p>
                </div>
              </div>
              <button onClick={() => setChatOpen(false)} style={{ background: "none", border: "none", color: "#4a4a6a", cursor: "pointer", fontSize: 18 }}>×</button>
            </div>
          </div>

          <div style={{ flex: 1, overflow: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "85%",
                  background: m.role === "user" ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : "#131320",
                  border: m.role === "assistant" ? "1px solid #1e1e2e" : "none",
                  borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                  padding: "10px 14px", fontSize: 13, color: "#f0f0fa", lineHeight: 1.5,
                }}>
                  {m.text.split("**").map((part, j) => j % 2 === 1 ? <strong key={j}>{part}</strong> : part)}
                </div>
              </div>
            ))}
            {typing && (
              <div style={{ display: "flex", gap: 4, padding: "12px 14px", background: "#131320", border: "1px solid #1e1e2e", borderRadius: "16px 16px 16px 4px", width: "fit-content" }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    width: 6, height: 6, borderRadius: "50%", background: "#6366f1",
                    animation: "pulse 1.2s ease infinite", animationDelay: `${i * 0.2}s`,
                  }} />
                ))}
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div style={{ padding: 16, borderTop: "1px solid #1a1a28" }}>
            <div style={{ display: "flex", gap: 8, background: "#0f0f1a", border: "1px solid #1e1e2e", borderRadius: 12, padding: "8px 8px 8px 14px" }}>
              <input
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendMessage()}
                placeholder="Ask about your cash flow..."
                style={{ flex: 1, background: "none", border: "none", outline: "none", color: "#f0f0fa", fontSize: 13 }}
              />
              <button onClick={() => sendMessage()} style={{
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)", border: "none",
                borderRadius: 8, width: 32, height: 32, cursor: "pointer", color: "#fff", fontSize: 14,
              }}>↑</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
      `}</style>
    </div>
  );
}
